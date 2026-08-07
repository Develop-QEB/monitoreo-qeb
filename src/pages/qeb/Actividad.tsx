import { Section } from '@/components/ui/Section'
import { StatusBadge } from '@/components/ui/StatusBadge'

export default function Actividad() {
  return (
    <div className="flex flex-col gap-6 text-[13px]">
      <div className="flex items-center justify-between border-b border-border-subtle pb-4">
        <div className="flex items-center gap-3">
          <span className="text-fg-muted text-[11.5px]">business</span>
          <span className="text-fg-primary text-[15px]">actividad.qeb</span>
          <span className="text-fg-faint">·</span>
          <span className="text-fg-muted text-[11.5px]">usuarios · sesiones · tiempo real</span>
        </div>
        <StatusBadge status="info" label="47 online" />
      </div>
      <Section title="wip" subtitle="fase B · últimos logins, más activos, sesiones simultáneas, en vivo">
        <p className="text-fg-muted text-[12.5px] px-2">
          $ pending&nbsp; socket.io + tabla usuarios.
        </p>
      </Section>
    </div>
  )
}
