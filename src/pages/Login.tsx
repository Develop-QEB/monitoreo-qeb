import { useState, type FormEvent } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/stores/authStore'

interface LocationState {
  from?: string
}

export default function Login() {
  const login = useAuth((s) => s.login)
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as LocationState | null)?.from ?? '/'

  const [email, setEmail] = useState('develop@qeb.mx')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    const res = await login(email, password)
    setBusy(false)
    if (res.ok) {
      navigate(from, { replace: true })
    } else {
      setError(res.error ?? 'error desconocido')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12 bg-bg-base">
      <div className="w-full max-w-md">
        {/* header */}
        <div className="flex flex-col items-start gap-6 mb-10">
          <img
            src="/images/logo-bco.png"
            alt="QEB"
            className="h-8 w-auto"
            draggable={false}
          />
          <div className="flex items-center gap-2 text-[12px]">
            <span className="text-fg-muted">monitor@qeb</span>
            <span className="text-fg-faint">·</span>
            <span className="text-fg-secondary">acceso</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="text-[12.5px] text-fg-primary flex items-center gap-2">
            <span className="text-fg-muted">▾</span>
            <span>iniciar sesión</span>
          </div>

          <div className="pl-4 flex flex-col gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-[10.5px] uppercase tracking-[0.14em] text-fg-muted">
                email
              </span>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                className="bg-bg-card border border-border-subtle rounded px-3 h-9 text-[13px] text-fg-primary outline-none focus:border-brand-500/60 focus:bg-bg-raised transition-colors"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-[10.5px] uppercase tracking-[0.14em] text-fg-muted">
                contraseña
              </span>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-bg-card border border-border-subtle rounded px-3 h-9 text-[13px] text-fg-primary outline-none focus:border-brand-500/60 focus:bg-bg-raised transition-colors"
              />
            </label>

            {error && (
              <div className="text-[11.5px] text-state-crit">
                <span className="text-fg-faint">[error] </span>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="h-9 mt-2 rounded bg-brand-500 hover:bg-brand-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-white text-[13px] font-medium flex items-center justify-center gap-2"
            >
              {busy ? (
                <>
                  <span className="animate-pulse">›</span>
                  <span>autenticando…</span>
                </>
              ) : (
                <>
                  <span>›</span>
                  <span>entrar</span>
                </>
              )}
            </button>
          </div>

          <div className="mt-6 pl-4 text-[11.5px] text-fg-muted">
            <div className="text-fg-faint mb-1">
              # usuarios de prueba · el back real hashea las contraseñas
            </div>
            <div className="grid grid-cols-[110px_1fr] gap-x-3 gap-y-0.5 font-mono">
              <span className="text-fg-muted">admin</span>
              <span className="text-fg-secondary">develop@qeb.mx · changeme</span>
              <span className="text-fg-muted">ti</span>
              <span className="text-fg-secondary">ti@qeb.mx · changeme</span>
              <span className="text-fg-muted">mejora-c</span>
              <span className="text-fg-secondary">mejora@qeb.mx · changeme</span>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
