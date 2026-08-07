import { Section } from '@/components/ui/Section'
import { StatusBadge } from '@/components/ui/StatusBadge'

export default function Reservas() {
  return (
    <div className="flex flex-col gap-6 text-[13px]">
      <div className="flex items-center justify-between border-b border-border-subtle pb-4">
        <div className="flex items-center gap-3">
          <span className="text-fg-muted text-[11.5px]">business</span>
          <span className="text-fg-primary text-[15px]">reservas.qeb</span>
          <span className="text-fg-faint">·</span>
          <span className="text-fg-muted text-[11.5px]">calidad de datos</span>
        </div>
        <StatusBadge status="warn" label="12 duplicadas" />
      </div>
      <Section title="wip" subtitle="fase B · duplicadas activas, sin arte, fechas invertidas, sin lat/lng">
        <p className="text-fg-muted text-[12.5px] px-2">
          $ pending&nbsp; queries de calidad contra qeb-mysql-prod.
        </p>
      </Section>
    </div>
  )
}
