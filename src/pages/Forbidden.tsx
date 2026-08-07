import { Link } from 'react-router-dom'
import { useAuth } from '@/stores/authStore'
import { ROLE_LABEL } from '@/lib/roles'

export default function Forbidden() {
  const user = useAuth((s) => s.user)
  return (
    <div className="flex flex-col gap-4 text-[13px] max-w-lg">
      <div className="border-b border-border-subtle pb-3 flex items-center gap-3">
        <span className="text-state-crit">[403]</span>
        <span className="text-fg-primary text-[15px]">forbidden</span>
        <span className="text-fg-faint">·</span>
        <span className="text-fg-muted text-[11.5px]">acceso denegado</span>
      </div>

      <p className="text-fg-secondary">
        Tu rol{' '}
        <span className="text-brand-300">
          {user ? ROLE_LABEL[user.role] : '(sin sesión)'}
        </span>{' '}
        no tiene permiso para esta vista.
      </p>

      <div className="mt-2 flex items-center gap-3 text-[12px]">
        <Link
          to="/"
          className="text-brand-400 hover:underline"
        >
          ‹ volver a overview
        </Link>
      </div>
    </div>
  )
}
