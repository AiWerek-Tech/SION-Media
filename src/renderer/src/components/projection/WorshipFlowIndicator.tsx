/**
 * WorshipFlowIndicator
 *
 * Displays the worship navigation flow as a horizontal strip of section badges.
 * Shows the current position, next step, and allows quick-jump by clicking a badge.
 *
 * Visual states:
 *   - Active badge  (flowPosition === index): solid background, full opacity
 *   - Next badge    (flowPosition + 1 === index): dimmed, subtle border
 *   - Other badges: low opacity
 *
 * Only rendered when a song is loaded (navigationFlow is not null/empty).
 */

import React, { useRef, useEffect } from 'react'
import type {
  NavigationFlow,
  NavigationFlowStep,
  ProjectionState,
  SectionType,
  SlideData
} from '@renderer/types'

interface WorshipFlowIndicatorProps {
  navigationFlow: NavigationFlow | null
  flowPosition: number
  isSmartMode: boolean
  projectionState: ProjectionState
  onBadgeClick: (step: NavigationFlowStep, stepIndex: number) => void
  slides?: SlideData[]
  currentSlideIndex?: number
  onSlideClick?: (slideIndex: number) => void
}

/** Map section type to a CSS modifier class for colour coding. */
function sectionTypeClass(type: SectionType): string {
  switch (type) {
    case 'verse':
      return 'flow-badge--verse'
    case 'chorus':
      return 'flow-badge--chorus'
    case 'bridge':
      return 'flow-badge--bridge'
    case 'intro':
      return 'flow-badge--intro'
    case 'ending':
      return 'flow-badge--ending'
    case 'other':
      return 'flow-badge--other'
  }
}

export function WorshipFlowIndicator({
  navigationFlow,
  flowPosition,
  isSmartMode,
  projectionState,
  onBadgeClick,
  slides = [],
  currentSlideIndex = -1,
  onSlideClick
}: WorshipFlowIndicatorProps): React.JSX.Element | null {
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll active badge into view when flowPosition changes
  useEffect(() => {
    if (!scrollRef.current || flowPosition < 0) return
    const container = scrollRef.current
    const activeBadge = container.querySelector<HTMLElement>('.flow-badge--active')
    if (activeBadge) {
      activeBadge.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    }
  }, [flowPosition, currentSlideIndex])

  const isNumberedMaterial =
    slides.length > 0 && slides.some((slide) => slide.contentType !== 'song')

  // Don't render when no song is loaded or projection is clear/black
  const isEmpty =
    (!isNumberedMaterial && (!navigationFlow || navigationFlow.steps.length === 0)) ||
    projectionState === 'CLEAR' ||
    projectionState === 'LOGO' ||
    projectionState === 'BLACK'

  if (isEmpty) return null

  if (isNumberedMaterial) {
    return (
      <div className="worship-flow-indicator" role="navigation" aria-label="Navigasi slide materi">
        <span
          className="worship-flow-indicator__mode is-material"
          title="Materi / presentasi"
          aria-hidden="true"
        />
        <div className="worship-flow-indicator__scroll" ref={scrollRef}>
          {slides.map((slide, index) => (
            <button
              key={`${slide.playlistItemId || 'material'}-${index}`}
              type="button"
              className={`flow-badge flow-badge--material ${index === currentSlideIndex ? 'flow-badge--active' : ''}`}
              onClick={() => onSlideClick?.(index)}
              title={`Slide ${index + 1}${slide.sectionLabel ? ` · ${slide.sectionLabel}` : ''}`}
              aria-current={index === currentSlideIndex ? 'step' : undefined}
              aria-label={`Slide ${index + 1}${index === currentSlideIndex ? ' (aktif)' : ''}`}
            >
              {index + 1}
            </button>
          ))}
        </div>
      </div>
    )
  }

  const { steps } = navigationFlow!
  const nextPosition = flowPosition + 1

  return (
    <div
      className="worship-flow-indicator"
      role="navigation"
      aria-label="Alur navigasi lagu"
      title={
        isSmartMode
          ? 'Smart Mode aktif — navigasi otomatis mengikuti pola worship'
          : 'Linear Mode — navigasi urutan normal'
      }
    >
      {/* Mode indicator dot */}
      <span
        className={`worship-flow-indicator__mode ${isSmartMode ? 'is-smart' : 'is-linear'}`}
        title={isSmartMode ? 'Smart Mode' : 'Linear Mode'}
        aria-hidden="true"
      />

      {/* Scrollable badge strip */}
      <div className="worship-flow-indicator__scroll" ref={scrollRef}>
        {steps.map((step, index) => {
          const isActive = index === flowPosition
          const isNext = index === nextPosition
          const isPast = index < flowPosition

          return (
            <button
              key={`${step.sectionLabel}-${index}`}
              className={[
                'flow-badge',
                sectionTypeClass(step.sectionType),
                isActive ? 'flow-badge--active' : '',
                isNext ? 'flow-badge--next' : '',
                isPast ? 'flow-badge--past' : ''
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => onBadgeClick(step, index)}
              title={`${step.sectionLabel} — klik untuk lompat ke section ini`}
              aria-current={isActive ? 'step' : undefined}
              aria-label={`${step.sectionLabel}${isActive ? ' (aktif)' : isNext ? ' (berikutnya)' : ''}`}
              type="button"
            >
              {step.badgeLabel}
            </button>
          )
        })}
      </div>
    </div>
  )
}
