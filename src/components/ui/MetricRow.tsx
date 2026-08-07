import { UnicodeSparkline } from './UnicodeSparkline'
import { cn } from '@/lib/utils'

interface Props {
  label: string
  value: string
  unit?: string
  spark?: number[]
  sparkColor?: string
  hint?: string
  className?: string
}

export function MetricRow({
  label,
  value,
  unit,
  spark,
  sparkColor,
  hint,
  className,
}: Props) {
  return (
    <div
      className={cn(
        'grid grid-cols-[110px_1fr_180px_160px] gap-3 items-center px-2 py-1.5 rounded hover:bg-white/[0.02] transition-colors',
        className,
      )}
    >
      <span className="text-fg-muted">{label}</span>
      <span className="text-fg-primary tabular-nums glyph text-[14px]">
        {value}
        {unit && <span className="text-fg-muted text-[12px] ml-1">{unit}</span>}
      </span>
      <span className="text-fg-faint text-[11.5px] tabular-nums">
        {hint ?? ''}
      </span>
      <span className="text-right">
        {spark && spark.length > 0 && (
          <UnicodeSparkline data={spark} color={sparkColor} />
        )}
      </span>
    </div>
  )
}
