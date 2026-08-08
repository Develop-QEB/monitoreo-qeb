import { useQuery } from '@tanstack/react-query'
import { Section } from '@/components/ui/Section'
import { StatusBadge, type StatusKind } from '@/components/ui/StatusBadge'
import { api } from '@/lib/api'
import { useAuth } from '@/stores/authStore'
import type { AuditEvent } from '@/types/api'
import { cn } from '@/lib/utils'

interface CampaniaStats {
  total: number
  vigentes: number
  aprobadas: number
  por_iniciar: number
  proximas_a_vencer: number
  sin_arte: number
}
interface TicketsStats {
  total: number
  nuevos: number
  en_proceso: number
  resueltos: number
  sin_respuesta: number
  area_ti: number
  area_qeb: number
  alta: number
}
interface ReservasStats {
  total: number
  activas: number
  eliminadas: number
  sin_archivo: number
  con_aps: number
  sin_aps: number
  instaladas: number
}
interface ActividadStats {
  total: number
  activos: number
  deleted: number
}

interface HealthResponse {
  ok: boolean
  service: string
  env: string
  uptimeSec: number
}

const ACTION_COLOR: Record<string, string> = {
  'auth.login':          'text-state-ok',
  'auth.login_fail':     'text-state-crit',
  'auth.logout':         'text-fg-muted',
  'user.create':         'text-brand-300',
  'user.update':         'text-brand-300',
  'user.delete':         'text-state-crit',
  'user.role_change':    'text-state-warn',
  'user.disable':        'text-state-warn',
  'user.enable':         'text-state-ok',
  'user.password_reset': 'text-state-info',
}

function n(v: number | string | undefined) {
  const num = typeof v === 'string' ? parseInt(v, 10) : v
  if (num === undefined || Number.isNaN(num)) return '—'
  return num.toLocaleString('es-MX')
}

function formatTs(ts: string) {
  return ts.replace('T', ' ').replace('Z', '').slice(0, 19)
}

