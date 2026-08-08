import { useAuth } from '@/stores/authStore'

const BASE_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:4001/api').replace(/\/$/, '')

interface ReportInput {
  message: string
  stack?: string
  errorType: 'boundary' | 'window.onerror' | 'unhandledrejection'
}

let recentSignatures = new Set<string>()

/**
 * Envía un error del propio panel al back del monitor.
 * Deduplica por firma (message+stack) para no spamear.
 * Fire-and-forget: si el back está caído o no hay red, no rompe nada.
 */
export function reportFrontError(input: ReportInput): void {
  const signature = `${input.message}|${(input.stack ?? '').slice(0, 200)}`
  if (recentSignatures.has(signature)) return
  recentSignatures.add(signature)
  // Reset firma después de 60s
  setTimeout(() => recentSignatures.delete(signature), 60_000)

  const payload = {
    message: input.message,
    stack: input.stack,
    url: window.location.href,
    userAgent: navigator.userAgent,
    userEmail: useAuth.getState().user?.email,
    errorType: input.errorType,
  }

  fetch(`${BASE_URL}/monitor/front-error`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    keepalive: true, // permite envío aunque el user cierre la pestaña
  }).catch(() => {
    // silencio: si no podemos reportar, ni modo
  })
}

/**
 * Registra listeners globales para capturar errores no atrapados por
 * el ErrorBoundary de React (async, event handlers, promesas).
 */
export function setupGlobalErrorHandlers(): void {
  window.addEventListener('error', (e) => {
    // e.error puede ser undefined en algunos errores (ej. de scripts cross-origin)
    reportFrontError({
      message: e.message || 'error no capturado',
      stack: e.error?.stack,
      errorType: 'window.onerror',
    })
  })

  window.addEventListener('unhandledrejection', (e) => {
    const reason = e.reason
    const message =
      typeof reason === 'string'
        ? reason
        : reason?.message || 'promise rechazada sin razón'
    const stack = reason?.stack
    reportFrontError({
      message: `[unhandledrejection] ${message}`,
      stack,
      errorType: 'unhandledrejection',
    })
  })
}
