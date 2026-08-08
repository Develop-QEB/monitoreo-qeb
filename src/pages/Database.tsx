import { useQuery } from '@tanstack/react-query'
import { Section } from '@/components/ui/Section'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useDoDbCluster } from '@/lib/infraQueries'
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
  })
  const indicesQ = useQuery({
    queryKey: ['qeb', 'indices'],
    queryFn: () => api.get<IndicesResp>('/qeb/indices'),
    staleTime: 5 * 60_000,
  })

  const configured = dbQ.data?.configured
  const cluster = dbQ.data?.cluster
  const status = statusQ.data
  const tables = tablesQ.data ?? []
  const maxTableSize = Math.max(...tables.map((t) => t.total_mb), 1)

  return (
    <div className="flex flex-col gap-6 text-[13px]">
      <div className="flex items-center justify-between border-b border-border-subtle pb-4">
        <div className="flex items-center gap-3">
          <span className="text-fg-muted text-[11.5px]">servicio</span>
          <span className="text-fg-primary text-[15px]">database.qeb</span>
          <span className="text-fg-faint">·</span>
          <span className="text-fg-muted text-[11.5px]">
            {cluster?.name ?? 'qeb-mysql-prod'} · {cluster?.engine ?? 'mysql'}{' '}
            {cluster?.version ?? ''}
          </span>
        </div>
        <StatusBadge
          status={cluster?.status === 'online' ? 'ok' : configured ? 'warn' : 'muted'}
          label={cluster?.status ?? (configured ? 'sin datos' : 'sin token do')}
        />
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
            <InfoTile label="nombre" value={cluster.name} />
            <InfoTile label="engine" value={`${cluster.engine} ${cluster.version}`} />
            <InfoTile label="status" value={cluster.status} />
            <InfoTile label="tamaño" value={cluster.size} />
            <InfoTile label="región" value={cluster.region} />
            <InfoTile label="nodos" value={String(cluster.num_nodes)} />
            {cluster.db_names && cluster.db_names.length > 0 && (
              <InfoTile
                label="databases"
                value={cluster.db_names.slice(0, 4).join(', ')}
                className="md:col-span-2"
              />
            )}
            <InfoTile label="creado" value={formatIso(cluster.created_at)} />
          </div>
        </Section>
      )}

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

      {/* Índices críticos */}
      <Section
        title="índices críticos"
        subtitle="verificación estática · SHOW INDEX contra u658050396_QEB"
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

      {/* Slow queries — sigue requiriendo config en el cluster */}
      <Section
        title="queries pesadas"
        subtitle="requiere habilitar slow_query_log en el cluster"
      >
        <div className="mt-2 rounded-md bg-bg-inset border border-brand-500/30 px-3 py-2 text-[12px] text-brand-300 font-mono">
          [pendiente] Mario/DO debe habilitar <span className="text-fg-primary">slow_query_log = ON</span> y <span className="text-fg-primary">long_query_time = 1</span> en los MySQL parameters del cluster (Settings → Configuration en el panel de DO). Cuando esté habilitado, agregamos endpoint para leer <span className="text-fg-primary">mysql.slow_log</span> con monitor_readonly.
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
