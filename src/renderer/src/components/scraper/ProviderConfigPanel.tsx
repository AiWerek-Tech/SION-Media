import React, { useMemo } from 'react'
import { Play, Square, RotateCcw, Settings2 } from 'lucide-react'
import type { Hymnal } from '../../types'

interface ScraperProviderInfo {
  id: string
  label: string
  defaultBaseUrl: string
  capabilities: {
    supportsNumericRange: boolean
    supportsSlug: boolean
    requiresBrowser: boolean
  }
}

export function ProviderConfigPanel(props: {
  providers: ScraperProviderInfo[]
  providerId: string
  baseUrl: string
  hymnals: Hymnal[]
  targetHymnalId: number | null
  startNumber: number
  endNumber: number
  concurrency: number
  retryCount: number
  delayMs: number
  conflictPolicy: 'skip' | 'overwrite' | 'ask'
  disabled: boolean
  canRetryFailed: boolean
  onProviderIdChange: (v: string) => void
  onBaseUrlChange: (v: string) => void
  onTargetHymnalIdChange: (v: number | null) => void
  onStartNumberChange: (v: number) => void
  onEndNumberChange: (v: number) => void
  onConcurrencyChange: (v: number) => void
  onRetryCountChange: (v: number) => void
  onDelayMsChange: (v: number) => void
  onConflictPolicyChange: (v: 'skip' | 'overwrite' | 'ask') => void
  onStart: () => void
  onAbort: () => void
  onRetryFailed: () => void
}): React.JSX.Element {
  const selectedProvider = useMemo(
    () => props.providers.find((p) => p.id === props.providerId) || null,
    [props.providers, props.providerId]
  )

  return (
    <div className="h-full min-h-0 card-modern flex flex-col">
      <div className="card-modern__header">
        <div>
          <div className="card-modern__title">Provider Configuration</div>
          <div className="card-modern__subtitle">
            {selectedProvider ? selectedProvider.label : 'Select provider'}
          </div>
        </div>
        <Settings2 className="w-4 h-4 text-zinc-500" />
      </div>

      <div className="flex-1 min-h-0 overflow-auto px-5 py-4 space-y-4">
        {/* Provider Selection */}
        <div className="space-y-1.5">
          <label className="text-label">Provider</label>
          <select
            value={props.providerId}
            disabled={props.disabled}
            onChange={(e) => props.onProviderIdChange(e.target.value)}
            className="input-premium w-full"
          >
            {props.providers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        {/* Base URL */}
        <div className="space-y-1.5">
          <label className="text-label">Base URL</label>
          <input
            value={props.baseUrl}
            disabled={props.disabled}
            onChange={(e) => props.onBaseUrlChange(e.target.value)}
            className="input-premium w-full"
            placeholder="https://..."
          />
        </div>

        {/* Hymnal Target */}
        <div className="space-y-1.5">
          <label className="text-label">Target Hymnal</label>
          <select
            value={props.targetHymnalId ?? ''}
            disabled={props.disabled}
            onChange={(e) =>
              props.onTargetHymnalIdChange(e.target.value ? Number(e.target.value) : null)
            }
            className="input-premium w-full"
          >
            <option value="">— Select Hymnal —</option>
            {props.hymnals.map((h) => (
              <option key={h.id} value={h.id}>
                {h.code} — {h.name}
              </option>
            ))}
          </select>
        </div>

        {/* Range */}
        <div className="space-y-1.5">
          <label className="text-label">Song Range</label>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              value={props.startNumber}
              disabled={props.disabled}
              onChange={(e) => props.onStartNumberChange(Number(e.target.value))}
              className="input-premium"
              placeholder="Start"
            />
            <input
              type="number"
              value={props.endNumber}
              disabled={props.disabled}
              onChange={(e) => props.onEndNumberChange(Number(e.target.value))}
              className="input-premium"
              placeholder="End"
            />
          </div>
        </div>

        {/* Concurrency & Retry */}
        <div className="space-y-1.5">
          <label className="text-label">Performance</label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <input
                type="number"
                value={props.concurrency}
                disabled={props.disabled}
                onChange={(e) => props.onConcurrencyChange(Number(e.target.value))}
                className="input-premium w-full"
                placeholder="Concurrency"
              />
              <span className="text-xs text-zinc-500 mt-1 block">Concurrency</span>
            </div>
            <div>
              <input
                type="number"
                value={props.retryCount}
                disabled={props.disabled}
                onChange={(e) => props.onRetryCountChange(Number(e.target.value))}
                className="input-premium w-full"
                placeholder="Retries"
              />
              <span className="text-xs text-zinc-500 mt-1 block">Retry Count</span>
            </div>
          </div>
        </div>

        {/* Delay & Conflict */}
        <div className="space-y-1.5">
          <label className="text-label">Behavior</label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <input
                type="number"
                value={props.delayMs}
                disabled={props.disabled}
                onChange={(e) => props.onDelayMsChange(Number(e.target.value))}
                className="input-premium w-full"
                placeholder="Delay"
              />
              <span className="text-xs text-zinc-500 mt-1 block">Delay (ms)</span>
            </div>
            <div>
              <select
                value={props.conflictPolicy}
                disabled={props.disabled}
                onChange={(e) =>
                  props.onConflictPolicyChange(e.target.value as 'skip' | 'overwrite' | 'ask')
                }
                className="input-premium w-full"
              >
                <option value="skip">Skip</option>
                <option value="overwrite">Overwrite</option>
                <option value="ask">Ask</option>
              </select>
              <span className="text-xs text-zinc-500 mt-1 block">Conflict</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="p-4 border-t border-white/5 space-y-2">
        <button
          onClick={props.onStart}
          disabled={props.disabled}
          className="btn-premium btn-premium-primary w-full"
        >
          <Play className="w-4 h-4" />
          Dry Run
        </button>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={props.onAbort}
            disabled={!props.disabled}
            className="btn-premium btn-premium-danger"
          >
            <Square className="w-4 h-4" />
            Abort
          </button>
          <button
            onClick={props.onRetryFailed}
            disabled={!props.canRetryFailed}
            className="btn-premium btn-premium-ghost"
          >
            <RotateCcw className="w-4 h-4" />
            Retry
          </button>
        </div>
      </div>
    </div>
  )
}
