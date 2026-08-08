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
    staleTime: 60_000,
  })
}

export function useDoAppDeployments() {
  return useQuery({
    queryKey: ['infra', 'do', 'app', 'deployments'],
    queryFn: () => api.get<DoAppDeploysResp>('/infra/do/app/deployments'),
    staleTime: 30_000,
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
}

export function useDoDbCluster() {
  return useQuery({
    queryKey: ['infra', 'do', 'database'],
    queryFn: () => api.get<DoDbResp>('/infra/do/database'),
    staleTime: 60_000,
  })
}
