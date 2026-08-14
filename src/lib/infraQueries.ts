import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

// ------- Config -------

export interface InfraConfig {
  vercel: boolean
  doApi: boolean
  doApp: boolean
  doDb: boolean
}

export function useInfraConfig() {
  return useQuery({
    queryKey: ['infra', 'config'],
    queryFn: () => api.get<InfraConfig>('/infra/config'),
    staleTime: 5 * 60_000,
  })
}

// ------- Vercel -------

export interface VercelDeployment {
  uid: string
  name: string
  url: string
  state: string
  meta: Record<string, string>
  target: string | null
  source: string
  createdAt: number
  buildingAt?: number
  ready?: number
  creator: { username: string; email?: string }
}

interface DeploymentsResp {
  configured: boolean
  reason?: string
  error?: string
  deployments?: VercelDeployment[]
}

export function useVercelDeployments() {
  return useQuery({
    queryKey: ['infra', 'vercel', 'deployments'],
    queryFn: () => api.get<DeploymentsResp>('/infra/vercel/deployments'),
    staleTime: 30_000,
    refetchInterval: 30_000,
  })
}

// ------- DO Apps -------

export interface DoAppDeployment {
  id: string
  cause: string
  phase: string
  progress?: { success_steps: number; error_steps: number; total_steps: number }
  created_at: string
  updated_at: string
}

export interface PlanInfo {
  slug: string
  usdPerMonth: number | null
  known: boolean
}

interface DoAppInfoResp {
  configured: boolean
  reason?: string
  error?: string
  app?: {
    id: string
    spec: { name: string; region: string }
    live_url?: string
    region?: { slug: string; label: string }
    tier_slug?: string
    active_deployment?: DoAppDeployment
    in_progress_deployment?: DoAppDeployment
  }
  plan?: PlanInfo
}

interface DoAppDeploysResp {
  configured: boolean
  reason?: string
  error?: string
  deployments?: DoAppDeployment[]
}

export function useDoAppInfo() {
  return useQuery({
    queryKey: ['infra', 'do', 'app'],
    queryFn: () => api.get<DoAppInfoResp>('/infra/do/app'),
    staleTime: 30_000,
    refetchInterval: 30_000,
  })
}

export function useDoAppDeployments() {
  return useQuery({
    queryKey: ['infra', 'do', 'app', 'deployments'],
    queryFn: () => api.get<DoAppDeploysResp>('/infra/do/app/deployments'),
    staleTime: 30_000,
    refetchInterval: 30_000,
  })
}

export interface AppMetricSeries {
  component: string
  points: { ts: number; value: number }[]
  latest: number | null
  avg: number | null
  peak: number | null
}

interface AppMetricsResp {
  configured: boolean
  reason?: string
  error?: string
  metric?: string
  hours?: number
  series?: AppMetricSeries[]
}

export function useDoAppMetrics(metric: 'cpu_percentage' | 'memory_percentage' | 'restart_count') {
  return useQuery({
    queryKey: ['infra', 'do', 'app', 'metrics', metric],
    queryFn: () => api.get<AppMetricsResp>(`/infra/do/app/metrics?metric=${metric}&hours=1`),
    staleTime: 30_000,
    refetchInterval: 30_000,
  })
}

export interface AppLogLine {
  ts: string | null
  raw: string
}

interface AppLogsResp {
  configured: boolean
  reason?: string
  error?: string
  count?: number
  lines?: AppLogLine[]
}

export function useDoAppLogs(maxLines = 300) {
  return useQuery({
    queryKey: ['infra', 'do', 'app', 'logs', maxLines],
    queryFn: () => api.get<AppLogsResp>(`/infra/do/app/logs?max=${maxLines}`),
    staleTime: 20_000,
    refetchInterval: 30_000,
  })
}

// --------- monitor_logs (histórico persistente) ---------

export interface DbLogLine {
  id: string
  ts: string
  level: string
  msg: string
}

export interface DbLogsFilters {
  level?: string
  q?: string
  from?: string // ISO
  to?: string // ISO
  limit?: number
}

