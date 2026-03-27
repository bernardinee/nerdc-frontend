import { create } from 'zustand'
import type { Admin, RegisterPayload, UserRole } from '@/types'
import { authService } from '@/services/adapters/authService'

/** Pages each role may access.  '*' means unrestricted. */
export const ROLE_ACCESS: Record<UserRole, string[] | '*'> = {
  system_admin:   '*',
  hospital_admin: ['dashboard', 'incidents', 'dispatch', 'tracking', 'analytics', 'profile'],
  police_admin:   ['dashboard', 'incidents', 'dispatch', 'tracking', 'analytics', 'profile'],
  fire_admin:     ['dashboard', 'incidents', 'dispatch', 'tracking', 'analytics', 'profile'],
}

interface AuthStore {
  admin: Admin | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  login:    (email: string, password: string) => Promise<void>
  register: (payload: RegisterPayload) => Promise<void>
  logout:   () => Promise<void>
  hydrate:  () => void
  clearError: () => void
  canAccess: (page: string) => boolean
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  admin:           null,
  isAuthenticated: false,
  isLoading:       false,
  error:           null,

  hydrate: () => {
    const admin = authService.getCurrentAdmin()
    set({ admin, isAuthenticated: !!admin })
  },

  clearError: () => set({ error: null }),

  login: async (email, password) => {
    set({ isLoading: true, error: null })
    try {
      const admin = await authService.login(email, password)
      set({ admin, isAuthenticated: true, isLoading: false })
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Login failed.', isLoading: false })
    }
  },

  register: async (payload) => {
    set({ isLoading: true, error: null })
    try {
      const admin = await authService.register(payload)
      set({ admin, isAuthenticated: true, isLoading: false })
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Registration failed.', isLoading: false })
    }
  },

  logout: async () => {
    await authService.logout()
    set({ admin: null, isAuthenticated: false })
  },

  canAccess: (page: string) => {
    const { admin } = get()
    if (!admin) return false
    const allowed = ROLE_ACCESS[admin.role]
    if (allowed === '*') return true
    return allowed.includes(page)
  },
}))
