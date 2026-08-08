import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Section } from '@/components/ui/Section'
import { StatusBadge, type StatusKind } from '@/components/ui/StatusBadge'
import { UnicodeSparkline } from '@/components/ui/UnicodeSparkline'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

interface Ticket {
  id: number
  titulo: string
  status: string
  prioridad: string
  categoria: string | null
  area: 'TI' | 'QEB' | string
  usuario_nombre: string
  usuario_email: string
  respondido_por: string | null
  created_at: string
  respondido_at: string | null
}

interface Stats {
  total: number
  nuevos: number
  en_proceso: number
  resueltos: number
  sin_respuesta: number
  area_ti: number
  area_qeb: number
  alta: number
}

interface Distribucion {
  categoria: string | null
  area: string
  count: number
}

interface TicketFull extends Ticket {
  descripcion: string
  imagen: string | null
  respuesta: string | null
  respondido_at: string | null
  updated_at: string
  status_cambiado_por: string | null
  usuario_id: number
}

interface TicketMessage {
  id: number
  ticket_id: number
  usuario_id: number
  usuario_nombre: string
  mensaje: string | null
  archivo_url: string | null
  archivo_nombre: string | null
  archivo_tipo: string | null
  created_at: string
}

interface TicketDetail {
  ticket: TicketFull
  mensajes: TicketMessage[]
  chat: TicketMessage[]
}

const STATUS_STYLE: Record<string, { kind: StatusKind }> = {
  Nuevo:        { kind: 'warn' },
  'En proceso': { kind: 'info' },
  Resuelto:     { kind: 'ok' },
  Cerrado:      { kind: 'muted' },
}

const PRIORIDAD_TEXT: Record<string, string> = {
  Alta:   'text-state-crit',
  Normal: 'text-fg-secondary',
  Baja:   'text-fg-muted',
}

const AREA_COLOR: Record<string, string> = {
  TI:  'text-brand-300',
  QEB: 'text-state-info',
}

const STATUS_FILTERS = ['todos', 'Nuevo', 'En proceso', 'Resuelto'] as const
type StatusFilter = (typeof STATUS_FILTERS)[number]
const AREA_FILTERS = ['todas', 'QEB', 'TI'] as const
type AreaFilter = (typeof AREA_FILTERS)[number]

function ageFrom(iso: string) {
  const then = new Date(iso).getTime()
  const now = Date.now()
  const h = Math.round((now - then) / (1000 * 60 * 60))
  if (h < 24) return `${h}h`
  return `${Math.round(h / 24)}d`
}

function fmtTs(iso: string) {
  return iso.replace('T', ' ').replace('Z', '').slice(0, 19)
}

