import { Section } from '@/components/ui/Section'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { UnicodeSparkline } from '@/components/ui/UnicodeSparkline'
import { cn } from '@/lib/utils'

const CONNECTIONS_24H = [
  12, 10, 8, 6, 5, 4, 6, 12, 22, 34, 42, 48, 52, 56, 58, 55, 52, 48, 44, 40, 36, 30, 22, 18,
]

interface Session {
  user: string
  email: string
  role: 'asesor' | 'admin' | 'coordinador' | 'diseñador'
  page: string
  since: string
  active: boolean
}

const LIVE_SESSIONS: Session[] = [
  { user: 'akary',    email: 'develop@qeb.mx',       role: 'admin',       page: '/dashboard',            since: '14:32', active: true  },
  { user: 'mario',    email: 'mario@qeb.mx',         role: 'admin',       page: '/reservas',             since: '13:58', active: true  },
  { user: 'jos',      email: 'jos@qeb.mx',           role: 'coordinador', page: '/campanas/2409',        since: '14:22', active: true  },
  { user: 'nadia',    email: 'nadia@qeb.mx',         role: 'asesor',     page: '/inventario',           since: '14:15', active: true  },
  { user: 'ricardo',  email: 'ricardo@qeb.mx',       role: 'asesor',     page: '/dashboard',            since: '14:47', active: true  },
  { user: 'sofia',    email: 'sofia@qeb.mx',         role: 'diseñador',  page: '/campanas/2418/artes',  since: '13:11', active: false },
]

interface TopUser {
  name: string
  email: string
  sessions7d: number
  timeAvg: string
  spark: number[]
}

const TOP_USERS: TopUser[] = [
  { name: 'akary',    email: 'develop@qeb.mx',  sessions7d: 42, timeAvg: '4h 12m', spark: [5, 6, 6, 7, 6, 6, 6] },
  { name: 'mario',    email: 'mario@qeb.mx',    sessions7d: 38, timeAvg: '3h 48m', spark: [5, 5, 6, 6, 5, 5, 6] },
  { name: 'nadia',    email: 'nadia@qeb.mx',    sessions7d: 34, timeAvg: '3h 22m', spark: [4, 5, 5, 5, 5, 4, 5] },
  { name: 'jos',      email: 'jos@qeb.mx',      sessions7d: 28, timeAvg: '2h 55m', spark: [4, 4, 4, 4, 4, 4, 4] },
  { name: 'ricardo',  email: 'ricardo@qeb.mx',  sessions7d: 22, timeAvg: '2h 10m', spark: [3, 3, 3, 4, 3, 3, 3] },
]

interface LoginRow {
  time: string
  user: string
  ip: string
  status: 'ok' | 'fail'
  ua: string
}

const RECENT_LOGINS: LoginRow[] = [
  { time: '14:47:12', user: 'ricardo',  ip: '187.144.22.14',   status: 'ok',   ua: 'Chrome · Windows' },
  { time: '14:32:04', user: 'akary',    ip: '189.203.14.211',  status: 'ok',   ua: 'Chrome · Windows' },
  { time: '14:22:41', user: 'jos',      ip: '201.148.9.44',    status: 'ok',   ua: 'Safari · macOS' },
  { time: '14:15:33', user: 'nadia',    ip: '187.144.22.14',   status: 'ok',   ua: 'Chrome · Windows' },
  { time: '13:58:12', user: 'mario',    ip: '189.203.14.211',  status: 'ok',   ua: 'Chrome · Windows' },
  { time: '13:11:04', user: 'sofia',    ip: '201.148.9.44',    status: 'ok',   ua: 'Firefox · macOS' },
  { time: '12:44:19', user: 'desconocido',  ip: '45.129.244.10',   status: 'fail', ua: 'curl/7.88.1' },
  { time: '12:44:15', user: 'desconocido',  ip: '45.129.244.10',   status: 'fail', ua: 'curl/7.88.1' },
]

const ROLE_COLOR: Record<Session['role'], string> = {
  admin:       'text-state-crit',
  coordinador: 'text-brand-300',
  asesor:      'text-state-info',
  diseñador:   'text-state-orange',
}

