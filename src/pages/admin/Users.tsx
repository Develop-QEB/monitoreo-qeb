import { useMemo, useState, type FormEvent } from 'react'
import { Section } from '@/components/ui/Section'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useUsers, type AdminUser } from '@/stores/usersStore'
import { useAudit } from '@/stores/auditStore'
import { useAuth } from '@/stores/authStore'
import { ROLE_LABEL, type Role } from '@/lib/roles'
import { cn } from '@/lib/utils'

const ROLES: Role[] = ['admin', 'ti', 'mejora-continua']
const ROLE_COLOR: Record<Role, string> = {
  admin: 'text-state-crit',
  ti: 'text-state-info',
  'mejora-continua': 'text-brand-300',
}

export default function Users() {
  const users = useUsers((s) => s.users)
  const create = useUsers((s) => s.create)
  const updateRole = useUsers((s) => s.updateRole)
  const toggleActive = useUsers((s) => s.toggleActive)
  const resetPassword = useUsers((s) => s.resetPassword)
  const record = useAudit((s) => s.record)
  const actor = useAuth((s) => s.user?.email ?? 'unknown')

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'ti' as Role })
  const [flash, setFlash] = useState<string | null>(null)
  const [filterRole, setFilterRole] = useState<'all' | Role>('all')
  const [search, setSearch] = useState('')

  const filtered = useMemo(
    () =>
      users.filter(
        (u) =>
          (filterRole === 'all' || u.role === filterRole) &&
          (search === '' ||
            (u.name + u.email).toLowerCase().includes(search.toLowerCase())),
      ),
    [users, filterRole, search],
  )

  const counts = useMemo(() => {
    return {
      total: users.length,
      admin: users.filter((u) => u.role === 'admin').length,
      ti: users.filter((u) => u.role === 'ti').length,
      mejora: users.filter((u) => u.role === 'mejora-continua').length,
      disabled: users.filter((u) => !u.active).length,
    }
  }, [users])

  function handleCreate(e: FormEvent) {
    e.preventDefault()
    if (!form.name || !form.email || !form.password) return
    if (users.some((u) => u.email.toLowerCase() === form.email.toLowerCase())) {
      setFlash('ese email ya existe')
      setTimeout(() => setFlash(null), 3000)
      return
    }
    const u = create(form)
    record({ actor, action: 'user.create', target: u.email, details: `role=${u.role}` })
    setForm({ name: '', email: '', password: '', role: 'ti' })
    setShowForm(false)
    setFlash(`usuario ${u.email} creado`)
    setTimeout(() => setFlash(null), 3000)
  }

  function handleRole(u: AdminUser, role: Role) {
    if (u.role === role) return
    updateRole(u.id, role)
    record({
      actor,
      action: 'user.role_change',
      target: u.email,
      details: `${u.role} → ${role}`,
    })
  }

  function handleToggle(u: AdminUser) {
    toggleActive(u.id)
    record({
      actor,
      action: u.active ? 'user.disable' : 'user.enable',
      target: u.email,
    })
  }

  function handleReset(u: AdminUser) {
    const pw = resetPassword(u.id)
    record({ actor, action: 'user.password_reset', target: u.email })
    setFlash(`nueva contraseña de ${u.email}: ${pw}  (mostrar una vez)`)
    setTimeout(() => setFlash(null), 8000)
  }

  return (
    <div className="flex flex-col gap-6 text-[13px]">
      <div className="flex items-center justify-between border-b border-border-subtle pb-4">
        <div className="flex items-center gap-3">
          <span className="text-fg-muted text-[11.5px]">admin</span>
          <span className="text-fg-primary text-[15px]">users.admin</span>
          <span className="text-fg-faint">·</span>
          <span className="text-fg-muted text-[11.5px]">gestión de usuarios y roles</span>
        </div>
        <StatusBadge status="info" label={`${counts.total} usuarios`} />
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
          [flash] {flash}
        </div>
      )}

      {/* Users table + create */}
      <Section
        title="users"
        subtitle="tabla · cambios auto-registrados en audit-log"
        right={
          <div className="flex items-center gap-2 text-[11px]">
            <span className="text-fg-faint">role:</span>
            {(['all', ...ROLES] as const).map((r) => (
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
                {r === 'all' ? 'all' : ROLE_LABEL[r]}
              </button>
            ))}
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="grep..."
              className="bg-bg-card border border-border-subtle rounded px-2 h-6 text-fg-secondary outline-none focus:border-brand-500/50 min-w-[120px]"
            />
            <button
              onClick={() => setShowForm((v) => !v)}
              className="px-2 h-6 rounded border border-brand-500/40 bg-brand-500/10 text-brand-300 hover:bg-brand-500/20"
            >
              {showForm ? '− cancel' : '+ new'}
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
              <span className="text-fg-faint text-[10.5px] uppercase tracking-wide">name</span>
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
              <span className="text-fg-faint text-[10.5px] uppercase tracking-wide">password</span>
              <input
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="bg-bg-card border border-border-subtle rounded px-2 h-8 text-fg-primary outline-none focus:border-brand-500/60"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-fg-faint text-[10.5px] uppercase tracking-wide">role</span>
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
              className="h-8 px-3 rounded bg-brand-500 hover:bg-brand-400 text-white text-[12px]"
            >
              create
            </button>
          </form>
        )}

        <div className="mt-1">
          <div className="grid grid-cols-[60px_140px_1fr_140px_100px_100px_180px] gap-3 px-2 py-1 text-[11px] text-fg-faint uppercase tracking-wide">
            <span>status</span>
            <span>name</span>
            <span>email</span>
            <span>role</span>
            <span>created</span>
            <span>last login</span>
            <span className="text-right">actions</span>
          </div>
          <div className="border-t border-border-subtle">
            {filtered.map((u, i) => (
              <div
                key={u.id}
                className={cn(
                  'grid grid-cols-[60px_140px_1fr_140px_100px_100px_180px] gap-3 px-2 py-1.5 items-center hover:bg-white/[0.02] transition-colors',
                  i !== 0 && 'border-t border-border-subtle',
                  !u.active && 'opacity-50',
                )}
              >
                <StatusBadge status={u.active ? 'ok' : 'muted'} label={u.active ? 'active' : 'off'} />
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
                <span className="text-fg-muted tabular-nums text-[11.5px]">{u.createdAt}</span>
                <span className="text-fg-muted tabular-nums text-[11.5px]">
                  {u.lastLogin ?? '—'}
                </span>
                <span className="text-right flex items-center justify-end gap-2 text-[11px]">
                  <button
                    onClick={() => handleReset(u)}
                    className="text-brand-400 hover:underline"
                  >
                    reset-pw
                  </button>
                  <button
                    onClick={() => handleToggle(u)}
                    className={cn(
                      'hover:underline',
                      u.active ? 'text-state-warn' : 'text-state-ok',
                    )}
                  >
                    {u.active ? 'disable' : 'enable'}
                  </button>
                </span>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="text-fg-muted text-center py-4">sin resultados</div>
            )}
          </div>
        </div>
      </Section>
    </div>
  )
}
