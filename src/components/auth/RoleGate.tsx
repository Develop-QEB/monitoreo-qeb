import type { ReactNode } from 'react'
import { useAuth } from '@/stores/authStore'
import type { Role } from '@/lib/roles'

interface Props {
  roles: Role[]
  fallback?: ReactNode
  children: ReactNode
}

/**
 * Renderiza `children` solo si el rol del usuario está en `roles`.
 * Útil para esconder botones destructivos (kill query, etc.) a mejora-continua.
 */
export function RoleGate({ roles, fallback = null, children }: Props) {
  const user = useAuth((s) => s.user)
  if (!user || !roles.includes(user.role)) return <>{fallback}</>
  return <>{children}</>
}