export default function Actividad() {
  return (
    <div className="flex flex-col gap-6 text-[13px]">
      <div className="flex items-center justify-between border-b border-border-subtle pb-4">
        <div className="flex items-center gap-3">
          <span className="text-fg-muted text-[11.5px]">negocio</span>
          <span className="text-fg-primary text-[15px]">actividad.qeb</span>
          <span className="text-fg-faint">·</span>
          <span className="text-fg-muted text-[11.5px]">usuarios · sesiones · tiempo real</span>
        </div>
        <StatusBadge status="info" label="6 en línea ahora" />
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'en línea ahora',  value: '6',   accent: 'text-state-info' },
          { label: 'pico 24h',        value: '58',  accent: 'text-fg-primary' },
          { label: 'logins 24h',      value: '124', accent: 'text-fg-primary' },
          { label: 'logins fallidos', value: '3',   accent: 'text-state-warn' },
        ].map((k) => (
          <div key={k.label} className="rounded-md bg-bg-card border border-border-subtle px-4 py-3">
            <div className="text-fg-faint text-[10.5px] uppercase tracking-wide">{k.label}</div>
            <div className={cn('tabular-nums text-[22px] mt-1', k.accent)}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Connections timeline */}
      <Section title="conexiones" subtitle="usuarios simultáneos · 24h">
        <div className="mt-2 px-2">
          <UnicodeSparkline data={CONNECTIONS_24H} color="#7DCFFF" className="text-[16px]" />
          <div className="mt-2 flex justify-between text-fg-faint text-[10.5px] tabular-nums">
            <span>00:00</span>
            <span>06:00</span>
            <span>12:00</span>
            <span>18:00</span>
            <span>ahora</span>
          </div>
        </div>
      </Section>

      {/* Live sessions */}
      <Section title="sesiones activas" subtitle="en tiempo real vía socket.io">
        <div className="mt-1">
          <div className="grid grid-cols-[80px_100px_180px_100px_1fr_80px] gap-3 px-2 py-1 text-[11px] text-fg-faint uppercase tracking-wide">
            <span>estado</span>
            <span>usuario</span>
            <span>email</span>
            <span>rol</span>
            <span>viendo</span>
            <span className="text-right">desde</span>
          </div>
          <div className="border-t border-border-subtle">
            {LIVE_SESSIONS.map((s, i) => (
              <div
                key={s.user}
                className={cn(
                  'grid grid-cols-[80px_100px_180px_100px_1fr_80px] gap-3 px-2 py-1.5 items-center hover:bg-white/[0.02] transition-colors',
                  i !== 0 && 'border-t border-border-subtle',
                )}
              >
                <StatusBadge status={s.active ? 'ok' : 'muted'} label={s.active ? 'en vivo' : 'inactivo'} />
                <span className="text-fg-primary">{s.user}</span>
                <span className="text-fg-muted truncate">{s.email}</span>
                <span className={cn('text-[11.5px]', ROLE_COLOR[s.role])}>{s.role}</span>
                <span className="text-fg-primary font-mono text-[12px] truncate">{s.page}</span>
                <span className="text-right text-fg-muted tabular-nums text-[11.5px]">
                  {s.since}
                </span>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* Top users */}
      <Section title="más activos" subtitle="últimos 7 días · sesiones y tiempo promedio">
        <div className="mt-1">
          <div className="grid grid-cols-[120px_1fr_100px_100px_120px] gap-3 px-2 py-1 text-[11px] text-fg-faint uppercase tracking-wide">
            <span>usuario</span>
            <span>email</span>
            <span className="text-right">sesiones 7d</span>
            <span className="text-right">tiempo prom</span>
            <span className="text-right">tendencia</span>
          </div>
          <div className="border-t border-border-subtle">
            {TOP_USERS.map((u, i) => (
              <div
                key={u.email}
                className={cn(
                  'grid grid-cols-[120px_1fr_100px_100px_120px] gap-3 px-2 py-1.5 items-center hover:bg-white/[0.02] transition-colors',
                  i !== 0 && 'border-t border-border-subtle',
                )}
              >
                <span className="text-fg-primary">{u.name}</span>
                <span className="text-fg-muted truncate">{u.email}</span>
                <span className="text-right text-fg-primary tabular-nums">{u.sessions7d}</span>
                <span className="text-right text-fg-secondary tabular-nums">{u.timeAvg}</span>
                <span className="text-right">
                  <UnicodeSparkline data={u.spark} color="#BB9AF7" />
                </span>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* Recent logins */}
      <Section title="logins recientes" subtitle="24h · exitosos y fallidos">
        <div className="mt-1">
          <div className="grid grid-cols-[80px_100px_140px_60px_1fr] gap-3 px-2 py-1 text-[11px] text-fg-faint uppercase tracking-wide">
            <span>hora</span>
            <span>usuario</span>
            <span>ip</span>
            <span>estado</span>
            <span>navegador</span>
          </div>
          <div className="border-t border-border-subtle">
            {RECENT_LOGINS.map((l, i) => (
              <div
                key={l.time + l.user}
                className={cn(
                  'grid grid-cols-[80px_100px_140px_60px_1fr] gap-3 px-2 py-1.5 items-center hover:bg-white/[0.02] transition-colors',
                  i !== 0 && 'border-t border-border-subtle',
                )}
              >
                <span className="text-fg-muted tabular-nums glyph text-[11.5px]">{l.time}</span>
                <span className={cn(l.status === 'fail' ? 'text-state-crit' : 'text-fg-primary')}>
                  {l.user}
                </span>
                <span className="text-fg-muted tabular-nums text-[11.5px]">{l.ip}</span>
                <StatusBadge status={l.status === 'ok' ? 'ok' : 'crit'} />
                <span className="text-fg-muted truncate text-[11.5px]">{l.ua}</span>
              </div>
            ))}
          </div>
        </div>
      </Section>
    </div>
  )
}
