import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Role } from '@/lib/roles'
import { MOCK_USERS } from '@/data/mockUsers'

export interface AdminUser {
  id: string
  name: string
  email: string
  password: string
  role: Role
  active: boolean
  createdAt: string
  lastLogin?: string
}

interface UsersState {
  users: AdminUser[]
  create: (u: Omit<AdminUser, 'id' | 'createdAt' | 'active'>) => AdminUser
  updateRole: (id: string, role: Role) => void
  toggleActive: (id: string) => void
  resetPassword: (id: string) => string
  markLogin: (email: string) => void
  reset: () => void
}

const SEED: AdminUser[] = MOCK_USERS.map((u) => ({ ...u }))

let seq = SEED.length + 100

function makeId() {
  seq += 1
  return `u_${String(seq).padStart(3, '0')}`
}

function todayIso() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function randomPassword() {
  const words = ['blue', 'ninja', 'rocket', 'orbit', 'sonic', 'cobra', 'lunar', 'quartz']
  const w = words[Math.floor(Math.random() * words.length)]
  const n = Math.floor(1000 + Math.random() * 9000)
  return `${w}-${n}`
}

export const useUsers = create<UsersState>()(
  persist(
    (set) => ({
      users: SEED,
      create: (u) => {
        const newUser: AdminUser = {
          id: makeId(),
          createdAt: todayIso(),
          active: true,
          ...u,
        }
        set((s) => ({ users: [...s.users, newUser] }))
        return newUser
      },
      updateRole: (id, role) =>
        set((s) => ({
          users: s.users.map((u) => (u.id === id ? { ...u, role } : u)),
        })),
      toggleActive: (id) =>
        set((s) => ({
          users: s.users.map((u) => (u.id === id ? { ...u, active: !u.active } : u)),
        })),
      resetPassword: (id) => {
        const pw = randomPassword()
        set((s) => ({
          users: s.users.map((u) => (u.id === id ? { ...u, password: pw } : u)),
        }))
        return pw
      },
      markLogin: (email) =>
        set((s) => ({
          users: s.users.map((u) =>
            u.email.toLowerCase() === email.toLowerCase() ? { ...u, lastLogin: todayIso() } : u,
          ),
        })),
      reset: () => set({ users: SEED }),
    }),
    { name: 'monitoreo-qeb:users' },
  ),
)
