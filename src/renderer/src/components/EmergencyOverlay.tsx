/**
 * EmergencyOverlay — Projection emergency full-screen overlay
 *
 * Activated by operator emergency action. Overrides ALL projection content
 * with a configurable message or solid black screen.
 *
 * Visual spec: phase3-part2-ui-parts7-11.md §7.3.5
 */

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface EmergencyOverlayProps {
  /** Whether emergency mode is active */
  active: boolean
  /** Main message to display (default: "Please Stand By") */
  message?: string
  /** Sub-message (optional) */
  subMessage?: string
}

export function EmergencyOverlay({
  active,
  message = 'Please Stand By',
  subMessage
}: EmergencyOverlayProps): React.JSX.Element {
  return (
    <AnimatePresence>
      {active && (
        <motion.div
          key="emergency-overlay"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.1 }}
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 100,
            background: '#000000',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none'
          }}
        >
          {/* Main message */}
          <div
            style={{
              fontFamily: "'Poppins', system-ui, sans-serif",
              fontSize: '64px',
              fontWeight: 800,
              color: '#ffffff',
              textAlign: 'center'
            }}
          >
            {message}
          </div>

          {/* Sub-message */}
          {subMessage && (
            <div
              style={{
                fontFamily: "'Inter', system-ui, sans-serif",
                fontSize: '28px',
                fontWeight: 500,
                color: 'rgba(255,255,255,0.6)',
                textAlign: 'center',
                marginTop: '16px'
              }}
            >
              {subMessage}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
