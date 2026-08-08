import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Section } from '@/components/ui/Section'
import { StatusBadge, type StatusKind } from '@/components/ui/StatusBadge'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

interface Ticket {
  id: number
  titulo: string
  status: string
  prioridad: string
  categoria: string | null
  area: 'TI' | 'QEB' | string
  usuario_nombre: string
  usuario_email: string
  respondido_por: string | null
  created_at: string
  respondido_at: string | null
}

interface Stats {
  total: number
  nuevos: number
  en_proceso: number
  resueltos: number
  sin_respuesta: number
  area_ti: number
  area_qeb: number
  alta: number
}

interface Distribucion {
  categoria: string | null
  area: string
  count: number
}

const STATUS_STYLE: Record<string, { kind: StatusKind }> = {
  Nuevo:        { kind: 'warn' },
  'En proceso': { kind: 'info' },
  Resuelto:     { kind: 'ok' },
  Cerrado:      { kind: 'muted' },
}

const PRIORIDAD_TEXT: Record<string, string> = {
  Alta:   'text-state-crit',
  Normal: 'text-fg-secondary',
  Baja:   'text-fg-muted',
}

const AREA_COLOR: Record<string, string> = {
  TI:  'text-brand-300',
  QEB: 'text-state-info',
}

const STATUS_FILTERS = ['todos', 'Nuevo', 'En proceso', 'Resuelto'] as const
type StatusFilter = (typeof STATUS_FILTERS)[number]
const AREA_FILTERS = ['todas', 'QEB', 'TI'] as const
type AreaFilter = (typeof AREA_FILTERS)[number]

function ageFrom(iso: string) {
  const then = new Date(iso).getTime()
  const now = Date.now()
  const h = Math.round((now - then) / (1000 * 60 * 60))
  if (h < 24) return `${h}h`
  return `${Math.round(h / 24)}d`
}

