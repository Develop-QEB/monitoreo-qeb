import { useQuery } from '@tanstack/react-query'
import { Section } from '@/components/ui/Section'
import { StatusBadge, type StatusKind } from '@/components/ui/StatusBadge'
import { LiveBadge } from '@/components/ui/LiveBadge'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

interface Stats {
  total: number
  activas: number
  eliminadas: number
  sin_archivo: number
  con_aps: number
  sin_aps: number
  instaladas: number
}

interface Distribucion {
  estatus: string
  count: number
}

function pct(part: number | undefined, total: number | undefined) {
  if (!part || !total) return '—'
  return `${((part / total) * 100).toFixed(1)}%`
}

function n(v: number | string | undefined) {
  const num = typeof v === 'string' ? parseInt(v, 10) : v
  if (num === undefined || Number.isNaN(num)) return '—'
  return num.toLocaleString('es-MX')
}

export default function Reservas() {
  const statsQ = useQuery({
    queryKey: ['qeb', 'reservas', 'stats'],
    queryFn: () => api.get<{ stats: Stats }>('/qeb/reservas/stats').then((r) => r.stats),
    staleTime: 30_000,
    refetchInterval: 30_000,
  })

  const distQ = useQuery({
    queryKey: ['qeb', 'reservas', 'by-estatus'],
    queryFn: () =>
      api
        .get<{ distribucion: Distribucion[] }>('/qeb/reservas/by-estatus')
        .then((r) => r.distribucion),
    staleTime: 60_000,
    refetchInterval: 60_000,
  })

  const stats = statsQ.data
  const distribucion = distQ.data ?? []
  const activasNum = Number(stats?.activas ?? 0)
  const maxCount = Math.max(...distribucion.map((d) => Number(d.count)), 1)

  const bannerStatus: StatusKind = statsQ.isError ? 'crit' : 'info'
  const bannerLabel = statsQ.isLoading
    ? 'cargando…'
    : statsQ.isError
      ? 'error api'
      : `${n(stats?.activas)} activas de ${n(stats?.total)}`

  return (
    <div className="flex flex-col gap-6 text-[13px]">
      <div className="flex items-center justify-between border-b border-border-subtle pb-4">
        <div className="flex items-center gap-3">
          <span className="text-fg-muted text-[11.5px]">negocio</span>
          <span className="text-fg-primary text-[15px]">reservas qeb</span>
          <span className="text-fg-faint">·</span>
          <span className="text-fg-muted text-[11.5px]">
            datos en vivo · agregados sobre {stats?.total != null ? n(stats.total) : '…'} filas
          </span>
        </div>
        <div className="flex items-center gap-3">
          <LiveBadge
            intervalSec={30}
            fetching={statsQ.isFetching || distQ.isFetching}
          />
          <StatusBadge status={bannerStatus} label={bannerLabel} />
        </div>
      </div>

      {(statsQ.isError || distQ.isError) && (
        <div className="rounded-md bg-state-critSoft border border-state-crit/30 px-3 py-2 text-[12px] text-state-crit font-mono">
          [api] {((statsQ.error ?? distQ.error) as Error)?.message}
        </div>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'total histórico', value: n(stats?.total),      accent: 'text-fg-primary' },
          { label: 'activas',         value: n(stats?.activas),    accent: 'text-state-ok' },
          { label: 'eliminadas',      value: n(stats?.eliminadas), accent: 'text-fg-muted' },
          { label: 'con APS',         value: n(stats?.con_aps),    accent: 'text-state-info' },
          { label: 'sin APS',         value: n(stats?.sin_aps),    accent: 'text-state-warn' },
          { label: 'sin archivo',     value: n(stats?.sin_archivo), accent: 'text-state-warn' },
        ].map((k) => (
          <div key={k.label} className="rounded-md bg-bg-card border border-border-subtle px-4 py-3">
            <div className="text-fg-faint text-[10.5px] uppercase tracking-wide">{k.label}</div>
            <div className={cn('tabular-nums text-[20px] mt-1', k.accent)}>
              {statsQ.isLoading ? '…' : k.value}
            </div>
          </div>
        ))}
      </div>

      {/* Salud de datos (calidad) */}
      <Section
        title="calidad de datos"
        subtitle="solo activas"
      >
        <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-md bg-bg-card border border-border-subtle px-4 py-3">
            <div className="text-fg-faint text-[10.5px] uppercase tracking-wide">
              % con APS asignado
            </div>
            <div className="text-state-info tabular-nums text-[22px] mt-1">
              {pct(Number(stats?.con_aps), activasNum)}
            </div>
            <div className="text-fg-muted text-[11px] mt-1">
              {n(stats?.con_aps)} de {n(stats?.activas)}
            </div>
          </div>
          <div className="rounded-md bg-bg-card border border-border-subtle px-4 py-3">
            <div className="text-fg-faint text-[10.5px] uppercase tracking-wide">
              % sin archivo (arte)
            </div>
            <div className="text-state-warn tabular-nums text-[22px] mt-1">
              {pct(Number(stats?.sin_archivo), activasNum)}
            </div>
            <div className="text-fg-muted text-[11px] mt-1">
              {n(stats?.sin_archivo)} activas sin subir arte
            </div>
          </div>
          <div className="rounded-md bg-bg-card border border-border-subtle px-4 py-3">
            <div className="text-fg-faint text-[10.5px] uppercase tracking-wide">
              instaladas
            </div>
            <div className="text-state-ok tabular-nums text-[22px] mt-1">
              {n(stats?.instaladas)}
            </div>
            <div className="text-fg-muted text-[11px] mt-1">confirmadas en campo</div>
          </div>
        </div>
      </Section>

      {/* Distribucion por estatus */}
      <Section title="distribución por estatus" subtitle="solo activas · top 15">
        <div className="mt-1">
          <div className="grid grid-cols-[1fr_100px_1fr] gap-3 px-2 py-1 text-[11px] text-fg-faint uppercase tracking-wide">
            <span>estatus</span>
            <span className="text-right">conteo</span>
            <span>proporción</span>
          </div>
          <div className="border-t border-border-subtle">
            {distQ.isLoading && (
              <div className="text-fg-muted text-center py-4 animate-pulse">cargando…</div>
            )}
            {!distQ.isLoading &&
              distribucion.map((d, i) => {
                const width = Math.max(4, (Number(d.count) / maxCount) * 100)
                return (
                  <div
                    key={d.estatus + i}
                    className={cn(
                      'grid grid-cols-[1fr_100px_1fr] gap-3 px-2 py-1.5 items-center hover:bg-white/[0.02] transition-colors',
                      i !== 0 && 'border-t border-border-subtle',
                    )}
                  >
                    <span className="text-fg-primary truncate">{d.estatus}</span>
                    <span className="text-right text-fg-primary tabular-nums">
                      {n(d.count)}
                    </span>
                    <div className="w-full h-1.5 bg-bg-inset rounded overflow-hidden">
                      <div
                        className="h-full bg-brand-500/60"
                        style={{ width: `${width}%` }}
                      />
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      </Section>
    </div>
  )
}
