import { Section } from '@/components/ui/Section'
import { StatusBadge, type StatusKind } from '@/components/ui/StatusBadge'
import { UnicodeSparkline } from '@/components/ui/UnicodeSparkline'
import { useState } from 'react'
import { Prompt } from '@/components/ui/Prompt'
import {
  useDoAppInfo,
  useDoAppDeployments,
  useDoAppMetrics,
  useDoAppLogs,
  type DoAppDeployment,
} from '@/lib/infraQueries'
import { cn } from '@/lib/utils'

function phaseBadge(phase: string): { kind: StatusKind; label: string } {
  const p = phase.toUpperCase()
  if (p === 'ACTIVE') return { kind: 'ok', label: 'listo' }
  if (p === 'BUILDING') return { kind: 'info', label: 'compilando' }
  if (p === 'DEPLOYING') return { kind: 'info', label: 'desplegando' }
  if (p === 'PENDING_BUILD' || p === 'PENDING_DEPLOY') return { kind: 'muted', label: 'en cola' }
  if (p === 'ERROR') return { kind: 'crit', label: 'error' }
  if (p === 'CANCELED') return { kind: 'muted', label: 'cancelado' }
  if (p === 'SUPERSEDED') return { kind: 'muted', label: 'reemplazado' }
  return { kind: 'muted', label: p.toLowerCase() }
}

const PHASES_WITH_REAL_DURATION = new Set(['ACTIVE', 'ERROR', 'CANCELED'])

function relative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const h = Math.round(diff / (1000 * 60 * 60))
  if (h < 1) return `hace ${Math.round(diff / (1000 * 60))}m`
  if (h < 24) return `hace ${h}h`
  return `hace ${Math.round(h / 24)}d`
}

function durationOf(d: DoAppDeployment): string {
  // Para SUPERSEDED, updated_at es cuando lo reemplazaron, no el fin del build.
  // Solo mostramos duración cuando el estado la refleja realmente.
  if (!PHASES_WITH_REAL_DURATION.has(d.phase.toUpperCase())) return '—'
  const start = new Date(d.created_at).getTime()
  const end = new Date(d.updated_at).getTime()
  const s = Math.max(0, Math.round((end - start) / 1000))
  if (s < 60) return `${s}s`
  return `${Math.floor(s / 60)}m ${s % 60}s`
}

function colorForLine(raw: string): string {
  const r = raw.toUpperCase()
  if (r.includes('ERROR') || r.includes(' ERR ') || r.includes('EXCEPTION') || r.includes('ECONNREFUSED')) {
    return 'text-state-crit'
  }
  if (r.includes('WARN')) return 'text-state-warn'
  if (r.includes('[SOCKET]')) return 'text-state-info'
  if (raw.match(/\s(4\d\d|5\d\d)\s/)) return 'text-state-warn'
  if (raw.match(/\s(2\d\d|3\d\d)\s/)) return 'text-state-ok'
  return 'text-fg-secondary'
}

