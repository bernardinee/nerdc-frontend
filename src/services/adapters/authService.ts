/**
 * Auth Service
 *
 * Runs in one of two modes, selected automatically:
 *
 *   MOCK MODE  — VITE_AUTH_URL is empty / not set
 *                Uses in-memory mock data. No backend required.
 *                Supports registering new accounts (stored in sessionStorage
 *                so they survive page refreshes within the same tab).
 *
 *   LIVE MODE  — VITE_AUTH_URL is set (e.g. http://localhost:8001)
 *                Calls the real FastAPI backend.
 *
 * Switch is automatic — just set VITE_AUTH_URL when the backend is ready.
 */

import type { Admin, AuthTokens, RegisterPayload } from '@/types'
import { MOCK_ADMINS, MOCK_CREDENTIALS } from '../mocks/mockData'

// ─── Config ───────────────────────────────────────────────────────────────────

const API_BASE = (import.meta.env.VITE_AUTH_URL as string | undefined)?.trim() ?? ''
const IS_MOCK  = API_BASE === ''

const KEY_ACCESS  = 'nerdc_access_token'
const KEY_REFRESH = 'nerdc_refresh_token'
const KEY_USER    = 'nerdc_user'
const KEY_MOCK_USERS = 'nerdc_mock_users'   // extra registered users (mock only)

// ─── Role mapping ─────────────────────────────────────────────────────────────

const ROLE_MAP: Record<string, string> = {
  SYSTEM_ADMIN:      'system_admin',
  HOSPITAL_ADMIN:    'hospital_admin',
  POLICE_ADMIN:      'police_admin',
  FIRE_SERVICE_ADMIN: 'fire_admin',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)) }

function saveTokens(tokens: AuthTokens) {
  localStorage.setItem(KEY_ACCESS,  tokens.access_token)
  localStorage.setItem(KEY_REFRESH, tokens.refresh_token)
}

function clearSession() {
  localStorage.removeItem(KEY_ACCESS)
  localStorage.removeItem(KEY_REFRESH)
  localStorage.removeItem(KEY_USER)
}

function decodePayload(token: string): Record<string, unknown> {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(atob(base64))
  } catch { return {} }
}

function isExpired(token: string): boolean {
  const { exp } = decodePayload(token) as { exp?: number }
  if (!exp) return false
  return Date.now() / 1000 > exp - 30
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normaliseAdmin(data: any): Admin {
  return {
    id:           String(data.id ?? data.user_id ?? ''),
    name:         data.name ?? data.full_name ?? data.username ?? data.email,
    email:        data.email,
    role:         (ROLE_MAP[data.role] ?? data.role?.toLowerCase()) as Admin['role'],
    organization: data.station_id ?? data.organization ?? 'NERDC',
    lastLogin:    data.last_login ?? data.lastLogin ?? new Date().toISOString(),
    avatar:       data.avatar ?? undefined,
  }
}

async function extractError(res: Response, fallback: string): Promise<string> {
  const ct = res.headers.get('content-type') ?? ''
  if (!ct.includes('application/json')) {
    return `${fallback} (HTTP ${res.status}: ${res.statusText || 'check that your backend is running'})`
  }
  try {
    const body = await res.json() as { detail?: string | { msg: string; loc?: string[] }[] }
    if (!body.detail) return `${fallback} (HTTP ${res.status})`
    if (Array.isArray(body.detail)) {
      return body.detail.map((d) => `${d.loc?.slice(-1)[0] ?? 'field'}: ${d.msg}`).join(' · ')
    }
    return body.detail
  } catch {
    return `${fallback} (HTTP ${res.status})`
  }
}

// ─── Mock auth ────────────────────────────────────────────────────────────────

interface MockCredential { email: string; password: string; adminId: string }

function getMockUsers(): Admin[] {
  try {
    const raw = sessionStorage.getItem(KEY_MOCK_USERS)
    return raw ? (JSON.parse(raw) as Admin[]) : []
  } catch { return [] }
}

function saveMockUser(user: Admin, password: string) {
  const users = getMockUsers()
  users.push(user)
  sessionStorage.setItem(KEY_MOCK_USERS, JSON.stringify(users))

  const creds: MockCredential[] = JSON.parse(sessionStorage.getItem('nerdc_mock_creds') ?? '[]')
  creds.push({ email: user.email, password, adminId: user.id })
  sessionStorage.setItem('nerdc_mock_creds', JSON.stringify(creds))
}

function findMockUser(email: string, password: string): Admin | null {
  // Check seed credentials first
  const seedCred = MOCK_CREDENTIALS.find((c) => c.email === email && c.password === password)
  if (seedCred) {
    return MOCK_ADMINS.find((a) => a.id === seedCred.adminId) ?? null
  }
  // Then check runtime-registered users
  const creds: MockCredential[] = JSON.parse(sessionStorage.getItem('nerdc_mock_creds') ?? '[]')
  const cred = creds.find((c) => c.email === email && c.password === password)
  if (!cred) return null
  return getMockUsers().find((u) => u.id === cred.adminId) ?? null
}

function mockEmailTaken(email: string): boolean {
  if (MOCK_ADMINS.some((a) => a.email === email)) return true
  return getMockUsers().some((u) => u.email === email)
}

// ─── Live auth (real backend) ─────────────────────────────────────────────────

async function livePost(path: string, body: unknown, headers: Record<string, string> = {}): Promise<Response> {
  return fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })
}

