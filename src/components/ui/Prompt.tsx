import { cn } from '@/lib/utils'

interface Props {
  className?: string
}

export function Prompt({ className }: Props) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 text-[12.5px] text-fg-secondary select-none',
        className,
      )}
    >
      <span className="text-brand-400">›</span>
      <span className="caret text-fg-primary" aria-hidden="true" />
    </div>
  )
}
