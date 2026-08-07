import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'

const TREE = [
  {
    label: 'monitoreo-qeb',
    children: [
      { to: '/', label: 'overview.tsx', end: true },
      { to: '/frontend', label: 'frontend.tsx' },
      { to: '/backend', label: 'backend.tsx' },
      { to: '/database', label: 'database.tsx' },
    ],
  },
]

export function Sidebar() {
  return (
    <aside className="hidden md:flex w-[230px] shrink-0 flex-col border-r border-border-subtle bg-bg-base">
      <div className="px-4 h-11 flex items-center gap-2 border-b border-border-subtle">
        <div className="h-4 w-4 rounded-[3px] bg-brand-500 grid place-items-center">
          <span className="text-[9px] font-bold text-white leading-none">Q</span>
        </div>
        <span className="text-[12px] text-fg-secondary">monitor@qeb</span>
        <span className="ml-auto text-fg-muted text-[11px]">v0.1</span>
      </div>

      <div className="flex-1 px-2 py-3 overflow-auto no-scrollbar">
        {TREE.map((group) => (
          <div key={group.label}>
            <div className="flex items-center gap-1 px-2 h-6 text-fg-muted text-[11px]">
              <span>▾</span>
              <span>{group.label}</span>
            </div>
            <div>
              {group.children.map((n) => (
                <NavLink
                  key={n.to}
                  to={n.to}
                  end={n.end}
                  className={({ isActive }) =>
                    cn(
                      'group relative flex items-center gap-2 pl-6 pr-3 h-7 text-[12.5px] transition-colors',
                      isActive
                        ? 'text-fg-primary bg-white/[0.04]'
                        : 'text-fg-secondary hover:text-fg-primary hover:bg-white/[0.02]',
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span
                        className={cn(
                          'absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 rounded-r-full transition-all',
                          isActive ? 'bg-brand-400 opacity-100' : 'opacity-0',
                        )}
                      />
                      <span className={cn('text-[10px]', isActive ? 'text-brand-400' : 'text-fg-faint')}>
                        {isActive ? '●' : '○'}
                      </span>
                      <span>{n.label}</span>
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}

        <div className="mt-6 px-2">
          <div className="flex items-center gap-1 px-0 h-6 text-fg-muted text-[11px]">
            <span>▸</span>
            <span>system</span>
          </div>
        </div>
      </div>

      <div className="px-4 py-3 border-t border-border-subtle text-[11px] text-fg-muted flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-state-ok" />
          <span>
            <span className="text-fg-faint">env:</span> main
          </span>
        </div>
        <span className="text-fg-faint">prod</span>
      </div>
    </aside>
  )
}
