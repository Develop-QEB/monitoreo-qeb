export type Role = 'admin' | 'ti' | 'mejora-continua'

export const ROLE_LABEL: Record<Role, string> = {
  admin: 'admin',
  ti: 'ti',
  'mejora-continua': 'mejora continua',
}

export interface NavItem {
  path: string
  label: string
  roles: Role[]
}

export interface NavGroup {
  key: string
  label: string
  items: NavItem[]
}

export const NAV_GROUPS: NavGroup[] = [
  {
    key: 'monitor',
    label: 'monitoreo-qeb',
    items: [
      { path: '/',          label: 'resumen.tsx',    roles: ['admin', 'ti', 'mejora-continua'] },
      { path: '/frontend',  label: 'frontend.tsx',   roles: ['admin', 'ti', 'mejora-continua'] },
      { path: '/backend',   label: 'backend.tsx',    roles: ['admin', 'ti', 'mejora-continua'] },
      { path: '/database',  label: 'database.tsx',   roles: ['admin', 'ti', 'mejora-continua'] },
    ],
  },
  {
    key: 'qeb',
    label: 'qeb',
    items: [
      { path: '/qeb/tickets',    label: 'tickets.tsx',    roles: ['admin', 'ti', 'mejora-continua'] },
      { path: '/qeb/reservas',   label: 'reservas.tsx',   roles: ['admin', 'ti', 'mejora-continua'] },
      { path: '/qeb/campanas',   label: 'campanas.tsx',   roles: ['admin', 'ti', 'mejora-continua'] },
      { path: '/qeb/actividad',  label: 'actividad.tsx',  roles: ['admin', 'ti', 'mejora-continua'] },
    ],
  },
  {
    key: 'admin',
    label: 'admin',
    items: [
      { path: '/admin/users',      label: 'usuarios.tsx',   roles: ['admin'] },
      { path: '/admin/audit-log',  label: 'bitacora.tsx',   roles: ['admin'] },
    ],
  },
]

export function canAccess(path: string, role: Role): boolean {
  for (const group of NAV_GROUPS) {
    const match = group.items.find((i) => i.path === path)
    if (match) return match.roles.includes(role)
  }
  return true
}

export function canAct(role: Role): boolean {
  return role === 'admin' || role === 'ti'
}

export function isAdmin(role: Role): boolean {
  return role === 'admin'
}
