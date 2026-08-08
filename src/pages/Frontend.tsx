import { Section } from '@/components/ui/Section'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { UnicodeSparkline } from '@/components/ui/UnicodeSparkline'
import { DeployCard, type Deploy } from '@/components/ui/DeployCard'
import { cn } from '@/lib/utils'

const LATEST: Deploy = {
  hash: 'a8f3c1d',
  status: 'ready',
  branch: 'main',
  actor: 'akary',
  duration: '2m 14s',
  relative: 'hace 8 min',
}

const HISTORY: Deploy[] = [
  { hash: 'b2e4d9f', status: 'ready', branch: 'main', actor: 'akary', duration: '1m 58s', relative: 'hace 2 h' },
  { hash: 'c1a7f28', status: 'ready', branch: 'main', actor: 'mario', duration: '3m 02s', relative: 'hace 5 h' },
  { hash: 'e5b9c34', status: 'error', branch: 'main', actor: 'akary', duration: '48s',   relative: 'hace 1 d' },
  { hash: 'f7d2a11', status: 'ready', branch: 'main', actor: 'mario', duration: '2m 21s', relative: 'hace 2 d' },
]

const UPTIME_30D = Array.from({ length: 30 }, (_, i) =>
  i === 12 ? 92 : 98 + Math.round(Math.sin(i / 3) * 2),
)

const RESPONSE_24H = Array.from({ length: 48 }, (_, i) => 160 + Math.round(Math.sin(i / 4) * 30) + (i % 7))

interface Endpoint {
  path: string
  p95: string
  status: 'ok' | 'warn' | 'crit'
  spark: number[]
}

const KEY_ROUTES: Endpoint[] = [
  { path: '/',              p95: '182 ms', status: 'ok',   spark: [180, 178, 182, 176, 172, 184, 179, 175, 180, 182] },
  { path: '/dashboard',     p95: '284 ms', status: 'ok',   spark: [280, 275, 290, 285, 278, 292, 288, 280, 284, 284] },
  { path: '/reservas',      p95: '246 ms', status: 'ok',   spark: [240, 245, 250, 248, 244, 250, 245, 248, 246, 246] },
  { path: '/campanas',      p95: '198 ms', status: 'ok',   spark: [195, 200, 205, 198, 192, 208, 200, 195, 198, 198] },
  { path: '/inventario',    p95: '410 ms', status: 'warn', spark: [380, 390, 400, 415, 420, 405, 410, 425, 410, 410] },
]

const STATUS_TEXT: Record<'ok' | 'warn' | 'crit', string> = {
  ok: 'text-state-ok',
  warn: 'text-state-warn',
  crit: 'text-state-crit',
}

