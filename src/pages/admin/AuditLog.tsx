import { useMemo, useState } from 'react'
import { Section } from '@/components/ui/Section'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { LiveBadge } from '@/components/ui/LiveBadge'
import { useAuditQuery } from '@/lib/queries'
import type { AuditAction } from '@/types/api'
import { cn } from '@/lib/utils'

const ACTION_COLOR: Record<AuditAction, string> = {
  'auth.login':          'text-state-ok',
  'auth.login_fail':     'text-state-crit',
  'auth.logout':         'text-fg-muted',
  'user.create':         'text-brand-300',
  'user.update':         'text-brand-300',
  'user.delete':         'text-state-crit',
  'user.role_change':    'text-state-warn',
  'user.disable':        'text-state-warn',
  'user.enable':         'text-state-ok',
  'user.password_reset': 'text-state-info',
  'query.kill':          'text-state-crit',
  'reserva.resolver':    'text-brand-300',
}

const ACTION_KIND: Record<AuditAction, string> = {
  'auth.login':          'acceso',
  'auth.login_fail':     'acceso',
  'auth.logout':         'acceso',
  'user.create':         'usuario',
  'user.update':         'usuario',
  'user.delete':         'usuario',
  'user.role_change':    'usuario',
  'user.disable':        'usuario',
  'user.enable':         'usuario',
  'user.password_reset': 'usuario',
  'query.kill':          'sistema',
  'reserva.resolver':    'sistema',
}

const KIND_FILTERS = ['todos', 'acceso', 'usuario', 'sistema'] as const
type KindFilter = (typeof KIND_FILTERS)[number]

function formatTs(ts: string) {
  return ts.replace('T', ' ').replace('Z', '').slice(0, 19)
}

export default function AuditLog() {
  const auditQ = useAuditQuery({ limit: 500 })
  const [kind, setKind] = useState<KindFilter>('todos')
  const [search, setSearch] = useState('')

  const events = auditQ.data ?? []

  const filtered = useMemo(
    () =>
      events.filter(
        (e) =>
          (kind === 'todos' || ACTION_KIND[e.action] === kind) &&
          (search === '' ||
            (e.actor + e.action + (e.target ?? '') + (e.details ?? ''))
              .toLowerCase()
              .includes(search.toLowerCase())),
      ),
    [events, kind, search],
  )

  const counts = useMemo(
    () => ({
      total: events.length,
      loginFails: events.filter((e) => e.action === 'auth.login_fail').length,
      criticalActions: events.filter((e) =>
        ['user.disable', 'user.role_change', 'query.kill'].includes(e.action),
      ).length,
    }),
    [events],
  )

  return (
    <div className="flex flex-col gap-6 text-[13px]">
      <div className="flex items-center justify-between border-b border-border-subtle pb-4">
        <div className="flex items-center gap-3">
          <span className="text-fg-muted text-[11.5px]">admin</span>
          <span className="text-fg-primary text-[15px]">bitacora admin</span>
          <span className="text-fg-faint">·</span>
          <span className="text-fg-muted text-[11.5px]">
            {auditQ.isLoading ? 'cargando…' : `${counts.total} eventos · últimos 500`}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <LiveBadge intervalSec={30} fetching={auditQ.isFetching} />
          <StatusBadge
            status={
              auditQ.isError ? 'crit' : counts.loginFails > 0 ? 'warn' : 'ok'
            }
            label={
              auditQ.isError
                ? 'error api'
                : counts.loginFails > 0
                  ? `${counts.loginFails} logins fallidos`
                  : 'sin alertas'
            }
          />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {[
          { label: 'eventos totales',   value: counts.total,           accent: 'text-fg-primary' },
          {
            label: 'logins fallidos',
            value: counts.loginFails,
            accent: counts.loginFails > 0 ? 'text-state-crit' : 'text-state-ok',
          },
          { label: 'acciones críticas', value: counts.criticalActions, accent: 'text-state-warn' },
        ].map((k) => (
          <div key={k.label} className="rounded-md bg-bg-card border border-border-subtle px-4 py-3">
            <div className="text-fg-faint text-[10.5px] uppercase tracking-wide">{k.label}</div>
            <div className={cn('tabular-nums text-[22px] mt-1', k.accent)}>{k.value}</div>
          </div>
        ))}
      </div>

      {auditQ.isError && (
        <div className="rounded-md bg-state-critSoft border border-state-crit/30 px-3 py-2 text-[12px] text-state-crit font-mono">
          [api] {(auditQ.error as Error).message}
        </div>
      )}

      <Section
        title="feed"
        subtitle="orden cronológico inverso · más reciente arriba"
        right={
          <div className="flex items-center gap-2 text-[11px]">
            <span className="text-fg-faint">tipo:</span>
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
              placeholder="buscar..."
              className="bg-bg-card border border-border-subtle rounded px-2 h-6 text-fg-secondary outline-none focus:border-brand-500/50 min-w-[140px]"
            />
            <button
              onClick={() => auditQ.refetch()}
              disabled={auditQ.isFetching}
              className="px-2 h-6 rounded border border-border-subtle text-fg-muted hover:text-fg-primary disabled:opacity-50"
            >
              {auditQ.isFetching ? '…' : 'actualizar'}
            </button>
          </div>
        }
      >
        <div className="mt-2 rounded-md bg-bg-inset border border-border-subtle px-3 py-2 font-mono text-[12.5px] max-h-[560px] overflow-auto">
          {auditQ.isLoading && (
            <div className="text-fg-muted text-center py-4 animate-pulse">cargando…</div>
          )}
          {!auditQ.isLoading &&
            filtered.map((e) => (
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
          {!auditQ.isLoading && filtered.length === 0 && !auditQ.isError && (
            <div className="text-fg-muted text-center py-4">sin eventos</div>
          )}
        </div>
      </Section>
    </div>
  )
}
