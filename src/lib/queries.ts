import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Role } from '@/lib/roles'
import type { AdminUser, AuditEvent } from '@/types/api'

// ---------- users ----------

export function useUsersQuery() {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await api.get<{ users: AdminUser[] }>('/users')
      return res.users
    },
    staleTime: 15_000,
  })
}

export function useCreateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { name: string; email: string; password: string; role: Role }) => {
      const res = await api.post<{ user: AdminUser }>('/users', input)
      return res.user
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })
}

export function useUpdateRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, role }: { id: string; role: Role }) => {
      const res = await api.patch<{ user: AdminUser }>(`/users/${id}/role`, { role })
      return res.user
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      qc.invalidateQueries({ queryKey: ['audit'] })
    },
  })
}

export function useToggleActive() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.patch<{ user: AdminUser }>(`/users/${id}/active`)
      return res.user
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      qc.invalidateQueries({ queryKey: ['audit'] })
    },
  })
}

export function useResetPassword() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.post<{ ok: true; newPassword: string }>(`/users/${id}/reset-password`)
      return res.newPassword
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['audit'] }),
  })
}

// ---------- audit ----------

export function useAuditQuery(params?: { action?: string; actor?: string; limit?: number }) {
  const qs = new URLSearchParams()
  if (params?.action) qs.set('action', params.action)
  if (params?.actor) qs.set('actor', params.actor)
  if (params?.limit) qs.set('limit', String(params.limit))
  const url = qs.toString() ? `/audit?${qs.toString()}` : '/audit'

  return useQuery({
    queryKey: ['audit', params],
    queryFn: async () => {
      const res = await api.get<{ events: AuditEvent[] }>(url)
      return res.events
    },
    staleTime: 10_000,
  })
}
