/**
 * LowerThird — Projection output overlay component
 *
 * Renders a lower-third text overlay on top of the current projection content.
 * Used for displaying pastor names, song leaders, announcements, etc.
 *
 * Visual spec: phase3-part2-ui-parts7-11.md §7.3.3, §8.5
 */

import React from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'

export interface LowerThirdData {
  /** Primary text — e.g., person's name */
  primary: string
  /** Secondary text — e.g., role/title */
  secondary?: string
  /** Unique key for animation transitions */
  id: string
}

interface LowerThirdProps {
  /** Lower third data to display. null = hidden */
  data: LowerThirdData | null
  /** Custom brand color for left accent bar (default: #3b82f6) */
  accentColor?: string
}

export function LowerThird({ data, accentColor = '#3b82f6' }: LowerThirdProps): React.JSX.Element {
  const shouldReduceMotion = useReducedMotion()

  return (
    <AnimatePresence mode="wait">
      {data && (
        <motion.div
          key={data.id}
          className="lower-third"
          initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 20 }}
          animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
          exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 20 }}
          transition={
            shouldReduceMotion
              ? { duration: 0.1 }
              : { duration: 0.4, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }
          }
          style={{
            position: 'absolute',
            bottom: '8%',
            left: '96px',
            right: '96px',
            zIndex: 20,
            pointerEvents: 'none'
          }}
        >
          <div
            style={{
              background:
                'linear-gradient(90deg, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.72) 60%, transparent 100%)',
              padding: '20px 32px',
              borderRadius: '8px',
              borderLeft: `4px solid ${accentColor}`,
              backdropFilter: 'blur(8px)',
              maxWidth: '70%'
            }}
          >
            {/* Primary text */}
            <div
              style={{
                fontFamily: "'Inter', system-ui, sans-serif",
                fontSize: '42px',
                fontWeight: 700,
                color: '#ffffff',
                lineHeight: 1.2,
                textShadow: '0 2px 8px rgba(0,0,0,0.6)'
              }}
            >
              {data.primary}
            </div>

            {/* Secondary text */}
            {data.secondary && (
              <div
                style={{
                  fontFamily: "'Inter', system-ui, sans-serif",
                  fontSize: '32px',
                  fontWeight: 500,
                  color: 'rgba(255,255,255,0.72)',
                  lineHeight: 1.2,
                  marginTop: '8px'
                }}
              >
                {data.secondary}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
