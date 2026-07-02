import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, X, Play, Square } from 'lucide-react'
import { useProjectionStore } from '@renderer/store/useProjectionStore'
import { Button } from '@renderer/components/design-system/Button'
import { Input } from '@renderer/components/design-system/Input'

interface EmergencyPanelProps {
  isOpen: boolean
  onClose: () => void
}

export function EmergencyPanel({ isOpen, onClose }: EmergencyPanelProps): React.JSX.Element | null {
  const { emergencyConfig, setEmergencyConfig } = useProjectionStore()

  // Local state for inputs
  const [message, setMessage] = useState(emergencyConfig.message || 'Please Stand By')
  const [subMessage, setSubMessage] = useState(emergencyConfig.subMessage || '')

  // Sync with store when opened
  useEffect(() => {
    if (!isOpen) return

    const timer = window.setTimeout(() => {
      setMessage(emergencyConfig.message ?? 'Please Stand By')
      setSubMessage(emergencyConfig.subMessage ?? '')
    }, 0)

    return () => window.clearTimeout(timer)
  }, [isOpen, emergencyConfig])

  // Keybindings for closing the panel
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return (): void => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // FIX UX-03: auto-close the panel after deactivation so the operator
  // doesn't need an extra click in a time-critical situation.
  const handleToggle = (): void => {
    const willActivate = !emergencyConfig.active
    setEmergencyConfig({
      active: willActivate,
      message,
      subMessage
    })
    // Close the panel automatically when deactivating
    if (!willActivate) {
      onClose()
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="fixed left-1/2 top-[10%] z-[1500] w-[480px] -translate-x-1/2 overflow-hidden rounded-xl border border-rose-900/50 bg-black/80 shadow-2xl backdrop-blur-xl"
          style={{
            boxShadow: '0 25px 50px -12px rgba(225, 29, 72, 0.25)'
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-rose-900/30 bg-rose-950/30 px-4 py-3">
            <div className="flex items-center gap-2 text-rose-500">
              <AlertTriangle className="h-5 w-5" />
              <h2 className="font-semibold tracking-wide">EMERGENCY OVERRIDE</h2>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400">MAIN MESSAGE</label>
                <Input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="e.g. Please Stand By"
                  className="bg-zinc-900/50 text-lg font-medium h-12"
                  disabled={emergencyConfig.active}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400">SUB-MESSAGE (OPTIONAL)</label>
                <Input
                  value={subMessage}
                  onChange={(e) => setSubMessage(e.target.value)}
                  placeholder="e.g. We will resume shortly."
                  className="bg-zinc-900/50"
                  disabled={emergencyConfig.active}
                />
              </div>
            </div>

            {/* Action */}
            <div className="mt-8">
              <Button
                variant={emergencyConfig.active ? 'danger' : 'primary'}
                className={`w-full py-6 text-lg font-bold tracking-widest ${
                  emergencyConfig.active
                    ? 'border-rose-500 text-rose-500 hover:bg-rose-500/10'
                    : 'bg-rose-600 text-white hover:bg-rose-500'
                }`}
                onClick={handleToggle}
              >
                {emergencyConfig.active ? (
                  <>
                    <Square className="mr-2 h-5 w-5 fill-current" />
                    DEACTIVATE OVERRIDE
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-5 w-5 fill-current" />
                    ACTIVATE OVERRIDE
                  </>
                )}
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
