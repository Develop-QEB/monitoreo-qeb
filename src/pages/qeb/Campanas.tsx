import { Section } from '@/components/ui/Section'
import { StatusBadge } from '@/components/ui/StatusBadge'

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
      <Section title="wip" subtitle="fase B · activas, próximas a vencer, en armado, sin arte, por asesor">
        <p className="text-fg-muted text-[12.5px] px-2">
          $ pending&nbsp; queries a tabla campanas.
        </p>
      </Section>
    </div>
  )
}
