import { Section } from '@/components/ui/Section'
import { StatusBadge, type StatusKind } from '@/components/ui/StatusBadge'
import { useVercelDeployments, type VercelDeployment } from '@/lib/infraQueries'
import { cn } from '@/lib/utils'

// Mapea el state de Vercel a nuestros colores
function stateBadge(state: string): { kind: StatusKind; label: string } {
  const s = state.toUpperCase()
  if (s === 'READY') return { kind: 'ok', label: 'listo' }
  if (s === 'BUILDING' || s === 'INITIALIZING') return { kind: 'info', label: 'compilando' }
  if (s === 'QUEUED') return { kind: 'muted', label: 'en cola' }
  if (s === 'ERROR' || s === 'FAILED') return { kind: 'crit', label: 'error' }
  if (s === 'CANCELED') return { kind: 'muted', label: 'cancelado' }
  return { kind: 'muted', label: s.toLowerCase() }
}

function relative(from: number): string {
  const diff = Date.now() - from
  const h = Math.round(diff / (1000 * 60 * 60))
  if (h < 1) return `hace ${Math.round(diff / (1000 * 60))}m`
  if (h < 24) return `hace ${h}h`
  return `hace ${Math.round(h / 24)}d`
}

function duration(d: VercelDeployment): string {
  if (d.buildingAt && d.ready) {
    const s = Math.round((d.ready - d.buildingAt) / 1000)
    if (s < 60) return `${s}s`
    return `${Math.floor(s / 60)}m ${s % 60}s`
  }
  return '—'
}

export default function Frontend() {
  const depQ = useVercelDeployments()
  const configured = depQ.data?.configured
  const deployments = depQ.data?.deployments ?? []

  return (
    <div className="flex flex-col gap-6 text-[13px]">
      <div className="flex items-center justify-between border-b border-border-subtle pb-4">
        <div className="flex items-center gap-3">
          <span className="text-fg-muted text-[11.5px]">servicio</span>
          <span className="text-fg-primary text-[15px]">frontend.qeb</span>
          <span className="text-fg-faint">·</span>
          <span className="text-fg-muted text-[11.5px]">vercel · main</span>
        </div>
        {configured ? (
          <StatusBadge status="ok" label="vercel conectado" />
        ) : (
          <StatusBadge status="muted" label="sin token vercel" />
        )}
      </div>

      {!depQ.isLoading && configured === false && (
        <div className="rounded-md bg-bg-inset border border-brand-500/30 px-3 py-2 text-[12px] text-brand-300 font-mono">
          [pendiente] configura en Render → Environment: <span className="text-fg-primary">VERCEL_TOKEN</span> y <span className="text-fg-primary">VERCEL_PROJECT_ID</span>. El token lo generas en <span className="text-fg-secondary">vercel.com/account/tokens</span> (scope read).
        </div>
      )}

      {depQ.isError && (
        <div className="rounded-md bg-state-critSoft border border-state-crit/30 px-3 py-2 text-[12px] text-state-crit font-mono">
          [api] {(depQ.error as Error).message}
        </div>
      )}

      {/* Deploys */}
      <Section title="despliegues" subtitle="datos reales de vercel api">
        <div className="mt-1">
          <div className="grid grid-cols-[16px_100px_120px_1fr_120px_120px] gap-3 px-2 py-1 text-[11px] text-fg-faint uppercase tracking-wide">
            <span></span>
            <span>estado</span>
            <span>hash</span>
            <span>por</span>
            <span className="text-right">duración</span>
            <span className="text-right">hace</span>
          </div>
          <div className="border-t border-border-subtle">
            {depQ.isLoading && (
              <div className="text-fg-muted text-center py-4 animate-pulse">cargando…</div>
            )}
            {!depQ.isLoading &&
              configured === true &&
              deployments.map((d, i) => {
                const s = stateBadge(d.state)
                const hash = d.meta?.githubCommitSha?.slice(0, 7) ?? d.uid.slice(0, 7)
                return (
                  <div
                    key={d.uid}
                    className={cn(
                      'grid grid-cols-[16px_100px_120px_1fr_120px_120px] gap-3 px-2 py-1.5 items-center hover:bg-white/[0.02] transition-colors',
                      i !== 0 && 'border-t border-border-subtle',
                    )}
                  >
                    <span
                      className={cn(
                        'h-1.5 w-1.5 rounded-full',
                        s.kind === 'ok' ? 'bg-state-ok' :
                        s.kind === 'crit' ? 'bg-state-crit' :
                        s.kind === 'info' ? 'bg-state-info' :
                        'bg-fg-muted',
                      )}
                    />
                    <StatusBadge status={s.kind} label={s.label} />
                    <span className="text-fg-primary tabular-nums font-mono text-[12px]">#{hash}</span>
                    <span className="text-fg-muted truncate">
                      <span className="text-fg-faint">rama </span>
                      {d.meta?.githubCommitRef ?? d.target ?? '?'}
                      <span className="text-fg-faint"> · por </span>
                      {d.creator?.username ?? '?'}
                    </span>
                    <span className="text-right text-fg-secondary tabular-nums">
                      {duration(d)}
                    </span>
                    <span className="text-right text-fg-muted tabular-nums text-[11.5px]">
                      {relative(d.createdAt)}
                    </span>
                  </div>
                )
              })}
            {!depQ.isLoading && configured === true && deployments.length === 0 && (
              <div className="text-fg-muted text-center py-4">
                sin despliegues (¿project id correcto?)
              </div>
            )}
            {!depQ.isLoading && configured === false && (
              <div className="text-fg-muted text-center py-4">
                despliegues aparecerán cuando configures VERCEL_TOKEN
              </div>
            )}
          </div>
        </div>
      </Section>

      {/* Uptime & response — todavía requieren un servicio de monitoreo aparte */}
      <Section
        title="uptime & tiempo de respuesta"
        subtitle="requiere servicio de pings (uptimerobot, better-stack, cronjob propio…)"
      >
        <div className="mt-2 rounded-md bg-bg-inset border border-brand-500/30 px-3 py-2 text-[12px] text-brand-300 font-mono">
          [pendiente] Vercel no expone uptime por API. Opciones: correr pings desde el mismo back del monitor cada 60s y guardar en dashboard_dev, o integrar con UptimeRobot / Better Stack.
        </div>
      </Section>
    </div>
  )
}
