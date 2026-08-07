import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'

const CRUMB: Record<string, string> = {
  '/': 'overview',
  '/frontend': 'frontend',
  '/backend': 'backend',
  '/database': 'database',
}

function formatTime(d: Date) {
  return d.toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

export function Header() {
  const { pathname } = useLocation()
  const crumb = CRUMB[pathname] ?? 'overview'
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <header className="h-11 shrink-0 border-b border-border-subtle bg-bg-base/85 backdrop-blur-md sticky top-0 z-10">
      <div className="h-full px-6 flex items-center gap-6 text-[12px] text-fg-secondary max-w-[1600px] w-full mx-auto">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-fg-muted">monitoreo-qeb</span>
          <span className="text-fg-faint">/</span>
          <span className="text-fg-muted">main</span>
          <span className="text-fg-faint">/</span>
          <span className="text-fg-primary">{crumb}</span>
        </div>

        <div className="ml-auto flex items-center gap-5">
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-state-ok/50 animate-ping" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-state-ok" />
            </span>
            <span className="text-fg-secondary">live</span>
          </div>
          <span className="text-fg-muted tabular-nums glyph">{formatTime(now)}</span>
        </div>
      </div>
    </header>
  )
}
