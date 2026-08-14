import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Section } from '@/components/ui/Section'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { LiveBadge } from '@/components/ui/LiveBadge'
import {
  useDoDbCluster,
  useUptimeSummary,
  useUptimeSeries,
  useSlowQueries,
} from '@/lib/infraQueries'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

function formatIso(iso: string) {
  return iso.replace('T', ' ').slice(0, 19)
}

function n(v: number | string | undefined) {
  const num = typeof v === 'string' ? parseInt(v, 10) : v
  if (num === undefined || Number.isNaN(num)) return '—'
  return num.toLocaleString('es-MX')
}

function humanUptime(sec: number) {
  const d = Math.floor(sec / (24 * 3600))
  const h = Math.floor((sec % (24 * 3600)) / 3600)
  const m = Math.floor((sec % 3600) / 60)
  return `${d}d ${h}h ${m}m`
}

function relative(iso: string | null | undefined): string {
  if (!iso) return '—'
  const t = new Date(iso).getTime()
  if (!Number.isFinite(t)) return '—'
  const s = Math.max(0, Math.round((Date.now() - t) / 1000))
  if (s < 60) return `hace ${s}s`
  const m = Math.round(s / 60)
  if (m < 60) return `hace ${m}m`
  const h = Math.round(m / 60)
  if (h < 48) return `hace ${h}h`
  return `hace ${Math.round(h / 24)}d`
}

interface DbStatus {
  uptime_sec: number
  version: string
  max_connections: number
  threads_connected: number
  threads_running: number
  max_used_connections: number
  queries_total: number
  queries_per_sec_avg: number
  slow_queries: number
  aborted_connects: number
  buffer_pool_used_pct: number
  innodb_buffer_pool_size_mb: number
  innodb_row_lock_waits: number
  innodb_row_lock_time_avg_ms: number
  bytes_sent_gb: number
  bytes_received_gb: number
  commands: { select: number; insert: number; update: number; delete: number }
}

interface TableRow {
  table: string
  rows: number
  data_mb: number
  index_mb: number
  total_mb: number
}

interface IndicesResp {
  expected: number
  found: number
  allPresent: boolean
  indexes: { table: string; name: string; present: boolean }[]
}

