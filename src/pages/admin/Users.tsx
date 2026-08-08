import { useMemo, useState, type FormEvent } from 'react'
import { Section } from '@/components/ui/Section'
import { StatusBadge } from '@/components/ui/StatusBadge'
import {
  useUsersQuery,
  useCreateUser,
  useUpdateRole,
  useToggleActive,
  useResetPassword,
} from '@/lib/queries'
import { ROLE_LABEL, type Role } from '@/lib/roles'
import type { AdminUser } from '@/types/api'
import { cn } from '@/lib/utils'

const ROLES: Role[] = ['admin', 'ti', 'mejora-continua']
const ROLE_COLOR: Record<Role, string> = {
  admin: 'text-state-crit',
  ti: 'text-state-info',
  'mejora-continua': 'text-brand-300',
}

export default function Users() {
  const usersQ = useUsersQuery()
  const createM = useCreateUser()
  const updateRoleM = useUpdateRole()
  const toggleActiveM = useToggleActive()
  const resetPwM = useResetPassword()

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'ti' as Role })
  const [flash, setFlash] = useState<string | null>(null)
  const [filterRole, setFilterRole] = useState<'todos' | Role>('todos')
  const [search, setSearch] = useState('')

  const users = usersQ.data ?? []

  const filtered = useMemo(
    () =>
      users.filter(
        (u) =>
          (filterRole === 'todos' || u.role === filterRole) &&
          (search === '' || (u.name + u.email).toLowerCase().includes(search.toLowerCase())),
      ),
    [users, filterRole, search],
  )

  const counts = useMemo(
    () => ({
      total: users.length,
      admin: users.filter((u) => u.role === 'admin').length,
      ti: users.filter((u) => u.role === 'ti').length,
      mejora: users.filter((u) => u.role === 'mejora-continua').length,
      disabled: users.filter((u) => !u.active).length,
    }),
    [users],
  )

  function showFlash(msg: string, ms = 4000) {
    setFlash(msg)
    setTimeout(() => setFlash(null), ms)
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    if (!form.name || !form.email || !form.password) return
    try {
      const u = await createM.mutateAsync(form)
      showFlash(`usuario ${u.email} creado`)
      setForm({ name: '', email: '', password: '', role: 'ti' })
      setShowForm(false)
    } catch (err) {
      showFlash(`[error] ${(err as Error).message}`)
    }
  }

  async function handleRole(u: AdminUser, role: Role) {
    if (u.role === role) return
    try {
      await updateRoleM.mutateAsync({ id: u.id, role })
    } catch (err) {
      showFlash(`[error] ${(err as Error).message}`)
    }
  }

  async function handleToggle(u: AdminUser) {
    try {
      await toggleActiveM.mutateAsync(u.id)
    } catch (err) {
      showFlash(`[error] ${(err as Error).message}`)
    }
  }

  async function handleReset(u: AdminUser) {
    try {
      const pw = await resetPwM.mutateAsync(u.id)
      showFlash(`nueva contraseña de ${u.email}: ${pw}  (se muestra una sola vez)`, 10_000)
    } catch (err) {
      showFlash(`[error] ${(err as Error).message}`)
    }
  }

  return (
    <div className="flex flex-col gap-6 text-[13px]">
      <div className="flex items-center justify-between border-b border-border-subtle pb-4">
        <div className="flex items-center gap-3">
          <span className="text-fg-muted text-[11.5px]">admin</span>
          <span className="text-fg-primary text-[15px]">usuarios.admin</span>
          <span className="text-fg-faint">·</span>
          <span className="text-fg-muted text-[11.5px]">gestión de usuarios y roles</span>
        </div>
        <StatusBadge
          status={usersQ.isError ? 'crit' : 'info'}
          label={
            usersQ.isLoading
              ? 'cargando…'
              : usersQ.isError
                ? 'error api'
                : `${counts.total} usuarios`
          }
        />
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'total',            value: counts.total,   accent: 'text-fg-primary' },
          { label: 'admin',            value: counts.admin,   accent: 'text-state-crit' },
          { label: 'ti',               value: counts.ti,      accent: 'text-state-info' },
          { label: 'mejora continua',  value: counts.mejora,  accent: 'text-brand-300' },
        ].map((k) => (
          <div key={k.label} className="rounded-md bg-bg-card border border-border-subtle px-4 py-3">
            <div className="text-fg-faint text-[10.5px] uppercase tracking-wide">{k.label}</div>
            <div className={cn('tabular-nums text-[22px] mt-1', k.accent)}>{k.value}</div>
          </div>
        ))}
      </div>

      {flash && (
        <div className="rounded-md bg-bg-inset border border-brand-500/30 px-3 py-2 text-[12px] text-brand-300 font-mono">
          [aviso] {flash}
        </div>
      )}

      {usersQ.isError && (
        <div className="rounded-md bg-state-critSoft border border-state-crit/30 px-3 py-2 text-[12px] text-state-crit font-mono">
          [api] {(usersQ.error as Error).message}
        </div>
      )}

      <Section
        title="usuarios"
        subtitle="tabla · los cambios se registran automáticamente en la bitácora"
        right={
          <div className="flex items-center gap-2 text-[11px]">
            <span className="text-fg-faint">rol:</span>
            {(['todos', ...ROLES] as const).map((r) => (
              <button
                key={r}
                onClick={() => setFilterRole(r)}
                className={cn(
                  'px-2 h-6 rounded border',
                  filterRole === r
                    ? 'border-brand-500/40 bg-brand-500/10 text-brand-300'
                    : 'border-border-subtle text-fg-muted hover:text-fg-primary',
                )}
              >
                {r === 'todos' ? 'todos' : ROLE_LABEL[r]}
              </button>
            ))}
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="buscar..."
              className="bg-bg-card border border-border-subtle rounded px-2 h-6 text-fg-secondary outline-none focus:border-brand-500/50 min-w-[120px]"
            />
            <button
              onClick={() => setShowForm((v) => !v)}
              className="px-2 h-6 rounded border border-brand-500/40 bg-brand-500/10 text-brand-300 hover:bg-brand-500/20"
            >
              {showForm ? '− cancelar' : '+ nuevo'}
            </button>
          </div>
        }
      >
        {showForm && (
          <form
            onSubmit={handleCreate}
            className="mt-2 mb-3 rounded-md bg-bg-inset border border-border-subtle px-4 py-3 grid grid-cols-1 md:grid-cols-[1fr_1.5fr_1fr_1fr_auto] gap-2 items-end"
          >
            <label className="flex flex-col gap-1">
              <span className="text-fg-faint text-[10.5px] uppercase tracking-wide">nombre</span>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="bg-bg-card border border-border-subtle rounded px-2 h-8 text-fg-primary outline-none focus:border-brand-500/60"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-fg-faint text-[10.5px] uppercase tracking-wide">email</span>
              <input
                required
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="bg-bg-card border border-border-subtle rounded px-2 h-8 text-fg-primary outline-none focus:border-brand-500/60"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-fg-faint text-[10.5px] uppercase tracking-wide">contraseña</span>
              <input
                required
                minLength={6}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="bg-bg-card border border-border-subtle rounded px-2 h-8 text-fg-primary outline-none focus:border-brand-500/60"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-fg-faint text-[10.5px] uppercase tracking-wide">rol</span>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
                className="bg-bg-card border border-border-subtle rounded px-2 h-8 text-fg-primary outline-none focus:border-brand-500/60"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABEL[r]}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              disabled={createM.isPending}
              className="h-8 px-3 rounded bg-brand-500 hover:bg-brand-400 disabled:opacity-50 text-white text-[12px]"
            >
              {createM.isPending ? '...' : 'crear'}
            </button>
          </form>
        )}

        <div className="mt-1">
          <div className="grid grid-cols-[60px_140px_1fr_140px_100px_100px_180px] gap-3 px-2 py-1 text-[11px] text-fg-faint uppercase tracking-wide">
            <span>estado</span>
            <span>nombre</span>
            <span>email</span>
            <span>rol</span>
            <span>creado</span>
            <span>último acceso</span>
            <span className="text-right">acciones</span>
          </div>
          <div className="border-t border-border-subtle">
            {usersQ.isLoading && (
              <div className="text-fg-muted text-center py-6 animate-pulse">cargando…</div>
            )}
            {!usersQ.isLoading &&
              filtered.map((u, i) => (
                <div
                  key={u.id}
                  className={cn(
                    'grid grid-cols-[60px_140px_1fr_140px_100px_100px_180px] gap-3 px-2 py-1.5 items-center hover:bg-white/[0.02] transition-colors',
                    i !== 0 && 'border-t border-border-subtle',
                    !u.active && 'opacity-50',
                  )}
                >
                  <StatusBadge
                    status={u.active ? 'ok' : 'muted'}
                    label={u.active ? 'activo' : 'off'}
                  />
                  <span className="text-fg-primary truncate">{u.name}</span>
                  <span className="text-fg-secondary truncate">{u.email}</span>
                  <select
                    value={u.role}
                    onChange={(e) => handleRole(u, e.target.value as Role)}
                    className={cn(
                      'bg-transparent border border-transparent hover:border-border-subtle rounded px-1 h-6 text-[12px] outline-none focus:border-brand-500/60 cursor-pointer',
                      ROLE_COLOR[u.role],
                    )}
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r} className="bg-bg-card text-fg-primary">
                        {ROLE_LABEL[r]}
                      </option>
                    ))}
                  </select>
                  <span className="text-fg-muted tabular-nums text-[11.5px]">
                    {u.createdAt.slice(0, 10)}
                  </span>
                  <span className="text-fg-muted tabular-nums text-[11.5px]">
                    {u.lastLoginAt ? u.lastLoginAt.slice(0, 10) : '—'}
                  </span>
                  <span className="text-right flex items-center justify-end gap-2 text-[11px]">
                    <button
                      onClick={() => handleReset(u)}
                      disabled={resetPwM.isPending}
                      className="text-brand-400 hover:underline disabled:opacity-50"
                    >
                      resetear
                    </button>
                    <button
                      onClick={() => handleToggle(u)}
                      disabled={toggleActiveM.isPending}
                      className={cn(
                        'hover:underline disabled:opacity-50',
                        u.active ? 'text-state-warn' : 'text-state-ok',
                      )}
                    >
                      {u.active ? 'deshabilitar' : 'habilitar'}
                    </button>
                  </span>
                </div>
              ))}
            {!usersQ.isLoading && filtered.length === 0 && !usersQ.isError && (
              <div className="text-fg-muted text-center py-4">sin resultados</div>
            )}
          </div>
        </div>
      </Section>
    </div>
  )
}
