import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Role } from '@/lib/roles'
import { useUsers } from '@/stores/usersStore'
import { useAudit } from '@/stores/auditStore'

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
    (set, get) => ({
      user: null,
      login: async (email, password) => {
        // Mock: validar contra usersStore. En back real será fetch a /api/auth/login.
        await new Promise((r) => setTimeout(r, 320))
        const emailTrim = email.trim().toLowerCase()
        const found = useUsers
          .getState()
          .users.find((u) => u.email.toLowerCase() === emailTrim && u.password === password)

        if (!found) {
          useAudit.getState().record({
            actor: emailTrim || 'unknown',
            action: 'auth.login_fail',
            target: emailTrim || 'unknown',
          })
          return { ok: false, error: 'credenciales inválidas' }
        }
        if (!found.active) {
          useAudit.getState().record({
            actor: emailTrim,
            action: 'auth.login_fail',
            target: emailTrim,
            details: 'usuario deshabilitado',
          })
          return { ok: false, error: 'usuario deshabilitado' }
        }

        useUsers.getState().markLogin(found.email)
        useAudit.getState().record({
          actor: found.email,
          action: 'auth.login',
          target: found.email,
        })
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
      logout: () => {
        const current = get().user
        if (current) {
          useAudit.getState().record({
            actor: current.email,
            action: 'auth.logout',
            target: current.email,
          })
        }
        set({ user: null })
      },
    }),
    { name: 'monitoreo-qeb:auth' },
  ),
)
