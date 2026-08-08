import { useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface Props {
  title: string
  subtitle?: string
  right?: ReactNode
  defaultOpen?: boolean
  children: ReactNode
  className?: string
}

export function Section({
  title,
  subtitle,
  right,
  defaultOpen = true,
  children,
  className,
}: Props) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <section className={cn('flex flex-col', className)}>
      <div className="flex items-center gap-2 py-1.5">
        {/* Solo el título es clickable para toggle. Los controles del `right` viven fuera del botón. */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="group flex items-center gap-2 text-left min-w-0 shrink-0"
        >
          <span
            className={cn(
              'text-[11px] text-fg-muted transition-transform',
              open ? '' : '-rotate-90',
            )}
          >
            ▾
          </span>
          <span className="text-[12.5px] font-medium text-fg-primary">{title}</span>
          {subtitle && (
            <span className="text-[11.5px] text-fg-muted">— {subtitle}</span>
          )}
        </button>
        {right && <div className="ml-auto">{right}</div>}
      </div>
      {open && <div className="pl-4 mt-1">{children}</div>}
    </section>
  )
}
