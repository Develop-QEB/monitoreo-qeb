import { cn } from '@/lib/utils'

const BARS = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'] as const

interface Props {
  data: number[]
  className?: string
  color?: string
}

export function UnicodeSparkline({ data, className, color }: Props) {
  if (data.length === 0) return null
  const min = Math.min(...data)
  const max = Math.max(...data)
  const span = max - min || 1
  const bars = data
    .map((v) => BARS[Math.min(BARS.length - 1, Math.floor(((v - min) / span) * (BARS.length - 1)))])
    .join('')
  return (
    <span
      className={cn('font-mono text-[12px] leading-none tracking-tight', className)}
      style={color ? { color } : undefined}
    >
      {bars}
    </span>
  )
}
