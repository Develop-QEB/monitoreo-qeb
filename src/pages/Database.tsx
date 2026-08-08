import { useState } from 'react'
import { Section } from '@/components/ui/Section'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { UnicodeSparkline } from '@/components/ui/UnicodeSparkline'
import { MetricRow } from '@/components/ui/MetricRow'
import { cn } from '@/lib/utils'

const CPU_SPARK = [24, 26, 28, 30, 32, 34, 33, 36, 34, 37, 38, 38]
const RAM_SPARK = [58, 60, 62, 62, 61, 62, 63, 62, 62, 62, 62, 62]
const DISK_SPARK = [26, 26, 27, 27, 27, 28, 28, 28, 28, 28, 28, 28]
const CONN_SPARK = [30, 32, 35, 40, 45, 48, 52, 47, 44, 42, 47, 47]

interface IndexRow {
  table: string
  name: string
  present: boolean
  rows: string
}

const CRITICAL_INDEXES: IndexRow[] = [
  { table: 'inventarios', name: 'idx_inv_estado',    present: true,  rows: '18.6k' },
  { table: 'inventarios', name: 'idx_inv_plaza',     present: true,  rows: '18.6k' },
  { table: 'inventarios', name: 'idx_inv_mueble',    present: true,  rows: '18.6k' },
  { table: 'inventarios', name: 'idx_inv_nse',       present: true,  rows: '18.6k' },
  { table: 'inventarios', name: 'idx_inv_tipo',      present: true,  rows: '18.6k' },
  { table: 'inventarios', name: 'idx_inv_estatus',   present: true,  rows: '18.6k' },
  { table: 'reservas',    name: 'idx_rsv_calendario', present: true, rows: '458k' },
]

interface TableStat {
  name: string
  rows: string
  size: string
  spark: number[]
}

const TOP_TABLES: TableStat[] = [
  { name: 'reservas',              rows: '458k', size: '124 MB', spark: [80, 90, 100, 110, 115, 118, 120, 122, 124] },
  { name: 'inventarios',           rows: '18.6k', size: '24 MB',  spark: [22, 22, 23, 23, 23, 24, 24, 24, 24] },
  { name: 'V_APS_Globales_V2',     rows: '38k',   size: '18 MB',  spark: [12, 14, 15, 16, 17, 17, 18, 18, 18] },
  { name: 'artes_tradicionales',   rows: '12.4k', size: '9.2 MB', spark: [7, 7, 8, 8, 8, 9, 9, 9, 9] },
  { name: 'imagenes_digitales',    rows: '8.1k',  size: '6.8 MB', spark: [5, 5, 6, 6, 6, 6, 7, 7, 7] },
  { name: 'campanas',              rows: '1.2k',  size: '3.4 MB', spark: [3, 3, 3, 3, 3, 3, 3, 4, 3] },
  { name: 'usuarios',              rows: '412',   size: '1.1 MB', spark: [1, 1, 1, 1, 1, 1, 1, 1, 1] },
]

interface Query {
  p95: string
  p99: string
  freq: string
  err: string
  status: 'ok' | 'warn' | 'crit'
  sql: string
  endpoint: string
  hint?: string
}

const HEAVY_QUERIES: Query[] = [
  {
    p95: '720 ms', p99: '1.24 s', freq: '1.4k', err: '0.2%', status: 'warn',
    sql: "SELECT r.*, i.nombre, ROW_NUMBER() OVER (PARTITION BY r.id_espacio_inventario ORDER BY r.fecha_inicio) FROM reservas r JOIN espacio_inventario ei ON …",
    endpoint: 'GET /api/dashboard/stats',
    hint: 'usa índice idx_rsv_calendario',
  },
  {
    p95: '480 ms', p99: '820 ms', freq: '620',  err: '0.0%', status: 'warn',
    sql: 'SELECT * FROM inventarios WHERE estatus IN (?) AND plaza = ? ORDER BY nombre',
    endpoint: 'GET /api/inventario',
  },
  {
    p95: '320 ms', p99: '580 ms', freq: '2.1k', err: '0.0%', status: 'ok',
    sql: 'SELECT * FROM campanas WHERE fecha_fin >= NOW() AND estatus = ?',
    endpoint: 'GET /api/campanas',
  },
  {
    p95: '2.4 s',  p99: '4.8 s',  freq: '12',   err: '25%',  status: 'crit',
    sql: 'SELECT * FROM V_APS_Globales_V2 WHERE catorcena BETWEEN ? AND ? GROUP BY plaza',
    endpoint: 'POST /api/reportes/aps',
    hint: 'timeout ocasional · sin índice compuesto (catorcena, plaza)',
  },
  {
    p95: '180 ms', p99: '260 ms', freq: '4.8k', err: '0.0%', status: 'ok',
    sql: 'SELECT id, nombre, rol FROM usuarios WHERE id = ?',
    endpoint: 'middleware/auth',
  },
]

