import { cn } from '@/lib/utils'

export type DeployStatus = 'queued' | 'building' | 'deploying' | 'ready' | 'error' | 'canceled'

const STATUS_STYLE: Record<
  DeployStatus,
  { label: string; text: string; dot: string; pulse: boolean }
> = {
  queued:    { label: 'queued',    text: 'text-fg-muted',    dot: 'bg-fg-muted',    pulse: true },
  building:  { label: 'building',  text: 'text-state-info',  dot: 'bg-state-info',  pulse: true },
  deploying: { label: 'deploying', text: 'text-brand-400',   dot: 'bg-brand-400',   pulse: true },
  ready:     { label: 'ready',     text: 'text-state-ok',    dot: 'bg-state-ok',    pulse: false },
  error:     { label: 'error',     text: 'text-state-crit',  dot: 'bg-state-crit',  pulse: false },
  canceled:  { label: 'canceled',  text: 'text-fg-muted',    dot: 'bg-fg-muted',    pulse: false },
}

export interface Deploy {
  hash: string
  status: DeployStatus
  branch: string
  actor: string
  duration: string
  relative: string
}

interface Props {
  latest: Deploy
  history: Deploy[]
}

function StatusDot({ status }: { status: DeployStatus }) {
  const s = STATUS_STYLE[status]
  return (
    <span className="relative flex h-1.5 w-1.5 shrink-0">
      {s.pulse && (
        <span className={cn('absolute inline-flex h-full w-full rounded-full opacity-70 animate-ping', s.dot)} />
      )}
      <span className={cn('relative inline-flex h-1.5 w-1.5 rounded-full', s.dot)} />
    </span>
  )
}

function DeployRow({ d, primary = false }: { d: Deploy; primary?: boolean }) {
  const s = STATUS_STYLE[d.status]
  return (
    <div
      className={cn(
        'grid grid-cols-[16px_90px_100px_1fr_100px_120px] gap-3 items-center px-2 py-1.5 rounded',
        'hover:bg-white/[0.02] transition-colors',
        primary && 'text-[14px]',
      )}
    >
      <StatusDot status={d.status} />
      <span className={cn('font-medium', s.text)}>{s.label}</span>
      <span className="text-fg-primary tabular-nums">#{d.hash}</span>
      <span className="text-fg-muted truncate">
        <span className="text-fg-faint">branch </span>
        {d.branch}
        <span className="text-fg-faint"> · by </span>
        {d.actor}
      </span>
      <span className="text-fg-secondary tabular-nums text-right">{d.duration}</span>
      <span className="text-fg-muted tabular-nums text-right">{d.relative}</span>
    </div>
  )
}

export function DeployCard({ latest, history }: Props) {
  return (
    <div className="mt-2">
      <DeployRow d={latest} primary />
      {history.length > 0 && (
        <>
          <div className="mt-3 mb-1 px-2 text-[11px] text-fg-faint uppercase tracking-wide">
            history
          </div>
          <div className="divide-y divide-border-subtle">
            {history.map((d) => (
              <DeployRow key={d.hash} d={d} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
