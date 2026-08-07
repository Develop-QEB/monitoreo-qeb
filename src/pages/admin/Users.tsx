import { Section } from '@/components/ui/Section'
import { StatusBadge } from '@/components/ui/StatusBadge'

export default function Users() {
  return (
    <div className="flex flex-col gap-6 text-[13px]">
      <div className="flex items-center justify-between border-b border-border-subtle pb-4">
        <div className="flex items-center gap-3">
          <span className="text-fg-muted text-[11.5px]">admin</span>
          <span className="text-fg-primary text-[15px]">users.admin</span>
          <span className="text-fg-faint">·</span>
          <span className="text-fg-muted text-[11.5px]">gestión de usuarios y roles</span>
        </div>
        <StatusBadge status="info" label="3 usuarios" />
      </div>
      <Section title="wip" subtitle="fase C · tabla, create/edit/disable, roles, last login">
        <p className="text-fg-muted text-[12.5px] px-2">
          $ pending&nbsp; CRUD sobre users, form modal, permisos por rol.
        </p>
      </Section>
    </div>
  )
}
