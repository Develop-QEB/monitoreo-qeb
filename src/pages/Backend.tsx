import { useState } from 'react'
import { Section } from '@/components/ui/Section'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { UnicodeSparkline } from '@/components/ui/UnicodeSparkline'
import { DeployCard, type Deploy } from '@/components/ui/DeployCard'
import { MetricRow } from '@/components/ui/MetricRow'
import { Prompt } from '@/components/ui/Prompt'
import { cn } from '@/lib/utils'

const LATEST: Deploy = {
  hash: 'd4f2a19',
  status: 'ready',
  branch: 'main',
  actor: 'akary',
  duration: '4m 22s',
  relative: 'hace 12 min',
}

const HISTORY: Deploy[] = [
  { hash: 'e1c8b34', status: 'ready',    branch: 'main', actor: 'mario', duration: '3m 58s', relative: 'hace 3 h' },
  { hash: 'a5d7e02', status: 'ready',    branch: 'main', actor: 'akary', duration: '5m 12s', relative: 'hace 1 d' },
  { hash: 'b9f4c67', status: 'error',    branch: 'main', actor: 'akary', duration: '1m 04s', relative: 'hace 2 d' },
]

const CPU_SPARK = [18, 22, 20, 24, 26, 22, 20, 24, 22, 20, 24, 22]
const RAM_SPARK = [56, 58, 57, 60, 62, 58, 57, 60, 58, 56, 58, 58]

interface EndpointStat {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  path: string
  p95: string
  err: string
  status: 'ok' | 'warn' | 'crit'
  spark: number[]
}

const ENDPOINTS: EndpointStat[] = [
  { method: 'GET',  path: '/api/dashboard/stats',       p95: '248 ms', err: '0.1%',  status: 'ok',   spark: [230, 245, 250, 248, 244, 250, 245, 248, 240, 248] },
  { method: 'POST', path: '/api/reservas',              p95: '180 ms', err: '0.0%',  status: 'ok',   spark: [170, 178, 180, 175, 172, 184, 180, 178, 180, 180] },
  { method: 'GET',  path: '/api/campanas',              p95: '156 ms', err: '0.0%',  status: 'ok',   spark: [150, 155, 158, 154, 152, 160, 156, 154, 156, 156] },
  { method: 'GET',  path: '/api/inventario',            p95: '412 ms', err: '0.4%',  status: 'warn', spark: [380, 390, 400, 415, 420, 405, 410, 425, 415, 412] },
  { method: 'POST', path: '/api/auth/login',            p95: '92 ms',  err: '2.1%',  status: 'warn', spark: [85, 88, 90, 92, 95, 90, 88, 92, 94, 92] },
  { method: 'GET',  path: '/api/sap/articulos',         p95: '820 ms', err: '0.8%',  status: 'warn', spark: [780, 800, 820, 830, 815, 820, 825, 820, 815, 820] },
]

interface LogRow {
  time: string
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG'
  source: string
  msg: string
  tail?: string
  req?: string
}

const LOGS: LogRow[] = [
  { time: '14:52:03', level: 'INFO',  source: 'http',        msg: 'GET  /api/dashboard/stats  200',        tail: '248 ms', req: 'req_a1b2' },
  { time: '14:51:58', level: 'INFO',  source: 'socket',      msg: 'cliente conectado · usuario 4231',                       req: 'ws_c8d1'  },
  { time: '14:51:41', level: 'WARN',  source: 'query',       msg: 'query lenta · SELECT ... FROM reservas', tail: '720 ms', req: 'req_a0f2' },
  { time: '14:50:22', level: 'INFO',  source: 'http',        msg: 'POST /api/reservas  201',                tail: '182 ms', req: 'req_9d3e' },
  { time: '14:49:15', level: 'ERROR', source: 'sap',         msg: 'ECONNREFUSED tunnel trycloudflare',      tail: 'reintento', req: 'req_8b71' },
  { time: '14:49:11', level: 'INFO',  source: 'sap',         msg: 'sondeo del tunnel · reintentando en 2s' },
  { time: '14:48:03', level: 'INFO',  source: 'http',        msg: 'GET  /api/campanas  200',                tail: '156 ms', req: 'req_7c22' },
  { time: '14:47:44', level: 'DEBUG', source: 'prisma',      msg: 'cache hit · Campana.findMany' },
  { time: '14:45:00', level: 'INFO',  source: 'cron',        msg: 'agregación diaria iniciada' },
  { time: '14:44:59', level: 'INFO',  source: 'cron',        msg: 'agregación ok · 458k filas',             tail: '4.2 s' },
]

