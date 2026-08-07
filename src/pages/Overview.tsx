import { Section } from '@/components/ui/Section'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { UnicodeSparkline } from '@/components/ui/UnicodeSparkline'
import { Prompt } from '@/components/ui/Prompt'
import { cn } from '@/lib/utils'

const SPARK_FRONT = [180, 178, 182, 176, 172, 184, 179, 175, 180, 182, 178, 182]
const SPARK_BACK = [255, 248, 260, 250, 242, 238, 245, 240, 238, 242, 240, 240]
const SPARK_DB = [24, 26, 28, 30, 32, 34, 33, 36, 34, 37, 38, 38]
const SPARK_USERS = [22, 24, 28, 30, 34, 36, 38, 40, 42, 44, 46, 47]

type Status = 'ok' | 'warn' | 'crit' | 'info'

interface ServiceRow {
  name: string
  route: string
  value: string
  status: Status
  spark: number[]
  sparkColor: string
}

const SERVICES: ServiceRow[] = [
  {
    name: 'frontend',
    route: 'GET /',
    value: '182 ms',
    status: 'ok',
    spark: SPARK_FRONT,
    sparkColor: '#9ECE6A',
  },
  {
    name: 'backend',
    route: 'api/*',
    value: '240 ms',
    status: 'ok',
    spark: SPARK_BACK,
    sparkColor: '#9ECE6A',
  },
  {
    name: 'database',
    route: 'cpu',
    value: '38 %',
    status: 'warn',
    spark: SPARK_DB,
    sparkColor: '#FF9E64',
  },
  {
    name: 'sap-tunnel',
    route: 'quick-tunnel',
    value: 'up · 4h 32m',
    status: 'ok',
    spark: [],
    sparkColor: '#9ECE6A',
  },
  {
    name: 'socket.io',
    route: 'ws',
    value: '47 conn',
    status: 'ok',
    spark: SPARK_USERS,
    sparkColor: '#7DCFFF',
  },
]

interface LogRow {
  time: string
  level: 'INFO' | 'WARN' | 'ERROR'
  source: string
  msg: string
  tail?: string
}

const LOGS: LogRow[] = [
  { time: '14:52:03', level: 'INFO', source: 'vercel.deploy', msg: 'ready', tail: '#a8f3c1' },
  { time: '14:38:22', level: 'WARN', source: 'api.dashboard', msg: 'slow query', tail: '720 ms' },
  { time: '14:22:11', level: 'INFO', source: 'socket.conn', msg: '47 users online' },
  { time: '13:10:04', level: 'INFO', source: 'mysql.backup', msg: 'qeb-mysql-prod', tail: '812 MB' },
  { time: '11:02:15', level: 'INFO', source: 'sap.tunnel', msg: 'reconnected', tail: 'trycloudflare' },
  { time: '09:41:00', level: 'INFO', source: 'http.health', msg: '200 OK', tail: '168 ms' },
]

const LEVEL_COLOR: Record<LogRow['level'], string> = {
  INFO: 'text-fg-muted',
  WARN: 'text-state-warn',
  ERROR: 'text-state-crit',
}

export default function Overview() {
  return (
    <div className="flex flex-col gap-6 text-[13px]">
      {/* Top banner */}
      <div className="flex items-center justify-between border-b border-border-subtle pb-4">
        <div className="flex items-baseline gap-3">
          <span className="text-fg-muted text-[11.5px]">uptime · 30d</span>
          <span className="text-fg-primary text-[28px] font-medium tracking-tight tabular-nums leading-none">
            99.98
          </span>
          <span className="text-fg-muted text-[13px]">%</span>
        </div>
        <div className="flex items-center gap-6">
          <span className="text-fg-muted text-[11.5px]">
            sla <span className="text-fg-secondary">99.90 %</span>
          </span>
          <span className="text-fg-muted text-[11.5px]">
            incidents <span className="text-fg-secondary">0</span>
          </span>
          <StatusBadge status="ok" label="all systems ok" />
        </div>
      </div>

      {/* Services */}
      <Section title="services" subtitle="live · 5s poll">
        <div className="mt-1">
          {/* header row */}
          <div className="grid grid-cols-[100px_120px_1fr_120px_120px] gap-3 px-2 py-1 text-[11px] text-fg-faint uppercase tracking-wide">
            <span>status</span>
            <span>service</span>
            <span>route</span>
            <span className="text-right">value</span>
            <span className="text-right">24h</span>
          </div>
          <div className="border-t border-border-subtle">
            {SERVICES.map((s, i) => (
              <div
                key={s.name}
                className={cn(
                  'grid grid-cols-[100px_120px_1fr_120px_120px] gap-3 px-2 py-2 items-center hover:bg-white/[0.02] transition-colors',
                  i !== 0 && 'border-t border-border-subtle',
                )}
              >
                <StatusBadge status={s.status} />
                <span className="text-fg-primary">{s.name}</span>
                <span className="text-fg-muted">
                  <span className="text-fg-faint">→ </span>
                  {s.route}
                </span>
                <span className="text-right text-fg-primary tabular-nums glyph">
                  {s.value}
                </span>
                <span className="text-right">
                  {s.spark.length > 0 ? (
                    <UnicodeSparkline data={s.spark} color={s.sparkColor} />
                  ) : (
                    <span className="text-fg-faint">──────────</span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* Logs */}
      <Section
        title="logs"
        subtitle="~/back-qeb · tail -f · últimas 24h"
        right={
          <span className="text-fg-muted text-[11px]">
            [i]nfo · [w]arn · [e]rror
          </span>
        }
      >
        <div className="mt-2 rounded-md bg-bg-inset border border-border-subtle px-3 py-2 font-mono text-[12.5px]">
          {LOGS.map((l) => (
            <div
              key={l.time + l.source}
              className="grid grid-cols-[80px_60px_180px_1fr_auto] gap-3 py-0.5 hover:bg-white/[0.02] px-1 -mx-1 rounded"
            >
              <span className="text-fg-muted tabular-nums glyph">{l.time}</span>
              <span className={cn('font-medium', LEVEL_COLOR[l.level])}>{l.level}</span>
              <span className="text-fg-secondary truncate">{l.source}</span>
              <span className="text-fg-primary truncate">{l.msg}</span>
              {l.tail && <span className="text-fg-muted tabular-nums">{l.tail}</span>}
            </div>
          ))}
          <div className="mt-2">
            <Prompt />
          </div>
        </div>
      </Section>
    </div>
  )
}
