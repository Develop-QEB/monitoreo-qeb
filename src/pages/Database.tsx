import { Section } from '@/components/ui/Section'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useDoDbCluster } from '@/lib/infraQueries'

function formatIso(iso: string) {
  return iso.replace('T', ' ').slice(0, 19)
}

export default function Database() {
  const dbQ = useDoDbCluster()
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
          [pendiente] configura en Render → Environment: <span className="text-fg-primary">DO_API_TOKEN</span> y <span className="text-fg-primary">DO_DB_CLUSTER_ID</span> (UUID del cluster qeb-mysql-prod, lo sacas de la URL del cluster en el panel de DO).
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

      {/* Métricas CPU/RAM/disco */}
      <Section
        title="cpu / ram / disco"
        subtitle="requiere endpoints de DO monitoring/metrics"
      >
        <div className="mt-2 rounded-md bg-bg-inset border border-brand-500/30 px-3 py-2 text-[12px] text-brand-300 font-mono">
          [pendiente] `/v2/monitoring/metrics/database/cpu`, `/memory`, `/disk`. Requieren time range y devuelven arrays de datapoints — hay que graficarlos con recharts.
        </div>
      </Section>

      {/* Queries pesadas · slow_log */}
      <Section
        title="queries pesadas"
        subtitle="requiere habilitar slow_query_log en el cluster"
      >
        <div className="mt-2 rounded-md bg-bg-inset border border-brand-500/30 px-3 py-2 text-[12px] text-brand-300 font-mono">
          [pendiente] Mario/DO debe habilitar `slow_query_log = ON` y `long_query_time = 1` en los MySQL parameters del cluster. Luego el back del monitor puede leer `mysql.slow_log` desde la DB con `monitor_readonly`.
        </div>
      </Section>

      {/* Índices críticos verificables desde monitor_readonly */}
      <Section
        title="índices críticos"
        subtitle="verificación estática · consulta SHOW INDEX contra u658050396_QEB"
      >
        <div className="mt-2 rounded-md bg-bg-inset border border-brand-500/30 px-3 py-2 text-[12px] text-brand-300 font-mono">
          [pendiente] endpoint que hace SHOW INDEX FROM inventarios / reservas / campania y valida los 7 índices críticos definidos en add_idx_dashboard_perf. Se puede implementar sin token de DO — solo con `monitor_readonly` que ya tenemos.
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