export default function Frontend() {
  return (
    <div className="flex flex-col gap-6 text-[13px]">
      {/* Service banner */}
      <div className="flex items-center justify-between border-b border-border-subtle pb-4">
        <div className="flex items-center gap-3">
          <span className="text-fg-muted text-[11.5px]">servicio</span>
          <span className="text-fg-primary text-[15px]">frontend.qeb</span>
          <span className="text-fg-faint">·</span>
          <span className="text-fg-muted text-[11.5px]">vercel · main</span>
          <span className="text-fg-faint">·</span>
          <a
            href="https://qeb.mx"
            target="_blank"
            rel="noreferrer"
            className="text-brand-400 hover:underline text-[11.5px]"
          >
            qeb.mx ↗
          </a>
        </div>
        <StatusBadge status="muted" label="mock · pendiente Vercel API" />
      </div>

      <div className="rounded-md bg-bg-inset border border-brand-500/30 px-3 py-2 text-[12px] text-brand-300 font-mono">
        [pendiente] esta vista aún muestra datos ficticios. Para conectar deploys y uptime reales necesitamos un Vercel Access Token en <span className="text-fg-primary">vercel.com/account/tokens</span> con scope read-only.
      </div>

      {/* Deploy */}
      <Section title="despliegues" subtitle="último + historial · vercel api">
        <DeployCard latest={LATEST} history={HISTORY} />
      </Section>

      {/* Uptime */}
      <Section title="disponibilidad" subtitle="30 días · sondeo cada 60s">
        <div className="mt-2 px-2">
          <div className="flex items-baseline gap-3">
            <span className="text-fg-primary text-[28px] tabular-nums font-medium leading-none">
              99.98
            </span>
            <span className="text-fg-muted">%</span>
            <span className="text-fg-faint text-[11.5px] ml-4">sla 99.90 %</span>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <UnicodeSparkline data={UPTIME_30D} color="#9ECE6A" className="text-[16px]" />
            <span className="text-fg-faint text-[11px] ml-2">30d</span>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-4 text-[11.5px] max-w-md">
            <div>
              <div className="text-fg-faint uppercase tracking-wide text-[10.5px]">operativo</div>
              <div className="text-fg-primary tabular-nums">29 d 23 h 42 m</div>
            </div>
            <div>
              <div className="text-fg-faint uppercase tracking-wide text-[10.5px]">degradado</div>
              <div className="text-fg-primary tabular-nums">18 m</div>
            </div>
            <div>
              <div className="text-fg-faint uppercase tracking-wide text-[10.5px]">caído</div>
              <div className="text-fg-primary tabular-nums">0 m</div>
            </div>
          </div>
        </div>
      </Section>

      {/* Response time */}
      <Section title="tiempo de respuesta" subtitle="24h · p50 / p95 / p99">
        <div className="mt-2 px-2">
          <div className="grid grid-cols-3 gap-6 max-w-lg">
            <div>
              <div className="text-fg-faint uppercase tracking-wide text-[10.5px]">p50</div>
              <div className="text-fg-primary tabular-nums text-[16px]">
                180 <span className="text-fg-muted text-[12px]">ms</span>
              </div>
            </div>
            <div>
              <div className="text-fg-faint uppercase tracking-wide text-[10.5px]">p95</div>
              <div className="text-fg-primary tabular-nums text-[16px]">
                324 <span className="text-fg-muted text-[12px]">ms</span>
              </div>
            </div>
            <div>
              <div className="text-fg-faint uppercase tracking-wide text-[10.5px]">p99</div>
              <div className="text-fg-primary tabular-nums text-[16px]">
                680 <span className="text-fg-muted text-[12px]">ms</span>
              </div>
            </div>
          </div>
          <div className="mt-3">
            <UnicodeSparkline data={RESPONSE_24H} color="#7DCFFF" className="text-[14px]" />
            <span className="text-fg-faint text-[11px] ml-2">24h</span>
          </div>
        </div>
      </Section>

      {/* Rutas clave */}
      <Section title="rutas" subtitle="rutas clave · p95 24h">
        <div className="mt-1">
          <div className="grid grid-cols-[80px_1fr_100px_180px] gap-3 px-2 py-1 text-[11px] text-fg-faint uppercase tracking-wide">
            <span>estado</span>
            <span>ruta</span>
            <span className="text-right">p95</span>
            <span className="text-right">24h</span>
          </div>
          <div className="border-t border-border-subtle">
            {KEY_ROUTES.map((r, i) => (
              <div
                key={r.path}
                className={cn(
                  'grid grid-cols-[80px_1fr_100px_180px] gap-3 px-2 py-1.5 items-center hover:bg-white/[0.02] transition-colors',
                  i !== 0 && 'border-t border-border-subtle',
                )}
              >
                <StatusBadge status={r.status} />
                <span className="text-fg-primary">{r.path}</span>
                <span className={cn('text-right tabular-nums', STATUS_TEXT[r.status])}>
                  {r.p95}
                </span>
                <span className="text-right">
                  <UnicodeSparkline
                    data={r.spark}
                    color={r.status === 'warn' ? '#FF9E64' : '#9ECE6A'}
                  />
                </span>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* Runtime errors */}
      <Section
        title="errores del cliente"
        subtitle="error boundary + window.onerror · últimas 24h"
        right={<span className="text-fg-muted text-[11px]">0 · 0 · 0</span>}
      >
        <div className="mt-2 grid grid-cols-3 gap-3 max-w-2xl">
          <div className="rounded-md bg-bg-card border border-border-subtle px-4 py-3">
            <div className="text-fg-faint text-[10.5px] uppercase tracking-wide">no capturados</div>
            <div className="text-state-ok tabular-nums text-[20px] mt-1">0</div>
          </div>
          <div className="rounded-md bg-bg-card border border-border-subtle px-4 py-3">
            <div className="text-fg-faint text-[10.5px] uppercase tracking-wide">boundary</div>
            <div className="text-state-ok tabular-nums text-[20px] mt-1">0</div>
          </div>
          <div className="rounded-md bg-bg-card border border-border-subtle px-4 py-3">
            <div className="text-fg-faint text-[10.5px] uppercase tracking-wide">fetch fallidos</div>
            <div className="text-state-ok tabular-nums text-[20px] mt-1">0</div>
          </div>
        </div>
        <p className="mt-3 px-2 text-fg-muted text-[11.5px]">
          $ pendiente&nbsp; falta cablear la captura client-side (error boundary + window.onerror + interceptor de axios).
        </p>
      </Section>
    </div>
  )
}