const LEVEL_COLOR: Record<LogRow['level'], string> = {
  INFO:  'text-fg-muted',
  WARN:  'text-state-warn',
  ERROR: 'text-state-crit',
  DEBUG: 'text-fg-faint',
}

interface ErrorGroup {
  count: number
  first: string
  last: string
  source: string
  signature: string
  spark: number[]
}

const ERROR_GROUPS: ErrorGroup[] = [
  { count: 24, first: '2026-08-05 09:12', last: '14:49:15', source: 'sap',     signature: 'ECONNREFUSED tunnel trycloudflare',    spark: [3, 1, 4, 2, 5, 4, 3, 2] },
  { count:  8, first: '2026-08-06 11:04', last: '13:22:41', source: 'prisma',  signature: 'PrismaClientKnownRequestError · P2025', spark: [1, 1, 2, 1, 1, 1, 1, 0] },
  { count:  3, first: '2026-08-07 10:12', last: '10:18:03', source: 'auth',    signature: 'JsonWebTokenError · invalid signature', spark: [0, 0, 1, 1, 1, 0, 0, 0] },
  { count:  1, first: '2026-08-07 08:45', last: '08:45:12', source: 'multer',  signature: 'MulterError · LIMIT_FILE_SIZE',          spark: [0, 0, 0, 0, 0, 0, 0, 1] },
]

const LEVELS = ['TODOS', 'INFO', 'WARN', 'ERROR', 'DEBUG'] as const
type LevelFilter = (typeof LEVELS)[number]