export default function Backend() {
  const appQ = useDoAppInfo()
  const depQ = useDoAppDeployments()
  const cpuQ = useDoAppMetrics('cpu_percentage')
  const memQ = useDoAppMetrics('memory_percentage')
  const logsQ = useDoAppLogs(300)
  const [logSearch, setLogSearch] = useState('')
  const configured = appQ.data?.configured
  const app = appQ.data?.app
  const deployments = depQ.data?.deployments ?? []
  const cpuSeries = cpuQ.data?.series?.[0]
  const memSeries = memQ.data?.series?.[0]
  const allLogs = logsQ.data?.lines ?? []
  const filteredLogs = logSearch
    ? allLogs.filter((l) => l.raw.toLowerCase().includes(logSearch.toLowerCase()))
    : allLogs

  return (
    <div className="flex flex-col gap-6 text-[13px]">
      <div className="flex items-center justify-between border-b border-border-subtle pb-4">
        <div className="flex items-center gap-3">
          <span className="text-fg-muted text-[11.5px]">servicio</span>
          <span className="text-fg-primary text-[15px]">backend.qeb</span>
          <span className="text-fg-faint">·</span>
          <span className="text-fg-muted text-[11.5px]">digitalocean apps</span>
          {app?.live_url && (
            <>
              <span className="text-fg-faint">·</span>
              <a
                href={app.live_url}
                target="_blank"
                rel="noreferrer"
                className="text-brand-400 hover:underline text-[11.5px]"
              >
                {new URL(app.live_url).host} ↗
              </a>
            </>
          )}
        </div>
        {configured ? (
          <StatusBadge status="ok" label="do api conectado" />
        ) : (
          <StatusBadge status="muted" label="sin token do" />
        )}
      </div>

      {!appQ.isLoading && configured === false && (
        <div className="rounded-md bg-bg-inset border border-brand-500/30 px-3 py-2 text-[12px] text-brand-300 font-mono">
          [pendiente] configura en Render → Environment: <span className="text-fg-primary">DO_API_TOKEN</span> y <span className="text-fg-primary">DO_APP_ID_QEB_BACK</span>. El token lo generas en <span className="text-fg-secondary">cloud.digitalocean.com → API → Tokens</span> (scope read).
        </div>
      )}

      {(appQ.isError || depQ.isError) && (
        <div className="rounded-md bg-state-critSoft border border-state-crit/30 px-3 py-2 text-[12px] text-state-crit font-mono">
          [api] {((appQ.error ?? depQ.error) as Error)?.message}
        </div>
      )}

      {/* Info del App */}
      {configured === true && app && (
        <Section title="app" subtitle="digitalocean apps · datos en vivo">
          <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-md bg-bg-card border border-border-subtle px-4 py-3">
              <div className="text-fg-faint text-[10.5px] uppercase tracking-wide">app</div>
              <div className="text-fg-primary mt-1">{app.spec.name}</div>
            </div>
            <div className="rounded-md bg-bg-card border border-border-subtle px-4 py-3">
              <div className="text-fg-faint text-[10.5px] uppercase tracking-wide">región</div>
              <div className="text-fg-primary mt-1">
                {app.region?.label ?? app.spec.region}
              </div>
            </div>
            {app.tier_slug && (
              <div className="rounded-md bg-bg-card border border-border-subtle px-4 py-3">
                <div className="text-fg-faint text-[10.5px] uppercase tracking-wide">tier</div>
                <div className="text-fg-primary mt-1">{app.tier_slug}</div>
              </div>
            )}
            {app.active_deployment && (
              <div className="rounded-md bg-bg-card border border-border-subtle px-4 py-3">
                <div className="text-fg-faint text-[10.5px] uppercase tracking-wide">
                  deploy activo
                </div>
                <div className="text-fg-primary mt-1 font-mono text-[12px]">
                  {app.active_deployment.id.slice(0, 8)} · {app.active_deployment.phase}
                </div>
              </div>
            )}
          </div>
        </Section>
      )}

      {/* Deploys */}
      <Section title="despliegues" subtitle="digitalocean apps api">
        <div className="mt-1">
          <div className="grid grid-cols-[16px_100px_120px_1fr_120px_120px] gap-3 px-2 py-1 text-[11px] text-fg-faint uppercase tracking-wide">
            <span></span>
            <span>estado</span>
            <span>id</span>
            <span>causa</span>
            <span className="text-right">duración</span>
            <span className="text-right">hace</span>
          </div>
          <div className="border-t border-border-subtle">
            {depQ.isLoading && (
              <div className="text-fg-muted text-center py-4 animate-pulse">cargando…</div>
            )}
            {!depQ.isLoading &&
              depQ.data?.configured === true &&
              deployments.map((d, i) => {
                const s = phaseBadge(d.phase)
                return (
                  <div
                    key={d.id}
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
                    <span className="text-fg-primary tabular-nums font-mono text-[12px]">
                      {d.id.slice(0, 8)}
                    </span>
                    <span className="text-fg-muted truncate text-[11.5px]">{d.cause}</span>
                    <span className="text-right text-fg-secondary tabular-nums">
                      {durationOf(d)}
                    </span>
                    <span className="text-right text-fg-muted tabular-nums text-[11.5px]">
                      {relative(d.created_at)}
                    </span>
                  </div>
                )
              })}
            {!depQ.isLoading &&
              (depQ.data?.configured === false || (depQ.data?.deployments?.length ?? 0) === 0) && (
                <div className="text-fg-muted text-center py-4">
                  {depQ.data?.configured === false
                    ? 'aparecerán cuando configures DO_API_TOKEN + DO_APP_ID_QEB_BACK'
                    : 'sin despliegues'}
                </div>
              )}
          </div>
        </div>
      </Section>

      {/* Métricas CPU y RAM del app */}
      <Section
        title="cpu / memoria del app"
        subtitle="digitalocean monitoring · última hora"
        right={
          <span className="text-fg-muted text-[11px]">
            {cpuSeries && `componente: ${cpuSeries.component}`}
          </span>
        }
      >
        {(cpuQ.isLoading || memQ.isLoading) && (
          <div className="text-fg-muted text-center py-3 animate-pulse">cargando…</div>
        )}
        {(cpuQ.data?.error || memQ.data?.error) && (
          <div className="text-state-crit font-mono text-[12px] py-2">
            [api] {cpuQ.data?.error ?? memQ.data?.error}
          </div>
        )}
        {cpuSeries && memSeries && (
          <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3">
            <MetricWithSpark
              label="CPU · última hora"
              latest={cpuSeries.latest}
              avg={cpuSeries.avg}
              peak={cpuSeries.peak}
              unit="%"
              points={cpuSeries.points.map((p) => p.value)}
              color="#9ECE6A"
            />
            <MetricWithSpark
              label="Memoria · última hora"
              latest={memSeries.latest}
              avg={memSeries.avg}
              peak={memSeries.peak}
              unit="%"
              points={memSeries.points.map((p) => p.value)}
              color="#7DCFFF"
            />
          </div>
        )}
      </Section>

      {/* Runtime Logs · datos reales de DO */}
      <Section
        title="runtime logs"
        subtitle="digitalocean apps · últimas ~300 líneas · auto-refresh 30s"
        right={
          <div className="flex items-center gap-2 text-[11px]">
            <input
              type="text"
              value={logSearch}
              onChange={(e) => setLogSearch(e.target.value)}
              placeholder="grep..."
              className="bg-bg-card border border-border-subtle rounded px-2 h-6 text-fg-secondary outline-none focus:border-brand-500/50 min-w-[160px]"
            />
            <span className="text-fg-muted tabular-nums">
              {filteredLogs.length}/{allLogs.length}
            </span>
            <button
              onClick={() => logsQ.refetch()}
              disabled={logsQ.isFetching}
              className="px-2 h-6 rounded border border-border-subtle text-fg-muted hover:text-fg-primary disabled:opacity-50"
            >
              {logsQ.isFetching ? '…' : 'actualizar'}
            </button>
          </div>
        }
      >
        <div className="mt-2 rounded-md bg-bg-inset border border-border-subtle px-3 py-2 font-mono text-[12px] max-h-[560px] overflow-auto">
          {logsQ.isLoading && (
            <div className="text-fg-muted text-center py-4 animate-pulse">cargando logs…</div>
          )}
          {logsQ.data?.error && (
            <div className="text-state-crit py-2">[api] {logsQ.data.error}</div>
          )}
          {!logsQ.isLoading &&
            filteredLogs.map((l, i) => (
              <div
                key={i}
                className="grid grid-cols-[160px_1fr] gap-3 py-0.5 px-1 -mx-1 rounded hover:bg-white/[0.02]"
              >
                <span className="text-fg-muted tabular-nums text-[11px] truncate">
                  {l.ts ? l.ts.replace('T', ' ').replace('Z', '').slice(0, 19) : '—'}
                </span>
                <span className={cn('whitespace-pre-wrap break-words', colorForLine(l.raw))}>
                  {l.raw}
                </span>
              </div>
            ))}
          {!logsQ.isLoading && filteredLogs.length === 0 && (
            <div className="text-fg-muted text-center py-3">
              {allLogs.length === 0 ? 'sin logs disponibles' : 'sin coincidencias'}
            </div>
          )}
          <div className="mt-2">
            <Prompt />
          </div>
        </div>
      </Section>
    </div>
  )
}

