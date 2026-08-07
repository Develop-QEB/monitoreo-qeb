import { Section } from '@/components/ui/Section'
import { StatusBadge } from '@/components/ui/StatusBadge'

export default function Frontend() {
  return (
    <div className="flex flex-col gap-6 text-[13px]">
      <div className="flex items-center justify-between border-b border-border-subtle pb-4">
        <div className="flex items-center gap-3">
          <span className="text-fg-muted text-[11.5px]">service</span>
          <span className="text-fg-primary text-[15px]">frontend.qeb</span>
          <span className="text-fg-faint">·</span>
          <span className="text-fg-muted text-[11.5px]">vercel · main</span>
        </div>
        <StatusBadge status="ok" label="operational" />
      </div>

      <Section title="wip" subtitle="fase 2 · deploy card, uptime, response, errors">
        <p className="text-fg-muted text-[12.5px]">
          $ pending&nbsp; deploy · uptime · response · runtime-errors
        </p>
      </Section>
    </div>
  )
}
