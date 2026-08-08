import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/stores/authStore'
import { ROLE_LABEL } from '@/lib/roles'
import { useRecentErrors } from '@/lib/infraQueries'
import { cn } from '@/lib/utils'

const CRUMB: Record<string, string> = {
  '/':                'resumen',
  '/frontend':        'frontend',
  '/backend':         'backend',
  '/database':        'database',
  '/qeb/tickets':     'qeb/tickets',
  '/qeb/reservas':    'qeb/reservas',
  '/qeb/campanas':    'qeb/campanas',
  '/qeb/actividad':   'qeb/actividad',
  '/admin/users':     'admin/usuarios',
  '/admin/audit-log': 'admin/bitacora',
  '/forbidden':       'acceso denegado',
}

function formatTime(d: Date) {
  return d.toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

function AlertBadge() {
  const q = useRecentErrors(15)
  const navigate = useNavigate()
  const count = q.data?.count ?? 0
  if (q.isLoading || count === 0) return null
  const kind: 'warn' | 'crit' = count >= 10 ? 'crit' : 'warn'
  return (
    <button
      onClick={() => navigate('/backend')}
      title={`${count} errores en los últimos 15 min · click para ir a /backend`}
      className={cn(
        'flex items-center gap-1.5 text-[11.5px] px-2 h-6 rounded border transition-colors',
        kind === 'crit'
          ? 'border-state-crit/40 bg-state-crit/10 text-state-crit hover:bg-state-crit/20'
          : 'border-state-warn/40 bg-state-warn/10 text-state-warn hover:bg-state-warn/20',
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
      <span className="tabular-nums">{count} err/15m</span>
    </button>
  )
}

export function Header() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const user = useAuth((s) => s.user)
  const logout = useAuth((s) => s.logout)
  const crumb = CRUMB[pathname] ?? 'resumen'

  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="h-11 shrink-0 border-b border-border-subtle bg-bg-base/85 backdrop-blur-md sticky top-0 z-10">
      <div className="h-full px-6 flex items-center gap-6 text-[12px] text-fg-secondary max-w-[1600px] w-full mx-auto">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-fg-muted">monitoreo-qeb</span>
          <span className="text-fg-faint">/</span>
          <span className="text-fg-muted">main</span>
          <span className="text-fg-faint">/</span>
          <span className="text-fg-primary">{crumb}</span>
        </div>

        <div className="ml-auto flex items-center gap-5">
          {user && (user.role === 'admin' || user.role === 'ti') && <AlertBadge />}
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-state-ok/50 animate-ping" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-state-ok" />
            </span>
            <span className="text-fg-secondary">en vivo</span>
          </div>
          <span className="text-fg-muted tabular-nums glyph">{formatTime(now)}</span>

          {user && (
            <div className="flex items-center gap-3 pl-5 border-l border-border-subtle">
              <div className="flex flex-col items-end leading-tight">
                <span className="text-fg-primary text-[12px]">{user.email}</span>
                <span className="text-brand-300 text-[10.5px]">
                  {ROLE_LABEL[user.role]}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="h-7 px-2.5 rounded border border-border-subtle hover:border-state-crit/60 text-fg-muted hover:text-state-crit text-[11px] transition-colors"
              >
                salir
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
