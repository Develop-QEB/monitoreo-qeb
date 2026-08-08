import { Component, type ErrorInfo, type ReactNode } from 'react'
import { reportFrontError } from '@/lib/errorReporter'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    reportFrontError({
      message: error.message,
      stack: `${error.stack ?? ''}\n---componentStack---\n${info.componentStack ?? ''}`,
      errorType: 'boundary',
    })
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (!this.state.hasError) return this.props.children
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-[13px]">
        <div className="max-w-lg w-full flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <span className="text-state-crit">[500]</span>
            <span className="text-fg-primary text-[15px]">error inesperado en el panel</span>
          </div>
          <p className="text-fg-secondary">
            Algo se rompió en el frontend del monitor. Ya se envió automáticamente al back
            para que quede registrado en <span className="text-brand-300">monitor_logs</span> con{' '}
            <span className="text-brand-300">source='monitor-front'</span>. Puedes verlo en{' '}
            <a href="/backend" className="text-brand-400 hover:underline">
              /backend
            </a>{' '}
            filtrando por source.
          </p>
          {this.state.error && (
            <div className="rounded-md bg-bg-inset border border-state-crit/30 px-3 py-2 font-mono text-[12px] text-state-crit whitespace-pre-wrap break-words">
              {this.state.error.message}
            </div>
          )}
          <div className="flex items-center gap-3">
            <button
              onClick={this.handleReset}
              className="h-9 px-4 rounded bg-brand-500 hover:bg-brand-400 text-white text-[13px]"
            >
              reintentar
            </button>
            <a
              href="/"
              className="h-9 px-4 rounded border border-border-subtle text-fg-secondary hover:text-fg-primary flex items-center"
            >
              ir al inicio
            </a>
          </div>
        </div>
      </div>
    )
  }
}
