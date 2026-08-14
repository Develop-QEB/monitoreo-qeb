import { Section } from '@/components/ui/Section'
import { StatusBadge, type StatusKind } from '@/components/ui/StatusBadge'
import { LiveBadge } from '@/components/ui/LiveBadge'
import {
  useVercelDeployments,
  useUptimeSummary,
  useUptimeSeries,
  type VercelDeployment,
} from '@/lib/infraQueries'
import { cn } from '@/lib/utils'

// Mapea el state de Vercel a nuestros colores
function stateBadge(state: string): { kind: StatusKind; label: string } {
  const s = state.toUpperCase()
  if (s === 'READY') return { kind: 'ok', label: 'listo' }
  if (s === 'BUILDING' || s === 'INITIALIZING') return { kind: 'info', label: 'compilando' }
  if (s === 'QUEUED') return { kind: 'muted', label: 'en cola' }
  if (s === 'ERROR' || s === 'FAILED') return { kind: 'crit', label: 'error' }
  if (s === 'CANCELED') return { kind: 'muted', label: 'cancelado' }
  return { kind: 'muted', label: s.toLowerCase() }
}

function relative(from: number): string {
  const diff = Date.now() - from
  const h = Math.round(diff / (1000 * 60 * 60))
  if (h < 1) return `hace ${Math.round(diff / (1000 * 60))}m`
  if (h < 24) return `hace ${h}h`
  return `hace ${Math.round(h / 24)}d`
}

function duration(d: VercelDeployment): string {
  if (d.buildingAt && d.ready) {
    const s = Math.round((d.ready - d.buildingAt) / 1000)
    if (s < 60) return `${s}s`
    return `${Math.floor(s / 60)}m ${s % 60}s`
  }
  return '—'
}

export default function Frontend() {
  const depQ = useVercelDeployments()
  const upQ = useUptimeSummary(24)
  const seriesQ = useUptimeSeries('front-qeb', 24)
  const configured = depQ.data?.configured
  const deployments = depQ.data?.deployments ?? []
  const frontUptime = upQ.data?.targets.find((t) => t.key === 'front-qeb')

  return (
    <div className="flex flex-col gap-6 text-[13px]">
      <div className="flex items-center justify-between border-b border-border-subtle pb-4">
        <div className="flex items-center gap-3">
          <span className="text-fg-muted text-[11.5px]">servicio</span>
          <span className="text-fg-primary text-[15px]">frontend.qeb</span>
          <span className="text-fg-faint">·</span>
          <span className="text-fg-muted text-[11.5px]">vercel · main</span>
        </div>
        <div className="flex items-center gap-3">
          <LiveBadge
            intervalSec={30}
            fetching={depQ.isFetching || upQ.isFetching || seriesQ.isFetching}
          />
          {configured ? (
            <StatusBadge status="ok" label="vercel conectado" />
          ) : (
            <StatusBadge status="muted" label="sin token vercel" />
          )}
        </div>
      </div>

      {!depQ.isLoading && configured === false && (
        <div className="rounded-md bg-bg-inset border border-brand-500/30 px-3 py-2 text-[12px] text-brand-300 font-mono">
          [pendiente] configura en Render → Environment: <span className="text-fg-primary">VERCEL_TOKEN</span> y <span className="text-fg-primary">VERCEL_PROJECT_ID</span>. El token lo generas en <span className="text-fg-secondary">vercel.com/account/tokens</span> (scope read).
        </div>
      )}

      {depQ.isError && (
        <div className="rounded-md bg-state-critSoft border border-state-crit/30 px-3 py-2 text-[12px] text-state-crit font-mono">
          [api] {(depQ.error as Error).message}
        </div>
      )}

      {/* Deploys */}
      <Section title="despliegues" subtitle="datos reales de vercel api">
        <div className="mt-1">
          <div className="grid grid-cols-[16px_100px_120px_1fr_120px_120px] gap-3 px-2 py-1 text-[11px] text-fg-faint uppercase tracking-wide">
            <span></span>
            <span>estado</span>
            <span>hash</span>
            <span>por</span>
            <span className="text-right">duración</span>
            <span className="text-right">hace</span>
          </div>
          <div className="border-t border-border-subtle">
            {depQ.isLoading && (
              <div className="text-fg-muted text-center py-4 animate-pulse">cargando…</div>
            )}
            {!depQ.isLoading &&
              configured === true &&
              deployments.map((d, i) => {
                const s = stateBadge(d.state)
                const hash = d.meta?.githubCommitSha?.slice(0, 7) ?? d.uid.slice(0, 7)
                return (
                  <div
                    key={d.uid}
                    className={cn(
                      'grid grid-cols-[16px_100px_120px_1fr_120px_120px] gap-3 px-2 py-1.5 items-center hover:bg-white/[0.02] transition-colors',
                      i !== 0 && 'border-t border-border-subtle',
                    )}
                  >
                    <span
                      className={cn(
                        'h-1.5 w-1.5 rounded-full',
                        s.kind === 'ok' ? 'bg-state-ok' :
                        s.kind === 'crit' ? 'bg-state-crit' :
                        s.kind === 'info' ? 'bg-state-info' :
                        'bg-fg-muted',
                      )}
                    />
                    <StatusBadge status={s.kind} label={s.label} />
                    <span className="text-fg-primary tabular-nums font-mono text-[12px]">#{hash}</span>
                    <span className="text-fg-muted truncate">
                      <span className="text-fg-faint">rama </span>
                      {d.meta?.githubCommitRef ?? d.target ?? '?'}
                      <span className="text-fg-faint"> · por </span>
                      {d.creator?.username ?? '?'}
                    </span>
                    <span className="text-right text-fg-secondary tabular-nums">
                      {duration(d)}
                    </span>
                    <span className="text-right text-fg-muted tabular-nums text-[11.5px]">
                      {relative(d.createdAt)}
                    </span>
                  </div>
                )
              })}
            {!depQ.isLoading && configured === true && deployments.length === 0 && (
              <div className="text-fg-muted text-center py-4">
                sin despliegues (¿project id correcto?)
              </div>
            )}
            {!depQ.isLoading && configured === false && (
              <div className="text-fg-muted text-center py-4">
                despliegues aparecerán cuando configures VERCEL_TOKEN
              </div>
            )}
          </div>
        </div>
      </Section>

      {/* Uptime & response — pings propios cada 60s desde el back del monitor */}
      <Section
        title="uptime & tiempo de respuesta"
        subtitle="pings cada 60s desde el back del monitor · últimas 24h"
      >
        <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatTile
            label="uptime 24h"
            value={frontUptime ? `${frontUptime.uptimePct.toFixed(2)}%` : undefined}
            note={frontUptime ? `${frontUptime.okCount}/${frontUptime.count} pings ok` : ''}
            loading={upQ.isLoading}
            accent={
              !frontUptime
                ? 'text-fg-primary'
                : frontUptime.uptimePct >= 99.5
                  ? 'text-state-ok'
                  : frontUptime.uptimePct >= 95
                    ? 'text-state-warn'
                    : 'text-state-crit'
            }
          />
          <StatTile
            label="respuesta prom."
            value={frontUptime?.avgMs != null ? `${frontUptime.avgMs} ms` : undefined}
            note="get contra el front prod"
            loading={upQ.isLoading}
          />
          <StatTile
            label="p95"
            value={frontUptime?.p95Ms != null ? `${frontUptime.p95Ms} ms` : undefined}
            note="95% de pings bajo este ms"
            loading={upQ.isLoading}
          />
          <StatTile
            label="último ping"
            value={
              frontUptime?.lastPingAt
                ? relative(new Date(frontUptime.lastPingAt).getTime())
                : undefined
            }
            note={
              frontUptime?.lastOk === false
                ? 'último falló'
                : frontUptime?.lastStatus != null
                  ? `HTTP ${frontUptime.lastStatus}`
                  : ''
            }
            loading={upQ.isLoading}
            accent={frontUptime?.lastOk === false ? 'text-state-crit' : undefined}
          />
        </div>

        <div className="mt-4">
          <UptimeSparkline
            points={seriesQ.data?.points ?? []}
            loading={seriesQ.isLoading}
          />
          <div className="mt-1 flex items-center justify-between text-[10.5px] text-fg-faint tabular-nums">
            <span>hace 24h</span>
            <span>{seriesQ.data?.points.length ?? 0} pings</span>
            <span>ahora</span>
          </div>
        </div>
      </Section>
    </div>
  )
}