async function tryRefresh(): Promise<boolean> {
  const refresh = localStorage.getItem(KEY_REFRESH)
  if (!refresh) return false
  try {
    const res = await livePost('/auth/refresh-token', { refresh_token: refresh })
    if (!res.ok) return false
    const tokens: AuthTokens = await res.json()
    saveTokens(tokens)
    return true
  } catch { return false }
}

async function liveAuthFetch(path: string, init: RequestInit = {}): Promise<Response> {
  let token = localStorage.getItem(KEY_ACCESS)
  if (token && isExpired(token)) {
    await tryRefresh()
    token = localStorage.getItem(KEY_ACCESS)
  }
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  })
  if (res.status === 401) {
    const refreshed = await tryRefresh()
    if (!refreshed) { clearSession(); throw new Error('Session expired. Please sign in again.') }
    const newToken = localStorage.getItem(KEY_ACCESS)
    return fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(newToken ? { Authorization: `Bearer ${newToken}` } : {}),
        ...(init.headers ?? {}),
      },
    })
  }
  return res
}

// ─── Public service ───────────────────────────────────────────────────────────

export const authService = {

  // ── Login ──────────────────────────────────────────────────────────────────

  async login(email: string, password: string): Promise<Admin> {
    if (IS_MOCK) {
      await sleep(700)
      const user = findMockUser(email, password)
      if (!user) throw new Error('Invalid email or password.')
      const session = { ...user, lastLogin: new Date().toISOString() }
      localStorage.setItem(KEY_USER, JSON.stringify(session))
      return session
    }

    const res = await livePost('/auth/login', { email, password })
    if (!res.ok) throw new Error(await extractError(res, 'Invalid email or password.'))
    const tokens: AuthTokens = await res.json()
    saveTokens(tokens)
    const admin = await this.fetchMe()
    localStorage.setItem(KEY_USER, JSON.stringify(admin))
    return admin
  },

  // ── Register ───────────────────────────────────────────────────────────────

  async register(payload: RegisterPayload): Promise<Admin> {
    if (IS_MOCK) {
      await sleep(900)
      if (mockEmailTaken(payload.email)) {
        throw new Error('An account with this email already exists.')
      }
      const newUser: Admin = {
        id:           `adm-${Date.now()}`,
        name:         payload.name,
        email:        payload.email,
        role:         payload.role,
        organization: payload.organization ?? 'NERDC',
        lastLogin:    new Date().toISOString(),
      }
      saveMockUser(newUser, payload.password)
      localStorage.setItem(KEY_USER, JSON.stringify(newUser))
      return newUser
    }

    const res = await livePost('/auth/register', {
      name:       payload.name,
      email:      payload.email,
      password:   payload.password,
      role:       payload.role === 'fire_admin' ? 'FIRE_SERVICE_ADMIN' : payload.role.toUpperCase(),
      station_id: payload.organization ?? '',
    })
    if (!res.ok) throw new Error(await extractError(res, 'Registration failed.'))
    // Register returns UserProfile (no tokens) — auto-login to get tokens
    const loginRes = await livePost('/auth/login', { email: payload.email, password: payload.password })
    if (!loginRes.ok) throw new Error('Registered successfully but could not sign in automatically. Please log in.')
    const tokens: AuthTokens = await loginRes.json()
    saveTokens(tokens)
    const admin = await this.fetchMe()
    localStorage.setItem(KEY_USER, JSON.stringify(admin))
    return admin
  },

  // ── Fetch profile (live only) ──────────────────────────────────────────────

  async fetchMe(): Promise<Admin> {
    const res = await liveAuthFetch('/auth/profile')
    if (!res.ok) throw new Error('Could not load user profile.')
    return normaliseAdmin(await res.json())
  },

  // ── Logout ─────────────────────────────────────────────────────────────────

  async logout(): Promise<void> {
    clearSession()
  },

  // ── Session helpers ────────────────────────────────────────────────────────

  getCurrentAdmin(): Admin | null {
    const raw = localStorage.getItem(KEY_USER)
    if (!raw) return null
    try { return JSON.parse(raw) as Admin } catch { return null }
  },

  getToken(): string | null { return localStorage.getItem(KEY_ACCESS) },
  getRefreshToken(): string | null { return localStorage.getItem(KEY_REFRESH) },

  isMockMode(): boolean { return IS_MOCK },
}
