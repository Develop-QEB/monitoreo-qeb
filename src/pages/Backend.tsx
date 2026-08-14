import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Section } from '@/components/ui/Section'
import { StatusBadge, type StatusKind } from '@/components/ui/StatusBadge'
import { LiveBadge } from '@/components/ui/LiveBadge'
import { UnicodeSparkline } from '@/components/ui/UnicodeSparkline'
import { Prompt } from '@/components/ui/Prompt'
import { useAuth } from '@/stores/authStore'
import {
  useDoAppInfo,
  useDoAppDeployments,
  useDoAppMetrics,
  useDbLogs,
  useDbLogsStats,
  useLogContext,
  useCaptureStatus,
  useUptimeSummary,
  useUptimeSeries,
  useMetricsHistory,
  type DoAppDeployment,
  type DbLogLine,
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
  if (!PHASES_WITH_REAL_DURATION.has(d.phase.toUpperCase())) return '—'
  const start = new Date(d.created_at).getTime()
  const end = new Date(d.updated_at).getTime()
  const s = Math.max(0, Math.round((end - start) / 1000))
  if (s < 60) return `${s}s`
  return `${Math.floor(s / 60)}m ${s % 60}s`
}

function colorForLevel(level: string): string {
  const l = level.toUpperCase()
  if (l === 'ERROR') return 'text-state-crit'
  if (l === 'WARN') return 'text-state-warn'
  if (l === 'DEBUG') return 'text-fg-faint'
  return 'text-fg-muted'
}

function fmtTs(iso: string) {
  return iso.replace('T', ' ').replace('Z', '').slice(0, 19)
}

