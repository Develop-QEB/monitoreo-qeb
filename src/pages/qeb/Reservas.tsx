import { useState } from 'react'
import { Section } from '@/components/ui/Section'
import { StatusBadge, type StatusKind } from '@/components/ui/StatusBadge'
import { UnicodeSparkline } from '@/components/ui/UnicodeSparkline'
import { RoleGate } from '@/components/auth/RoleGate'
import { cn } from '@/lib/utils'

interface Duplicate {
  id_a: string
  id_b: string
  codigo: string
  plaza: string
  inicio: string
  fin: string
  cliente: string
}

const DUPLICATES: Duplicate[] = [
  { id_a: 'R-88214', id_b: 'R-88301', codigo: 'GDL-VTE-1042', plaza: 'GDL', inicio: '2026-08-11', fin: '2026-08-24', cliente: 'Coca-Cola FEMSA' },
  { id_a: 'R-87991', id_b: 'R-88155', codigo: 'GDL-VTE-0871', plaza: 'GDL', inicio: '2026-08-11', fin: '2026-08-24', cliente: 'Bimbo' },
  { id_a: 'R-88044', id_b: 'R-88044', codigo: 'ZAP-VTE-2201', plaza: 'ZAP', inicio: '2026-08-25', fin: '2026-09-07', cliente: 'Herdez' },
]

interface Anomaly {
  id: string
  codigo: string
  plaza: string
  issue: string
  since: string
  status: StatusKind
}

const ANOMALIES: Anomaly[] = [
  { id: 'R-88112', codigo: 'MTY-DIG-0421', plaza: 'MTY', issue: 'sin arte aprobado · faltan 3d de inicio', since: '2026-08-04', status: 'crit' },
  { id: 'R-88118', codigo: 'CDMX-DIG-1102', plaza: 'CDMX', issue: 'sin arte aprobado · faltan 5d de inicio', since: '2026-08-04', status: 'warn' },
  { id: 'R-88052', codigo: 'GDL-VTE-1204', plaza: 'GDL', issue: 'fechas invertidas (fin < inicio)', since: '2026-08-05', status: 'crit' },
  { id: 'R-88061', codigo: 'PUE-VTE-0330', plaza: 'PUE', issue: 'sin lat/lng en inventario asociado', since: '2026-08-06', status: 'warn' },
  { id: 'R-88099', codigo: 'GDL-VTE-1188', plaza: 'GDL', issue: 'sin lat/lng en inventario asociado', since: '2026-08-06', status: 'warn' },
]

const QUALITY_30D = [12, 14, 11, 13, 15, 14, 16, 18, 17, 19, 17, 20, 22, 21, 19, 17, 15, 14, 13, 12, 14, 15, 16, 15, 14, 13, 12, 13, 12, 12]

