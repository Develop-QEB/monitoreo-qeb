import { Section } from '@/components/ui/Section'
import { StatusBadge, type StatusKind } from '@/components/ui/StatusBadge'
import { UnicodeSparkline } from '@/components/ui/UnicodeSparkline'
import { cn } from '@/lib/utils'

interface Campana {
  id: string
  nombre: string
  cliente: string
  asesor: string
  inicio: string
  fin: string
  daysLeft: number
  status: StatusKind
  arte: 'aprobado' | 'en revisión' | 'pendiente' | 'sin arte'
}

const CAMPANAS: Campana[] = [
  { id: 'C-2409', nombre: 'Verano FEMSA · GDL',     cliente: 'Coca-Cola FEMSA', asesor: 'akary', inicio: '2026-07-15', fin: '2026-08-15', daysLeft: 8,  status: 'warn', arte: 'aprobado'     },
  { id: 'C-2411', nombre: 'Kellogg\'s regreso a clases', cliente: 'Kellogg\'s',     asesor: 'mario', inicio: '2026-08-01', fin: '2026-08-14', daysLeft: 7,  status: 'warn', arte: 'aprobado'     },
  { id: 'C-2414', nombre: 'Herdez CDMX Q3',         cliente: 'Herdez',          asesor: 'jos',   inicio: '2026-08-10', fin: '2026-09-10', daysLeft: 34, status: 'ok',   arte: 'aprobado'     },
  { id: 'C-2418', nombre: 'Bimbo Norte MTY',        cliente: 'Bimbo',           asesor: 'mario', inicio: '2026-08-12', fin: '2026-09-25', daysLeft: 49, status: 'ok',   arte: 'en revisión'  },
  { id: 'C-2421', nombre: 'Nestlé Bajío',           cliente: 'Nestlé',          asesor: 'akary', inicio: '2026-08-18', fin: '2026-10-01', daysLeft: 55, status: 'ok',   arte: 'pendiente'    },
  { id: 'C-2425', nombre: 'Lala GDL Ago',           cliente: 'Lala',            asesor: 'akary', inicio: '2026-08-22', fin: '2026-09-04', daysLeft: 28, status: 'crit', arte: 'sin arte'     },
]

interface ByAsesor {
  name: string
  active: number
  next7d: number
  spark: number[]
}

const BY_ASESOR: ByAsesor[] = [
  { name: 'akary', active: 8,  next7d: 2, spark: [5, 6, 7, 7, 8, 8, 8] },
  { name: 'mario', active: 12, next7d: 3, spark: [9, 10, 11, 12, 11, 12, 12] },
  { name: 'jos',   active: 6,  next7d: 1, spark: [4, 4, 5, 5, 6, 6, 6] },
  { name: 'nadia', active: 4,  next7d: 0, spark: [3, 3, 4, 4, 4, 4, 4] },
]

const ARTE_COLOR: Record<Campana['arte'], string> = {
  aprobado:      'text-state-ok',
  'en revisión': 'text-state-info',
  pendiente:     'text-state-warn',
  'sin arte':    'text-state-crit',
}

export default function Campanas() {
  return (
    <div className="flex flex-col gap-6 text-[13px]">
      <div className="flex items-center justify-between border-b border-border-subtle pb-4">
        <div className="flex items-center gap-3">
          <span className="text-fg-muted text-[11.5px]">business</span>
          <span className="text-fg-primary text-[15px]">campanas.qeb</span>
          <span className="text-fg-faint">·</span>
          <span className="text-fg-muted text-[11.5px]">activas, próximas, sin arte</span>
        </div>
        <StatusBadge status="ok" label="42 activas" />
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'activas',             value: '42', accent: 'text-fg-primary' },
          { label: 'próximas a vencer 7d', value: '5',  accent: 'text-state-warn' },
          { label: 'en armado',           value: '8',  accent: 'text-fg-primary' },
          { label: 'sin arte aprobado',   value: '3',  accent: 'text-state-crit' },
        ].map((k) => (
          <div key={k.label} className="rounded-md bg-bg-card border border-border-subtle px-4 py-3">
            <div className="text-fg-faint text-[10.5px] uppercase tracking-wide">{k.label}</div>
            <div className={cn('tabular-nums text-[22px] mt-1', k.accent)}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Campañas próximas a vencer */}
      <Section
        title="próximas a vencer o requieren atención"
        subtitle="ordenadas por días restantes"
      >
        <div className="mt-1">
          <div className="grid grid-cols-[80px_1fr_160px_80px_140px_60px_120px] gap-3 px-2 py-1 text-[11px] text-fg-faint uppercase tracking-wide">
            <span>id</span>
            <span>nombre</span>
            <span>cliente</span>
            <span>asesor</span>
            <span>periodo</span>
            <span className="text-right">quedan</span>
            <span className="text-right">arte</span>
          </div>
          <div className="border-t border-border-subtle">
            {CAMPANAS.map((c, i) => (
              <div
                key={c.id}
                className={cn(
                  'grid grid-cols-[80px_1fr_160px_80px_140px_60px_120px] gap-3 px-2 py-1.5 items-center hover:bg-white/[0.02] transition-colors',
                  i !== 0 && 'border-t border-border-subtle',
                )}
              >
                <span className="text-brand-300 tabular-nums">{c.id}</span>
                <span className="text-fg-primary truncate">{c.nombre}</span>
                <span className="text-fg-secondary truncate">{c.cliente}</span>
                <span className="text-fg-muted">{c.asesor}</span>
                <span className="text-fg-muted tabular-nums text-[11.5px]">
                  {c.inicio} → {c.fin}
                </span>
                <span
                  className={cn(
                    'text-right tabular-nums',
                    c.status === 'crit'
                      ? 'text-state-crit'
                      : c.status === 'warn'
                        ? 'text-state-warn'
                        : 'text-fg-primary',
                  )}
                >
                  {c.daysLeft}d
                </span>
                <span className={cn('text-right text-[11.5px]', ARTE_COLOR[c.arte])}>
                  {c.arte}
                </span>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* Workload por asesor */}
      <Section title="carga por asesor" subtitle="activas + próximas 7d">
        <div className="mt-1">
          <div className="grid grid-cols-[140px_100px_100px_1fr] gap-3 px-2 py-1 text-[11px] text-fg-faint uppercase tracking-wide">
            <span>asesor</span>
            <span className="text-right">activas</span>
            <span className="text-right">próx 7d</span>
            <span className="text-right">trend</span>
          </div>
          <div className="border-t border-border-subtle">
            {BY_ASESOR.map((a, i) => (
              <div
                key={a.name}
                className={cn(
                  'grid grid-cols-[140px_100px_100px_1fr] gap-3 px-2 py-1.5 items-center hover:bg-white/[0.02] transition-colors',
                  i !== 0 && 'border-t border-border-subtle',
                )}
              >
                <span className="text-fg-primary">{a.name}</span>
                <span className="text-right text-fg-primary tabular-nums">{a.active}</span>
                <span className="text-right text-state-warn tabular-nums">{a.next7d}</span>
                <span className="text-right">
                  <UnicodeSparkline data={a.spark} color="#BB9AF7" />
                </span>
              </div>
            ))}
          </div>
        </div>
      </Section>
    </div>
  )
}
