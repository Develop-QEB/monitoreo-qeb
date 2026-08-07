import type { Role } from '@/lib/roles'

// MOCK ONLY - En el back real estos van hasheados en DB.
// No commitear con datos sensibles reales.
export interface MockUser {
  id: string
  name: string
  email: string
  password: string
  role: Role
  active: boolean
  createdAt: string
  lastLogin?: string
}

export const MOCK_USERS: MockUser[] = [
  {
    id: 'u_001',
    name: 'Akary',
    email: 'develop@qeb.mx',
    password: 'changeme',
    role: 'admin',
    active: true,
    createdAt: '2026-08-07',
  },
  {
    id: 'u_002',
    name: 'TI Demo',
    email: 'ti@qeb.mx',
    password: 'changeme',
    role: 'ti',
    active: true,
    createdAt: '2026-08-07',
  },
  {
    id: 'u_003',
    name: 'Mejora Continua Demo',
    email: 'mejora@qeb.mx',
    password: 'changeme',
    role: 'mejora-continua',
    active: true,
    createdAt: '2026-08-07',
  },
]
