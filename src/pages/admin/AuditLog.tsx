import { useMemo, useState } from 'react'
import { Section } from '@/components/ui/Section'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useAudit, type AuditAction } from '@/stores/auditStore'
import { cn } from '@/lib/utils'

const ACTION_COLOR: Record<AuditAction, string> = {
  'auth.login':          'text-state-ok',
  'auth.login_fail':     'text-state-crit',
  'auth.logout':         'text-fg-muted',
  'user.create':         'text-brand-300',
  'user.update':         'text-brand-300',
  'user.role_change':    'text-state-warn',
  'user.disable':        'text-state-warn',
  'user.enable':         'text-state-ok',
  'user.password_reset': 'text-state-info',
  'query.kill':          'text-state-crit',
  'reserva.resolver':    'text-brand-300',
}

const ACTION_KIND: Record<AuditAction, string> = {
  'auth.login':          'auth',
  'auth.login_fail':     'auth',
  'auth.logout':         'auth',
  'user.create':         'user',
  'user.update':         'user',
  'user.role_change':    'user',
  'user.disable':        'user',
  'user.enable':         'user',
  'user.password_reset': 'user',
  'query.kill':          'system',
  'reserva.resolver':    'system',
}

const KIND_FILTERS = ['all', 'auth', 'user', 'system'] as const
type KindFilter = (typeof KIND_FILTERS)[number]

function formatTs(ts: string) {
  return ts.replace('T', ' ')
}

export default function AuditLog() {
  const events = useAudit((s) => s.events)
  const clear = useAudit((s) => s.clear)
  const [kind, setKind] = useState<KindFilter>('all')
  const [search, setSearch] = useState('')

  const filtered = useMemo(
    () =>
      events.filter(
        (e) =>
          (kind === 'all' || ACTION_KIND[e.action] === kind) &&
          (search === '' ||
            (e.actor + e.action + (e.target ?? '') + (e.details ?? ''))
              .toLowerCase()
              .includes(search.toLowerCase())),
      ),
    [events, kind, search],
  )

  const counts = useMemo(() => {
    return {
      total: events.length,
      loginFails: events.filter((e) => e.action === 'auth.login_fail').length,
      criticalActions: events.filter((e) =>
        ['user.disable', 'user.role_change', 'query.kill'].includes(e.action),
      ).length,
    }
  }, [events])

  return (
    <div className="flex flex-col gap-6 text-[13px]">
      <div className="flex items-center justify-between border-b border-border-subtle pb-4">
        <div className="flex items-center gap-3">
          <span className="text-fg-muted text-[11.5px]">admin</span>
          <span className="text-fg-primary text-[15px]">audit-log.admin</span>
          <span className="text-fg-faint">·</span>
          <span className="text-fg-muted text-[11.5px]">
            {counts.total} eventos · retención 500 más recientes
          </span>
        </div>
        <StatusBadge
          status={counts.loginFails > 0 ? 'warn' : 'ok'}
          label={counts.loginFails > 0 ? `${counts.loginFails} login fails` : 'sin alertas'}
        />
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {[
          { label: 'eventos totales',   value: counts.total,           accent: 'text-fg-primary' },
          { label: 'login fails',       value: counts.loginFails,      accent: counts.loginFails > 0 ? 'text-state-crit' : 'text-state-ok' },
          { label: 'acciones críticas', value: counts.criticalActions, accent: 'text-state-warn' },
        ].map((k) => (
          <div key={k.label} className="rounded-md bg-bg-card border border-border-subtle px-4 py-3">
            <div className="text-fg-faint text-[10.5px] uppercase tracking-wide">{k.label}</div>
            <div className={cn('tabular-nums text-[22px] mt-1', k.accent)}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Feed */}
      <Section
        title="feed"
        subtitle="orden cronológico inverso · más reciente arriba"
        right={
          <div className="flex items-center gap-2 text-[11px]">
            <span className="text-fg-faint">kind:</span>
            {KIND_FILTERS.map((k) => (
              <button
                key={k}
                onClick={() => setKind(k)}
                className={cn(
                  'px-2 h-6 rounded border',
                  kind === k
                    ? 'border-brand-500/40 bg-brand-500/10 text-brand-300'
                    : 'border-border-subtle text-fg-muted hover:text-fg-primary',
                )}
              >
                {k}
              </button>
            ))}
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="grep..."
              className="bg-bg-card border border-border-subtle rounded px-2 h-6 text-fg-secondary outline-none focus:border-brand-500/50 min-w-[140px]"
            />
            <button
              onClick={() => {
                if (confirm('¿limpiar todos los eventos de audit local?')) clear()
              }}
              className="px-2 h-6 rounded border border-state-crit/40 text-state-crit hover:bg-state-crit/10"
            >
              clear
            </button>
          </div>
        }
      >
        <div className="mt-2 rounded-md bg-bg-inset border border-border-subtle px-3 py-2 font-mono text-[12.5px] max-h-[560px] overflow-auto">
          {filtered.map((e) => (
            <div
              key={e.id}
              className="grid grid-cols-[160px_180px_180px_180px_1fr] gap-3 py-0.5 hover:bg-white/[0.02] px-1 -mx-1 rounded"
            >
              <span className="text-fg-muted tabular-nums text-[11.5px]">
                {formatTs(e.ts)}
              </span>
              <span className="text-brand-300 truncate">{e.actor}</span>
              <span className={cn('font-medium', ACTION_COLOR[e.action])}>{e.action}</span>
              <span className="text-fg-primary truncate">{e.target ?? '—'}</span>
              <span className="text-fg-muted truncate">{e.details ?? ''}</span>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="text-fg-muted text-center py-4">sin eventos</div>
          )}
        </div>
      </Section>
    </div>
  )
}
