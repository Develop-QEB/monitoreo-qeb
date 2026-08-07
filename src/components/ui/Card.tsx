import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface Props {
  title?: string
  right?: ReactNode
  children: ReactNode
  className?: string
  bare?: boolean
}

export function Card({ title, right, children, className, bare = false }: Props) {
  return (
    <section
      className={cn(
        'rounded-md bg-bg-card border border-border-subtle flex flex-col',
        className,
      )}
    >
      {title && (
        <header className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-border-subtle">
          <h3 className="text-[12px] text-fg-secondary">{title}</h3>
          {right}
        </header>
      )}
      <div className={cn(bare ? '' : 'px-4 py-3', 'flex-1')}>{children}</div>
    </section>
  )
}
