import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/stores/authStore'
import { canAccess, defaultRouteFor } from '@/lib/roles'

export function ProtectedRoute() {
  const user = useAuth((s) => s.user)
  const location = useLocation()

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  // Redirect en la raíz al home natural del rol (evita mostrar /forbidden en /)
  if (location.pathname === '/' && !canAccess('/', user.role)) {
    return <Navigate to={defaultRouteFor(user.role)} replace />
  }

  if (!canAccess(location.pathname, user.role)) {
    return <Navigate to="/forbidden" replace />
  }

  return <Outlet />
}
