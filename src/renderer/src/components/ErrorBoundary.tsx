/**
 * ErrorBoundary — Phase 4
 *
 * Per-mode error boundary. Catches render errors in a mode without
 * crashing the entire app. Projection output continues unaffected.
 *
 * @see implementation-master-order-v1.md §2.6 Phase 4
 */

import React from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface ErrorBoundaryProps {
  children: React.ReactNode
  /** Mode name for error display */
  mode?: string
  /** Fallback UI — defaults to built-in error card */
  fallback?: React.ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error(`[ErrorBoundary:${this.props.mode ?? 'unknown'}]`, error, info.componentStack)
  }

  private handleReset = (): void => {
    this.setState({ hasError: false, error: null })
  }

  render(): React.ReactNode {
    if (!this.state.hasError) return this.props.children

    if (this.props.fallback) return this.props.fallback

    const { mode } = this.props
    const { error } = this.state

    return (
      <div
        className="flex h-full w-full flex-col items-center justify-center gap-4 p-8"
        style={{ background: 'var(--color-bg-base, #0d0f17)' }}
      >
        <div
          className="flex flex-col items-center gap-3 rounded-2xl p-6 text-center"
          style={{
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.2)',
            maxWidth: 480
          }}
        >
          <AlertTriangle size={32} color="#f87171" />
          <h3
            className="text-base font-bold"
            style={{ color: '#f87171', fontFamily: 'Poppins, Inter, sans-serif' }}
          >
            {mode ? `${mode} Mode Error` : 'Render Error'}
          </h3>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
            {error?.message ?? 'Terjadi kesalahan yang tidak terduga.'}
          </p>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
            Proyeksi tidak terpengaruh — output tetap berjalan.
          </p>
          <button
            type="button"
            onClick={this.handleReset}
            className="mt-2 flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-600 transition-colors"
            style={{
              background: 'rgba(239,68,68,0.15)',
              color: '#f87171',
              border: '1px solid rgba(239,68,68,0.3)',
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={14} />
            Coba Lagi
          </button>
        </div>
      </div>
    )
  }
}