function StatTile({
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
      <div className={cn('tabular-nums text-[20px] mt-1', accent ?? 'text-fg-primary')}>
        {loading ? '…' : (value ?? '—')}
      </div>
      {note && <div className="text-fg-muted text-[11px] mt-0.5">{note}</div>}
    </div>
  )
}

// Sparkline barras: ancho de cada barra proporcional al tiempo, alto proporcional
// al responseMs. Barra roja si el ping fallo. Visualmente denso pero simple.
function UptimeSparkline({
  points,
  loading,
}: {
  points: { ts: string; ok: boolean; responseMs: number }[]
  loading?: boolean
}) {
  if (loading) {
    return <div className="h-16 rounded bg-bg-inset animate-pulse" />
  }
  if (points.length === 0) {
    return (
      <div className="h-16 rounded bg-bg-inset border border-border-subtle flex items-center justify-center text-fg-muted text-[11.5px]">
        aún no hay pings (espera 1-2 min tras arrancar el back)
      </div>
    )
  }
  const okMs = points.filter((p) => p.ok).map((p) => p.responseMs)
  const maxMs = Math.max(200, ...okMs)
  return (
    <div className="h-16 rounded bg-bg-inset border border-border-subtle flex items-end gap-[1px] px-1 py-1">
      {points.map((p, i) => {
        const h = p.ok ? Math.max(4, Math.round((p.responseMs / maxMs) * 100)) : 100
        const color = p.ok
          ? p.responseMs > 1500
            ? 'bg-state-warn'
            : 'bg-state-ok'
          : 'bg-state-crit'
        return (
          <div
            key={i}
            className={cn('flex-1 min-w-[2px] rounded-sm', color)}
            style={{ height: `${h}%` }}
            title={`${p.ts} · ${p.responseMs}ms${p.ok ? '' : ' · FALLO'}`}
          />
        )
      })}
    </div>
  )
}
