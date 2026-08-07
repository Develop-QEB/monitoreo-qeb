import { Section } from '@/components/ui/Section'
import { StatusBadge } from '@/components/ui/StatusBadge'

export default function Database() {
  return (
    <div className="flex flex-col gap-6 text-[13px]">
      <div className="flex items-center justify-between border-b border-border-subtle pb-4">
        <div className="flex items-center gap-3">
          <span className="text-fg-muted text-[11.5px]">service</span>
          <span className="text-fg-primary text-[15px]">database.qeb</span>
          <span className="text-fg-faint">·</span>
          <span className="text-fg-muted text-[11.5px]">mysql-do · qeb-mysql-prod</span>
        </div>
        <StatusBadge status="warn" label="cpu 38%" />
      </div>

      <Section title="wip" subtitle="fase 2 · connections, cpu/ram, indexes, heavy-queries, backups">
        <p className="text-fg-muted text-[12.5px]">
          $ pending&nbsp; conn · cpu/ram/disk · indexes-check · table-sizes · slow-queries · backups
        </p>
      </Section>
    </div>
  )
}