function MetricWithSpark({
  label,
  latest,
  avg,
  peak,
  unit,
  points,
  color,
}: {
  label: string
  latest: number | null
  avg: number | null
  peak: number | null
  unit: string
  points: number[]
  color: string
}) {
  const status =
    latest == null ? 'muted' : latest >= 80 ? 'crit' : latest >= 60 ? 'warn' : 'ok'
  const accentClass =
    status === 'crit' ? 'text-state-crit' :
    status === 'warn' ? 'text-state-warn' :
    'text-state-ok'
  return (
    <div className="rounded-md bg-bg-card border border-border-subtle px-4 py-3">
      <div className="text-fg-faint text-[10.5px] uppercase tracking-wide">{label}</div>
      <div className="flex items-baseline gap-3 mt-1">
        <span className={cn('tabular-nums text-[26px]', accentClass)}>
          {latest != null ? latest.toFixed(1) : '—'}
        </span>
        <span className="text-fg-muted text-[13px]">{unit}</span>
      </div>
      <div className="text-fg-muted text-[11px] mt-1 flex gap-3">
        <span>avg {avg != null ? avg.toFixed(1) : '—'}{unit}</span>
        <span>pico {peak != null ? peak.toFixed(1) : '—'}{unit}</span>
      </div>
      {points.length > 0 && (
        <div className="mt-2">
          <UnicodeSparkline data={points} color={color} className="text-[14px]" />
        </div>
      )}
    </div>
  )
}