export default function Database() {
  const dbQ = useDoDbCluster()
  const upQ = useUptimeSummary(24)
  const seriesQ = useUptimeSeries('db-qeb', 24)
  const statusQ = useQuery({
    queryKey: ['qeb', 'db', 'status'],
    queryFn: () => api.get<DbStatus>('/qeb/db/status'),
    staleTime: 30_000,
    refetchInterval: 60_000,
  })
  const tablesQ = useQuery({
    queryKey: ['qeb', 'db', 'tables'],
    queryFn: () => api.get<{ tables: TableRow[] }>('/qeb/db/tables').then((r) => r.tables),
    staleTime: 5 * 60_000,
    refetchInterval: 5 * 60_000,
  })
  const indicesQ = useQuery({
    queryKey: ['qeb', 'indices'],
    queryFn: () => api.get<IndicesResp>('/qeb/indices'),
    staleTime: 5 * 60_000,
    refetchInterval: 5 * 60_000,
  })

  const configured = dbQ.data?.configured
  const cluster = dbQ.data?.cluster
  const plan = dbQ.data?.plan
  const status = statusQ.data
  const tables = tablesQ.data ?? []
  const maxTableSize = Math.max(...tables.map((t) => t.total_mb), 1)
  const dbUptime = upQ.data?.targets.find((t) => t.key === 'db-qeb')

  return (
    <div className="flex flex-col gap-6 text-[13px]">
      <div className="flex items-center justify-between border-b border-border-subtle pb-4">
        <div className="flex items-center gap-3">
          <span className="text-fg-muted text-[11.5px]">servicio</span>
          <span className="text-fg-primary text-[15px]">database qeb</span>
          <span className="text-fg-faint">·</span>
          <span className="text-fg-muted text-[11.5px]">
            {cluster?.engine ?? 'mysql'} {cluster?.version ?? ''}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <LiveBadge
            intervalSec={60}
            fetching={
              dbQ.isFetching ||
              upQ.isFetching ||
              statusQ.isFetching ||
              tablesQ.isFetching ||
              indicesQ.isFetching
            }
          />
          <StatusBadge
            status={cluster?.status === 'online' ? 'ok' : configured ? 'warn' : 'muted'}
            label={cluster?.status ?? (configured ? 'sin datos' : 'sin token do')}
          />
        </div>
      </div>

      {dbQ.isError && (
        <div className="rounded-md bg-state-critSoft border border-state-crit/30 px-3 py-2 text-[12px] text-state-crit font-mono">
          [api] {(dbQ.error as Error).message}
        </div>
      )}

      {/* Info del cluster (DO) */}
      {configured === true && cluster && (
        <Section title="cluster" subtitle="digitalocean managed database · info en vivo">
          <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-3">
            <InfoTile label="engine" value={`${cluster.engine} ${cluster.version}`} />
            <InfoTile label="status" value={cluster.status} />
            <InfoTile label="región" value={cluster.region} />
            {plan && (
              <div className="rounded-md bg-bg-card border border-border-subtle px-4 py-3">
                <div className="text-fg-faint text-[10.5px] uppercase tracking-wide">plan</div>
                <div className="text-fg-primary mt-1 text-[14px]">{plan.slug}</div>
                <div className="text-fg-muted text-[11.5px] mt-0.5">
                  {plan.usdPerMonth != null
                    ? `~$${plan.usdPerMonth} USD/mes`
                    : 'precio: consultar'}
                </div>
              </div>
            )}
            <InfoTile
              label="nodos"
              value={`${cluster.num_nodes} nodo${cluster.num_nodes === 1 ? '' : 's'}`}
            />
            <InfoTile label="creado" value={formatIso(cluster.created_at)} />
          </div>
        </Section>
      )}

      {/* Uptime & response — pings TCP al puerto de MySQL cada 60s */}
      <Section
        title="uptime & tiempo de respuesta"
        subtitle="ping TCP al puerto de mysql cada 60s desde el monitor · últimas 24h"
      >
        <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricTile
            label="uptime 24h"
            value={dbUptime ? `${dbUptime.uptimePct.toFixed(2)}%` : '—'}
            note={dbUptime ? `${dbUptime.okCount}/${dbUptime.count} pings ok` : ''}
            accent={
              !dbUptime
                ? undefined
                : dbUptime.uptimePct >= 99.5
                  ? 'text-state-ok'
                  : dbUptime.uptimePct >= 95
                    ? 'text-state-warn'
                    : 'text-state-crit'
            }
          />
          <MetricTile
            label="latencia prom."
            value={dbUptime?.avgMs != null ? `${dbUptime.avgMs} ms` : '—'}
            note="tcp handshake"
          />
          <MetricTile
            label="p95"
            value={dbUptime?.p95Ms != null ? `${dbUptime.p95Ms} ms` : '—'}
            note="95% de pings bajo este ms"
          />
          <MetricTile
            label="último ping"
            value={dbUptime?.lastPingAt ? relative(dbUptime.lastPingAt) : '—'}
            note={dbUptime?.lastOk === false ? 'último falló' : ''}
            accent={dbUptime?.lastOk === false ? 'text-state-crit' : undefined}
          />
        </div>
        <div className="mt-4">
          <DbSparkline points={seriesQ.data?.points ?? []} loading={seriesQ.isLoading} />
          <div className="mt-1 flex items-center justify-between text-[10.5px] text-fg-faint tabular-nums">
            <span>hace 24h</span>
            <span>{seriesQ.data?.points.length ?? 0} pings</span>
            <span>ahora</span>
          </div>
        </div>
      </Section>

      {/* MySQL live stats (via monitor_readonly) */}
      <Section
        title="estadísticas mysql"
        subtitle="SHOW GLOBAL STATUS · actualiza cada 60s"
        right={
          statusQ.data && (
            <span className="text-fg-muted text-[11px]">uptime {humanUptime(status!.uptime_sec)}</span>
          )
        }
      >
        {statusQ.isLoading && (
          <div className="text-fg-muted text-center py-4 animate-pulse">cargando…</div>
        )}
        {statusQ.isError && (
          <div className="text-state-crit text-center py-3 font-mono text-[12px]">
            [api] {(statusQ.error as Error).message}
          </div>
        )}
        {status && (
          <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricTile
              label="conexiones activas"
              value={`${status.threads_connected}`}
              accent="text-state-info"
              note={`de ${status.max_connections} max · pico ${status.max_used_connections}`}
            />
            <MetricTile
              label="threads corriendo"
              value={String(status.threads_running)}
              accent={status.threads_running > 5 ? 'text-state-warn' : 'text-fg-primary'}
              note="queries ejecutándose ahora"
            />
            <MetricTile
              label="queries / seg"
              value={String(status.queries_per_sec_avg)}
              accent="text-fg-primary"
              note={`total ${n(status.queries_total)}`}
            />
            <MetricTile
              label="slow queries"
              value={n(status.slow_queries)}
              accent={
                status.slow_queries > 100 ? 'text-state-warn' : 'text-state-ok'
              }
              note="acumulado desde arranque"
            />
            <MetricTile
              label="buffer pool uso"
              value={`${status.buffer_pool_used_pct}%`}
              accent="text-state-info"
              note={`${n(status.innodb_buffer_pool_size_mb)} MB`}
            />
            <MetricTile
              label="aborted connects"
              value={n(status.aborted_connects)}
              accent={status.aborted_connects > 50 ? 'text-state-warn' : 'text-fg-muted'}
              note="conexiones que fallaron"
            />
            <MetricTile
              label="tráfico enviado"
              value={`${status.bytes_sent_gb} GB`}
              accent="text-fg-secondary"
              note="acumulado"
            />
            <MetricTile
              label="tráfico recibido"
              value={`${status.bytes_received_gb} GB`}
              accent="text-fg-secondary"
              note="acumulado"
            />
          </div>
        )}
        {status && (
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricTile label="SELECTs" value={n(status.commands.select)} accent="text-state-info" note="acumulado" />
            <MetricTile label="INSERTs" value={n(status.commands.insert)} accent="text-state-ok" note="acumulado" />
            <MetricTile label="UPDATEs" value={n(status.commands.update)} accent="text-state-warn" note="acumulado" />
            <MetricTile label="DELETEs" value={n(status.commands.delete)} accent="text-state-crit" note="acumulado" />
          </div>
        )}
      </Section>

      {/* Top tablas por peso */}
      <Section
        title="tablas por peso"
        subtitle="top 15 · information_schema.TABLES"
      >
        <div className="mt-1">
          <div className="grid grid-cols-[1fr_100px_100px_100px_1fr] gap-3 px-2 py-1 text-[11px] text-fg-faint uppercase tracking-wide">
            <span>tabla</span>
            <span className="text-right">filas</span>
            <span className="text-right">datos</span>
            <span className="text-right">índices</span>
            <span>proporción</span>
          </div>
          <div className="border-t border-border-subtle">
            {tablesQ.isLoading && (
              <div className="text-fg-muted text-center py-4 animate-pulse">cargando…</div>
            )}
            {!tablesQ.isLoading &&
              tables.map((t, i) => {
                const width = Math.max(4, (t.total_mb / maxTableSize) * 100)
                return (
                  <div
                    key={t.table}
                    className={cn(
                      'grid grid-cols-[1fr_100px_100px_100px_1fr] gap-3 px-2 py-1.5 items-center hover:bg-white/[0.02] transition-colors',
                      i !== 0 && 'border-t border-border-subtle',
                    )}
                  >
                    <span className="text-fg-primary truncate">{t.table}</span>
                    <span className="text-right text-fg-muted tabular-nums">
                      {n(t.rows)}
                    </span>
                    <span className="text-right text-fg-secondary tabular-nums">
                      {t.data_mb} MB
                    </span>
                    <span className="text-right text-fg-secondary tabular-nums">
                      {t.index_mb} MB
                    </span>
                    <div className="w-full h-1.5 bg-bg-inset rounded overflow-hidden">
                      <div
                        className="h-full bg-brand-500/60"
                        style={{ width: `${width}%` }}
                      />
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      </Section>

      {/* Queries lentas · performance_schema */}
      <SlowQueriesSection />

      {/* Índices críticos */}
      <Section
        title="índices críticos"
        subtitle="verificación estática · SHOW INDEX contra la BD de QEB"
        right={
          indicesQ.data && (
            <StatusBadge
              status={indicesQ.data.allPresent ? 'ok' : 'crit'}
              label={`${indicesQ.data.found} / ${indicesQ.data.expected} presentes`}
            />
          )
        }
      >
        <div className="mt-1">
          <div className="grid grid-cols-[70px_160px_1fr] gap-3 px-2 py-1 text-[11px] text-fg-faint uppercase tracking-wide">
            <span>estado</span>
            <span>tabla</span>
            <span>índice</span>
          </div>
          <div className="border-t border-border-subtle">
            {indicesQ.isLoading && (
              <div className="text-fg-muted text-center py-4 animate-pulse">cargando…</div>
            )}
            {!indicesQ.isLoading &&
              indicesQ.data?.indexes.map((idx, i) => (
                <div
                  key={idx.name}
                  className={cn(
                    'grid grid-cols-[70px_160px_1fr] gap-3 px-2 py-1.5 items-center hover:bg-white/[0.02] transition-colors',
                    i !== 0 && 'border-t border-border-subtle',
                  )}
                >
                  <StatusBadge
                    status={idx.present ? 'ok' : 'crit'}
                    label={idx.present ? 'ok' : 'faltante'}
                  />
                  <span className="text-brand-300">{idx.table}</span>
                  <span className="text-fg-primary font-mono text-[12.5px]">{idx.name}</span>
                </div>
              ))}
          </div>
        </div>
      </Section>

    </div>
  )
}

function InfoTile({
  label,
  value,
  className,
}: {
  label: string
  value: string
  className?: string
}) {
  return (
    <div
      className={`rounded-md bg-bg-card border border-border-subtle px-4 py-3 ${className ?? ''}`}
    >
      <div className="text-fg-faint text-[10.5px] uppercase tracking-wide">{label}</div>
      <div className="text-fg-primary mt-1 truncate">{value}</div>
    </div>
  )
}

function DbSparkline({
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
          ? p.responseMs > 1000
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

function SlowQueriesSection() {
  const [orderBy, setOrderBy] = useState<'sum' | 'avg' | 'count' | 'max'>('sum')
  const [minAvgMs, setMinAvgMs] = useState(0)
  const [expandedDigest, setExpandedDigest] = useState<string | null>(null)
  const q = useSlowQueries({ orderBy, limit: 20, minAvgMs })
  const queries = q.data?.queries ?? []
  const permissionError = q.data?.error && q.data.error.includes('monitor_readonly')

  return (
    <Section
      title="queries lentas"
      subtitle="top 20 desde performance_schema · sirve para cazar cuellos de botella antes de que la DB caiga"
      right={
        <div className="flex items-center gap-2 text-[11px]">
          <span className="text-fg-faint">ordenar por:</span>
          {(['sum', 'avg', 'count', 'max'] as const).map((o) => (
            <button
              key={o}
              onClick={() => setOrderBy(o)}
              className={cn(
                'px-2 h-6 rounded border',
                orderBy === o
                  ? 'border-brand-500/40 bg-brand-500/10 text-brand-300'
                  : 'border-border-subtle text-fg-muted hover:text-fg-primary',
              )}
            >
              {o === 'sum' ? 'tiempo total' : o === 'avg' ? 'avg' : o === 'count' ? 'count' : 'max'}
            </button>
          ))}
          <span className="text-fg-faint ml-2">min avg ms:</span>
          <input
            type="number"
            min={0}
            value={minAvgMs}
            onChange={(e) => setMinAvgMs(Math.max(0, parseInt(e.target.value, 10) || 0))}
            className="bg-bg-card border border-border-subtle rounded px-2 h-6 w-16 text-fg-secondary tabular-nums outline-none focus:border-brand-500/50"
          />
        </div>
      }
    >
      {permissionError && (
        <div className="mt-2 rounded-md bg-state-critSoft border border-state-crit/30 px-3 py-2 text-[12px] text-state-crit font-mono">
          [permiso] {q.data?.error}
        </div>
      )}
      <div className="mt-1">
        <div className="grid grid-cols-[1fr_70px_70px_80px_80px_80px] gap-3 px-2 py-1 text-[11px] text-fg-faint uppercase tracking-wide">
          <span>query</span>
          <span className="text-right">count</span>
          <span className="text-right">avg ms</span>
          <span className="text-right">max ms</span>
          <span className="text-right">total s</span>
          <span className="text-right">rows/exec</span>
        </div>
        <div className="border-t border-border-subtle">
          {q.isLoading && (
            <div className="text-fg-muted text-center py-4 animate-pulse">cargando…</div>
          )}
          {!q.isLoading && !permissionError && queries.length === 0 && (
            <div className="text-fg-muted text-center py-4">
              sin queries que cumplan el filtro
            </div>
          )}
          {!q.isLoading &&
            queries.map((query, i) => {
              const isExp = expandedDigest === query.digest
              const avgWarn = query.avg_ms > 500
              const avgCrit = query.avg_ms > 2000
              return (
                <div
                  key={query.digest}
                  className={cn(i !== 0 && 'border-t border-border-subtle')}
                >
                  <div
                    onClick={() => setExpandedDigest(isExp ? null : query.digest)}
                    className="grid grid-cols-[1fr_70px_70px_80px_80px_80px] gap-3 px-2 py-1.5 items-center hover:bg-white/[0.02] transition-colors cursor-pointer"
                  >
                    <span className="text-fg-primary font-mono text-[11.5px] truncate">
                      {query.digest_text?.slice(0, 120) ?? '—'}
                    </span>
                    <span className="text-right text-fg-secondary tabular-nums">
                      {query.count_star.toLocaleString('es-MX')}
                    </span>
                    <span
                      className={cn(
                        'text-right tabular-nums',
                        avgCrit ? 'text-state-crit' : avgWarn ? 'text-state-warn' : 'text-fg-secondary',
                      )}
                    >
                      {query.avg_ms.toFixed(1)}
                    </span>
                    <span className="text-right text-fg-muted tabular-nums text-[11.5px]">
                      {query.max_ms.toFixed(0)}
                    </span>
                    <span className="text-right text-fg-primary tabular-nums">
                      {(query.sum_ms / 1000).toFixed(1)}
                    </span>
                    <span className="text-right text-fg-muted tabular-nums text-[11.5px]">
                      {query.rows_examined_avg.toLocaleString('es-MX')}
                    </span>
                  </div>
                  {isExp && (
                    <div className="px-4 py-2 bg-bg-inset border-l-2 border-brand-500/40 text-[11.5px] font-mono text-fg-secondary whitespace-pre-wrap break-words">
                      {query.digest_text}
                    </div>
                  )}
                </div>
              )
            })}
        </div>
      </div>
    </Section>
  )
}

function MetricTile({
  label,
  value,
  accent,
  note,
}: {
  label: string
  value: string
  accent?: string
  note?: string
}) {
  return (
    <div className="rounded-md bg-bg-card border border-border-subtle px-4 py-3">
      <div className="text-fg-faint text-[10.5px] uppercase tracking-wide">{label}</div>
      <div className={cn('tabular-nums text-[20px] mt-1', accent ?? 'text-fg-primary')}>
        {value}
      </div>
      {note && <div className="text-fg-muted text-[10.5px] mt-0.5">{note}</div>}
    </div>
  )
}
