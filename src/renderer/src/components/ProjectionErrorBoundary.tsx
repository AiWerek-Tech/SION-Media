/**
 * ProjectionErrorBoundary — Production-grade fallback for projection window
 *
 * Unlike the main ErrorBoundary, this one NEVER shows a white/blank screen.
 * It renders a dark screen with centered status text so the audience sees
 * "Projection temporarily unavailable" while the operator can use the
 * recovery button or wait for the auto-retry.
 *
 * Auto-retries after 5 seconds (up to MAX_RETRIES) to attempt recovery.
 */

import React from 'react'

interface Props {
  children: React.ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  retryCount: number
}

export class ProjectionErrorBoundary extends React.Component<Props, State> {
  private retryTimer: ReturnType<typeof setTimeout> | null = null
  private static readonly MAX_RETRIES = 3
  private static readonly RETRY_DELAY_MS = 5000

  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null, retryCount: 0 }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('[ProjectionErrorBoundary] Render crash caught:', error, info.componentStack)
  }

  componentDidUpdate(_prevProps: Props, prevState: State): void {
    if (this.state.hasError && !prevState.hasError) {
      // Schedule auto-retry
      if (this.state.retryCount < ProjectionErrorBoundary.MAX_RETRIES) {
        this.retryTimer = setTimeout(() => {
          this.setState((s) => ({
            hasError: false,
            error: null,
            retryCount: s.retryCount + 1
          }))
        }, ProjectionErrorBoundary.RETRY_DELAY_MS)
      }
    }
  }

  componentWillUnmount(): void {
    if (this.retryTimer) clearTimeout(this.retryTimer)
  }

  private handleManualRetry = (): void => {
    if (this.retryTimer) clearTimeout(this.retryTimer)
    this.setState({ hasError: false, error: null, retryCount: 0 })
  }

  render(): React.ReactNode {
    if (!this.state.hasError) return this.props.children

    const canRetry = this.state.retryCount < ProjectionErrorBoundary.MAX_RETRIES

    // Safe fallback: dark screen with centered status — audience sees a clean
    // dark screen; operator sees the recovery UI.
    return (
      <div
        style={{
          width: '100vw',
          height: '100vh',
          backgroundColor: '#0a0a0a',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'Inter, system-ui, sans-serif',
          overflow: 'hidden',
          gap: '16px'
        }}
      >
        <div
          style={{
            color: 'rgba(255,255,255,0.7)',
            fontSize: '18px',
            fontWeight: 500,
            letterSpacing: '0.02em',
            textAlign: 'center'
          }}
        >
          Projection temporarily unavailable
        </div>
        {canRetry && (
          <div
            style={{
              color: 'rgba(255,255,255,0.35)',
              fontSize: '13px',
              textAlign: 'center'
            }}
          >
            Auto-recovering in {ProjectionErrorBoundary.RETRY_DELAY_MS / 1000}s (attempt{' '}
            {this.state.retryCount + 1}/{ProjectionErrorBoundary.MAX_RETRIES})
          </div>
        )}
        <button
          onClick={this.handleManualRetry}
          style={{
            marginTop: '8px',
            padding: '8px 24px',
            backgroundColor: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '6px',
            color: 'rgba(255,255,255,0.8)',
            fontSize: '13px',
            cursor: 'pointer',
            fontFamily: 'inherit'
          }}
        >
          Retry Now
        </button>
      </div>
    )
  }
}