export function useDbLogs(filters: DbLogsFilters) {
  const qs = new URLSearchParams()
  if (filters.level) qs.set('level', filters.level)
  if (filters.q) qs.set('q', filters.q)
  if (filters.from) qs.set('from', filters.from)
  if (filters.to) qs.set('to', filters.to)
  if (filters.limit) qs.set('limit', String(filters.limit))

  return useQuery({
    queryKey: ['infra', 'do', 'app', 'logs', 'db', filters],
    queryFn: () =>
      api.get<{ count: number; lines: DbLogLine[] }>(
        `/infra/do/app/logs/db${qs.toString() ? '?' + qs.toString() : ''}`,
      ),
    staleTime: 15_000,
    refetchInterval: 15_000,
  })
}

export interface DbLogsStats {
  total: number
  by_level: { level: string; count: number }[]
  first_at: string | null
  last_at: string | null
}

export function useDbLogsStats() {
  return useQuery({
    queryKey: ['infra', 'do', 'app', 'logs', 'db', 'stats'],
    queryFn: () => api.get<DbLogsStats>('/infra/do/app/logs/db/stats'),
    staleTime: 30_000,
    refetchInterval: 30_000,
  })
}

export interface CaptureStatus {
  running: boolean
  startedAt: string | null
  restartCount: number
  lastError: string | null
  lastErrorAt: string | null
}

export function useCaptureStatus() {
  return useQuery({
    queryKey: ['infra', 'do', 'app', 'logs', 'capture'],
    queryFn: () => api.get<CaptureStatus>('/infra/do/app/logs/capture'),
    staleTime: 15_000,
    refetchInterval: 30_000,
  })
}

// --------- DO Spaces (qeb-media-main) ---------

export interface SpacesObject {
  key: string
  size: number
  lastModified: string | null
}

export interface SpacesSummary {
  configured: boolean
  reason?: string
  error?: string
  bucket?: string
  region?: string
  endpoint?: string
  totalObjects?: number
  totalBytes?: number
  totalGiB?: number
  byExtension?: { ext: string; count: number; bytes: number }[]
  byTopLevel?: { prefix: string; count: number; bytes: number }[]
  largest?: SpacesObject[]
  mostRecent?: SpacesObject[]
  oldestAt?: string | null
  newestAt?: string | null
}

export function useSpacesSummary() {
  return useQuery({
    queryKey: ['infra', 'spaces', 'summary'],
    queryFn: () => api.get<SpacesSummary>('/infra/spaces/summary'),
    staleTime: 5 * 60_000,
    refetchInterval: 5 * 60_000,
  })
}

/**
 * Errores recientes (últimos N minutos). Sirve para el badge de alertas
 * en el header y el widget de overview.
 */
export function useRecentErrors(minutes = 15) {
  return useQuery({
    queryKey: ['infra', 'do', 'app', 'logs', 'recent-errors', minutes],
    queryFn: () => {
      const from = new Date(Date.now() - minutes * 60_000).toISOString()
      const to = new Date().toISOString()
      const qs = new URLSearchParams({
        level: 'ERROR',
        from,
        to,
        limit: '50',
      })
      return api.get<{ count: number; lines: DbLogLine[] }>(
        `/infra/do/app/logs/db?${qs.toString()}`,
      )
    },
    staleTime: 15_000,
    refetchInterval: 15_000,
  })
}

export function useLogContext(id: string | null) {
  return useQuery({
    queryKey: ['infra', 'do', 'app', 'logs', 'db', 'context', id],
    queryFn: () =>
      api.get<{ target: DbLogLine; context: DbLogLine[] }>(
        `/infra/do/app/logs/db/${id}/context?size=20`,
      ),
    enabled: !!id,
    staleTime: 5 * 60_000,
  })
}

// ------- DO Databases -------

interface DoDbResp {
  configured: boolean
  reason?: string
  error?: string
  cluster?: {
    id: string
    name: string
    engine: string
    version: string
    status: string
    size: string
    region: string
    num_nodes: number
    db_names?: string[]
    connection?: { host: string; port: number; database: string; ssl: boolean }
    created_at: string
  }
  plan?: PlanInfo
}

