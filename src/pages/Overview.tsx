import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Section } from '@/components/ui/Section'
import { StatusBadge, type StatusKind } from '@/components/ui/StatusBadge'
import { LiveBadge } from '@/components/ui/LiveBadge'
import { api } from '@/lib/api'
import { useAuth } from '@/stores/authStore'
import {
  useRecentErrors,
  useVercelDeployments,
  useDoAppInfo,
  useDoDbCluster,
  useSpacesSummary,
  useVpsStatus,
} from '@/lib/infraQueries'
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

function relative(iso: string | number | null | undefined): string {
  if (iso == null) return '—'
  const t = typeof iso === 'number' ? iso : new Date(iso).getTime()
  if (!Number.isFinite(t)) return '—'
  const diff = Date.now() - t
  const s = Math.max(0, Math.round(diff / 1000))
  if (s < 60) return `hace ${s}s`
  const m = Math.round(s / 60)
  if (m < 60) return `hace ${m}m`
  const h = Math.round(m / 60)
  if (h < 48) return `hace ${h}h`
  return `hace ${Math.round(h / 24)}d`
}

export default function Overview() {
  const user = useAuth((s) => s.user)
  const navigate = useNavigate()
  const isMejora = user?.role === 'mejora-continua'
  const errorsQ = useRecentErrors(15)

  const campQ = useQuery({
    queryKey: ['qeb', 'campania', 'stats'],
    queryFn: () => api.get<{ stats: CampaniaStats }>('/qeb/campania/stats').then((r) => r.stats),
    staleTime: 30_000,
    refetchInterval: 30_000,
  })
  const ticketsQ = useQuery({
    queryKey: ['qeb', 'tickets', 'stats'],
    queryFn: () => api.get<{ stats: TicketsStats }>('/qeb/tickets/stats').then((r) => r.stats),
    staleTime: 30_000,
    refetchInterval: 30_000,
  })
  const reservasQ = useQuery({
    queryKey: ['qeb', 'reservas', 'stats'],
    queryFn: () => api.get<{ stats: ReservasStats }>('/qeb/reservas/stats').then((r) => r.stats),
    staleTime: 30_000,
    refetchInterval: 30_000,
  })
  const actividadQ = useQuery({
    queryKey: ['qeb', 'actividad', 'stats'],
    queryFn: () => api.get<{ stats: ActividadStats }>('/qeb/actividad/stats').then((r) => r.stats),
    staleTime: 30_000,
    refetchInterval: 30_000,
  })
  const healthQ = useQuery({
    queryKey: ['monitor', 'health'],
    queryFn: () => api.get<HealthResponse>('/../health'), // /health está fuera de /api
    staleTime: 15_000,
    refetchInterval: 15_000,
  })
  const auditQ = useQuery({
    queryKey: ['audit', { limit: 6 }],
    queryFn: () =>
      api.get<{ events: AuditEvent[] }>('/audit?limit=6').then((r) => r.events),
    staleTime: 30_000,
    refetchInterval: 30_000,
    enabled: user?.role === 'admin',
  })

  // Estado de cada componente de infra · queries reales al back.
  // Todas se cargan aunque el usuario sea 'mejora-continua'; el bloque se oculta abajo.
  const vercelQ = useVercelDeployments()
  const doAppQ = useDoAppInfo()
  const doDbQ = useDoDbCluster()
  const spacesQ = useSpacesSummary()
  const vpsQ = useVpsStatus()

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
        <div className="flex items-center gap-3">
          <LiveBadge
            intervalSec={30}
            fetching={
              campQ.isFetching ||
              ticketsQ.isFetching ||
              reservasQ.isFetching ||
              actividadQ.isFetching ||
              vercelQ.isFetching ||
              doAppQ.isFetching ||
              doDbQ.isFetching ||
              spacesQ.isFetching ||
              vpsQ.isFetching
            }
          />
          <StatusBadge status={bannerStatus} label={bannerLabel} />
        </div>
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
        <Section title="infra" subtitle="estado en vivo · click para detalle">
          <div className="mt-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <InfraTile
              name="frontend"
              tag="vercel"
              to="/frontend"
              loading={vercelQ.isLoading}
              {...frontendTileProps(vercelQ.data)}
            />
            <InfraTile
              name="backend"
              tag="DO app · qeb-back"
              to="/backend"
              loading={doAppQ.isLoading}
              {...backendTileProps(doAppQ.data)}
            />
            <InfraTile
              name="database"
              tag="mysql · qeb-mysql-prod"
              to="/database"
              loading={doDbQ.isLoading}
              {...databaseTileProps(doDbQ.data)}
            />
            <InfraTile
              name="spaces"
              tag={spacesQ.data?.bucket ?? 'qeb-media-main'}
              to="/spaces"
              loading={spacesQ.isLoading}
              {...spacesTileProps(spacesQ.data)}
            />
            <InfraTile
              name="vps"
              tag="agente ship-logs"
              to="/vps"
              loading={vpsQ.isLoading}
              {...vpsTileProps(vpsQ.data)}
            />
          </div>
        </Section>
      )}

      {/* Errores recientes — solo admin/ti (mejora-continua no ve infra) */}
      {!isMejora && errorsQ.data && errorsQ.data.count > 0 && (
        <Section
          title="errores recientes del back"
          subtitle="últimos 15 min · monitor_logs"
          right={
            <StatusBadge
              status={errorsQ.data.count >= 10 ? 'crit' : 'warn'}
              label={`${errorsQ.data.count} ERROR`}
            />
          }
        >
          <div className="mt-2 rounded-md bg-bg-inset border border-border-subtle px-3 py-2 font-mono text-[12.5px]">
            {errorsQ.data.lines.slice(-5).map((e) => (
              <div
                key={e.id}
                onClick={() => navigate('/backend')}
                className="grid grid-cols-[160px_1fr_60px] gap-3 py-0.5 px-1 -mx-1 rounded cursor-pointer hover:bg-white/[0.02]"
              >
                <span className="text-fg-muted tabular-nums text-[11px]">
                  {e.ts.replace('T', ' ').replace('Z', '').slice(0, 19)}
                </span>
                <span className="text-state-crit truncate">{e.msg}</span>
                <span className="text-fg-faint text-[11px] text-right">[ver →]</span>
              </div>
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

function InfraTile({
  name,
  tag,
  to,
  status,
  statusLabel,
  note,
  loading,
}: {
  name: string
  tag: string
  to: string
  status: StatusKind
  statusLabel: string
  note?: string
  loading?: boolean
}) {
  return (
    <a
      href={to}
      className="rounded-md bg-bg-card border border-border-subtle px-4 py-3 hover:border-brand-500/40 transition-colors block"
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-fg-primary">{name}</span>
        {loading ? (
          <span className="text-fg-muted text-[11px] animate-pulse">…</span>
        ) : (
          <StatusBadge status={status} label={statusLabel} />
        )}
      </div>
      <div className="text-fg-muted text-[11.5px]">{tag}</div>
      {note && <div className="text-fg-secondary text-[11.5px] mt-1 tabular-nums">{note}</div>}
    </a>
  )
}

// ------- Mapping de cada respuesta del back a (status, label, note) -------
// Reglas de estado por componente. El "note" es la métrica que resume la salud.

type TileProps = { status: StatusKind; statusLabel: string; note?: string }

function unconfigured(reason?: string): TileProps {
  return { status: 'muted', statusLabel: 'sin configurar', note: reason }
}

function frontendTileProps(d: unknown): TileProps {
  const r = d as {
    configured: boolean
    reason?: string
    deployments?: { state: string; ready?: number; createdAt: number }[]
  } | undefined
  if (!r) return { status: 'muted', statusLabel: '—' }
  if (!r.configured) return unconfigured(r.reason)
  const last = r.deployments?.[0]
  if (!last) return { status: 'muted', statusLabel: 'sin deploys' }
  const s = last.state.toUpperCase()
  const status: StatusKind =
    s === 'READY' ? 'ok' : s === 'ERROR' || s === 'CANCELED' ? 'crit' : 'warn'
  const when = last.ready ?? last.createdAt
  return { status, statusLabel: s, note: `último deploy ${relative(when)}` }
}

function backendTileProps(d: unknown): TileProps {
  const r = d as {
    configured: boolean
    reason?: string
    app?: {
      spec?: { name?: string }
      active_deployment?: { phase: string; updated_at: string }
      in_progress_deployment?: { phase: string }
    }
  } | undefined
  if (!r) return { status: 'muted', statusLabel: '—' }
  if (!r.configured) return unconfigured(r.reason)
  const inProg = r.app?.in_progress_deployment
  if (inProg) return { status: 'warn', statusLabel: inProg.phase, note: 'deploy en curso' }
  const act = r.app?.active_deployment
  if (!act) return { status: 'muted', statusLabel: 'sin deploy activo' }
  const s = act.phase.toUpperCase()
  const status: StatusKind = s === 'ACTIVE' ? 'ok' : s === 'ERROR' ? 'crit' : 'warn'
  return { status, statusLabel: s, note: `activo desde ${relative(act.updated_at)}` }
}

function databaseTileProps(d: unknown): TileProps {
  const r = d as {
    configured: boolean
    reason?: string
    cluster?: { status: string; engine: string; version: string; size?: string; num_nodes?: number }
  } | undefined
  if (!r) return { status: 'muted', statusLabel: '—' }
  if (!r.configured) return unconfigured(r.reason)
  const c = r.cluster
  if (!c) return { status: 'muted', statusLabel: 'sin datos' }
  const s = c.status.toLowerCase()
  const status: StatusKind = s === 'online' ? 'ok' : s === 'creating' || s === 'migrating' ? 'warn' : 'crit'
  const nodes = c.num_nodes ? `${c.num_nodes} nodo${c.num_nodes === 1 ? '' : 's'}` : ''
  return {
    status,
    statusLabel: s,
    note: [c.engine, c.version, nodes].filter(Boolean).join(' · '),
  }
}

function spacesTileProps(d: unknown): TileProps {
  const r = d as {
    configured: boolean
    reason?: string
    totalObjects?: number
    totalGiB?: number
  } | undefined
  if (!r) return { status: 'muted', statusLabel: '—' }
  if (!r.configured) return unconfigured(r.reason)
  const objs = r.totalObjects ?? 0
  const gib = r.totalGiB ?? 0
  return {
    status: 'ok',
    statusLabel: 'ok',
    note: `${objs.toLocaleString('es-MX')} obj · ${gib.toFixed(2)} GiB`,
  }
}

function vpsTileProps(d: unknown): TileProps {
  const r = d as { configured: boolean; connected: boolean; lastLineAt: string | null } | undefined
  if (!r) return { status: 'muted', statusLabel: '—' }
  if (!r.configured) return unconfigured('VPS_LOG_SECRET no seteado')
  if (r.connected) {
    return { status: 'ok', statusLabel: 'connected', note: `último log ${relative(r.lastLineAt)}` }
  }
  return {
    status: 'warn',
    statusLabel: 'sin agente',
    note: r.lastLineAt ? `último log ${relative(r.lastLineAt)}` : 'nunca ha empujado',
  }
}
