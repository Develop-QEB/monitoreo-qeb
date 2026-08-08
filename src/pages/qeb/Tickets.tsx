import { useState } from 'react'
import { Section } from '@/components/ui/Section'
import { StatusBadge, type StatusKind } from '@/components/ui/StatusBadge'
import { UnicodeSparkline } from '@/components/ui/UnicodeSparkline'
import { cn } from '@/lib/utils'

interface Ticket {
  id: string
  title: string
  priority: 'alta' | 'media' | 'baja'
  assignee: string
  created: string
  age: string
  sla: 'ok' | 'warn' | 'crit'
}

const OPEN_TICKETS: Ticket[] = [
  { id: 'ASN-4218', title: 'Filtro de reservas por fecha no responde',                                    priority: 'alta',  assignee: 'akary', created: '2026-08-07', age: '4h',  sla: 'warn' },
  { id: 'ASN-4217', title: 'Error 500 al aprobar arte digital sin thumbnail',                             priority: 'alta',  assignee: 'mario', created: '2026-08-07', age: '6h',  sla: 'warn' },
  { id: 'ASN-4215', title: 'Timeout en /api/reportes/aps con rangos > 3 catorcenas',                      priority: 'media', assignee: 'akary', created: '2026-08-06', age: '1d',  sla: 'ok'   },
  { id: 'ASN-4212', title: 'Descarga de manual PDF falla en Safari iOS',                                   priority: 'baja',  assignee: 'mario', created: '2026-08-06', age: '1d',  sla: 'ok'   },
  { id: 'ASN-4209', title: 'Modal de reemplazo no clona filas de artes_tradicionales',                    priority: 'media', assignee: 'akary', created: '2026-08-05', age: '2d',  sla: 'warn' },
  { id: 'ASN-4204', title: 'Buscador de códigos no prioriza cercanía geográfica',                         priority: 'baja',  assignee: 'jos',   created: '2026-08-04', age: '3d',  sla: 'crit' },
  { id: 'ASN-4198', title: 'Dashboard de inventario tarda >5s con >100 filtros activos',                  priority: 'media', assignee: 'mario', created: '2026-08-02', age: '5d',  sla: 'crit' },
]

interface Workload {
  assignee: string
  open: number
  closed7d: number
  spark: number[]
}

const WORKLOAD: Workload[] = [
  { assignee: 'akary', open: 3, closed7d: 12, spark: [2, 3, 4, 3, 2, 3, 4] },
  { assignee: 'mario', open: 3, closed7d: 8,  spark: [1, 2, 2, 1, 1, 2, 2] },
  { assignee: 'jos',   open: 1, closed7d: 2,  spark: [0, 1, 0, 0, 1, 0, 0] },
]

const PRIORITY_COLOR: Record<Ticket['priority'], string> = {
  alta:  'text-state-crit',
  media: 'text-state-warn',
  baja:  'text-fg-muted',
}

const FILTERS = ['todas', 'alta', 'media', 'baja'] as const
type Filter = (typeof FILTERS)[number]

export default function Tickets() {
  const [filter, setFilter] = useState<Filter>('todas')
  const filtered = OPEN_TICKETS.filter((t) => filter === 'todas' || t.priority === filter)

  return (
    <div className="flex flex-col gap-6 text-[13px]">
      <div className="flex items-center justify-between border-b border-border-subtle pb-4">
        <div className="flex items-center gap-3">
          <span className="text-fg-muted text-[11.5px]">negocio</span>
          <span className="text-fg-primary text-[15px]">tickets.qeb</span>
          <span className="text-fg-faint">·</span>
          <span className="text-fg-muted text-[11.5px]">asana · soporte</span>
        </div>
        <StatusBadge status="warn" label="2 fuera de sla" />
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'abiertos',         value: '12',   accent: 'text-fg-primary' },
          { label: 'cerrados 7d',      value: '22',   accent: 'text-state-ok' },
          { label: 'tiempo resolución', value: '18h',  accent: 'text-fg-primary' },
          { label: 'fuera de sla',     value: '2',    accent: 'text-state-warn' },
        ].map((k) => (
          <div key={k.label} className="rounded-md bg-bg-card border border-border-subtle px-4 py-3">
            <div className="text-fg-faint text-[10.5px] uppercase tracking-wide">{k.label}</div>
            <div className={cn('tabular-nums text-[22px] mt-1', k.accent)}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Open tickets */}
      <Section
        title="tickets abiertos"
        subtitle="ordenados por antigüedad"
        right={
          <div className="flex items-center gap-1 text-[11px]">
            <span className="text-fg-faint">prioridad:</span>
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  'px-2 h-6 rounded border',
                  filter === f
                    ? 'border-brand-500/40 bg-brand-500/10 text-brand-300'
                    : 'border-border-subtle text-fg-muted hover:text-fg-primary',
                )}
              >
                {f}
              </button>
            ))}
          </div>
        }
      >
        <div className="mt-1">
          <div className="grid grid-cols-[100px_60px_1fr_100px_60px_60px] gap-3 px-2 py-1 text-[11px] text-fg-faint uppercase tracking-wide">
            <span>id</span>
            <span>pri</span>
            <span>título</span>
            <span>asignado</span>
            <span className="text-right">edad</span>
            <span className="text-right">sla</span>
          </div>
          <div className="border-t border-border-subtle">
            {filtered.map((t, i) => (
              <div
                key={t.id}
                className={cn(
                  'grid grid-cols-[100px_60px_1fr_100px_60px_60px] gap-3 px-2 py-1.5 items-center hover:bg-white/[0.02] transition-colors',
                  i !== 0 && 'border-t border-border-subtle',
                )}
              >
                <span className="text-brand-300 tabular-nums">{t.id}</span>
                <span className={cn('font-medium', PRIORITY_COLOR[t.priority])}>
                  {t.priority}
                </span>
                <span className="text-fg-primary truncate">{t.title}</span>
                <span className="text-fg-muted">{t.assignee}</span>
                <span className="text-right text-fg-secondary tabular-nums">{t.age}</span>
                <span className="text-right">
                  <StatusBadge status={t.sla as StatusKind} />
                </span>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="text-fg-muted text-center py-4">sin resultados</div>
            )}
          </div>
        </div>
      </Section>

      {/* Workload */}
      <Section title="carga de trabajo" subtitle="por atendedor · abiertos + cerrados 7d">
        <div className="mt-1">
          <div className="grid grid-cols-[140px_100px_120px_1fr] gap-3 px-2 py-1 text-[11px] text-fg-faint uppercase tracking-wide">
            <span>asignado</span>
            <span className="text-right">abiertos</span>
            <span className="text-right">cerrados 7d</span>
            <span className="text-right">tendencia</span>
          </div>
          <div className="border-t border-border-subtle">
            {WORKLOAD.map((w, i) => (
              <div
                key={w.assignee}
                className={cn(
                  'grid grid-cols-[140px_100px_120px_1fr] gap-3 px-2 py-1.5 items-center hover:bg-white/[0.02] transition-colors',
                  i !== 0 && 'border-t border-border-subtle',
                )}
              >
                <span className="text-fg-primary">{w.assignee}</span>
                <span className="text-right text-fg-primary tabular-nums">{w.open}</span>
                <span className="text-right text-state-ok tabular-nums">{w.closed7d}</span>
                <span className="text-right">
                  <UnicodeSparkline data={w.spark} color="#BB9AF7" />
                </span>
              </div>
            ))}
          </div>
        </div>
      </Section>
    </div>
  )
}
