import React from 'react'
import { logger } from '../utils/logger'

interface ErrorBoundaryProps {
  children: React.ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  errorMessage: string
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, errorMessage: '' }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return { hasError: true, errorMessage: message }
  }

  componentDidCatch(error: unknown, errorInfo: React.ErrorInfo): void {
    logger.error('Renderer crash:', error, errorInfo)
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-screen flex items-center justify-center bg-bg-base text-text-primary">
          <div className="glass-panel p-6 max-w-xl text-center">
            <h2 className="text-h3 font-bold mb-2">Terjadi Kesalahan</h2>
            <p className="text-sm text-text-muted mb-4 break-words">{this.state.errorMessage}</p>
            <button className="btn-primary" onClick={() => window.location.reload()}>
              Muat Ulang
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
