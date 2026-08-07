import { Section } from '@/components/ui/Section'
import { StatusBadge } from '@/components/ui/StatusBadge'

export default function AuditLog() {
  return (
    <div className="flex flex-col gap-6 text-[13px]">
      <div className="flex items-center justify-between border-b border-border-subtle pb-4">
        <div className="flex items-center gap-3">
          <span className="text-fg-muted text-[11.5px]">admin</span>
          <span className="text-fg-primary text-[15px]">audit-log.admin</span>
          <span className="text-fg-faint">·</span>
          <span className="text-fg-muted text-[11.5px]">quién hizo qué y cuándo</span>
        </div>
        <StatusBadge status="ok" label="0 eventos críticos" />
      </div>
      <Section title="wip" subtitle="fase C · logins, cambios de rol, kills de query, acciones admin">
        <p className="text-fg-muted text-[12.5px] px-2">
          $ pending&nbsp; feed de eventos filtrable por actor / acción / rango.
        </p>
      </Section>
    </div>
  )
}