interface Backup {
  date: string
  time: string
  size: string
  status: 'ok' | 'error'
  label: string
}

const BACKUPS: Backup[] = [
  { date: '2026-08-07', time: '02:00', size: '812 MB', status: 'ok', label: 'diario · automático' },
  { date: '2026-08-06', time: '02:00', size: '811 MB', status: 'ok', label: 'diario · automático' },
  { date: '2026-08-05', time: '02:00', size: '810 MB', status: 'ok', label: 'diario · automático' },
  { date: '2026-08-04', time: '02:00', size: '808 MB', status: 'ok', label: 'diario · automático' },
]

const SORT_KEYS = ['p95', 'p99', 'freq', 'err'] as const
type SortKey = (typeof SORT_KEYS)[number]

const STATUS_TEXT_COLOR: Record<'ok' | 'warn' | 'crit', string> = {
  ok: 'text-state-ok',
  warn: 'text-state-warn',
  crit: 'text-state-crit',
}

export default function Database() {
  const [sort, setSort] = useState<SortKey>('p95')
  const [expanded, setExpanded] = useState<string | null>(null)

  return (
    <div className="flex flex-col gap-6 text-[13px]">
      {/* Banner */}
      <div className="flex items-center justify-between border-b border-border-subtle pb-4">
        <div className="flex items-center gap-3">
          <span className="text-fg-muted text-[11.5px]">servicio</span>
          <span className="text-fg-primary text-[15px]">database.qeb</span>
          <span className="text-fg-faint">·</span>
          <span className="text-fg-muted text-[11.5px]">mysql-do · qeb-mysql-prod · u658050396_QEB</span>
        </div>
        <StatusBadge status="muted" label="mock · pendiente DO metrics" />
      </div>

      <div className="rounded-md bg-bg-inset border border-brand-500/30 px-3 py-2 text-[12px] text-brand-300 font-mono">
        [pendiente] métricas del cluster aún son ficticias. Para CPU/RAM/disco y queries pesadas reales necesitamos DO Personal Access Token (read) para el endpoint /databases/&#123;id&#125;/metrics, más habilitar el slow_query_log en el cluster.
      </div>

      {/* Cluster resources */}
      <Section title="recursos" subtitle="cluster · db-s-2vcpu-4gb">
        <MetricRow label="cpu"   value="38" unit="%"      spark={CPU_SPARK}  sparkColor="#FF9E64" hint="umbral 40 %" />
        <MetricRow label="ram"   value="62" unit="%"      spark={RAM_SPARK}  sparkColor="#7DCFFF" hint="2.5 / 4 GB" />
        <MetricRow label="disco" value="28" unit="%"      spark={DISK_SPARK} sparkColor="#BB9AF7" hint="22 / 80 GB" />
        <MetricRow
          label="conexiones"
          value="47"
          unit="/ 200"
          spark={CONN_SPARK}
          sparkColor="#9ECE6A"
          hint="inactivas 12 · pico 24h 89"
        />
      </Section>

      {/* Critical indexes */}
      <Section
        title="índices críticos"
        subtitle="verificación · add_idx_dashboard_perf.cjs"
        right={<StatusBadge status="ok" label="7 / 7 presentes" />}
      >
        <div className="mt-1">
          <div className="grid grid-cols-[60px_140px_1fr_100px] gap-3 px-2 py-1 text-[11px] text-fg-faint uppercase tracking-wide">
            <span>estado</span>
            <span>tabla</span>
            <span>índice</span>
            <span className="text-right">filas</span>
          </div>
          <div className="border-t border-border-subtle">
            {CRITICAL_INDEXES.map((idx, i) => (
              <div
                key={idx.name}
                className={cn(
                  'grid grid-cols-[60px_140px_1fr_100px] gap-3 px-2 py-1.5 items-center hover:bg-white/[0.02] transition-colors',
                  i !== 0 && 'border-t border-border-subtle',
                )}
              >
                <StatusBadge status={idx.present ? 'ok' : 'crit'} label={idx.present ? 'ok' : 'borrado'} />
                <span className="text-brand-300">{idx.table}</span>
                <span className="text-fg-primary">{idx.name}</span>
                <span className="text-right text-fg-muted tabular-nums">{idx.rows}</span>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* Table sizes */}
      <Section title="tamaño de tablas" subtitle="top tablas por peso">
        <div className="mt-1">
          <div className="grid grid-cols-[1fr_100px_100px_160px] gap-3 px-2 py-1 text-[11px] text-fg-faint uppercase tracking-wide">
            <span>tabla</span>
            <span className="text-right">filas</span>
            <span className="text-right">tamaño</span>
            <span className="text-right">crecimiento 30d</span>
          </div>
          <div className="border-t border-border-subtle">
            {TOP_TABLES.map((t, i) => (
              <div
                key={t.name}
                className={cn(
                  'grid grid-cols-[1fr_100px_100px_160px] gap-3 px-2 py-1.5 items-center hover:bg-white/[0.02] transition-colors',
                  i !== 0 && 'border-t border-border-subtle',
                )}
              >
                <span className="text-fg-primary">{t.name}</span>
                <span className="text-right text-fg-muted tabular-nums">{t.rows}</span>
                <span className="text-right text-fg-secondary tabular-nums">{t.size}</span>
                <span className="text-right">
                  <UnicodeSparkline data={t.spark} color="#BB9AF7" />
                </span>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* Heavy queries */}
      <Section
        title="queries pesadas"
        subtitle="últimas 24h · slow_log + instrumentación en la app"
        right={
          <div className="flex items-center gap-1 text-[11px]">
            <span className="text-fg-faint">orden:</span>
            {SORT_KEYS.map((k) => (
              <button
                key={k}
                onClick={() => setSort(k)}
                className={cn(
                  'px-2 h-6 rounded border',
                  sort === k
                    ? 'border-brand-500/40 bg-brand-500/10 text-brand-300'
                    : 'border-border-subtle text-fg-muted hover:text-fg-primary',
                )}
              >
                {k}
              </button>
            ))}
          </div>
        }
      >
        <div className="mt-1">
          <div className="grid grid-cols-[80px_80px_80px_70px_60px_1fr_110px] gap-3 px-2 py-1 text-[11px] text-fg-faint uppercase tracking-wide">
            <span>estado</span>
            <span className="text-right">p95</span>
            <span className="text-right">p99</span>
            <span className="text-right">freq</span>
            <span className="text-right">err</span>
            <span>query</span>
            <span className="text-right">acción</span>
          </div>
          <div className="border-t border-border-subtle">
            {HEAVY_QUERIES.map((q, i) => {
              const isOpen = expanded === q.sql
              return (
                <div key={q.sql} className={cn(i !== 0 && 'border-t border-border-subtle')}>
                  <div
                    onClick={() => setExpanded(isOpen ? null : q.sql)}
                    className="grid grid-cols-[80px_80px_80px_70px_60px_1fr_110px] gap-3 px-2 py-1.5 items-center hover:bg-white/[0.02] transition-colors cursor-pointer"
                  >
                    <StatusBadge status={q.status} />
                    <span className={cn('text-right tabular-nums', STATUS_TEXT_COLOR[q.status])}>
                      {q.p95}
                    </span>
                    <span className="text-right text-fg-secondary tabular-nums">{q.p99}</span>
                    <span className="text-right text-fg-muted tabular-nums">{q.freq}</span>
                    <span
                      className={cn(
                        'text-right tabular-nums',
                        q.status === 'crit' ? 'text-state-crit' : 'text-fg-muted',
                      )}
                    >
                      {q.err}
                    </span>
                    <span className="text-fg-primary truncate font-mono text-[12.5px]">
                      {q.sql}
                    </span>
                    <span className="text-right text-fg-faint text-[11px]">
                      {isOpen ? '[ocultar]' : '[detalles]'}
                    </span>
                  </div>
                  {isOpen && (
                    <div className="px-2 pb-3 bg-white/[0.015]">
                      <div className="rounded-md bg-bg-inset border border-border-subtle p-3 font-mono text-[12px] text-fg-primary whitespace-pre-wrap break-words">
                        {q.sql}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-4 text-[11.5px] px-1">
                        <span>
                          <span className="text-fg-faint">endpoint </span>
                          <span className="text-brand-300">{q.endpoint}</span>
                        </span>
                        {q.hint && (
                          <span>
                            <span className="text-fg-faint">nota </span>
                            <span className="text-state-warn">{q.hint}</span>
                          </span>
                        )}
                        <button className="ml-auto text-state-crit hover:underline">
                          [matar query]
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </Section>

      {/* Backups */}
      <Section title="respaldos" subtitle="snapshots automáticos de digitalocean">
        <div className="mt-1">
          <div className="grid grid-cols-[60px_100px_80px_100px_1fr] gap-3 px-2 py-1 text-[11px] text-fg-faint uppercase tracking-wide">
            <span>estado</span>
            <span>fecha</span>
            <span>hora</span>
            <span className="text-right">tamaño</span>
            <span>etiqueta</span>
          </div>
          <div className="border-t border-border-subtle">
            {BACKUPS.map((b, i) => (
              <div
                key={b.date + b.time}
                className={cn(
                  'grid grid-cols-[60px_100px_80px_100px_1fr] gap-3 px-2 py-1.5 items-center hover:bg-white/[0.02] transition-colors',
                  i !== 0 && 'border-t border-border-subtle',
                )}
              >
                <StatusBadge status={b.status === 'ok' ? 'ok' : 'crit'} />
                <span className="text-fg-muted tabular-nums">{b.date}</span>
                <span className="text-fg-secondary tabular-nums">{b.time}</span>
                <span className="text-right text-fg-primary tabular-nums">{b.size}</span>
                <span className="text-fg-muted text-[11.5px]">{b.label}</span>
              </div>
            ))}
          </div>
        </div>
      </Section>
    </div>
  )
}
