import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Section } from '@/components/ui/Section'
import { StatusBadge, type StatusKind } from '@/components/ui/StatusBadge'
import { LiveBadge } from '@/components/ui/LiveBadge'
import { api } from '@/lib/api'
import { useAuth } from '@/stores/authStore'
import { cn } from '@/lib/utils'

interface LogLine {
  ts: string
  msg: string
  level: string
  source: string
}
interface DropletProc {
  key: string
  label: string
  pm2: string
  status: string
  up: boolean
  uptimeMs: number | null
  restarts: number | null
  cpu: number | null
  memory: number | null // bytes
}

function colorForLevel(level: string): string {
  const l = level.toUpperCase()
  if (l === 'ERROR') return 'text-state-crit'
  if (l === 'WARN') return 'text-state-warn'
  if (l === 'DEBUG') return 'text-fg-faint'
  return 'text-fg-muted'
}
function fmtTs(iso: string) {
  return iso.replace('T', ' ').replace('Z', '').slice(0, 19)
}
function fmtUptime(ms: number | null): string {
  if (ms == null || ms < 0) return '—'
  const s = Math.floor(ms / 1000)
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (d > 0) return `${d}d ${h}h`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}
function fmtMem(bytes: number | null): string {
  if (bytes == null) return '—'
  return `${Math.round(bytes / 1024 / 1024)} MB`
}

// Marcador por proceso: verde = activo, rojo = caído, gris = no existe.
function badgeFor(proc: DropletProc | undefined): { kind: StatusKind; label: string } {
  if (!proc) return { kind: 'muted', label: 'sin datos' }
  if (proc.up) return { kind: 'ok', label: 'activo' }
  if (proc.status === 'missing') return { kind: 'muted', label: 'no existe' }
  return { kind: 'crit', label: `caído (${proc.status})` }
}

const MAX_LINES = 1500