export default function Backend() {
  const [level, setLevel] = useState<LevelFilter>('TODOS')
  const [search, setSearch] = useState('')

  const filtered = LOGS.filter(
    (l) =>
      (level === 'TODOS' || l.level === level) &&
      (search === '' || (l.msg + l.source).toLowerCase().includes(search.toLowerCase())),
  )

  return (
    <div className="flex flex-col gap-6 text-[13px]">
      {/* Banner */}
      <div className="flex items-center justify-between border-b border-border-subtle pb-4">
        <div className="flex items-center gap-3">
          <span className="text-fg-muted text-[11.5px]">servicio</span>
          <span className="text-fg-primary text-[15px]">backend.qeb</span>
          <span className="text-fg-faint">·</span>
          <span className="text-fg-muted text-[11.5px]">digitalocean · main</span>
          <span className="text-fg-faint">·</span>
          <a
            href="https://api.qeb.mx/health"
            target="_blank"
            rel="noreferrer"
            className="text-brand-400 hover:underline text-[11.5px]"
          >
            api.qeb.mx ↗
          </a>
        </div>
        <StatusBadge status="ok" label="operativo" />
      </div>

      {/* Deploy */}
      <Section title="despliegues" subtitle="último + historial · api de digitalocean apps">
        <DeployCard latest={LATEST} history={HISTORY} />
      </Section>

      {/* Resources */}
      <Section title="recursos" subtitle="droplet · basic-2 · 2 vCPU · 4 GB RAM">
        <MetricRow label="cpu"  value="22" unit="%"    spark={CPU_SPARK} sparkColor="#9ECE6A" hint="promedio 24h  20 %" />
        <MetricRow label="ram"  value="58" unit="%"    spark={RAM_SPARK} sparkColor="#7DCFFF" hint="2.3 / 4 GB" />
        <MetricRow label="disco" value="34" unit="%"    spark={[32,32,33,33,34,34,34,34,34,34]} sparkColor="#BB9AF7" hint="27 / 80 GB" />
        <MetricRow label="red"  value="12" unit="MB/s" spark={[8,10,14,12,16,18,14,12,10,12]} sparkColor="#BB9AF7" hint="entrada/salida prom" />
      </Section>

      {/* SAP Tunnel */}
      <Section
        title="tunnel sap"
        subtitle="cloudflared quick-tunnel · 213.255.227.117"
        right={<StatusBadge status="ok" label="activo · 4h 32m" />}
      >
        <div className="mt-2 px-2 flex flex-col gap-1.5">
          <div className="grid grid-cols-[140px_1fr] gap-3">
            <span className="text-fg-muted">url</span>
            <span className="text-fg-primary truncate">
              workflow-namely-changes-nothing.trycloudflare.com
            </span>
          </div>
          <div className="grid grid-cols-[140px_1fr] gap-3">
            <span className="text-fg-muted">última reconexión</span>
            <span className="text-fg-secondary">
              2026-08-07 11:02  <span className="text-fg-faint">· después del reboot del vps</span>
            </span>
          </div>
          <div className="grid grid-cols-[140px_1fr] gap-3">
            <span className="text-fg-muted">sondeos 24h</span>
            <span className="text-fg-secondary">
              288 <span className="text-fg-faint">· 0 fallidos · 1.4s promedio</span>
            </span>
          </div>
        </div>
      </Section>

      {/* Socket.io */}
      <Section title="socket.io" subtitle="conexiones activas · ws">
        <div className="mt-2 px-2 flex items-baseline gap-6">
          <div>
            <div className="text-fg-faint uppercase tracking-wide text-[10.5px]">activas</div>
            <div className="text-fg-primary tabular-nums text-[22px]">47</div>
          </div>
          <div>
            <div className="text-fg-faint uppercase tracking-wide text-[10.5px]">pico 24h</div>
            <div className="text-fg-secondary tabular-nums text-[16px]">63</div>
          </div>
          <div className="flex-1">
            <UnicodeSparkline
              data={[22, 24, 28, 30, 34, 36, 38, 40, 42, 44, 46, 47, 63, 55, 47]}
              color="#7DCFFF"
              className="text-[14px]"
            />
          </div>
        </div>
      </Section>

      {/* Endpoints */}
      <Section title="endpoints" subtitle="latencia por ruta · p95 24h · % de error">
        <div className="mt-1">
          <div className="grid grid-cols-[80px_60px_1fr_100px_80px_160px] gap-3 px-2 py-1 text-[11px] text-fg-faint uppercase tracking-wide">
            <span>estado</span>
            <span>mtd</span>
            <span>ruta</span>
            <span className="text-right">p95</span>
            <span className="text-right">err</span>
            <span className="text-right">24h</span>
          </div>
          <div className="border-t border-border-subtle">
            {ENDPOINTS.map((e, i) => (
              <div
                key={e.method + e.path}
                className={cn(
                  'grid grid-cols-[80px_60px_1fr_100px_80px_160px] gap-3 px-2 py-1.5 items-center hover:bg-white/[0.02] transition-colors',
                  i !== 0 && 'border-t border-border-subtle',
                )}
              >
                <StatusBadge status={e.status} />
                <span className="text-brand-300">{e.method}</span>
                <span className="text-fg-primary truncate">{e.path}</span>
                <span className="text-right text-fg-primary tabular-nums">{e.p95}</span>
                <span
                  className={cn(
                    'text-right tabular-nums',
                    e.status === 'ok' ? 'text-fg-muted' : 'text-state-warn',
                  )}
                >
                  {e.err}
                </span>
                <span className="text-right">
                  <UnicodeSparkline
                    data={e.spark}
                    color={e.status === 'warn' ? '#FF9E64' : '#9ECE6A'}
                  />
                </span>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* Logs viewer */}
      <Section
        title="logs"
        subtitle="~/back-qeb · archivo propio · retención ilimitada"
        right={
          <span className="text-fg-muted text-[11px]">
            {filtered.length} / {LOGS.length}
          </span>
        }
      >
        <div className="mt-2">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2 mb-2 text-[11.5px] px-2">
            <span className="text-fg-faint">filtro:</span>
            <div className="flex items-center gap-1">
              {LEVELS.map((lv) => (
                <button
                  key={lv}
                  onClick={() => setLevel(lv)}
                  className={cn(
                    'px-2 h-6 rounded border transition-colors',
                    level === lv
                      ? 'border-brand-500/40 bg-brand-500/10 text-brand-300'
                      : 'border-border-subtle text-fg-muted hover:text-fg-primary hover:bg-white/[0.02]',
                  )}
                >
                  {lv.toLowerCase()}
                </button>
              ))}
            </div>
            <span className="text-fg-faint ml-2">·</span>
            <label className="text-fg-faint ml-1">desde</label>
            <input
              type="date"
              defaultValue="2026-08-07"
              className="bg-bg-card border border-border-subtle rounded px-2 h-6 text-fg-secondary tabular-nums outline-none focus:border-brand-500/50"
            />
            <label className="text-fg-faint">hasta</label>
            <input
              type="date"
              defaultValue="2026-08-07"
              className="bg-bg-card border border-border-subtle rounded px-2 h-6 text-fg-secondary tabular-nums outline-none focus:border-brand-500/50"
            />
            <span className="text-fg-faint">·</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="buscar..."
              className="bg-bg-card border border-border-subtle rounded px-2 h-6 text-fg-secondary outline-none focus:border-brand-500/50 min-w-[160px] flex-1 max-w-xs"
            />
          </div>

          {/* Log stream */}
          <div className="rounded-md bg-bg-inset border border-border-subtle px-3 py-2 font-mono text-[12.5px] max-h-[420px] overflow-auto">
            {filtered.map((l) => (
              <div
                key={l.time + l.msg}
                className="grid grid-cols-[80px_60px_100px_1fr_100px_80px] gap-3 py-0.5 hover:bg-white/[0.02] px-1 -mx-1 rounded"
              >
                <span className="text-fg-muted tabular-nums glyph">{l.time}</span>
                <span className={cn('font-medium', LEVEL_COLOR[l.level])}>{l.level}</span>
                <span className="text-fg-secondary truncate">{l.source}</span>
                <span className="text-fg-primary truncate">{l.msg}</span>
                <span className="text-fg-muted tabular-nums truncate text-right">{l.tail}</span>
                <span className="text-fg-faint tabular-nums truncate text-right">{l.req}</span>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="text-fg-muted text-center py-4">
                sin resultados para el filtro actual
              </div>
            )}
            <div className="mt-2">
              <Prompt />
            </div>
          </div>
        </div>
      </Section>

      {/* Error groups */}
      <Section
        title="errores agrupados"
        subtitle="agrupados por firma (mensaje + stack) · 7 días"
        right={<span className="text-fg-muted text-[11px]">4 grupos</span>}
      >
        <div className="mt-1">
          <div className="grid grid-cols-[60px_80px_140px_140px_1fr_120px] gap-3 px-2 py-1 text-[11px] text-fg-faint uppercase tracking-wide">
            <span className="text-right">conteo</span>
            <span>fuente</span>
            <span>primera vez</span>
            <span>última vez</span>
            <span>firma</span>
            <span className="text-right">tendencia</span>
          </div>
          <div className="border-t border-border-subtle">
            {ERROR_GROUPS.map((g, i) => (
              <div
                key={g.signature}
                className={cn(
                  'grid grid-cols-[60px_80px_140px_140px_1fr_120px] gap-3 px-2 py-1.5 items-center hover:bg-white/[0.02] transition-colors cursor-pointer',
                  i !== 0 && 'border-t border-border-subtle',
                )}
              >
                <span className="text-right text-state-crit tabular-nums font-medium">
                  {g.count}
                </span>
                <span className="text-brand-300">{g.source}</span>
                <span className="text-fg-muted tabular-nums text-[11.5px]">{g.first}</span>
                <span className="text-fg-secondary tabular-nums text-[11.5px]">{g.last}</span>
                <span className="text-fg-primary truncate">{g.signature}</span>
                <span className="text-right">
                  <UnicodeSparkline data={g.spark} color="#F7768E" />
                </span>
              </div>
            ))}
          </div>
        </div>
      </Section>
    </div>
  )
}
