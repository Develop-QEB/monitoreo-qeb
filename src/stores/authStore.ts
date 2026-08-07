import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Role } from '@/lib/roles'
import { MOCK_USERS } from '@/data/mockUsers'

export interface AuthUser {
  id: string
  name: string
  email: string
  role: Role
}

interface AuthState {
  user: AuthUser | null
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>
  logout: () => void
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      login: async (email, password) => {
        // Mock: validar contra MOCK_USERS. En back real será fetch a /api/auth/login.
        await new Promise((r) => setTimeout(r, 320))
        const found = MOCK_USERS.find(
          (u) => u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password,
        )
        if (!found) return { ok: false, error: 'credenciales inválidas' }
        if (!found.active) return { ok: false, error: 'usuario deshabilitado' }
        set({
          user: {
            id: found.id,
            name: found.name,
            email: found.email,
            role: found.role,
          },
        })
        return { ok: true }
      },
      logout: () => set({ user: null }),
    }),
    { name: 'monitoreo-qeb:auth' },
  ),
)