export default function Overview() {
  const user = useAuth((s) => s.user)
  const isMejora = user?.role === 'mejora-continua'

  const campQ = useQuery({
    queryKey: ['qeb', 'campania', 'stats'],
    queryFn: () => api.get<{ stats: CampaniaStats }>('/qeb/campania/stats').then((r) => r.stats),
    staleTime: 60_000,
  })
  const ticketsQ = useQuery({
    queryKey: ['qeb', 'tickets', 'stats'],
    queryFn: () => api.get<{ stats: TicketsStats }>('/qeb/tickets/stats').then((r) => r.stats),
    staleTime: 60_000,
  })
  const reservasQ = useQuery({
    queryKey: ['qeb', 'reservas', 'stats'],
    queryFn: () => api.get<{ stats: ReservasStats }>('/qeb/reservas/stats').then((r) => r.stats),
    staleTime: 60_000,
  })
  const actividadQ = useQuery({
    queryKey: ['qeb', 'actividad', 'stats'],
    queryFn: () => api.get<{ stats: ActividadStats }>('/qeb/actividad/stats').then((r) => r.stats),
    staleTime: 60_000,
  })
  const healthQ = useQuery({
    queryKey: ['monitor', 'health'],
    queryFn: () => api.get<HealthResponse>('/../health'), // /health está fuera de /api
    staleTime: 30_000,
    refetchInterval: 30_000,
  })
  const auditQ = useQuery({
    queryKey: ['audit', { limit: 6 }],
    queryFn: () =>
      api.get<{ events: AuditEvent[] }>('/audit?limit=6').then((r) => r.events),
    staleTime: 15_000,
    enabled: user?.role === 'admin',
  })

  const anyLoading = campQ.isLoading || ticketsQ.isLoading || reservasQ.isLoading || actividadQ.isLoading
  const anyError = campQ.isError || ticketsQ.isError || reservasQ.isError || actividadQ.isError
  const backOk = healthQ.data?.ok === true

  const bannerStatus: StatusKind = anyError ? 'crit' : backOk ? 'ok' : 'muted'
  const bannerLabel = anyLoading
    ? 'cargando…'
    : anyError
      ? 'error contra api'
      : backOk
        ? 'monitor operativo'
        : 'monitor sin health'

  return (
    <div className="flex flex-col gap-6 text-[13px]">
      {/* Banner */}
      <div className="flex items-center justify-between border-b border-border-subtle pb-4">
        <div className="flex items-baseline gap-3">
          <span className="text-fg-muted text-[11.5px]">bienvenido</span>
          <span className="text-fg-primary text-[16px] font-medium">{user?.name ?? ''}</span>
          <span className="text-fg-faint">·</span>
          <span className="text-brand-300 text-[11.5px]">{user?.role}</span>
        </div>
        <StatusBadge status={bannerStatus} label={bannerLabel} />
      </div>

      {/* KPIs de negocio · datos reales */}
      <Section title="negocio en vivo" subtitle="datos leidos de qeb-mysql-prod">
        <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiTile
            label="tickets abiertos"
            value={
              ticketsQ.data
                ? String(Number(ticketsQ.data.nuevos) + Number(ticketsQ.data.en_proceso))
                : undefined
            }
            note={
              ticketsQ.data
                ? `${ticketsQ.data.sin_respuesta} sin respuesta · ${ticketsQ.data.alta} alta`
                : ''
            }
            loading={ticketsQ.isLoading}
            accent={
              ticketsQ.data && Number(ticketsQ.data.sin_respuesta) > 0
                ? 'text-state-warn'
                : 'text-fg-primary'
            }
          />
          <KpiTile
            label="campañas vigentes"
            value={campQ.data ? String(campQ.data.vigentes) : undefined}
            note={campQ.data ? `${campQ.data.sin_arte} sin arte hoy` : ''}
            loading={campQ.isLoading}
            accent={
              campQ.data && Number(campQ.data.sin_arte) > 0
                ? 'text-state-warn'
                : 'text-state-ok'
            }
          />
          <KpiTile
            label="reservas activas"
            value={reservasQ.data ? n(reservasQ.data.activas) : undefined}
            note={reservasQ.data ? `${n(reservasQ.data.sin_archivo)} sin arte cargado` : ''}
            loading={reservasQ.isLoading}
            accent="text-fg-primary"
          />
          <KpiTile
            label="usuarios activos qeb"
            value={actividadQ.data ? String(actividadQ.data.activos) : undefined}
            note={actividadQ.data ? `${actividadQ.data.total} totales` : ''}
            loading={actividadQ.isLoading}
            accent="text-state-info"
          />
        </div>
      </Section>

      {/* Infra — solo para admin y ti */}
      {!isMejora && (
        <Section
          title="infra"
          subtitle="componentes monitoreados · deploys, cpu, latencia · pendiente cablear API tokens"
        >
          <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { name: 'frontend', tag: 'vercel', to: '/frontend' },
              { name: 'backend',  tag: 'digitalocean apps · qeb-back', to: '/backend' },
              { name: 'database', tag: 'mysql · qeb-mysql-prod', to: '/database' },
            ].map((s) => (
              <a
                key={s.name}
                href={s.to}
                className="rounded-md bg-bg-card border border-border-subtle px-4 py-3 hover:border-brand-500/40 transition-colors"
              >
                <div className="flex items-baseline justify-between mb-1">
                  <span className="text-fg-primary">{s.name}</span>
                  <span className="text-fg-faint text-[10.5px]">↗</span>
                </div>
                <span className="text-fg-muted text-[11.5px]">{s.tag}</span>
              </a>
            ))}
          </div>
        </Section>
      )}

      {/* Actividad admin — solo admin ve la bitácora */}
      {user?.role === 'admin' && (
        <Section title="bitácora reciente" subtitle="últimos 6 eventos del monitor">
          <div className="mt-2 rounded-md bg-bg-inset border border-border-subtle px-3 py-2 font-mono text-[12.5px]">
            {auditQ.isLoading && (
              <div className="text-fg-muted text-center py-3 animate-pulse">cargando…</div>
            )}
            {auditQ.data?.map((e) => (
              <div
                key={e.id}
                className="grid grid-cols-[160px_180px_180px_1fr] gap-3 py-0.5 hover:bg-white/[0.02] px-1 -mx-1 rounded"
              >
                <span className="text-fg-muted tabular-nums text-[11.5px]">
                  {formatTs(e.ts)}
                </span>
                <span className="text-brand-300 truncate">{e.actor}</span>
                <span className={cn('font-medium', ACTION_COLOR[e.action] ?? 'text-fg-secondary')}>
                  {e.action}
                </span>
                <span className="text-fg-primary truncate">{e.target ?? '—'}</span>
              </div>
            ))}
            {auditQ.data && auditQ.data.length === 0 && (
              <div className="text-fg-muted text-center py-3">sin eventos</div>
            )}
          </div>
        </Section>
      )}
    </div>
  )
}

function KpiTile({
  label,
  value,
  note,
  loading,
  accent,
}: {
  label: string
  value?: string
  note?: string
  loading?: boolean
  accent?: string
}) {
  return (
    <div className="rounded-md bg-bg-card border border-border-subtle px-4 py-3">
      <div className="text-fg-faint text-[10.5px] uppercase tracking-wide">{label}</div>
      <div className={cn('tabular-nums text-[24px] mt-1', accent ?? 'text-fg-primary')}>
        {loading ? '…' : (value ?? '—')}
      </div>
      {note && <div className="text-fg-muted text-[11px] mt-0.5">{note}</div>}
    </div>
  )
}
