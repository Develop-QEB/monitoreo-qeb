import { NavLink } from 'react-router-dom'
import { NAV_GROUPS } from '@/lib/roles'
import { useAuth } from '@/stores/authStore'
import { cn } from '@/lib/utils'

export function Sidebar() {
  const user = useAuth((s) => s.user)
  if (!user) return null

  const visibleGroups = NAV_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((i) => i.roles.includes(user.role)),
  })).filter((g) => g.items.length > 0)

  return (
    <aside className="hidden md:flex w-[230px] shrink-0 flex-col border-r border-border-subtle bg-bg-base">
      <div className="px-4 h-11 flex items-center gap-2.5 border-b border-border-subtle">
        <img
          src="/images/logo-bco.png"
          alt="QEB"
          className="h-4 w-auto"
          draggable={false}
        />
        <span className="text-fg-faint text-[11px]">·</span>
        <span className="text-[11.5px] text-fg-secondary">monitor</span>
        <span className="ml-auto text-fg-muted text-[10.5px]">v0.1</span>
      </div>

      <div className="flex-1 px-2 py-3 overflow-auto no-scrollbar flex flex-col gap-4">
        {visibleGroups.map((group) => (
          <div key={group.key}>
            <div className="flex items-center gap-1 px-2 h-6 text-fg-muted text-[11px]">
              <span>▾</span>
              <span>{group.label}</span>
            </div>
            <div>
              {group.items.map((n) => (
                <NavLink
                  key={n.path}
                  to={n.path}
                  end={n.path === '/'}
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
                      <span
                        className={cn(
                          'text-[10px]',
                          isActive ? 'text-brand-400' : 'text-fg-faint',
                        )}
                      >
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
