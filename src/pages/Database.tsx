import { useQuery } from '@tanstack/react-query'
import { Section } from '@/components/ui/Section'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useDoDbCluster } from '@/lib/infraQueries'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

function formatIso(iso: string) {
  return iso.replace('T', ' ').slice(0, 19)
}

interface IndicesResp {
  expected: number
  found: number
  allPresent: boolean
  indexes: { table: string; name: string; present: boolean }[]
}

function useIndicesCriticos() {
  return useQuery({
    queryKey: ['qeb', 'indices'],
    queryFn: () => api.get<IndicesResp>('/qeb/indices'),
    staleTime: 5 * 60_000,
  })
}

export default function Database() {
  const dbQ = useDoDbCluster()
  const indicesQ = useIndicesCriticos()
  const configured = dbQ.data?.configured
  const cluster = dbQ.data?.cluster

  return (
    <div className="flex flex-col gap-6 text-[13px]">
      <div className="flex items-center justify-between border-b border-border-subtle pb-4">
        <div className="flex items-center gap-3">
          <span className="text-fg-muted text-[11.5px]">servicio</span>
          <span className="text-fg-primary text-[15px]">database.qeb</span>
          <span className="text-fg-faint">·</span>
          <span className="text-fg-muted text-[11.5px]">
            {cluster?.name ?? 'qeb-mysql-prod'} · {cluster?.engine ?? 'mysql'}{' '}
            {cluster?.version ?? ''}
          </span>
        </div>
        {configured ? (
          <StatusBadge
            status={cluster?.status === 'online' ? 'ok' : 'warn'}
            label={cluster?.status ?? 'sin datos'}
          />
        ) : (
          <StatusBadge status="muted" label="sin token do" />
        )}
      </div>

      {!dbQ.isLoading && configured === false && (
        <div className="rounded-md bg-bg-inset border border-brand-500/30 px-3 py-2 text-[12px] text-brand-300 font-mono">
          [pendiente] configura en Render → Environment: <span className="text-fg-primary">DO_API_TOKEN</span> y <span className="text-fg-primary">DO_DB_CLUSTER_ID</span> (UUID del cluster qeb-mysql-prod).
        </div>
      )}

      {dbQ.isError && (
        <div className="rounded-md bg-state-critSoft border border-state-crit/30 px-3 py-2 text-[12px] text-state-crit font-mono">
          [api] {(dbQ.error as Error).message}
        </div>
      )}

      {/* Info del cluster */}
      {configured === true && cluster && (
        <Section title="cluster" subtitle="digitalocean managed database · info en vivo">
          <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-3">
            <InfoTile label="nombre" value={cluster.name} />
            <InfoTile label="engine" value={`${cluster.engine} ${cluster.version}`} />
            <InfoTile label="status" value={cluster.status} />
            <InfoTile label="tamaño" value={cluster.size} />
            <InfoTile label="región" value={cluster.region} />
            <InfoTile label="nodos" value={String(cluster.num_nodes)} />
            {cluster.db_names && cluster.db_names.length > 0 && (
              <InfoTile
                label="databases"
                value={cluster.db_names.slice(0, 4).join(', ')}
                className="md:col-span-2"
              />
            )}
            <InfoTile label="creado" value={formatIso(cluster.created_at)} />
          </div>
        </Section>
      )}

      {/* Índices críticos — funcional con monitor_readonly */}
      <Section
        title="índices críticos"
        subtitle="verificación estática · SHOW INDEX contra u658050396_QEB"
        right={
          indicesQ.data && (
            <StatusBadge
              status={indicesQ.data.allPresent ? 'ok' : 'crit'}
              label={`${indicesQ.data.found} / ${indicesQ.data.expected} presentes`}
            />
          )
        }
      >
        <div className="mt-1">
          <div className="grid grid-cols-[70px_160px_1fr] gap-3 px-2 py-1 text-[11px] text-fg-faint uppercase tracking-wide">
            <span>estado</span>
            <span>tabla</span>
            <span>índice</span>
          </div>
          <div className="border-t border-border-subtle">
            {indicesQ.isLoading && (
              <div className="text-fg-muted text-center py-4 animate-pulse">cargando…</div>
            )}
            {indicesQ.isError && (
              <div className="text-state-crit text-center py-4 font-mono text-[12px]">
                [api] {(indicesQ.error as Error).message}
              </div>
            )}
            {!indicesQ.isLoading &&
              indicesQ.data?.indexes.map((idx, i) => (
                <div
                  key={idx.name}
                  className={cn(
                    'grid grid-cols-[70px_160px_1fr] gap-3 px-2 py-1.5 items-center hover:bg-white/[0.02] transition-colors',
                    i !== 0 && 'border-t border-border-subtle',
                  )}
                >
                  <StatusBadge
                    status={idx.present ? 'ok' : 'crit'}
                    label={idx.present ? 'ok' : 'faltante'}
                  />
                  <span className="text-brand-300">{idx.table}</span>
                  <span className="text-fg-primary font-mono text-[12.5px]">{idx.name}</span>
                </div>
              ))}
          </div>
        </div>
      </Section>

      {/* Métricas CPU/RAM/disco */}
      <Section
        title="cpu / ram / disco"
        subtitle="requiere endpoints de DO monitoring/metrics"
      >
        <div className="mt-2 rounded-md bg-bg-inset border border-brand-500/30 px-3 py-2 text-[12px] text-brand-300 font-mono">
          [pendiente] `/v2/monitoring/metrics/database/*` devuelve arrays de datapoints por tiempo. Requiere graficar con recharts.
        </div>
      </Section>

      {/* Queries pesadas · slow_log */}
      <Section
        title="queries pesadas"
        subtitle="requiere habilitar slow_query_log en el cluster"
      >
        <div className="mt-2 rounded-md bg-bg-inset border border-brand-500/30 px-3 py-2 text-[12px] text-brand-300 font-mono">
          [pendiente] Mario/DO debe habilitar `slow_query_log = ON` y `long_query_time = 1` en los MySQL parameters del cluster. Luego el back puede leer `mysql.slow_log` con `monitor_readonly`.
        </div>
      </Section>
    </div>
  )
}

function InfoTile({
  label,
  value,
  className,
}: {
  label: string
  value: string
  className?: string
}) {
  return (
    <div
      className={`rounded-md bg-bg-card border border-border-subtle px-4 py-3 ${className ?? ''}`}
    >
      <div className="text-fg-faint text-[10.5px] uppercase tracking-wide">{label}</div>
      <div className="text-fg-primary mt-1 truncate">{value}</div>
    </div>
  )
}
