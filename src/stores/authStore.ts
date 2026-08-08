import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Role } from '@/lib/roles'
import { api, setAuthToken, ApiError } from '@/lib/api'

export interface AuthUser {
  id: string
  name: string
  email: string
  role: Role
}

interface LoginResponse {
  token: string
  user: AuthUser
}

interface AuthState {
  user: AuthUser | null
  token: string | null
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>
  logout: () => Promise<void>
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      login: async (email, password) => {
        try {
          const res = await api.post<LoginResponse>('/auth/login', { email, password })
          setAuthToken(res.token)
          set({ user: res.user, token: res.token })
          return { ok: true }
        } catch (e) {
          const msg = e instanceof ApiError ? e.message : 'error desconocido'
          return { ok: false, error: msg }
        }
      },
      logout: async () => {
        if (get().token) {
          try {
            await api.post('/auth/logout')
          } catch {
            // silent — igual limpiamos local
          }
        }
        setAuthToken(null)
        set({ user: null, token: null })
      },
    }),
    {
      name: 'monitoreo-qeb:auth',
      onRehydrateStorage: () => (state) => {
        if (state?.token) setAuthToken(state.token)
      },
    },
  ),
)