export function useDoDbCluster() {
  return useQuery({
    queryKey: ['infra', 'do', 'database'],
    queryFn: () => api.get<DoDbResp>('/infra/do/database'),
    staleTime: 60_000,
    refetchInterval: 60_000,
  })
}

// ------- Historico de CPU/RAM (snapshot cada 5min, retencion 30d) -------

export interface MetricHistoryPoint {
  ts: string
  value: number
}

export interface MetricHistoryResp {
  metric: 'cpu' | 'ram'
  hours: number
  count: number
  avg: number | null
  peak: number | null
  latest: number | null
  points: MetricHistoryPoint[]
}

export function useMetricsHistory(metric: 'cpu' | 'ram', hours: number) {
  return useQuery({
    queryKey: ['infra', 'do', 'app', 'metrics', 'history', metric, hours],
    queryFn: () =>
      api.get<MetricHistoryResp>(
        `/infra/do/app/metrics/history?metric=${metric}&hours=${hours}`,
      ),
    staleTime: 5 * 60_000,
    refetchInterval: 5 * 60_000,
  })
}

// ------- Slow queries del back QEB (performance_schema) -------

export interface SlowQuery {
  digest: string
  digest_text: string
  count_star: number
  avg_ms: number
  max_ms: number
  sum_ms: number
  rows_examined_avg: number
  rows_sent_avg: number
  last_seen: string | null
  first_seen: string | null
}

export function useSlowQueries(opts: {
  orderBy?: 'sum' | 'avg' | 'count' | 'max'
  limit?: number
  minAvgMs?: number
}) {
  const qs = new URLSearchParams()
  if (opts.orderBy) qs.set('orderBy', opts.orderBy)
  if (opts.limit) qs.set('limit', String(opts.limit))
  if (opts.minAvgMs) qs.set('minAvgMs', String(opts.minAvgMs))
  return useQuery({
    queryKey: ['qeb', 'slow-queries', opts],
    queryFn: () =>
      api.get<{ orderBy: string; minAvgMs: number; queries: SlowQuery[]; error?: string }>(
        `/qeb/slow-queries?${qs.toString()}`,
      ),
    staleTime: 60_000,
    refetchInterval: 60_000,
  })
}

// ------- Uptime (pings propios) -------

export type UptimeTargetKey = 'front-qeb' | 'back-qeb' | 'db-qeb'

export interface UptimeTargetSummary {
  key: UptimeTargetKey
  name: string
  count: number
  okCount: number
  uptimePct: number
  avgMs: number | null
  p95Ms: number | null
  lastPingAt: string | null
  lastOk: boolean | null
  lastStatus: number | null
}

export interface UptimeSummaryResp {
  hours: number
  targets: UptimeTargetSummary[]
}

export function useUptimeSummary(hours = 24) {
  return useQuery({
    queryKey: ['infra', 'uptime', 'summary', hours],
    queryFn: () => api.get<UptimeSummaryResp>(`/infra/uptime/summary?hours=${hours}`),
    staleTime: 30_000,
    refetchInterval: 30_000,
  })
}

export interface UptimePoint {
  ts: string
  ok: boolean
  responseMs: number
  status: number | null
}

export function useUptimeSeries(target: UptimeTargetKey, hours = 24) {
  return useQuery({
    queryKey: ['infra', 'uptime', 'series', target, hours],
    queryFn: () =>
      api.get<{ target: string; hours: number; points: UptimePoint[] }>(
        `/infra/uptime/series?target=${target}&hours=${hours}`,
      ),
    staleTime: 30_000,
    refetchInterval: 30_000,
  })
}

// ------- VPS status -------

export interface VpsStatus {
  configured: boolean
  connected: boolean
  lastLineAt: string | null
  buffered: number
}

export function useVpsStatus() {
  return useQuery({
    queryKey: ['vps', 'status'],
    queryFn: () => api.get<VpsStatus>('/vps/logs/status'),
    staleTime: 10_000,
    refetchInterval: 15_000,
  })
}