export default function Vps() {
  const token = useAuth((s) => s.token)
  const [live, setLive] = useState(true)
  const [paused, setPaused] = useState(false)
  const [lines, setLines] = useState<LogLine[]>([])
  const esRef = useRef<EventSource | null>(null)
  const pausedRef = useRef(paused)
  pausedRef.current = paused

  const statusQ = useQuery({
    queryKey: ['droplet', 'status'],
    queryFn: () => api.get<{ procs: DropletProc[] }>('/droplet/status'),
    refetchInterval: 5000,
  })
  const procs = statusQ.data?.procs ?? []
  const procByKey = (key: string) => procs.find((p) => p.key === key)

  // Acciones de los botones (reiniciar proceso / limpiar cache del proxy SAP).
  async function restart(source: string): Promise<string> {
    const r = await api.post<{ ok: boolean; pm2: string }>(`/droplet/restart/${source}`)
    if (!r.ok) throw new Error('no se pudo reiniciar')
    return `reiniciado (${r.pm2})`
  }
  async function clearCache(group: string): Promise<string> {
    const r = await api.post<{ ok: boolean }>(`/droplet/clear-cache/${group}`)
    if (!r.ok) throw new Error('no se pudo limpiar cache')
    return group === 'todo' ? 'cache limpiado' : `cache ${group.toUpperCase()} limpiado`
  }

  // Las fuentes salen del propio estado (orden estable del back); fallback fijo.
  const sources = procs.length
    ? procs.map((p) => ({ key: p.key, label: p.label }))
    : [
        { key: 'autosync', label: 'autosync' },
        { key: 'qeb-api', label: 'qeb-api' },
      ]

  const downCount = procs.filter((p) => !p.up && p.status !== 'missing').length
  const overall: { kind: StatusKind; label: string } = !procs.length
    ? { kind: 'muted', label: 'sin datos' }
    : downCount > 0
      ? { kind: 'crit', label: `${downCount} caído${downCount > 1 ? 's' : ''}` }
      : { kind: 'ok', label: 'todo activo' }

  // Stream SSE en vivo (una sola conexión; cada línea trae su source).
  useEffect(() => {
    if (!live || !token) {
      esRef.current?.close()
      esRef.current = null
      return
    }
    const base = (import.meta.env.VITE_API_URL ?? 'http://localhost:4001/api').replace(/\/$/, '')
    const url = `${base}/droplet/logs/live?token=${encodeURIComponent(token)}`
    const es = new EventSource(url)
    esRef.current = es
    es.onmessage = (e) => {
      if (pausedRef.current) return
      try {
        const line = JSON.parse(e.data) as LogLine
        setLines((prev) => [...prev, line].slice(-MAX_LINES))
      } catch {
        /* ignore */
      }
    }
    es.onerror = () => {
      /* el navegador reintenta solo */
    }
    return () => {
      es.close()
      esRef.current = null
    }
  }, [live, token])

  return (
    <div className="flex flex-col gap-6 text-[13px]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border-subtle pb-4">
        <div className="flex items-center gap-3">
          <span className="text-fg-muted text-[11.5px]">host</span>
          <span className="text-fg-primary text-[15px]">droplet qeb</span>
          <span className="text-fg-faint">·</span>
          <span className="text-fg-muted text-[11.5px]">ubuntu · pm2</span>
        </div>
        <div className="flex items-center gap-3">
          <LiveBadge intervalSec={5} fetching={statusQ.isFetching} />
          <StatusBadge status={overall.kind} label={overall.label} />
        </div>
      </div>

      {/* Marcadores por proceso (verde = activo, rojo = caído) */}
      <div className="grid grid-cols-2 md:grid-cols-2 gap-3">
        {sources.map((s) => {
          const p = procByKey(s.key)
          const b = badgeFor(p)
          return (
            <div
              key={s.key}
              className="rounded-md bg-bg-card border border-border-subtle px-4 py-3"
            >
              <div className="flex items-center justify-between">
                <div className="text-fg-faint text-[10.5px] uppercase tracking-wide">{s.label}</div>
                <StatusBadge status={b.kind} label={b.label} />
              </div>
              <div
                className={cn(
                  'tabular-nums text-[16px] mt-1 flex items-center gap-2',
                  p?.up ? 'text-state-ok' : p && p.status !== 'missing' ? 'text-state-crit' : 'text-fg-muted',
                )}
              >
                <span
                  className={cn(
                    'h-1.5 w-1.5 rounded-full',
                    p?.up ? 'bg-state-ok animate-pulse' : p && p.status !== 'missing' ? 'bg-state-crit' : 'bg-fg-faint',
                  )}
                />
                {p?.up ? 'activo' : p && p.status !== 'missing' ? 'caído' : 'sin datos'}
              </div>
              <div className="text-fg-muted text-[10.5px] mt-0.5">
                {p
                  ? `pm2: ${p.pm2} · uptime ${fmtUptime(p.uptimeMs)} · ↺ ${p.restarts ?? '—'} · ${fmtMem(p.memory)}`
                  : 'sin datos del proceso'}
              </div>
              <div className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t border-border-subtle pt-2.5">
                <ActionButton
                  label="reiniciar"
                  danger
                  onRun={() => restart(s.key)}
                  onDone={() => statusQ.refetch()}
                />
                {s.key === 'qeb-api' && (
                  <>
                    <span className="text-fg-faint text-[10px] ml-1">cache:</span>
                    <ActionButton label="CIMU" onRun={() => clearCache('cimu')} />
                    <ActionButton label="TRADE" onRun={() => clearCache('trade')} />
                    <ActionButton label="todo" onRun={() => clearCache('todo')} />
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {statusQ.isError && (
        <div className="rounded-md bg-state-critSoft border border-state-crit/30 px-3 py-2 text-[12px] text-state-crit font-mono">
          [api] {(statusQ.error as Error)?.message}
        </div>
      )}

      {/* Controles globales del stream */}
      <div className="flex items-center justify-end gap-2 text-[11px]">
        <button
          onClick={() => setLive((v) => !v)}
          className={cn(
            'px-2 h-6 rounded border',
            live
              ? 'border-state-ok/60 bg-state-ok/10 text-state-ok'
              : 'border-border-subtle text-fg-muted hover:text-fg-primary',
          )}
          title="conectar / desconectar el stream"
        >
          {live ? '● en vivo' : '○ desconectado'}
        </button>
        <button
          onClick={() => setPaused((v) => !v)}
          className={cn(
            'px-2 h-6 rounded border',
            paused
              ? 'border-state-warn/60 bg-state-warn/10 text-state-warn'
              : 'border-border-subtle text-fg-muted hover:text-fg-primary',
          )}
          title="pausar la llegada de líneas"
        >
          {paused ? '❚❚ pausado' : '▶ en curso'}
        </button>
        <button
          onClick={() => setLines([])}
          className="px-2 h-6 rounded border border-border-subtle text-fg-muted hover:text-fg-primary"
        >
          limpiar
        </button>
      </div>

      {/* Una consola por fuente */}
      {sources.map((s) => (
        <LogConsole
          key={s.key}
          source={s}
          proc={procByKey(s.key)}
          lines={lines}
          paused={paused}
          live={live}
        />
      ))}
    </div>
  )
}

function LogConsole({
  source,
  proc,
  lines,
  paused,
  live,
}: {
  source: { key: string; label: string }
  proc: DropletProc | undefined
  lines: LogLine[]
  paused: boolean
  live: boolean
}) {
  const [search, setSearch] = useState('')
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const mine = lines.filter((l) => l.source === source.key)
  const filtered = search
    ? mine.filter((l) => l.msg.toLowerCase().includes(search.toLowerCase()))
    : mine
  const b = badgeFor(proc)

  useEffect(() => {
    if (paused) return
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [mine.length, paused])

  return (
    <Section
      title={source.label}
      subtitle={proc ? `pm2: ${proc.pm2} · stream directo (no se persiste)` : 'pm2'}
      right={<StatusBadge status={b.kind} label={b.label} />}
    >
      <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-fg-muted px-1">
        <span>
          líneas: <span className="text-fg-primary tabular-nums">{mine.length}</span>
          {search && <span className="text-fg-faint"> · {filtered.length} coinciden</span>}
        </span>
        {proc && !proc.up && proc.status !== 'missing' && (
          <span className="text-state-crit">
            proceso caído — revisa las líneas en rojo (suele ser una conexión que falló)
          </span>
        )}
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="filtrar en la línea..."
          className="bg-bg-card border border-border-subtle rounded px-2 h-6 text-fg-secondary outline-none focus:border-brand-500/50 min-w-[160px] flex-1 max-w-xs ml-auto"
        />
      </div>

      <div
        ref={scrollRef}
        className="mt-3 rounded-md bg-bg-inset border border-border-subtle px-3 py-2 font-mono text-[12px] h-[320px] overflow-auto"
      >
        {filtered.length === 0 && (
          <div className="text-fg-muted text-center py-6">
            {!live ? 'stream desconectado — dale a "en vivo".' : 'esperando logs…'}
          </div>
        )}
        {filtered.map((l, i) => (
          <div key={i} className="grid grid-cols-[150px_56px_1fr] gap-2 py-0.5 hover:bg-white/[0.02]">
            <span className="text-fg-muted tabular-nums text-[11px]">{fmtTs(l.ts)}</span>
            <span className={cn('font-medium', colorForLevel(l.level))}>{l.level}</span>
            <span className="text-fg-primary whitespace-pre-wrap break-words">{l.msg}</span>
          </div>
        ))}
      </div>
    </Section>
  )
}

// Boton de accion con confirmacion en 2 pasos + feedback (evita clicks accidentales
// sobre acciones que tocan prod: reiniciar un proceso, limpiar cache).
function ActionButton({
  label,
  onRun,
  danger = false,
  onDone,
}: {
  label: string
  onRun: () => Promise<string>
  danger?: boolean
  onDone?: () => void
}) {
  const [phase, setPhase] = useState<'idle' | 'confirm' | 'running'>('idle')
  const [flash, setFlash] = useState<{ ok: boolean; msg: string } | null>(null)

  async function run() {
    setPhase('running')
    try {
      const msg = await onRun()
      setFlash({ ok: true, msg })
      onDone?.()
    } catch (e) {
      setFlash({ ok: false, msg: e instanceof Error ? e.message : 'error' })
    } finally {
      setPhase('idle')
      window.setTimeout(() => setFlash(null), 4000)
    }
  }

  if (flash) {
    return (
      <span
        className={cn(
          'px-2 h-6 inline-flex items-center rounded border text-[11px] whitespace-nowrap',
          flash.ok
            ? 'border-state-ok/50 text-state-ok bg-state-ok/10'
            : 'border-state-crit/50 text-state-crit bg-state-crit/10',
        )}
      >
        {flash.ok ? '✓ ' : '✕ '}
        {flash.msg}
      </span>
    )
  }
  if (phase === 'running') {
    return (
      <span className="px-2 h-6 inline-flex items-center rounded border border-border-subtle text-fg-muted text-[11px]">
        … {label}
      </span>
    )
  }
  if (phase === 'confirm') {
    return (
      <span className="inline-flex items-center gap-1">
        <button
          onClick={run}
          className="px-2 h-6 rounded border border-state-crit/60 bg-state-crit/10 text-state-crit text-[11px]"
        >
          confirmar {label}
        </button>
        <button
          onClick={() => setPhase('idle')}
          className="px-2 h-6 rounded border border-border-subtle text-fg-muted text-[11px]"
          title="cancelar"
        >
          ✕
        </button>
      </span>
    )
  }
  return (
    <button
      onClick={() => setPhase('confirm')}
      className={cn(
        'px-2 h-6 rounded border text-[11px]',
        danger
          ? 'border-state-crit/40 text-state-crit hover:bg-state-crit/10'
          : 'border-border-subtle text-fg-muted hover:text-fg-primary',
      )}
    >
      {label}
    </button>
  )
}
