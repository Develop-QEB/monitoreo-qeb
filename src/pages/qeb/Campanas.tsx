import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Section } from '@/components/ui/Section'
import { StatusBadge, type StatusKind } from '@/components/ui/StatusBadge'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

interface Campania {
  id: number
  nombre: string
  fecha_inicio: string
  fecha_fin: string
  total_caras: string
  status: string
  fecha_aprobacion: string | null
  posted_to_sap: number | null
  cliente: string | null
  asesor: string | null
  razon_social: string | null
}

interface Stats {
  total: number
  vigentes: number
  aprobadas: number
  por_iniciar: number
  proximas_a_vencer: number
  sin_arte: number
}

const SCOPE_FILTERS = ['vigentes', 'reciente'] as const
type Scope = (typeof SCOPE_FILTERS)[number]

const STATUS_STYLE: Record<string, { kind: StatusKind; label: string }> = {
  Aprobada:              { kind: 'ok',    label: 'Aprobada' },
  finalizada:            { kind: 'muted', label: 'finalizada' },
  'Por iniciar':         { kind: 'info',  label: 'Por iniciar' },
  Rechazada:             { kind: 'crit',  label: 'Rechazada' },
  Cancelada:             { kind: 'crit',  label: 'Cancelada' },
  'Ajuste CTO Cliente':  { kind: 'warn',  label: 'Ajuste CTO' },
  Atendido:              { kind: 'info',  label: 'Atendido' },
  Compartir:             { kind: 'info',  label: 'Compartir' },
  'Pase a ventas':       { kind: 'info',  label: 'Pase a ventas' },
  inactiva:              { kind: 'muted', label: 'inactiva' },
}

function shortDate(iso: string) {
  return iso.slice(0, 10)
}

function daysBetween(fromIso: string, toIso: string) {
  const from = new Date(fromIso).getTime()
  const to = new Date(toIso).getTime()
  return Math.round((to - from) / (1000 * 60 * 60 * 24))
}

