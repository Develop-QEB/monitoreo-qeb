import { Section } from '@/components/ui/Section'
import { StatusBadge } from '@/components/ui/StatusBadge'

export default function Tickets() {
  return (
    <div className="flex flex-col gap-6 text-[13px]">
      <div className="flex items-center justify-between border-b border-border-subtle pb-4">
        <div className="flex items-center gap-3">
          <span className="text-fg-muted text-[11.5px]">business</span>
          <span className="text-fg-primary text-[15px]">tickets.qeb</span>
          <span className="text-fg-faint">·</span>
          <span className="text-fg-muted text-[11.5px]">asana · soporte</span>
        </div>
        <StatusBadge status="ok" label="up to date" />
      </div>
      <Section title="wip" subtitle="fase B · abiertos, backlog, resolución promedio, por atendedor">
        <p className="text-fg-muted text-[12.5px] px-2">
          $ pending&nbsp; conectar a fuente de tickets (asana / linear / propio).
        </p>
      </Section>
    </div>
  )
}