export default function Tickets() {
  const [status, setStatus] = useState<StatusFilter>('todos')
  const [area, setArea] = useState<AreaFilter>('todas')
  const [openId, setOpenId] = useState<number | null>(null)

  const statsQ = useQuery({
    queryKey: ['qeb', 'tickets', 'stats'],
    queryFn: () => api.get<{ stats: Stats }>('/qeb/tickets/stats').then((r) => r.stats),
    staleTime: 60_000,
  })

  const distQ = useQuery({
    queryKey: ['qeb', 'tickets', 'by-categoria'],
    queryFn: () =>
      api.get<{ distribucion: Distribucion[] }>('/qeb/tickets/by-categoria').then((r) => r.distribucion),
    staleTime: 60_000,
  })

  const listQ = useQuery({
    queryKey: ['qeb', 'tickets', status, area],
    queryFn: () => {
      const qs = new URLSearchParams({ limit: '50' })
      if (status !== 'todos') qs.set('status', status)
      if (area !== 'todas') qs.set('area', area)
      return api.get<{ tickets: Ticket[] }>(`/qeb/tickets?${qs}`).then((r) => r.tickets)
    },
    staleTime: 30_000,
  })

  const stats = statsQ.data
  const tickets = listQ.data ?? []
  const distribucion = distQ.data ?? []

  const bannerStatus: StatusKind = statsQ.isError ? 'crit' : (stats?.sin_respuesta ?? 0) > 0 ? 'warn' : 'ok'
  const bannerLabel = statsQ.isLoading
    ? 'cargando…'
    : statsQ.isError
      ? 'error api'
      : `${stats?.sin_respuesta ?? 0} sin respuesta`

  return (
    <div className="flex flex-col gap-6 text-[13px]">
      <div className="flex items-center justify-between border-b border-border-subtle pb-4">
        <div className="flex items-center gap-3">
          <span className="text-fg-muted text-[11.5px]">negocio</span>
          <span className="text-fg-primary text-[15px]">tickets.qeb</span>
          <span className="text-fg-faint">·</span>
          <span className="text-fg-muted text-[11.5px]">
            reportes y solicitudes de los usuarios de qeb · datos en vivo
          </span>
        </div>
        <StatusBadge status={bannerStatus} label={bannerLabel} />
      </div>

      {(statsQ.isError || listQ.isError) && (
        <div className="rounded-md bg-state-critSoft border border-state-crit/30 px-3 py-2 text-[12px] text-state-crit font-mono">
          [api] {((statsQ.error ?? listQ.error) as Error)?.message}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'total',            value: stats?.total,         accent: 'text-fg-primary' },
          { label: 'nuevos',           value: stats?.nuevos,        accent: 'text-state-warn' },
          { label: 'resueltos',        value: stats?.resueltos,     accent: 'text-state-ok' },
          { label: 'alta prioridad',   value: stats?.alta,          accent: 'text-state-crit' },
        ].map((k) => (
          <div key={k.label} className="rounded-md bg-bg-card border border-border-subtle px-4 py-3">
            <div className="text-fg-faint text-[10.5px] uppercase tracking-wide">{k.label}</div>
            <div className={cn('tabular-nums text-[22px] mt-1', k.accent)}>
              {statsQ.isLoading ? '…' : (k.value ?? 0)}
            </div>
          </div>
        ))}
      </div>

      <Section title="por área" subtitle="TI atiende SAP y usuarios · QEB atiende todo lo demás">
        <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="rounded-md bg-bg-card border border-border-subtle px-4 py-3">
            <div className="flex items-baseline justify-between mb-1">
              <div className="text-fg-faint text-[10.5px] uppercase tracking-wide">QEB</div>
              <div className="text-state-info tabular-nums text-[22px]">
                {stats?.area_qeb ?? '…'}
              </div>
            </div>
            <div className="text-fg-muted text-[11.5px]">
              bugs, features, ayuda, correcciones de datos
            </div>
          </div>
          <div className="rounded-md bg-bg-card border border-border-subtle px-4 py-3">
            <div className="flex items-baseline justify-between mb-1">
              <div className="text-fg-faint text-[10.5px] uppercase tracking-wide">TI</div>
              <div className="text-brand-300 tabular-nums text-[22px]">
                {stats?.area_ti ?? '…'}
              </div>
            </div>
            <div className="text-fg-muted text-[11.5px]">
              Posteo SAP · Desposteo SAP · Ajuste de Usuario
            </div>
          </div>
        </div>
      </Section>

      <Section title="por categoría" subtitle="conteo histórico">
        <div className="mt-1">
          <div className="grid grid-cols-[1fr_60px_100px] gap-3 px-2 py-1 text-[11px] text-fg-faint uppercase tracking-wide">
            <span>categoría</span>
            <span>área</span>
            <span className="text-right">conteo</span>
          </div>
          <div className="border-t border-border-subtle">
            {distQ.isLoading && (
              <div className="text-fg-muted text-center py-4 animate-pulse">cargando…</div>
            )}
            {!distQ.isLoading &&
              distribucion.map((d, i) => (
                <div
                  key={`${d.categoria}-${d.area}-${i}`}
                  className={cn(
                    'grid grid-cols-[1fr_60px_100px] gap-3 px-2 py-1.5 items-center hover:bg-white/[0.02] transition-colors',
                    i !== 0 && 'border-t border-border-subtle',
                  )}
                >
                  <span className="text-fg-primary">{d.categoria ?? 'sin categoría'}</span>
                  <span className={cn('text-[11.5px]', AREA_COLOR[d.area] ?? 'text-fg-muted')}>
                    {d.area}
                  </span>
                  <span className="text-right text-fg-primary tabular-nums">{d.count}</span>
                </div>
              ))}
          </div>
        </div>
      </Section>

      <Section
        title="tickets recientes"
        subtitle="ordenados por más recientes · click para ver detalle"
        right={
          <div className="flex flex-wrap items-center gap-1 text-[11px]">
            <span className="text-fg-faint">estado:</span>
            {STATUS_FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setStatus(f)}
                className={cn(
                  'px-2 h-6 rounded border',
                  status === f
                    ? 'border-brand-500/40 bg-brand-500/10 text-brand-300'
                    : 'border-border-subtle text-fg-muted hover:text-fg-primary',
                )}
              >
                {f.toLowerCase()}
              </button>
            ))}
            <span className="text-fg-faint ml-2">área:</span>
            {AREA_FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setArea(f)}
                className={cn(
                  'px-2 h-6 rounded border',
                  area === f
                    ? 'border-brand-500/40 bg-brand-500/10 text-brand-300'
                    : 'border-border-subtle text-fg-muted hover:text-fg-primary',
                )}
              >
                {f.toLowerCase()}
              </button>
            ))}
          </div>
        }
      >
        <div className="mt-1">
          <div className="grid grid-cols-[70px_1fr_180px_140px_60px_80px_100px_60px] gap-3 px-2 py-1 text-[11px] text-fg-faint uppercase tracking-wide">
            <span>id</span>
            <span>título</span>
            <span>usuario</span>
            <span>categoría</span>
            <span>área</span>
            <span>prioridad</span>
            <span>estado</span>
            <span className="text-right">edad</span>
          </div>
          <div className="border-t border-border-subtle">
            {listQ.isLoading && (
              <div className="text-fg-muted text-center py-6 animate-pulse">cargando…</div>
            )}
            {!listQ.isLoading &&
              tickets.map((t, i) => {
                const st = STATUS_STYLE[t.status] ?? { kind: 'muted' as StatusKind }
                return (
                  <div
                    key={t.id}
                    onClick={() => setOpenId(t.id)}
                    className={cn(
                      'grid grid-cols-[70px_1fr_180px_140px_60px_80px_100px_60px] gap-3 px-2 py-1.5 items-center hover:bg-white/[0.02] transition-colors cursor-pointer',
                      i !== 0 && 'border-t border-border-subtle',
                    )}
                  >
                    <span className="text-brand-300 tabular-nums">#{t.id}</span>
                    <div className="min-w-0">
                      <div className="text-fg-primary truncate">{t.titulo}</div>
                      {t.respondido_por && (
                        <div className="text-fg-faint text-[10.5px] truncate">
                          respondiendo: {t.respondido_por}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-fg-primary truncate text-[12px]">{t.usuario_nombre}</div>
                      <div className="text-fg-muted truncate text-[10.5px]">{t.usuario_email}</div>
                    </div>
                    <span className="text-fg-secondary truncate text-[11.5px]">
                      {t.categoria ?? '—'}
                    </span>
                    <span className={cn('text-[11.5px]', AREA_COLOR[t.area] ?? 'text-fg-muted')}>
                      {t.area}
                    </span>
                    <span className={cn('text-[11.5px]', PRIORIDAD_TEXT[t.prioridad] ?? 'text-fg-muted')}>
                      {t.prioridad}
                    </span>
                    <StatusBadge status={st.kind} label={t.status} />
                    <span className="text-right text-fg-muted tabular-nums text-[11.5px]">
                      {ageFrom(t.created_at)}
                    </span>
                  </div>
                )
              })}
            {!listQ.isLoading && tickets.length === 0 && !listQ.isError && (
              <div className="text-fg-muted text-center py-4">sin resultados</div>
            )}
          </div>
        </div>
      </Section>

      {/* Sparkline decoration for consistency */}
      <UnicodeSparkline data={[]} className="hidden" />

      {openId && <TicketModal id={openId} onClose={() => setOpenId(null)} />}
    </div>
  )
}

