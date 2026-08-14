import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Section } from '@/components/ui/Section'
import { StatusBadge, type StatusKind } from '@/components/ui/StatusBadge'
import { LiveBadge } from '@/components/ui/LiveBadge'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

interface Stats {
  total: number
  activos: number
  deleted: number
}

interface Usuario {
  id: number
  nombre: string
  correo_electronico: string
  area: string
  puesto: string
  user_role: string
  created_at: string | null
  updated_at: string | null
}

const ROLE_COLOR: Record<string, string> = {
  Admin:  'text-state-crit',
  admin:  'text-state-crit',
  Normal: 'text-fg-secondary',
}

export default function Actividad() {
  const [search, setSearch] = useState('')

  const statsQ = useQuery({
    queryKey: ['qeb', 'actividad', 'stats'],
    queryFn: () => api.get<{ stats: Stats }>('/qeb/actividad/stats').then((r) => r.stats),
    staleTime: 30_000,
    refetchInterval: 30_000,
  })

  const usuariosQ = useQuery({
    queryKey: ['qeb', 'actividad', 'usuarios'],
    queryFn: () =>
      api.get<{ usuarios: Usuario[] }>('/qeb/actividad/usuarios').then((r) => r.usuarios),
    staleTime: 5 * 60_000,
    refetchInterval: 5 * 60_000,
  })

  const stats = statsQ.data
  const usuarios = usuariosQ.data ?? []

  const usuariosFiltrados = useMemo(
    () =>
      usuarios.filter(
        (u) =>
          search === '' ||
          (u.nombre + u.correo_electronico + u.area + u.puesto)
            .toLowerCase()
            .includes(search.toLowerCase()),
      ),
    [usuarios, search],
  )

  const bannerStatus: StatusKind = statsQ.isError ? 'crit' : 'info'
  const bannerLabel = statsQ.isLoading
    ? 'cargando…'
    : statsQ.isError
      ? 'error api'
      : `${stats?.activos ?? 0} usuarios activos`

  return (
    <div className="flex flex-col gap-6 text-[13px]">
      <div className="flex items-center justify-between border-b border-border-subtle pb-4">
        <div className="flex items-center gap-3">
          <span className="text-fg-muted text-[11.5px]">negocio</span>
          <span className="text-fg-primary text-[15px]">actividad qeb</span>
          <span className="text-fg-faint">·</span>
          <span className="text-fg-muted text-[11.5px]">usuarios de qeb</span>
        </div>
        <div className="flex items-center gap-3">
          <LiveBadge
            intervalSec={30}
            fetching={statsQ.isFetching || usuariosQ.isFetching}
          />
          <StatusBadge status={bannerStatus} label={bannerLabel} />
        </div>
      </div>

      {(statsQ.isError || usuariosQ.isError) && (
        <div className="rounded-md bg-state-critSoft border border-state-crit/30 px-3 py-2 text-[12px] text-state-crit font-mono">
          [api] {((statsQ.error ?? usuariosQ.error) as Error)?.message}
        </div>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'usuarios totales',    value: stats?.total,      accent: 'text-fg-primary' },
          { label: 'activos',             value: stats?.activos,    accent: 'text-state-ok' },
          { label: 'eliminados',          value: stats?.deleted,    accent: 'text-fg-muted' },
        ].map((k) => (
          <div key={k.label} className="rounded-md bg-bg-card border border-border-subtle px-4 py-3">
            <div className="text-fg-faint text-[10.5px] uppercase tracking-wide">{k.label}</div>
            <div className={cn('tabular-nums text-[22px] mt-1', k.accent)}>
              {statsQ.isLoading ? '…' : (k.value ?? 0)}
            </div>
          </div>
        ))}
      </div>

      {/* Usuarios */}
      <Section
        title="usuarios"
        subtitle={`${usuarios.length} activos en la plataforma`}
        right={
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="buscar por nombre, email, área..."
            className="bg-bg-card border border-border-subtle rounded px-2 h-6 text-fg-secondary outline-none focus:border-brand-500/50 min-w-[240px] text-[11.5px]"
          />
        }
      >
        <div className="mt-1">
          <div className="grid grid-cols-[60px_180px_220px_1fr_1fr_100px] gap-3 px-2 py-1 text-[11px] text-fg-faint uppercase tracking-wide">
            <span>id</span>
            <span>nombre</span>
            <span>email</span>
            <span>área</span>
            <span>puesto</span>
            <span>rol</span>
          </div>
          <div className="border-t border-border-subtle max-h-[500px] overflow-auto">
            {usuariosQ.isLoading && (
              <div className="text-fg-muted text-center py-4 animate-pulse">cargando…</div>
            )}
            {!usuariosQ.isLoading &&
              usuariosFiltrados.map((u, i) => (
                <div
                  key={u.id}
                  className={cn(
                    'grid grid-cols-[60px_180px_220px_1fr_1fr_100px] gap-3 px-2 py-1.5 items-center hover:bg-white/[0.02] transition-colors',
                    i !== 0 && 'border-t border-border-subtle',
                  )}
                >
                  <span className="text-brand-300 tabular-nums text-[11.5px]">#{u.id}</span>
                  <span className="text-fg-primary truncate">{u.nombre}</span>
                  <span className="text-fg-muted truncate text-[11.5px]">
                    {u.correo_electronico}
                  </span>
                  <span className="text-fg-secondary truncate text-[11.5px]">
                    {u.area || '—'}
                  </span>
                  <span className="text-fg-secondary truncate text-[11.5px]">
                    {u.puesto || '—'}
                  </span>
                  <span
                    className={cn(
                      'text-[11.5px]',
                      ROLE_COLOR[u.user_role] ?? 'text-fg-muted',
                    )}
                  >
                    {u.user_role}
                  </span>
                </div>
              ))}
            {!usuariosQ.isLoading && usuariosFiltrados.length === 0 && (
              <div className="text-fg-muted text-center py-4">sin resultados</div>
            )}
          </div>
        </div>
      </Section>
    </div>
  )
}
