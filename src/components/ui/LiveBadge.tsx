import { cn } from '@/lib/utils'

interface Props {
  intervalSec?: number
  fetching?: boolean
  label?: string
  className?: string
}

// Badge estilo "◎ live · refresca cada Ns". El punto parpadea siempre en verde
// para que el usuario vea que la screen esta "viva". Cuando react-query esta
// haciendo un refetch (fetching=true), el punto se pinta brillante y el label
// muestra "actualizando…" un segundo antes de volver al estado normal.
export function LiveBadge({ intervalSec = 10, fetching, label, className }: Props) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-[11px] text-fg-muted tabular-nums',
        className,
      )}
    >
      <span
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          fetching ? 'bg-state-ok' : 'bg-state-ok/70 animate-pulse',
        )}
      />
      <span>{fetching ? 'actualizando…' : (label ?? `live · ${intervalSec}s`)}</span>
    </span>
  )
}