function TicketModal({ id, onClose }: { id: number; onClose: () => void }) {
  const detailQ = useQuery({
    queryKey: ['qeb', 'tickets', 'detail', id],
    queryFn: () => api.get<TicketDetail>(`/qeb/tickets/${id}`),
    staleTime: 30_000,
  })
  const t = detailQ.data?.ticket
  const mensajes = detailQ.data?.mensajes ?? []
  const chat = detailQ.data?.chat ?? []
  const totalMessages = mensajes.length + chat.length

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-3xl max-h-[85vh] bg-bg-base border border-border-strong rounded-lg shadow-raised flex flex-col overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-3 border-b border-border-subtle">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-brand-300 tabular-nums text-[15px]">#{id}</span>
            {t && (
              <>
                <span className="text-fg-primary truncate text-[15px]">{t.titulo}</span>
                <StatusBadge
                  status={(STATUS_STYLE[t.status] ?? { kind: 'muted' as StatusKind }).kind}
                  label={t.status}
                />
              </>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-fg-muted hover:text-fg-primary text-[18px] leading-none"
            aria-label="cerrar"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-auto px-6 py-4 text-[13px] flex flex-col gap-4">
          {detailQ.isLoading && (
            <div className="text-fg-muted text-center py-8 animate-pulse">cargando…</div>
          )}
          {detailQ.isError && (
            <div className="text-state-crit font-mono text-[12px] py-2">
              [api] {(detailQ.error as Error).message}
            </div>
          )}
          {t && (
            <>
              {/* Meta info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <MetaTile label="área" value={t.area} accent={AREA_COLOR[t.area]} />
                <MetaTile label="prioridad" value={t.prioridad} accent={PRIORIDAD_TEXT[t.prioridad]} />
                <MetaTile label="categoría" value={t.categoria ?? '—'} />
                <MetaTile label="creado" value={fmtTs(t.created_at)} />
              </div>

              {/* Usuario */}
              <div className="rounded-md bg-bg-card border border-border-subtle px-4 py-3">
                <div className="text-fg-faint text-[10.5px] uppercase tracking-wide mb-1">
                  usuario que reportó
                </div>
                <div className="text-fg-primary">{t.usuario_nombre}</div>
                <div className="text-fg-muted text-[11.5px]">{t.usuario_email}</div>
              </div>

              {/* Descripción */}
              <div>
                <div className="text-fg-faint text-[10.5px] uppercase tracking-wide mb-1">
                  descripción
                </div>
                <div className="rounded-md bg-bg-inset border border-border-subtle px-3 py-2 text-fg-primary whitespace-pre-wrap break-words text-[12.5px]">
                  {t.descripcion || '(sin descripción)'}
                </div>
              </div>

              {/* Imagen adjunta si hay */}
              {t.imagen && (
                <div>
                  <div className="text-fg-faint text-[10.5px] uppercase tracking-wide mb-1">
                    imagen adjunta
                  </div>
                  {t.imagen.startsWith('data:') || t.imagen.startsWith('http') ? (
                    <img
                      src={t.imagen}
                      alt="ticket"
                      className="max-h-64 rounded border border-border-subtle"
                    />
                  ) : (
                    <div className="text-fg-muted text-[11.5px]">
                      [adjunto no visualizable · {t.imagen.length} chars]
                    </div>
                  )}
                </div>
              )}

              {/* Respuesta oficial si existe */}
              {t.respuesta && (
                <div>
                  <div className="text-fg-faint text-[10.5px] uppercase tracking-wide mb-1">
                    respuesta oficial · por {t.respondido_por ?? '?'}
                    {t.respondido_at && ` · ${fmtTs(t.respondido_at)}`}
                  </div>
                  <div className="rounded-md bg-state-okSoft border border-state-ok/20 px-3 py-2 text-fg-primary whitespace-pre-wrap break-words text-[12.5px]">
                    {t.respuesta}
                  </div>
                </div>
              )}

              {/* Mensajes + chat */}
              {totalMessages > 0 && (
                <div>
                  <div className="text-fg-faint text-[10.5px] uppercase tracking-wide mb-1">
                    conversación · {totalMessages} mensajes
                  </div>
                  <div className="flex flex-col gap-2">
                    {[...mensajes, ...chat]
                      .sort(
                        (a, b) =>
                          new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
                      )
                      .map((m) => (
                        <div
                          key={`${m.id}-${m.created_at}`}
                          className="rounded-md bg-bg-card border border-border-subtle px-3 py-2"
                        >
                          <div className="flex items-baseline justify-between mb-1">
                            <span className="text-brand-300 text-[11.5px]">{m.usuario_nombre}</span>
                            <span className="text-fg-muted tabular-nums text-[10.5px]">
                              {fmtTs(m.created_at)}
                            </span>
                          </div>
                          {m.mensaje && (
                            <div className="text-fg-primary text-[12.5px] whitespace-pre-wrap break-words">
                              {m.mensaje}
                            </div>
                          )}
                          {m.archivo_url && (
                            <a
                              href={m.archivo_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-brand-400 hover:underline text-[11px] mt-1 inline-block"
                            >
                              📎 {m.archivo_nombre ?? 'archivo'} ↗
                            </a>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function MetaTile({
  label,
  value,
  accent,
}: {
  label: string
  value: string
  accent?: string
}) {
  return (
    <div className="rounded-md bg-bg-card border border-border-subtle px-3 py-2">
      <div className="text-fg-faint text-[10.5px] uppercase tracking-wide">{label}</div>
      <div className={cn('mt-0.5 truncate text-[12.5px]', accent ?? 'text-fg-primary')}>{value}</div>
    </div>
  )
}
