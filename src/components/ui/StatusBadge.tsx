import { cn } from '@/lib/utils'

export type StatusKind = 'ok' | 'warn' | 'crit' | 'info' | 'muted'

const COLOR: Record<StatusKind, string> = {
  ok: 'text-state-ok',
  warn: 'text-state-warn',
  crit: 'text-state-crit',
  info: 'text-state-info',
  muted: 'text-fg-muted',
}

interface Props {
  status: StatusKind
  label?: string
  className?: string
}

export function StatusBadge({ status, label, className }: Props) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 text-[11.5px] font-medium tracking-tight',
        COLOR[status],
        className,
      )}
    >
      <span className="text-fg-faint">[</span>
      <span>{label ?? status}</span>
      <span className="text-fg-faint">]</span>
    </span>
  )
}