function isoDay(d: Date) {
  // Fecha LOCAL (no UTC) en formato YYYY-MM-DD para el date picker.
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const LEVELS = ['todos', 'ERROR', 'WARN', 'INFO', 'DEBUG'] as const
type LevelFilter = (typeof LEVELS)[number]

export default function Backend() {
  const appQ = useDoAppInfo()
  const depQ = useDoAppDeployments()
  const cpuQ = useDoAppMetrics('cpu_percentage')
  const memQ = useDoAppMetrics('memory_percentage')
  const upQ = useUptimeSummary(24)
  const seriesQ = useUptimeSeries('back-qeb', 24)
  const configured = appQ.data?.configured
  const app = appQ.data?.app
  const plan = appQ.data?.plan
  const deployments = depQ.data?.deployments ?? []
  const cpuSeries = cpuQ.data?.series?.[0]
  const memSeries = memQ.data?.series?.[0]
  const backUptime = upQ.data?.targets.find((t) => t.key === 'back-qeb')

  return (
    <div className="flex flex-col gap-6 text-[13px]">
      <div className="flex items-center justify-between border-b border-border-subtle pb-4">
        <div className="flex items-center gap-3">
          <span className="text-fg-muted text-[11.5px]">servicio</span>
          <span className="text-fg-primary text-[15px]">backend qeb</span>
          <span className="text-fg-faint">·</span>
          <span className="text-fg-muted text-[11.5px]">digitalocean apps</span>
        </div>
        <div className="flex items-center gap-3">
          <LiveBadge
            intervalSec={30}
            fetching={
              appQ.isFetching ||
              depQ.isFetching ||
              cpuQ.isFetching ||
              memQ.isFetching ||
              upQ.isFetching
            }
          />
          {configured ? (
            <StatusBadge status="ok" label="do api conectado" />
          ) : (
            <StatusBadge status="muted" label="sin token do" />
          )}
        </div>
      </div>

      {!appQ.isLoading && configured === false && (
        <div className="rounded-md bg-bg-inset border border-brand-500/30 px-3 py-2 text-[12px] text-brand-300 font-mono">
          [pendiente] configura en Render → Environment: <span className="text-fg-primary">DO_API_TOKEN</span> y <span className="text-fg-primary">DO_APP_ID_QEB_BACK</span>.
        </div>
      )}

      {(appQ.isError || depQ.isError) && (
        <div className="rounded-md bg-state-critSoft border border-state-crit/30 px-3 py-2 text-[12px] text-state-crit font-mono">
          [api] {((appQ.error ?? depQ.error) as Error)?.message}
        </div>
      )}

      {configured === true && app && (
        <Section title="app" subtitle="digitalocean apps · datos en vivo">
          <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-md bg-bg-card border border-border-subtle px-4 py-3">
              <div className="text-fg-faint text-[10.5px] uppercase tracking-wide">región</div>
              <div className="text-fg-primary mt-1">
                {app.region?.label ?? app.spec.region}
              </div>
            </div>
            {plan && (
              <div className="rounded-md bg-bg-card border border-border-subtle px-4 py-3">
                <div className="text-fg-faint text-[10.5px] uppercase tracking-wide">plan</div>
                <div className="text-fg-primary mt-1 text-[14px]">
                  {plan.slug}
                </div>
                <div className="text-fg-muted text-[11.5px] mt-0.5">
                  {plan.usdPerMonth != null
                    ? `~$${plan.usdPerMonth} USD/mes`
                    : 'precio: consultar'}
                </div>
              </div>
            )}
            {app.active_deployment && (
              <div className="rounded-md bg-bg-card border border-border-subtle px-4 py-3">
                <div className="text-fg-faint text-[10.5px] uppercase tracking-wide">
                  deploy activo
                </div>
                <div className="text-fg-primary mt-1 font-mono text-[12px]">
                  {app.active_deployment.phase}
                </div>
                <div className="text-fg-muted text-[11.5px] mt-0.5">
                  desde {relative(app.active_deployment.updated_at)}
                </div>
              </div>
            )}
          </div>
        </Section>
      )}

      {/* Uptime & response — pings propios contra el back cada 60s */}
      <Section
        title="uptime & tiempo de respuesta"
        subtitle="pings cada 60s desde el monitor · últimas 24h"
      >
        <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-3">
          <UptimeStat
            label="uptime 24h"
            value={backUptime ? `${backUptime.uptimePct.toFixed(2)}%` : undefined}
            note={backUptime ? `${backUptime.okCount}/${backUptime.count} pings ok` : ''}
            loading={upQ.isLoading}
            accent={
              !backUptime
                ? undefined
                : backUptime.uptimePct >= 99.5
                  ? 'text-state-ok'
                  : backUptime.uptimePct >= 95
                    ? 'text-state-warn'
                    : 'text-state-crit'
            }
          />
          <UptimeStat
            label="respuesta prom."
            value={backUptime?.avgMs != null ? `${backUptime.avgMs} ms` : undefined}
            note="get contra el back"
            loading={upQ.isLoading}
          />
          <UptimeStat
            label="p95"
            value={backUptime?.p95Ms != null ? `${backUptime.p95Ms} ms` : undefined}
            note="95% de pings bajo este ms"
            loading={upQ.isLoading}
          />
          <UptimeStat
            label="último ping"
            value={
              backUptime?.lastPingAt
                ? relative(backUptime.lastPingAt)
                : undefined
            }
            note={
              backUptime?.lastOk === false
                ? 'último falló'
                : backUptime?.lastStatus != null
                  ? `HTTP ${backUptime.lastStatus}`
                  : ''
            }
            loading={upQ.isLoading}
            accent={backUptime?.lastOk === false ? 'text-state-crit' : undefined}
          />
        </div>

        <div className="mt-4">
          <BackSparkline points={seriesQ.data?.points ?? []} loading={seriesQ.isLoading} />
          <div className="mt-1 flex items-center justify-between text-[10.5px] text-fg-faint tabular-nums">
            <span>hace 24h</span>
            <span>{seriesQ.data?.points.length ?? 0} pings</span>
            <span>ahora</span>
          </div>
        </div>
      </Section>

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
          </div>
        </div>
      </Section>

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

      {/* Histórico persistente de CPU/RAM (30 días) */}
      <MetricsHistorySection />

      {/* Logs viewer con historial persistente + filtros + contexto */}
      <LogsViewer />
    </div>
  )
}

function MetricsHistorySection() {
  const [hours, setHours] = useState(24)
  const cpuQ = useMetricsHistory('cpu', hours)
  const ramQ = useMetricsHistory('ram', hours)

  const RANGES = [
    { hours: 24, label: '24h' },
    { hours: 24 * 7, label: '7d' },
    { hours: 24 * 30, label: '30d' },
  ] as const

  return (
    <Section
      title="histórico CPU / RAM"
      subtitle="snapshot cada 5min · retención 30 días · DO monitoring solo guarda 1h"
      right={
        <div className="flex items-center gap-1 text-[11px]">
          <span className="text-fg-faint">rango:</span>
          {RANGES.map((r) => (
            <button
              key={r.hours}
              onClick={() => setHours(r.hours)}
              className={cn(
                'px-2 h-6 rounded border',
                hours === r.hours
                  ? 'border-brand-500/40 bg-brand-500/10 text-brand-300'
                  : 'border-border-subtle text-fg-muted hover:text-fg-primary',
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      }
    >
      <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3">
        <HistoryChart
          label="CPU histórico"
          loading={cpuQ.isLoading}
          data={cpuQ.data}
          barColor="bg-brand-500/70"
        />
        <HistoryChart
          label="RAM histórica"
          loading={ramQ.isLoading}
          data={ramQ.data}
          barColor="bg-state-info/70"
        />
      </div>
    </Section>
  )
}

function HistoryChart({
  label,
  loading,
  data,
  barColor,
}: {
  label: string
  loading?: boolean
  data?: {
    points: { ts: string; value: number }[]
    avg: number | null
    peak: number | null
    latest: number | null
    count: number
  }
  barColor: string
}) {
  return (
    <div className="rounded-md bg-bg-card border border-border-subtle px-4 py-3">
      <div className="flex items-baseline justify-between mb-2">
        <div className="text-fg-faint text-[10.5px] uppercase tracking-wide">{label}</div>
        <div className="text-fg-muted text-[10.5px] tabular-nums">
          {data ? `${data.count} pts` : ''}
        </div>
      </div>
      {loading ? (
        <div className="h-24 rounded bg-bg-inset animate-pulse" />
      ) : !data || data.points.length === 0 ? (
        <div className="h-24 rounded bg-bg-inset border border-border-subtle flex items-center justify-center text-fg-muted text-[11.5px]">
          sin snapshots aún (el 1º sale al arrancar el back)
        </div>
      ) : (
        <div className="h-24 rounded bg-bg-inset border border-border-subtle flex items-end gap-[1px] px-1 py-1">
          {data.points.map((p, i) => {
            const h = Math.max(2, Math.min(100, p.value))
            return (
              <div
                key={i}
                className={cn('flex-1 min-w-[1px] rounded-sm', barColor)}
                style={{ height: `${h}%` }}
                title={`${p.ts.slice(0, 19).replace('T', ' ')} · ${p.value.toFixed(1)}%`}
              />
            )
          })}
        </div>
      )}
      <div className="mt-2 flex justify-between text-[11px] text-fg-muted tabular-nums">
        <span>
          <span className="text-fg-faint">avg </span>
          {data?.avg != null ? `${data.avg.toFixed(1)}%` : '—'}
        </span>
        <span>
          <span className="text-fg-faint">pico </span>
          <span className={cn(data?.peak != null && data.peak > 85 && 'text-state-crit')}>
            {data?.peak != null ? `${data.peak.toFixed(1)}%` : '—'}
          </span>
        </span>
        <span>
          <span className="text-fg-faint">ahora </span>
          {data?.latest != null ? `${data.latest.toFixed(1)}%` : '—'}
        </span>
      </div>
    </div>
  )
}

function LogsViewer() {
  const [level, setLevel] = useState<LevelFilter>('todos')
  const [search, setSearch] = useState('')
  const [dayFrom, setDayFrom] = useState(isoDay(new Date()))
  const [dayTo, setDayTo] = useState(isoDay(new Date()))
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [live, setLive] = useState(false)
  const [liveLines, setLiveLines] = useState<{ ts: string | null; msg: string; level: string }[]>([])
  const esRef = useRef<EventSource | null>(null)
  const token = useAuth((s) => s.token)

  const filters = useMemo(() => {
    // El date picker devuelve fechas en la zona local del usuario.
    // Convertimos "YYYY-MM-DD" local a ISO UTC para que la query cubra
    // ese día completo en su timezone.
    const fromLocal = new Date(`${dayFrom}T00:00:00`)
    const toLocal = new Date(`${dayTo}T23:59:59.999`)
    return {
      level: level === 'todos' ? undefined : level,
      q: search || undefined,
      from: fromLocal.toISOString(),
      to: toLocal.toISOString(),
      limit: 500,
    }
  }, [level, search, dayFrom, dayTo])

  const dbQ = useDbLogs(filters)
  const statsQ = useDbLogsStats()
  const ctxQ = useLogContext(expandedId)
  const captureQ = useCaptureStatus()

  const lines = dbQ.data?.lines ?? []

  // Auto-scroll al fondo (los mas recientes) cuando llegan logs nuevos.
  // Respeta al usuario: si scrolleo hacia arriba a leer, no lo interrumpimos.
  const logsRef = useRef<HTMLDivElement | null>(null)
  const stickToBottomRef = useRef(true)
  useLayoutEffect(() => {
    const el = logsRef.current
    if (!el) return
    if (stickToBottomRef.current) {
      el.scrollTop = el.scrollHeight
    }
  }, [lines.length, expandedId])
  const onLogsScroll = () => {
    const el = logsRef.current
    if (!el) return
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    stickToBottomRef.current = distanceFromBottom < 40
  }

  // Live tail via SSE (opcional, escribe también a la DB desde el back)
  useEffect(() => {
    if (!live || !token) {
      esRef.current?.close()
      esRef.current = null
      return
    }
    const url = `${(import.meta.env.VITE_API_URL ?? 'http://localhost:4001/api').replace(/\/$/, '')}/infra/do/app/logs/live?token=${encodeURIComponent(token)}`
    const es = new EventSource(url)
    esRef.current = es
    es.onmessage = (e) => {
      try {
        const line = JSON.parse(e.data)
        setLiveLines((prev) => [...prev, line].slice(-200))
      } catch {
        /* ignore */
      }
    }
    es.onerror = () => {
      // en errores dejamos la conexión (el navegador reintenta solo)
    }
    return () => {
      es.close()
      esRef.current = null
    }
  }, [live, token])

  return (
    <Section
      title="runtime logs"
      subtitle="tabla monitor_logs · histórico persistente · sobrevive a rebuilds de DO"
      right={
        <div className="flex items-center gap-2 text-[11px]">
          <StatusBadge
            status={captureQ.data?.running ? 'ok' : 'warn'}
            label={
              captureQ.data?.running
                ? 'captura 24/7 activa'
                : captureQ.data
                  ? 'captura detenida'
                  : '...'
            }
          />
          <button
            onClick={() => setLive((v) => !v)}
            className={cn(
              'px-2 h-6 rounded border',
              live
                ? 'border-state-ok/60 bg-state-ok/10 text-state-ok'
                : 'border-border-subtle text-fg-muted hover:text-fg-primary',
            )}
            title="además del capturer del back, ver el stream en tiempo real aquí"
          >
            {live ? '● ver en vivo' : '○ ver en vivo'}
          </button>
          <button
            onClick={() => dbQ.refetch()}
            disabled={dbQ.isFetching}
            className="px-2 h-6 rounded border border-border-subtle text-fg-muted hover:text-fg-primary disabled:opacity-50"
          >
            {dbQ.isFetching ? '…' : 'actualizar'}
          </button>
        </div>
      }
    >
      {/* Filtros */}
      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
        <span className="text-fg-faint">nivel:</span>
        {LEVELS.map((lv) => (
          <button
            key={lv}
            onClick={() => setLevel(lv)}
            className={cn(
              'px-2 h-6 rounded border',
              level === lv
                ? 'border-brand-500/40 bg-brand-500/10 text-brand-300'
                : 'border-border-subtle text-fg-muted hover:text-fg-primary',
            )}
          >
            {lv.toLowerCase()}
          </button>
        ))}
        <span className="text-fg-faint ml-2">desde</span>
        <input
          type="date"
          value={dayFrom}
          onChange={(e) => setDayFrom(e.target.value)}
          className="bg-bg-card border border-border-subtle rounded px-2 h-6 text-fg-secondary tabular-nums outline-none focus:border-brand-500/50"
        />
        <span className="text-fg-faint">hasta</span>
        <input
          type="date"
          value={dayTo}
          onChange={(e) => setDayTo(e.target.value)}
          className="bg-bg-card border border-border-subtle rounded px-2 h-6 text-fg-secondary tabular-nums outline-none focus:border-brand-500/50"
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="buscar en msg..."
          className="bg-bg-card border border-border-subtle rounded px-2 h-6 text-fg-secondary outline-none focus:border-brand-500/50 min-w-[200px] flex-1 max-w-xs"
        />
      </div>

      {/* Stats globales de captura */}
      {statsQ.data && (
        <div className="mt-2 text-[11px] text-fg-muted flex flex-wrap gap-4 px-1">
          <span>total capturado: <span className="text-fg-primary tabular-nums">{statsQ.data.total.toLocaleString('es-MX')}</span></span>
          {statsQ.data.first_at && (
            <span>desde: <span className="text-fg-secondary">{fmtTs(statsQ.data.first_at)}</span></span>
          )}
          {statsQ.data.last_at && (
            <span>hasta: <span className="text-fg-secondary">{fmtTs(statsQ.data.last_at)}</span></span>
          )}
          {statsQ.data.by_level.map((l) => (
            <span key={l.level}>
              <span className={colorForLevel(l.level)}>{l.level}</span>:{' '}
              <span className="text-fg-secondary tabular-nums">{l.count.toLocaleString('es-MX')}</span>
            </span>
          ))}
        </div>
      )}

      {/* Estado compacto de la captura */}
      {captureQ.data && !captureQ.data.running && (
        <div className="mt-2 rounded-md bg-bg-inset border border-state-crit/30 px-3 py-2 text-[11.5px] text-state-crit font-mono">
          [aviso] captura detenida.
          {captureQ.data.lastError && <span> último error: {captureQ.data.lastError}</span>}
        </div>
      )}

      {/* Live stream si está activo */}
      {live && (
        <div className="mt-3 rounded-md bg-state-okSoft border border-state-ok/30 px-3 py-2 text-[12px] font-mono">
          <div className="text-state-ok mb-1 text-[11px]">
            [en vivo] streaming desde DO · {liveLines.length} líneas en buffer · cada una se guarda en monitor_logs
          </div>
          <div className="max-h-[220px] overflow-auto">
            {liveLines.slice(-30).map((l, i) => (
              <div key={i} className="grid grid-cols-[160px_60px_1fr] gap-2 py-0.5 text-[11.5px]">
                <span className="text-fg-muted tabular-nums text-[11px]">
                  {l.ts ? fmtTs(l.ts) : '—'}
                </span>
                <span className={cn('font-medium', colorForLevel(l.level))}>{l.level}</span>
                <span className="text-fg-primary truncate">{l.msg}</span>
              </div>
            ))}
            {liveLines.length === 0 && (
              <div className="text-fg-muted text-center py-2">esperando logs…</div>
            )}
          </div>
        </div>
      )}

      {/* Tabla histórica · orden asc (viejos arriba, nuevos abajo). Auto-scroll al fondo. */}
      <div
        ref={logsRef}
        onScroll={onLogsScroll}
        className="mt-3 rounded-md bg-bg-inset border border-border-subtle px-3 py-2 font-mono text-[12px] max-h-[600px] overflow-auto"
      >
        {dbQ.isLoading && (
          <div className="text-fg-muted text-center py-4 animate-pulse">cargando…</div>
        )}
        {dbQ.isError && (
          <div className="text-state-crit py-2">[api] {(dbQ.error as Error).message}</div>
        )}
        {!dbQ.isLoading && lines.length === 0 && !dbQ.isError && (
          <div className="text-fg-muted text-center py-4">
            {statsQ.data && statsQ.data.total === 0 ? (
              'aún no hemos capturado logs. La captura arranca automáticamente al boot del back.'
            ) : (
              <div>
                <div>sin resultados con estos filtros.</div>
                {statsQ.data && (
                  <div className="text-fg-faint text-[11px] mt-1">
                    en total tenemos {statsQ.data.total.toLocaleString('es-MX')} líneas
                    {statsQ.data.first_at && (
                      <> capturadas desde {fmtTs(statsQ.data.first_at)} hasta {fmtTs(statsQ.data.last_at ?? '')} (UTC)</>
                    )}
                    . Prueba ampliar el rango de fechas o quitar filtros.
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        {!dbQ.isLoading &&
          lines.map((l, i) => {
            const isExpanded = expandedId === l.id
            return (
              <div
                key={l.id}
                className={cn(
                  i !== 0 && 'border-t border-border-subtle',
                  isExpanded && 'bg-white/[0.02]',
                )}
              >
                <div
                  onClick={() => setExpandedId(isExpanded ? null : l.id)}
                  className="grid grid-cols-[160px_60px_1fr_60px] gap-3 py-0.5 px-1 -mx-1 rounded cursor-pointer hover:bg-white/[0.02]"
                >
                  <span className="text-fg-muted tabular-nums text-[11px]">{fmtTs(l.ts)}</span>
                  <span className={cn('font-medium', colorForLevel(l.level))}>{l.level}</span>
                  <span className="text-fg-primary whitespace-pre-wrap break-words">
                    {l.msg}
                  </span>
                  <span className="text-fg-faint text-[11px] text-right">
                    {isExpanded ? '[ocultar]' : '[contexto]'}
                  </span>
                </div>
                {isExpanded && (
                  <ContextPanel
                    isLoading={ctxQ.isLoading}
                    context={ctxQ.data?.context ?? []}
                    targetId={l.id}
                  />
                )}
              </div>
            )
          })}
        <div className="mt-2">
          <Prompt />
        </div>
      </div>
    </Section>
  )
}

function ContextPanel({
  isLoading,
  context,
  targetId,
}: {
  isLoading: boolean
  context: DbLogLine[]
  targetId: string
}) {
  if (isLoading) {
    return (
      <div className="pl-4 py-2 text-fg-muted text-[11.5px] animate-pulse">
        cargando contexto (20 líneas antes + 20 después)…
      </div>
    )
  }
  if (context.length === 0) return null
  return (
    <div className="pl-4 py-2 border-l-2 border-brand-500/40 bg-bg-base/40">
      <div className="text-fg-faint text-[10.5px] uppercase tracking-wide mb-1">
        contexto · {context.length} líneas
      </div>
      {context.map((c) => {
        const isTarget = c.id === targetId
        return (
          <div
            key={c.id}
            className={cn(
              'grid grid-cols-[160px_60px_1fr] gap-2 py-0.5 text-[11.5px]',
              isTarget && 'bg-brand-500/10 -mx-1 px-1 rounded font-semibold',
            )}
          >
            <span className="text-fg-muted tabular-nums text-[11px]">{fmtTs(c.ts)}</span>
            <span className={cn('font-medium', colorForLevel(c.level))}>{c.level}</span>
            <span
              className={cn(
                'whitespace-pre-wrap break-words',
                isTarget ? 'text-brand-200' : 'text-fg-secondary',
              )}
            >
              {c.msg}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function UptimeStat({
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

function BackSparkline({
  points,
  loading,
}: {
  points: { ts: string; ok: boolean; responseMs: number }[]
  loading?: boolean
}) {
  if (loading) return <div className="h-16 rounded bg-bg-inset animate-pulse" />
  if (points.length === 0) {
    return (
      <div className="h-16 rounded bg-bg-inset border border-border-subtle flex items-center justify-center text-fg-muted text-[11.5px]">
        aún no hay pings (espera 1-2 min tras arrancar el back del monitor)
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