export default function Reservas() {
  const [showResolved, setShowResolved] = useState(false)

  return (
    <div className="flex flex-col gap-6 text-[13px]">
      <div className="flex items-center justify-between border-b border-border-subtle pb-4">
        <div className="flex items-center gap-3">
          <span className="text-fg-muted text-[11.5px]">business</span>
          <span className="text-fg-primary text-[15px]">reservas.qeb</span>
          <span className="text-fg-faint">·</span>
          <span className="text-fg-muted text-[11.5px]">calidad de datos · qeb-mysql-prod</span>
        </div>
        <StatusBadge status="warn" label="12 alertas activas" />
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'duplicadas activas', value: '3',  accent: 'text-state-crit' },
          { label: 'sin arte',           value: '2',  accent: 'text-state-crit' },
          { label: 'fechas invertidas',  value: '1',  accent: 'text-state-warn' },
          { label: 'sin lat/lng',        value: '6',  accent: 'text-state-warn' },
        ].map((k) => (
          <div key={k.label} className="rounded-md bg-bg-card border border-border-subtle px-4 py-3">
            <div className="text-fg-faint text-[10.5px] uppercase tracking-wide">{k.label}</div>
            <div className={cn('tabular-nums text-[22px] mt-1', k.accent)}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Duplicates */}
      <Section
        title="duplicadas activas"
        subtitle="mismo código en el mismo periodo · requiere resolución"
        right={<span className="text-state-crit text-[11px]">{DUPLICATES.length} pares</span>}
      >
        <div className="mt-1">
          <div className="grid grid-cols-[100px_100px_120px_60px_120px_1fr_100px] gap-3 px-2 py-1 text-[11px] text-fg-faint uppercase tracking-wide">
            <span>id a</span>
            <span>id b</span>
            <span>código</span>
            <span>plaza</span>
            <span>periodo</span>
            <span>cliente</span>
            <span className="text-right">acción</span>
          </div>
          <div className="border-t border-border-subtle">
            {DUPLICATES.map((d, i) => (
              <div
                key={d.id_a + d.id_b}
                className={cn(
                  'grid grid-cols-[100px_100px_120px_60px_120px_1fr_100px] gap-3 px-2 py-1.5 items-center hover:bg-white/[0.02] transition-colors',
                  i !== 0 && 'border-t border-border-subtle',
                )}
              >
                <span className="text-brand-300">{d.id_a}</span>
                <span className="text-brand-300">{d.id_b}</span>
                <span className="text-fg-primary tabular-nums">{d.codigo}</span>
                <span className="text-fg-muted">{d.plaza}</span>
                <span className="text-fg-muted tabular-nums text-[11.5px]">
                  {d.inicio} → {d.fin}
                </span>
                <span className="text-fg-secondary truncate">{d.cliente}</span>
                <span className="text-right">
                  <RoleGate
                    roles={['admin', 'ti']}
                    fallback={<span className="text-fg-faint text-[11px]">[readonly]</span>}
                  >
                    <button className="text-brand-400 hover:underline text-[11.5px]">
                      [resolver]
                    </button>
                  </RoleGate>
                </span>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* Anomalies */}
      <Section
        title="anomalías"
        subtitle="sin arte, fechas invertidas, sin coordenadas"
        right={
          <div className="flex items-center gap-2 text-[11px]">
            <label className="text-fg-muted flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={showResolved}
                onChange={(e) => setShowResolved(e.target.checked)}
                className="accent-brand-500"
              />
              incluir resueltas
            </label>
          </div>
        }
      >
        <div className="mt-1">
          <div className="grid grid-cols-[60px_100px_140px_60px_1fr_120px] gap-3 px-2 py-1 text-[11px] text-fg-faint uppercase tracking-wide">
            <span>status</span>
            <span>id</span>
            <span>código</span>
            <span>plaza</span>
            <span>issue</span>
            <span className="text-right">desde</span>
          </div>
          <div className="border-t border-border-subtle">
            {ANOMALIES.map((a, i) => (
              <div
                key={a.id + a.issue}
                className={cn(
                  'grid grid-cols-[60px_100px_140px_60px_1fr_120px] gap-3 px-2 py-1.5 items-center hover:bg-white/[0.02] transition-colors',
                  i !== 0 && 'border-t border-border-subtle',
                )}
              >
                <StatusBadge status={a.status} />
                <span className="text-brand-300">{a.id}</span>
                <span className="text-fg-primary tabular-nums">{a.codigo}</span>
                <span className="text-fg-muted">{a.plaza}</span>
                <span className="text-fg-primary truncate">{a.issue}</span>
                <span className="text-right text-fg-muted tabular-nums text-[11.5px]">
                  {a.since}
                </span>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* Quality trend */}
      <Section title="calidad" subtitle="alertas totales · últimos 30 días">
        <div className="mt-2 px-2">
          <div className="flex items-baseline gap-3">
            <span className="text-fg-primary text-[28px] tabular-nums font-medium leading-none">
              12
            </span>
            <span className="text-fg-muted">alertas hoy</span>
            <span className="text-state-warn text-[11.5px] ml-2">+8% vs semana pasada</span>
          </div>
          <div className="mt-3">
            <UnicodeSparkline data={QUALITY_30D} color="#FF9E64" className="text-[16px]" />
            <span className="text-fg-faint text-[11px] ml-2">30d</span>
          </div>
        </div>
      </Section>
    </div>
  )
}
