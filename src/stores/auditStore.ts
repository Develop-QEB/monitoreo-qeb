import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type AuditAction =
  | 'auth.login'
  | 'auth.login_fail'
  | 'auth.logout'
  | 'user.create'
  | 'user.update'
  | 'user.role_change'
  | 'user.disable'
  | 'user.enable'
  | 'user.password_reset'
  | 'query.kill'
  | 'reserva.resolver'

export interface AuditEvent {
  id: string
  ts: string
  actor: string
  action: AuditAction
  target?: string
  details?: string
}

interface AuditState {
  events: AuditEvent[]
  record: (e: Omit<AuditEvent, 'id' | 'ts'>) => void
  clear: () => void
}

const SEED: AuditEvent[] = [
  { id: 's1', ts: '2026-08-07T09:41:00', actor: 'develop@qeb.mx', action: 'auth.login',    target: 'develop@qeb.mx' },
  { id: 's2', ts: '2026-08-07T10:02:14', actor: 'mario@qeb.mx',   action: 'auth.login',    target: 'mario@qeb.mx' },
  { id: 's3', ts: '2026-08-07T10:44:22', actor: 'develop@qeb.mx', action: 'user.create',   target: 'ti@qeb.mx', details: 'role=ti' },
  { id: 's4', ts: '2026-08-07T12:44:15', actor: 'unknown',        action: 'auth.login_fail', target: 'admin@qeb.mx', details: 'ip=45.129.244.10' },
  { id: 's5', ts: '2026-08-07T12:44:19', actor: 'unknown',        action: 'auth.login_fail', target: 'admin@qeb.mx', details: 'ip=45.129.244.10' },
  { id: 's6', ts: '2026-08-07T13:22:41', actor: 'develop@qeb.mx', action: 'query.kill',    target: 'query_a0f2', details: 'p95=720ms freq=1.4k' },
  { id: 's7', ts: '2026-08-07T14:22:11', actor: 'mario@qeb.mx',   action: 'auth.login',    target: 'mario@qeb.mx' },
]

let counter = 100
function newId() {
  counter += 1
  return `e${counter}`
}

function nowIso() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

export const useAudit = create<AuditState>()(
  persist(
    (set) => ({
      events: SEED,
      record: (e) =>
        set((s) => ({
          events: [{ id: newId(), ts: nowIso(), ...e }, ...s.events].slice(0, 500),
        })),
      clear: () => set({ events: [] }),
    }),
    { name: 'monitoreo-qeb:audit' },
  ),
)
