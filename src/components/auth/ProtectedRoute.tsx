import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/stores/authStore'
import { canAccess } from '@/lib/roles'

export function ProtectedRoute() {
  const user = useAuth((s) => s.user)
  const location = useLocation()

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (!canAccess(location.pathname, user.role)) {
    return <Navigate to="/forbidden" replace />
  }

  return <Outlet />
}