export default function Tickets() {
  const [status, setStatus] = useState<StatusFilter>('todos')
  const [area, setArea] = useState<AreaFilter>('todas')

  const statsQ = useQuery({
    queryKey: ['qeb', 'tickets', 'stats'],
    queryFn: () => api.get<{ stats: Stats }>('/qeb/tickets/stats').then((r) => r.stats),
    staleTime: 60_000,
  })

  const distQ = useQuery({
    queryKey: ['qeb', 'tickets', 'by-categoria'],
    queryFn: () =>
      api.get<{ distribucion: Distribucion[] }>('/qeb/tickets/by-categoria').then((r) => r.distribucion),
    staleTime: 60_000,
  })

  const listQ = useQuery({
    queryKey: ['qeb', 'tickets', status, area],
    queryFn: () => {
      const qs = new URLSearchParams({ limit: '50' })
      if (status !== 'todos') qs.set('status', status)
      if (area !== 'todas') qs.set('area', area)
      return api.get<{ tickets: Ticket[] }>(`/qeb/tickets?${qs}`).then((r) => r.tickets)
    },
    staleTime: 30_000,
  })

  const stats = statsQ.data
  const tickets = listQ.data ?? []
  const distribucion = distQ.data ?? []

  const bannerStatus: StatusKind = statsQ.isError ? 'crit' : (stats?.sin_respuesta ?? 0) > 0 ? 'warn' : 'ok'
  const bannerLabel = statsQ.isLoading
    ? 'cargando…'
    : statsQ.isError
      ? 'error api'
      : `${stats?.sin_respuesta ?? 0} sin respuesta`

  return (
    <div className="flex flex-col gap-6 text-[13px]">
      <div className="flex items-center justify-between border-b border-border-subtle pb-4">
        <div className="flex items-center gap-3">
          <span className="text-fg-muted text-[11.5px]">negocio</span>
          <span className="text-fg-primary text-[15px]">tickets.qeb</span>
          <span className="text-fg-faint">·</span>
          <span className="text-fg-muted text-[11.5px]">
            reportes y solicitudes de los usuarios de qeb · datos en vivo
          </span>
        </div>
        <StatusBadge status={bannerStatus} label={bannerLabel} />
      </div>

      {(statsQ.isError || listQ.isError) && (
        <div className="rounded-md bg-state-critSoft border border-state-crit/30 px-3 py-2 text-[12px] text-state-crit font-mono">
          [api] {((statsQ.error ?? listQ.error) as Error)?.message}
        </div>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'total',            value: stats?.total,         accent: 'text-fg-primary' },
          { label: 'nuevos',           value: stats?.nuevos,        accent: 'text-state-warn' },
          { label: 'resueltos',        value: stats?.resueltos,     accent: 'text-state-ok' },
          { label: 'alta prioridad',   value: stats?.alta,          accent: 'text-state-crit' },
        ].map((k) => (
          <div key={k.label} className="rounded-md bg-bg-card border border-border-subtle px-4 py-3">
            <div className="text-fg-faint text-[10.5px] uppercase tracking-wide">{k.label}</div>
            <div className={cn('tabular-nums text-[22px] mt-1', k.accent)}>
              {statsQ.isLoading ? '…' : (k.value ?? 0)}
            </div>
          </div>
        ))}
      </div>

      {/* Por área */}
      <Section title="por área" subtitle="TI atiende SAP y usuarios · QEB atiende todo lo demás">
        <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="rounded-md bg-bg-card border border-border-subtle px-4 py-3">
            <div className="flex items-baseline justify-between mb-1">
              <div className="text-fg-faint text-[10.5px] uppercase tracking-wide">QEB</div>
              <div className="text-state-info tabular-nums text-[22px]">
                {stats?.area_qeb ?? '…'}
              </div>
            </div>
            <div className="text-fg-muted text-[11.5px]">
              bugs, features, ayuda, correcciones de datos
            </div>
          </div>
          <div className="rounded-md bg-bg-card border border-border-subtle px-4 py-3">
            <div className="flex items-baseline justify-between mb-1">
              <div className="text-fg-faint text-[10.5px] uppercase tracking-wide">TI</div>
              <div className="text-brand-300 tabular-nums text-[22px]">
                {stats?.area_ti ?? '…'}
              </div>
            </div>
            <div className="text-fg-muted text-[11.5px]">
              Posteo SAP · Desposteo SAP · Ajuste de Usuario
            </div>
          </div>
        </div>
      </Section>

      {/* Distribucion por categoria */}
      <Section title="por categoría" subtitle="conteo histórico">
        <div className="mt-1">
          <div className="grid grid-cols-[1fr_60px_100px] gap-3 px-2 py-1 text-[11px] text-fg-faint uppercase tracking-wide">
            <span>categoría</span>
            <span>área</span>
            <span className="text-right">conteo</span>
          </div>
          <div className="border-t border-border-subtle">
            {distQ.isLoading && (
              <div className="text-fg-muted text-center py-4 animate-pulse">cargando…</div>
            )}
            {!distQ.isLoading &&
              distribucion.map((d, i) => (
                <div
                  key={`${d.categoria}-${d.area}-${i}`}
                  className={cn(
                    'grid grid-cols-[1fr_60px_100px] gap-3 px-2 py-1.5 items-center hover:bg-white/[0.02] transition-colors',
                    i !== 0 && 'border-t border-border-subtle',
                  )}
                >
                  <span className="text-fg-primary">{d.categoria ?? 'sin categoría'}</span>
                  <span className={cn('text-[11.5px]', AREA_COLOR[d.area] ?? 'text-fg-muted')}>
                    {d.area}
                  </span>
                  <span className="text-right text-fg-primary tabular-nums">{d.count}</span>
                </div>
              ))}
          </div>
        </div>
      </Section>

      {/* Lista */}
      <Section
        title="tickets recientes"
        subtitle="últimos 50 · orden por fecha de creación"
        right={
          <div className="flex flex-wrap items-center gap-1 text-[11px]">
            <span className="text-fg-faint">estado:</span>
            {STATUS_FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setStatus(f)}
                className={cn(
                  'px-2 h-6 rounded border',
                  status === f
                    ? 'border-brand-500/40 bg-brand-500/10 text-brand-300'
                    : 'border-border-subtle text-fg-muted hover:text-fg-primary',
                )}
              >
                {f.toLowerCase()}
              </button>
            ))}
            <span className="text-fg-faint ml-2">área:</span>
            {AREA_FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setArea(f)}
                className={cn(
                  'px-2 h-6 rounded border',
                  area === f
                    ? 'border-brand-500/40 bg-brand-500/10 text-brand-300'
                    : 'border-border-subtle text-fg-muted hover:text-fg-primary',
                )}
              >
                {f.toLowerCase()}
              </button>
            ))}
          </div>
        }
      >
        <div className="mt-1">
          <div className="grid grid-cols-[70px_1fr_180px_140px_60px_80px_100px_60px] gap-3 px-2 py-1 text-[11px] text-fg-faint uppercase tracking-wide">
            <span>id</span>
            <span>título</span>
            <span>usuario</span>
            <span>categoría</span>
            <span>área</span>
            <span>prioridad</span>
            <span>estado</span>
            <span className="text-right">edad</span>
          </div>
          <div className="border-t border-border-subtle">
            {listQ.isLoading && (
              <div className="text-fg-muted text-center py-6 animate-pulse">cargando…</div>
            )}
            {!listQ.isLoading &&
              tickets.map((t, i) => {
                const st = STATUS_STYLE[t.status] ?? { kind: 'muted' as StatusKind }
                return (
                  <div
                    key={t.id}
                    className={cn(
                      'grid grid-cols-[70px_1fr_180px_140px_60px_80px_100px_60px] gap-3 px-2 py-1.5 items-center hover:bg-white/[0.02] transition-colors',
                      i !== 0 && 'border-t border-border-subtle',
                    )}
                  >
                    <span className="text-brand-300 tabular-nums">#{t.id}</span>
                    <div className="min-w-0">
                      <div className="text-fg-primary truncate">{t.titulo}</div>
                      {t.respondido_por && (
                        <div className="text-fg-faint text-[10.5px] truncate">
                          respondiendo: {t.respondido_por}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-fg-primary truncate text-[12px]">
                        {t.usuario_nombre}
                      </div>
                      <div className="text-fg-muted truncate text-[10.5px]">
                        {t.usuario_email}
                      </div>
                    </div>
                    <span className="text-fg-secondary truncate text-[11.5px]">
                      {t.categoria ?? '—'}
                    </span>
                    <span className={cn('text-[11.5px]', AREA_COLOR[t.area] ?? 'text-fg-muted')}>
                      {t.area}
                    </span>
                    <span
                      className={cn(
                        'text-[11.5px]',
                        PRIORIDAD_TEXT[t.prioridad] ?? 'text-fg-muted',
                      )}
                    >
                      {t.prioridad}
                    </span>
                    <StatusBadge status={st.kind} label={t.status} />
                    <span className="text-right text-fg-muted tabular-nums text-[11.5px]">
                      {ageFrom(t.created_at)}
                    </span>
                  </div>
                )
              })}
            {!listQ.isLoading && tickets.length === 0 && !listQ.isError && (
              <div className="text-fg-muted text-center py-4">sin resultados</div>
            )}
          </div>
        </div>
      </Section>
    </div>
  )
}
