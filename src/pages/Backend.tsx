import { Section } from '@/components/ui/Section'
import { StatusBadge } from '@/components/ui/StatusBadge'

export default function Backend() {
  return (
    <div className="flex flex-col gap-6 text-[13px]">
      <div className="flex items-center justify-between border-b border-border-subtle pb-4">
        <div className="flex items-center gap-3">
          <span className="text-fg-muted text-[11.5px]">service</span>
          <span className="text-fg-primary text-[15px]">backend.qeb</span>
          <span className="text-fg-faint">·</span>
          <span className="text-fg-muted text-[11.5px]">digitalocean · main</span>
        </div>
        <StatusBadge status="ok" label="operational" />
      </div>

      <Section title="wip" subtitle="fase 2 · deploy, cpu/ram, latency, logs viewer, errores, sap">
        <p className="text-fg-muted text-[12.5px]">
          $ pending&nbsp; deploy · cpu/ram/disk · latency-by-endpoint · logs-viewer · error-groups · sap-tunnel
        </p>
      </Section>
    </div>
  )
}
