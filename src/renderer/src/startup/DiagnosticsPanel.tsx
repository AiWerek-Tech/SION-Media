import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { useAppStore } from '@renderer/store/useAppStore'
import { useBootStore } from './bootStore'

const diagnosticEntries = [
  { label: 'GPU Acceleration', key: 'gpu' },
  { label: 'Display Engine', key: 'display' },
  { label: 'Song Database', key: 'songs' },
  { label: 'Bible Engine', key: 'bible' },
  { label: 'Projection Pipeline', key: 'projection' }
] as const

export function DiagnosticsPanel(): React.JSX.Element {
  const phase = useBootStore((state) => state.phase)
  const safeMode = useBootStore((state) => state.safeMode)
  const tasks = useBootStore((state) => state.tasks)
  const lastBootTrace = useBootStore((state) => state.lastBootTrace)
  const displayCount = useAppStore((state) => state.displayCount)

  const [isVisible, setIsVisible] = useState(true)
  const [isCloseHovered, setIsCloseHovered] = useState(false)
  const [hoveredRow, setHoveredRow] = useState<string | null>(null)

  const taskMap = tasks.reduce<Record<string, string>>((acc, task) => {
    acc[task.id] = task.status
    return acc
  }, {})

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.section
          initial={{ opacity: 0, y: 16, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96, filter: 'blur(8px)' }}
          transition={{ type: 'spring', damping: 26, stiffness: 220 }}
          className="pointer-events-auto absolute bottom-6 right-6 z-50 overflow-hidden"
          style={{
            width: '380px',
            borderRadius: '16px',
            background: 'rgba(17, 19, 28, 0.96)',
            backdropFilter: 'blur(24px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: '0 20px 48px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.02)',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 20px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
              background: 'rgba(255, 255, 255, 0.015)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h3
                style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#f8fafc',
                  fontFamily: 'Poppins, Inter, sans-serif',
                  letterSpacing: '0.01em',
                  margin: 0
                }}
              >
                System Diagnostics
              </h3>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  background: 'rgba(99, 102, 241, 0.12)',
                  color: '#818cf8',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  border: '1px solid rgba(99, 102, 241, 0.18)'
                }}
              >
                {phase}
              </span>
            </div>
            <button
              onClick={() => setIsVisible(false)}
              onMouseEnter={() => setIsCloseHovered(true)}
              onMouseLeave={() => setIsCloseHovered(false)}
              aria-label="Tutup"
              style={{
                padding: '6px',
                borderRadius: '50%',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: isCloseHovered ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                border: 'none',
                color: isCloseHovered ? '#f1f5f9' : '#94a3b8',
                transition: 'background 0.15s, color 0.15s'
              }}
            >
              <X size={15} />
            </button>
          </div>

          {/* Body */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              padding: '20px'
            }}
          >
            {diagnosticEntries.map((entry) => {
              const status =
                entry.key === 'display'
                  ? displayCount > 0
                    ? 'Ready'
                    : 'Waiting'
                  : taskMap[entry.key] === 'done'
                    ? 'Ready'
                    : taskMap[entry.key] === 'running'
                      ? 'Starting'
                      : 'Pending'

              const getStatusColors = (): {
                color: string
                dot: string
                bg: string
                border: string
              } => {
                if (status === 'Ready') {
                  return {
                    color: '#34d399',
                    dot: '#10b981',
                    bg: 'rgba(52, 211, 153, 0.08)',
                    border: '1px solid rgba(52, 211, 153, 0.12)'
                  }
                }
                if (status === 'Starting') {
                  return {
                    color: '#fbbf24',
                    dot: '#f59e0b',
                    bg: 'rgba(251, 191, 36, 0.08)',
                    border: '1px solid rgba(251, 191, 36, 0.12)'
                  }
                }
                return {
                  color: '#94a3b8',
                  dot: '#64748b',
                  bg: 'rgba(148, 163, 184, 0.06)',
                  border: '1px solid rgba(148, 163, 184, 0.1)'
                }
              }

              const colors = getStatusColors()

              return (
                <div
                  key={entry.key}
                  onMouseEnter={() => setHoveredRow(entry.key)}
                  onMouseLeave={() => setHoveredRow(null)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background:
                      hoveredRow === entry.key
                        ? 'rgba(255, 255, 255, 0.03)'
                        : 'rgba(255, 255, 255, 0.01)',
                    border:
                      hoveredRow === entry.key
                        ? '1px solid rgba(255, 255, 255, 0.05)'
                        : '1px solid rgba(255, 255, 255, 0.01)',
                    transition: 'background 0.15s, border-color 0.15s'
                  }}
                >
                  <span
                    style={{
                      fontSize: '13px',
                      fontWeight: 500,
                      color: hoveredRow === entry.key ? '#f1f5f9' : '#cbd5e1',
                      transition: 'color 0.15s'
                    }}
                  >
                    {entry.label}
                  </span>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      background: colors.bg,
                      border: colors.border
                    }}
                  >
                    <div
                      style={{
                        height: '6px',
                        width: '6px',
                        borderRadius: '50%',
                        background: colors.dot
                      }}
                    />
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        color: colors.color
                      }}
                    >
                      {status}
                    </span>
                  </div>
                </div>
              )
            })}

            <div
              style={{
                height: '1px',
                background: 'rgba(255, 255, 255, 0.06)',
                margin: '10px 4px'
              }}
            />

            {/* Footer Stats */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 12px'
              }}
            >
              <span style={{ fontSize: '13px', fontWeight: 500, color: '#94a3b8' }}>
                Connected Displays
              </span>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#f1f5f9' }}>
                {displayCount}
              </span>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 12px'
              }}
            >
              <span style={{ fontSize: '13px', fontWeight: 500, color: '#94a3b8' }}>
                Last Boot Trace
              </span>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#f1f5f9' }}>
                {lastBootTrace.length > 0 ? `${lastBootTrace.length} events` : 'None'}
              </span>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 12px'
              }}
            >
              <span style={{ fontSize: '13px', fontWeight: 500, color: '#94a3b8' }}>Safe Mode</span>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  background: safeMode ? 'rgba(245, 158, 11, 0.12)' : 'rgba(255, 255, 255, 0.04)',
                  color: safeMode ? '#fbbf24' : '#94a3b8',
                  border: safeMode
                    ? '1px solid rgba(245, 158, 11, 0.18)'
                    : '1px solid rgba(255, 255, 255, 0.06)'
                }}
              >
                {safeMode ? 'Active' : 'Disabled'}
              </span>
            </div>
          </div>
        </motion.section>
      )}
    </AnimatePresence>
  )
}