function daysFromToday(iso: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(iso)
  target.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

export default function Campanas() {
  const [scope, setScope] = useState<Scope>('vigentes')

  const statsQ = useQuery({
    queryKey: ['qeb', 'campania', 'stats'],
    queryFn: () => api.get<{ stats: Stats }>('/qeb/campania/stats').then((r) => r.stats),
    staleTime: 60_000,
  })

  const listQ = useQuery({
    queryKey: ['qeb', 'campania', scope],
    queryFn: () =>
      api
        .get<{ campanias: Campania[] }>(`/qeb/campania?scope=${scope}&limit=50`)
        .then((r) => r.campanias),
    staleTime: 30_000,
  })

  const stats = statsQ.data
  const campanias = listQ.data ?? []

  const rowsWithComputed = useMemo(
    () =>
      campanias.map((c) => {
        const restan = daysFromToday(c.fecha_fin)
        return { ...c, restan }
      }),
    [campanias],
  )

  const statusFilter = statsQ.isError || listQ.isError ? 'crit' : 'info'
  const bannerLabel = statsQ.isLoading
    ? 'cargando…'
    : statsQ.isError
      ? 'error api'
      : `${stats?.vigentes ?? 0} vigentes · ${stats?.total ?? 0} totales`

  return (
    <div className="flex flex-col gap-6 text-[13px]">
      <div className="flex items-center justify-between border-b border-border-subtle pb-4">
        <div className="flex items-center gap-3">
          <span className="text-fg-muted text-[11.5px]">negocio</span>
          <span className="text-fg-primary text-[15px]">campania.qeb</span>
          <span className="text-fg-faint">·</span>
          <span className="text-fg-muted text-[11.5px]">
            datos en vivo desde u658050396_QEB
          </span>
        </div>
        <StatusBadge status={statusFilter} label={bannerLabel} />
      </div>

      {(statsQ.isError || listQ.isError) && (
        <div className="rounded-md bg-state-critSoft border border-state-crit/30 px-3 py-2 text-[12px] text-state-crit font-mono">
          [api] {((statsQ.error ?? listQ.error) as Error)?.message}
        </div>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'total',              value: stats?.total,            accent: 'text-fg-primary' },
          { label: 'vigentes hoy',       value: stats?.vigentes,         accent: 'text-state-ok' },
          { label: 'aprobadas',          value: stats?.aprobadas,        accent: 'text-state-ok' },
          { label: 'por iniciar',        value: stats?.por_iniciar,      accent: 'text-state-info' },
          { label: 'terminan en 7d',     value: stats?.proximas_a_vencer, accent: 'text-state-warn' },
          { label: 'vigentes sin arte',  value: stats?.sin_arte,         accent: 'text-state-crit' },
        ].map((k) => (
          <div key={k.label} className="rounded-md bg-bg-card border border-border-subtle px-4 py-3">
            <div className="text-fg-faint text-[10.5px] uppercase tracking-wide">{k.label}</div>
            <div className={cn('tabular-nums text-[22px] mt-1', k.accent)}>
              {statsQ.isLoading ? '…' : (k.value ?? 0)}
            </div>
          </div>
        ))}
      </div>

      {/* Lista */}
      <Section
        title={scope === 'vigentes' ? 'campañas vigentes' : 'últimas 50 creadas'}
        subtitle="join con cliente para asesor + cliente comercial"
        right={
          <div className="flex items-center gap-1 text-[11px]">
            <span className="text-fg-faint">mostrar:</span>
            {SCOPE_FILTERS.map((s) => (
              <button
                key={s}
                onClick={() => setScope(s)}
                className={cn(
                  'px-2 h-6 rounded border',
                  scope === s
                    ? 'border-brand-500/40 bg-brand-500/10 text-brand-300'
                    : 'border-border-subtle text-fg-muted hover:text-fg-primary',
                )}
              >
                {s}
              </button>
            ))}
            <button
              onClick={() => {
                statsQ.refetch()
                listQ.refetch()
              }}
              disabled={listQ.isFetching}
              className="px-2 h-6 rounded border border-border-subtle text-fg-muted hover:text-fg-primary disabled:opacity-50 ml-2"
            >
              {listQ.isFetching ? '…' : 'actualizar'}
            </button>
          </div>
        }
      >
        <div className="mt-1">
          <div className="grid grid-cols-[80px_1fr_180px_180px_60px_140px_60px_120px] gap-3 px-2 py-1 text-[11px] text-fg-faint uppercase tracking-wide">
            <span>id</span>
            <span>nombre</span>
            <span>cliente</span>
            <span>asesor</span>
            <span>caras</span>
            <span>periodo</span>
            <span className="text-right">restan</span>
            <span className="text-right">status</span>
          </div>
          <div className="border-t border-border-subtle">
            {listQ.isLoading && (
              <div className="text-fg-muted text-center py-6 animate-pulse">cargando…</div>
            )}
            {!listQ.isLoading &&
              rowsWithComputed.map((c, i) => {
                const st = STATUS_STYLE[c.status] ?? { kind: 'muted' as StatusKind, label: c.status }
                const restanColor =
                  c.restan < 0
                    ? 'text-fg-faint'
                    : c.restan <= 7
                      ? 'text-state-warn'
                      : c.restan <= 30
                        ? 'text-fg-primary'
                        : 'text-fg-secondary'
                return (
                  <div
                    key={c.id}
                    className={cn(
                      'grid grid-cols-[80px_1fr_180px_180px_60px_140px_60px_120px] gap-3 px-2 py-1.5 items-center hover:bg-white/[0.02] transition-colors',
                      i !== 0 && 'border-t border-border-subtle',
                    )}
                  >
                    <span className="text-brand-300 tabular-nums text-[11.5px]">#{c.id}</span>
                    <span className="text-fg-primary truncate">{c.nombre}</span>
                    <span className="text-fg-secondary truncate text-[11.5px]">
                      {c.cliente ?? '—'}
                    </span>
                    <span className="text-fg-muted truncate text-[11.5px]">
                      {c.asesor ?? '—'}
                    </span>
                    <span className="text-fg-muted tabular-nums text-[11.5px]">
                      {c.total_caras}
                    </span>
                    <span className="text-fg-muted tabular-nums text-[11px]">
                      {shortDate(c.fecha_inicio)} → {shortDate(c.fecha_fin)}
                      <span className="text-fg-faint ml-1">
                        ({daysBetween(c.fecha_inicio, c.fecha_fin)}d)
                      </span>
                    </span>
                    <span className={cn('text-right tabular-nums', restanColor)}>
                      {c.restan >= 0 ? `${c.restan}d` : '—'}
                    </span>
                    <span className="text-right">
                      <StatusBadge status={st.kind} label={st.label} />
                    </span>
                  </div>
                )
              })}
            {!listQ.isLoading && rowsWithComputed.length === 0 && !listQ.isError && (
              <div className="text-fg-muted text-center py-4">sin resultados</div>
            )}
          </div>
        </div>
      </Section>
    </div>
  )
}
