import { Section } from '@/components/ui/Section'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { LiveBadge } from '@/components/ui/LiveBadge'
import { useSpacesSummary } from '@/lib/infraQueries'
import { cn } from '@/lib/utils'

function fmtBytes(b: number | undefined): string {
  if (!b) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let i = 0
  let n = b
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024
    i++
  }
  return `${n.toFixed(n < 10 ? 2 : n < 100 ? 1 : 0)} ${units[i]}`
}

function fmtNum(n: number | undefined): string {
  if (n === undefined) return '—'
  return n.toLocaleString('es-MX')
}

function fmtTs(iso: string | null | undefined): string {
  if (!iso) return '—'
  return iso.replace('T', ' ').replace('Z', '').slice(0, 19)
}

function shortKey(key: string, max = 60): string {
  if (key.length <= max) return key
  return key.slice(0, max - 3) + '...'
}

export default function Spaces() {
  const q = useSpacesSummary()
  const data = q.data
  const configured = data?.configured

  const maxExtBytes = Math.max(...(data?.byExtension ?? []).map((e) => e.bytes), 1)
  const maxPrefixBytes = Math.max(...(data?.byTopLevel ?? []).map((p) => p.bytes), 1)

  return (
    <div className="flex flex-col gap-6 text-[13px]">
      <div className="flex items-center justify-between border-b border-border-subtle pb-4">
        <div className="flex items-center gap-3">
          <span className="text-fg-muted text-[11.5px]">servicio</span>
          <span className="text-fg-primary text-[15px]">spaces qeb</span>
          <span className="text-fg-faint">·</span>
          <span className="text-fg-muted text-[11.5px]">digitalocean spaces</span>
        </div>
        <div className="flex items-center gap-3">
          <LiveBadge intervalSec={300} fetching={q.isFetching} />
          {configured ? (
            <StatusBadge status="ok" label="spaces conectado (readonly)" />
          ) : (
            <StatusBadge status="muted" label="sin keys spaces" />
          )}
        </div>
      </div>

      {!q.isLoading && configured === false && (
        <div className="rounded-md bg-bg-inset border border-brand-500/30 px-3 py-2 text-[12px] text-brand-300 font-mono">
          [pendiente] configura en Render → Environment:{' '}
          <span className="text-fg-primary">DO_SPACES_KEY</span>,{' '}
          <span className="text-fg-primary">DO_SPACES_SECRET</span>,{' '}
          <span className="text-fg-primary">DO_SPACES_BUCKET=qeb-media-main</span>,{' '}
          <span className="text-fg-primary">DO_SPACES_REGION=sfo3</span>.
        </div>
      )}

      {(q.isError || data?.error) && (
        <div className="rounded-md bg-state-critSoft border border-state-crit/30 px-3 py-2 text-[12px] text-state-crit font-mono">
          [api] {data?.error ?? (q.error as Error)?.message}
        </div>
      )}

      {/* KPI row */}
      {configured && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiTile
            label="tamaño total"
            value={data?.totalBytes != null ? fmtBytes(data.totalBytes) : '…'}
            note={data?.totalGiB != null ? `${data.totalGiB.toFixed(2)} GiB` : ''}
            accent="text-fg-primary"
          />
          <KpiTile
            label="objetos"
            value={fmtNum(data?.totalObjects)}
            note="máx 10k analizados"
            accent="text-state-info"
          />
          <KpiTile
            label="objeto más antiguo"
            value={fmtTs(data?.oldestAt)}
            accent="text-fg-secondary"
          />
          <KpiTile
            label="objeto más reciente"
            value={fmtTs(data?.newestAt)}
            accent="text-state-ok"
          />
        </div>
      )}

      {/* Extensiones */}
      {data?.byExtension && data.byExtension.length > 0 && (
        <Section title="por extensión" subtitle="tipos de archivo · agrupado">
          <div className="mt-1">
            <div className="grid grid-cols-[100px_100px_120px_1fr] gap-3 px-2 py-1 text-[11px] text-fg-faint uppercase tracking-wide">
              <span>ext</span>
              <span className="text-right">conteo</span>
              <span className="text-right">tamaño</span>
              <span>proporción</span>
            </div>
            <div className="border-t border-border-subtle">
              {data.byExtension.map((e, i) => {
                const width = Math.max(4, (e.bytes / maxExtBytes) * 100)
                return (
                  <div
                    key={e.ext}
                    className={cn(
                      'grid grid-cols-[100px_100px_120px_1fr] gap-3 px-2 py-1.5 items-center hover:bg-white/[0.02] transition-colors',
                      i !== 0 && 'border-t border-border-subtle',
                    )}
                  >
                    <span className="text-fg-primary font-mono">{e.ext}</span>
                    <span className="text-right text-fg-muted tabular-nums">
                      {fmtNum(e.count)}
                    </span>
                    <span className="text-right text-fg-secondary tabular-nums">
                      {fmtBytes(e.bytes)}
                    </span>
                    <div className="w-full h-1.5 bg-bg-inset rounded overflow-hidden">
                      <div
                        className="h-full bg-brand-500/60"
                        style={{ width: `${width}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </Section>
      )}

      {/* Carpetas top-level */}
      {data?.byTopLevel && data.byTopLevel.length > 0 && (
        <Section title="por carpeta (top-level)" subtitle="primer segmento del path">
          <div className="mt-1">
            <div className="grid grid-cols-[1fr_100px_120px_1fr] gap-3 px-2 py-1 text-[11px] text-fg-faint uppercase tracking-wide">
              <span>carpeta</span>
              <span className="text-right">conteo</span>
              <span className="text-right">tamaño</span>
              <span>proporción</span>
            </div>
            <div className="border-t border-border-subtle">
              {data.byTopLevel.map((p, i) => {
                const width = Math.max(4, (p.bytes / maxPrefixBytes) * 100)
                return (
                  <div
                    key={p.prefix}
                    className={cn(
                      'grid grid-cols-[1fr_100px_120px_1fr] gap-3 px-2 py-1.5 items-center hover:bg-white/[0.02] transition-colors',
                      i !== 0 && 'border-t border-border-subtle',
                    )}
                  >
                    <span className="text-brand-300 font-mono truncate">{p.prefix}</span>
                    <span className="text-right text-fg-muted tabular-nums">
                      {fmtNum(p.count)}
                    </span>
                    <span className="text-right text-fg-secondary tabular-nums">
                      {fmtBytes(p.bytes)}
                    </span>
                    <div className="w-full h-1.5 bg-bg-inset rounded overflow-hidden">
                      <div
                        className="h-full bg-brand-400/60"
                        style={{ width: `${width}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </Section>
      )}

      {/* Top objetos por tamaño */}
      {data?.largest && data.largest.length > 0 && (
        <Section title="objetos más grandes" subtitle="top 20 · el bucket puede tener basura enorme">
          <div className="mt-1">
            <div className="grid grid-cols-[1fr_120px_160px] gap-3 px-2 py-1 text-[11px] text-fg-faint uppercase tracking-wide">
              <span>key</span>
              <span className="text-right">tamaño</span>
              <span className="text-right">modificado</span>
            </div>
            <div className="border-t border-border-subtle">
              {data.largest.map((o, i) => (
                <div
                  key={o.key}
                  className={cn(
                    'grid grid-cols-[1fr_120px_160px] gap-3 px-2 py-1.5 items-center hover:bg-white/[0.02] transition-colors',
                    i !== 0 && 'border-t border-border-subtle',
                  )}
                >
                  <span className="text-fg-primary font-mono text-[11.5px] truncate">
                    {shortKey(o.key, 80)}
                  </span>
                  <span className="text-right text-fg-secondary tabular-nums">
                    {fmtBytes(o.size)}
                  </span>
                  <span className="text-right text-fg-muted tabular-nums text-[11.5px]">
                    {fmtTs(o.lastModified)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Section>
      )}

      {/* Recientes */}
      {data?.mostRecent && data.mostRecent.length > 0 && (
        <Section title="uploads recientes" subtitle="últimos 20 por lastModified">
          <div className="mt-1">
            <div className="grid grid-cols-[1fr_120px_160px] gap-3 px-2 py-1 text-[11px] text-fg-faint uppercase tracking-wide">
              <span>key</span>
              <span className="text-right">tamaño</span>
              <span className="text-right">subido</span>
            </div>
            <div className="border-t border-border-subtle">
              {data.mostRecent.map((o, i) => (
                <div
                  key={o.key}
                  className={cn(
                    'grid grid-cols-[1fr_120px_160px] gap-3 px-2 py-1.5 items-center hover:bg-white/[0.02] transition-colors',
                    i !== 0 && 'border-t border-border-subtle',
                  )}
                >
                  <span className="text-fg-primary font-mono text-[11.5px] truncate">
                    {shortKey(o.key, 80)}
                  </span>
                  <span className="text-right text-fg-secondary tabular-nums">
                    {fmtBytes(o.size)}
                  </span>
                  <span className="text-right text-fg-muted tabular-nums text-[11.5px]">
                    {fmtTs(o.lastModified)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Section>
      )}
    </div>
  )
}

function KpiTile({
  label,
  value,
  note,
  accent,
}: {
  label: string
  value: string
  note?: string
  accent?: string
}) {
  return (
    <div className="rounded-md bg-bg-card border border-border-subtle px-4 py-3">
      <div className="text-fg-faint text-[10.5px] uppercase tracking-wide">{label}</div>
      <div className={cn('tabular-nums text-[20px] mt-1', accent ?? 'text-fg-primary')}>
        {value}
      </div>
      {note && <div className="text-fg-muted text-[10.5px] mt-0.5">{note}</div>}
    </div>
  )
}
