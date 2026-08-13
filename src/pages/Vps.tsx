import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Section } from '@/components/ui/Section'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { api } from '@/lib/api'
import { useAuth } from '@/stores/authStore'
import { cn } from '@/lib/utils'

interface VpsLogLine {
  ts: string
  msg: string
  level: string
  source: string
}
interface VpsStatus {
  configured: boolean
  connected: boolean
  lastLineAt: string | null
  buffered: number
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
function relative(iso: string | null): string {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const s = Math.round(diff / 1000)
  if (s < 60) return `hace ${s}s`
  const m = Math.round(s / 60)
  if (m < 60) return `hace ${m}m`
  return `hace ${Math.round(m / 60)}h`
}

const MAX_LINES = 1000

export default function Vps() {
  const token = useAuth((s) => s.token)
  const [live, setLive] = useState(true)
  const [paused, setPaused] = useState(false)
  const [lines, setLines] = useState<VpsLogLine[]>([])
  const [search, setSearch] = useState('')
  const esRef = useRef<EventSource | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const pausedRef = useRef(paused)
  pausedRef.current = paused

  const statusQ = useQuery({
    queryKey: ['vps', 'status'],
    queryFn: () => api.get<VpsStatus>('/vps/logs/status'),
    refetchInterval: 5000,
  })
  const status = statusQ.data
  const configured = status?.configured
  const connected = status?.connected

  // Stream SSE en vivo
  useEffect(() => {
    if (!live || !token) {
      esRef.current?.close()
      esRef.current = null
      return
    }
    const base = (import.meta.env.VITE_API_URL ?? 'http://localhost:4001/api').replace(/\/$/, '')
    const url = `${base}/vps/logs/live?token=${encodeURIComponent(token)}`
    const es = new EventSource(url)
    esRef.current = es
    es.onmessage = (e) => {
      if (pausedRef.current) return
      try {
        const line = JSON.parse(e.data) as VpsLogLine
        setLines((prev) => [...prev, line].slice(-MAX_LINES))
      } catch {
        /* ignore */
      }
    }
    es.onerror = () => {
      // el navegador reintenta solo; no cerramos.
    }
    return () => {
      es.close()
      esRef.current = null
    }
  }, [live, token])

  // Auto-scroll al fondo cuando llegan líneas (si no está pausado).
  useEffect(() => {
    if (paused) return
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [lines, paused])

  const filtered = search
    ? lines.filter((l) => l.msg.toLowerCase().includes(search.toLowerCase()))
    : lines

  return (
    <div className="flex flex-col gap-6 text-[13px]">
      <div className="flex items-center justify-between border-b border-border-subtle pb-4">
        <div className="flex items-center gap-3">
          <span className="text-fg-muted text-[11.5px]">servicio</span>
          <span className="text-fg-primary text-[15px]">vps.qeb</span>
          <span className="text-fg-faint">·</span>
          <span className="text-fg-muted text-[11.5px]">windows · powershell agent</span>
        </div>
        {configured === false ? (
          <StatusBadge status="muted" label="sin secreto vps" />
        ) : connected ? (
          <StatusBadge status="ok" label="agente conectado" />
        ) : (
          <StatusBadge status="warn" label="esperando agente" />
        )}
      </div>

      {statusQ.data && configured === false && (
        <div className="rounded-md bg-bg-inset border border-brand-500/30 px-3 py-2 text-[12px] text-brand-300 font-mono">
          [pendiente] configura <span className="text-fg-primary">VPS_LOG_SECRET</span> en el env del
          back y corre el agente <span className="text-fg-primary">ship-logs.ps1</span> en el VPS.
        </div>
      )}

      {statusQ.isError && (
        <div className="rounded-md bg-state-critSoft border border-state-crit/30 px-3 py-2 text-[12px] text-state-crit font-mono">
          [api] {(statusQ.error as Error)?.message}
        </div>
      )}

      <Section
        title="logs en vivo"
        subtitle="stream directo del VPS · solo en vivo (no se persiste)"
        right={
          <div className="flex items-center gap-2 text-[11px]">
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
              title="pausar el auto-scroll y la llegada de líneas"
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
        }
      >
        {/* Barra de estado + búsqueda */}
        <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-fg-muted px-1">
          <span>
            líneas en buffer:{' '}
            <span className="text-fg-primary tabular-nums">{lines.length}</span>
            {search && (
              <span className="text-fg-faint"> · {filtered.length} coinciden</span>
            )}
          </span>
          {status?.lastLineAt && (
            <span>
              última línea:{' '}
              <span className="text-fg-secondary">{relative(status.lastLineAt)}</span>
            </span>
          )}
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="filtrar en la línea..."
            className="bg-bg-card border border-border-subtle rounded px-2 h-6 text-fg-secondary outline-none focus:border-brand-500/50 min-w-[200px] flex-1 max-w-xs ml-auto"
          />
        </div>

        {/* Consola */}
        <div
          ref={scrollRef}
          className="mt-3 rounded-md bg-bg-inset border border-border-subtle px-3 py-2 font-mono text-[12px] h-[560px] overflow-auto"
        >
          {filtered.length === 0 && (
            <div className="text-fg-muted text-center py-6">
              {!live
                ? 'stream desconectado — dale a "en vivo" para conectar.'
                : connected === false
                  ? 'conectado al back, esperando que el agente del VPS empuje logs…'
                  : 'esperando logs…'}
            </div>
          )}
          {filtered.map((l, i) => (
            <div
              key={i}
              className="grid grid-cols-[150px_56px_1fr] gap-2 py-0.5 hover:bg-white/[0.02]"
            >
              <span className="text-fg-muted tabular-nums text-[11px]">{fmtTs(l.ts)}</span>
              <span className={cn('font-medium', colorForLevel(l.level))}>{l.level}</span>
              <span className="text-fg-primary whitespace-pre-wrap break-words">{l.msg}</span>
            </div>
          ))}
        </div>
      </Section>
    </div>
  )
}
