import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import Login from '@/pages/Login'
import Forbidden from '@/pages/Forbidden'
import Overview from '@/pages/Overview'
import Frontend from '@/pages/Frontend'
import Backend from '@/pages/Backend'
import Database from '@/pages/Database'
import Spaces from '@/pages/Spaces'
import Tickets from '@/pages/qeb/Tickets'
import Reservas from '@/pages/qeb/Reservas'
import Campanas from '@/pages/qeb/Campanas'
import Actividad from '@/pages/qeb/Actividad'
import Users from '@/pages/admin/Users'
import AuditLog from '@/pages/admin/AuditLog'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route index element={<Overview />} />
          <Route path="/frontend" element={<Frontend />} />
          <Route path="/backend" element={<Backend />} />
          <Route path="/database" element={<Database />} />
          <Route path="/spaces" element={<Spaces />} />

          <Route path="/qeb/tickets" element={<Tickets />} />
          <Route path="/qeb/reservas" element={<Reservas />} />
          <Route path="/qeb/campanas" element={<Campanas />} />
          <Route path="/qeb/actividad" element={<Actividad />} />

          <Route path="/admin/users" element={<Users />} />
          <Route path="/admin/audit-log" element={<AuditLog />} />

          <Route path="/forbidden" element={<Forbidden />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Route>
    </Routes>
  )
}
