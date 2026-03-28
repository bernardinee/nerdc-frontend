/**
 * Shared authenticated fetch utility used by all service adapters.
 *
 * - Reads the access token from localStorage
 * - Automatically refreshes on 401 (re-using auth service's refresh logic)
 * - Attaches Authorization header to every request
 */

const KEY_ACCESS  = 'nerdc_access_token'
const KEY_REFRESH = 'nerdc_refresh_token'

const AUTH_BASE = (import.meta.env.VITE_AUTH_URL as string | undefined)?.trim() ?? ''

function getToken()   { return localStorage.getItem(KEY_ACCESS) }
function getRefresh() { return localStorage.getItem(KEY_REFRESH) }

function saveToken(access: string, refresh: string) {
  localStorage.setItem(KEY_ACCESS,  access)
  localStorage.setItem(KEY_REFRESH, refresh)
}

function clearSession() {
  localStorage.removeItem(KEY_ACCESS)
  localStorage.removeItem(KEY_REFRESH)
  localStorage.removeItem('nerdc_user')
}

async function refreshTokens(): Promise<boolean> {
  const refresh = getRefresh()
  if (!refresh || !AUTH_BASE) return false
  try {
    const res = await fetch(`${AUTH_BASE}/auth/refresh-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refresh }),
    })
    if (!res.ok) return false
    const data = await res.json()
    saveToken(data.access_token, data.refresh_token)
    return true
  } catch {
    return false
  }
}

export async function apiFetch(baseUrl: string, path: string, init: RequestInit = {}): Promise<Response> {
  const token = getToken()

  const makeReq = (t: string | null) =>
    fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(t ? { Authorization: `Bearer ${t}` } : {}),
        ...(init.headers ?? {}),
      },
    })

  const res = await makeReq(token)

  if (res.status === 401) {
    const refreshed = await refreshTokens()
    if (!refreshed) {
      clearSession()
      // Redirect to login if we have a window
      if (typeof window !== 'undefined') window.location.href = '/login'
      throw new Error('Session expired. Please sign in again.')
    }
    return makeReq(getToken())
  }

  return res
}

/** Extract a readable error message from a FastAPI response */
export async function extractApiError(res: Response, fallback: string): Promise<string> {
  const ct = res.headers.get('content-type') ?? ''
  if (!ct.includes('application/json')) {
    return `${fallback} (HTTP ${res.status})`
  }
  try {
    const body = await res.json() as { detail?: string | { msg: string; loc?: string[] }[] }
    if (!body.detail) return `${fallback} (HTTP ${res.status})`
    if (Array.isArray(body.detail)) {
      return body.detail.map((d) => `${d.loc?.slice(-1)[0] ?? 'field'}: ${d.msg}`).join(' · ')
    }
    return String(body.detail)
  } catch {
    return `${fallback} (HTTP ${res.status})`
  }
}
