import type { Role } from '@/lib/roles'

export interface AdminUser {
  id: string
  name: string
  email: string
  role: Role
  active: boolean
  createdAt: string
  lastLoginAt: string | null
}

export type AuditAction =
  | 'auth.login'
  | 'auth.login_fail'
  | 'auth.logout'
  | 'user.create'
  | 'user.update'
  | 'user.delete'
  | 'user.role_change'
  | 'user.disable'
  | 'user.enable'
  | 'user.password_reset'
  | 'query.kill'
  | 'reserva.resolver'

export interface AuditEvent {
  id: string
  ts: string
  actor: string
  action: AuditAction
  target: string | null
  details: string | null
}
