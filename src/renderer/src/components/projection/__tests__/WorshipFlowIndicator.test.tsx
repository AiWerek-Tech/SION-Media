/**
 * Unit Tests — WorshipFlowIndicator Component
 *
 * Feature: smart-worship-navigation
 * Task: 8.2
 * Requirements: 6.1, 6.4, 6.6, 6.9
 */

import { describe, test, expect, vi, beforeAll } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { WorshipFlowIndicator } from '../WorshipFlowIndicator'
import type { NavigationFlow, NavigationFlowStep } from '@renderer/types'

// jsdom does not implement scrollIntoView — mock it globally
beforeAll(() => {
  window.HTMLElement.prototype.scrollIntoView = vi.fn()
})

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function makeStep(
  sectionType: NavigationFlowStep['sectionType'],
  sectionLabel: string,
  badgeLabel: string,
  firstSlideIndex = 0,
  lastSlideIndex = 0
): NavigationFlowStep {
  return { sectionType, sectionLabel, badgeLabel, firstSlideIndex, lastSlideIndex }
}

function makeFlow(
  types: Array<NavigationFlowStep['sectionType']>,
  isSmartMode = true
): NavigationFlow {
  const steps: NavigationFlowStep[] = types.map((type, i) => {
    const labels: Record<NavigationFlowStep['sectionType'], string> = {
      verse: `VERSE ${i + 1}`,
      chorus: 'CHORUS',
      bridge: 'BRIDGE',
      intro: 'INTRO',
      ending: 'ENDING',
      other: 'OTHER'
    }
    const badges: Record<NavigationFlowStep['sectionType'], string> = {
      verse: `V${i + 1}`,
      chorus: 'C',
      bridge: 'B',
      intro: 'I',
      ending: 'E',
      other: 'OT'
    }
    return makeStep(type, labels[type], badges[type], i, i)
  })
  return { steps, isSmartMode }
}

const noop = vi.fn()

// ─────────────────────────────────────────────────────────────────────────────
// Rendering
// ─────────────────────────────────────────────────────────────────────────────

describe('WorshipFlowIndicator — Rendering', () => {
  // Req 6.6: state kosong saat projectionState adalah CLEAR
  test('renders nothing when projectionState is CLEAR', () => {
    const { container } = render(
      <WorshipFlowIndicator
        navigationFlow={makeFlow(['verse', 'chorus'])}
        flowPosition={0}
        isSmartMode={true}
        projectionState="CLEAR"
        onBadgeClick={noop}
      />
    )
    expect(container.firstChild).toBeNull()
  })

  test('renders nothing when projectionState is LOGO', () => {
    const { container } = render(
      <WorshipFlowIndicator
        navigationFlow={makeFlow(['verse', 'chorus'])}
        flowPosition={0}
        isSmartMode={true}
        projectionState="LOGO"
        onBadgeClick={noop}
      />
    )
    expect(container.firstChild).toBeNull()
  })

  test('renders nothing when navigationFlow is null', () => {
    const { container } = render(
      <WorshipFlowIndicator
        navigationFlow={null}
        flowPosition={-1}
        isSmartMode={false}
        projectionState="LIVE"
        onBadgeClick={noop}
      />
    )
    expect(container.firstChild).toBeNull()
  })

  test('renders nothing when navigationFlow has empty steps', () => {
    const { container } = render(
      <WorshipFlowIndicator
        navigationFlow={{ steps: [], isSmartMode: false }}
        flowPosition={-1}
        isSmartMode={false}
        projectionState="LIVE"
        onBadgeClick={noop}
      />
    )
    expect(container.firstChild).toBeNull()
  })

  // Req 6.1, 6.2: menampilkan badge untuk setiap step
  test('renders one badge per step in flow', () => {
    const flow = makeFlow(['intro', 'verse', 'chorus', 'verse', 'chorus'])
    render(
      <WorshipFlowIndicator
        navigationFlow={flow}
        flowPosition={0}
        isSmartMode={true}
        projectionState="LIVE"
        onBadgeClick={noop}
      />
    )
    const badges = screen.getAllByRole('button')
    expect(badges).toHaveLength(5)
  })

  test('renders badge labels correctly', () => {
    const flow = makeFlow(['verse', 'chorus', 'bridge'])
    render(
      <WorshipFlowIndicator
        navigationFlow={flow}
        flowPosition={0}
        isSmartMode={true}
        projectionState="LIVE"
        onBadgeClick={noop}
      />
    )
    // Query by text content (badge label), not accessible name
    const buttons = screen.getAllByRole('button')
    expect(buttons[0]).toHaveTextContent('V1')
    expect(buttons[1]).toHaveTextContent('C')
    expect(buttons[2]).toHaveTextContent('B')
  })

  test('renders in FREEZE state', () => {
    const flow = makeFlow(['verse', 'chorus'])
    render(
      <WorshipFlowIndicator
        navigationFlow={flow}
        flowPosition={0}
        isSmartMode={true}
        projectionState="FREEZE"
        onBadgeClick={noop}
      />
    )
    expect(screen.getAllByRole('button')).toHaveLength(2)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Active / Next Badge States
// ─────────────────────────────────────────────────────────────────────────────

describe('WorshipFlowIndicator — Active / Next Badge States', () => {
  // Req 6.4: badge aktif memiliki aria-current="step"
  test('active badge has aria-current="step"', () => {
    const flow = makeFlow(['verse', 'chorus'])
    render(
      <WorshipFlowIndicator
        navigationFlow={flow}
        flowPosition={1}
        isSmartMode={true}
        projectionState="LIVE"
        onBadgeClick={noop}
      />
    )
    const buttons = screen.getAllByRole('button')
    // flowPosition=1 → second badge (chorus) is active
    expect(buttons[1]).toHaveAttribute('aria-current', 'step')
    expect(buttons[0]).not.toHaveAttribute('aria-current')
  })

  test('active badge has flow-badge--active class', () => {
    const flow = makeFlow(['verse', 'chorus', 'verse'])
    render(
      <WorshipFlowIndicator
        navigationFlow={flow}
        flowPosition={1}
        isSmartMode={true}
        projectionState="LIVE"
        onBadgeClick={noop}
      />
    )
    const buttons = screen.getAllByRole('button')
    expect(buttons[1].className).toContain('flow-badge--active')
    expect(buttons[0].className).not.toContain('flow-badge--active')
    expect(buttons[2].className).not.toContain('flow-badge--active')
  })

  // Req 6.5: badge next memiliki visual berbeda
  test('next badge (flowPosition + 1) has flow-badge--next class', () => {
    const flow = makeFlow(['verse', 'chorus', 'verse'])
    render(
      <WorshipFlowIndicator
        navigationFlow={flow}
        flowPosition={0}
        isSmartMode={true}
        projectionState="LIVE"
        onBadgeClick={noop}
      />
    )
    const buttons = screen.getAllByRole('button')
    expect(buttons[1].className).toContain('flow-badge--next')
    expect(buttons[0].className).not.toContain('flow-badge--next')
    expect(buttons[2].className).not.toContain('flow-badge--next')
  })

  test('past badges have flow-badge--past class', () => {
    const flow = makeFlow(['verse', 'chorus', 'verse', 'chorus'])
    render(
      <WorshipFlowIndicator
        navigationFlow={flow}
        flowPosition={2}
        isSmartMode={true}
        projectionState="LIVE"
        onBadgeClick={noop}
      />
    )
    const buttons = screen.getAllByRole('button')
    expect(buttons[0].className).toContain('flow-badge--past')
    expect(buttons[1].className).toContain('flow-badge--past')
    expect(buttons[2].className).not.toContain('flow-badge--past')
  })

  test('no badge is active when flowPosition is -1', () => {
    const flow = makeFlow(['verse', 'chorus'])
    render(
      <WorshipFlowIndicator
        navigationFlow={flow}
        flowPosition={-1}
        isSmartMode={true}
        projectionState="LIVE"
        onBadgeClick={noop}
      />
    )
    const buttons = screen.getAllByRole('button')
    buttons.forEach((btn) => {
      expect(btn).not.toHaveAttribute('aria-current')
      expect(btn.className).not.toContain('flow-badge--active')
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Section Type CSS Classes
// ─────────────────────────────────────────────────────────────────────────────

describe('WorshipFlowIndicator — Section Type CSS Classes', () => {
  test('verse badge has flow-badge--verse class', () => {
    const flow = makeFlow(['verse'])
    render(
      <WorshipFlowIndicator
        navigationFlow={flow}
        flowPosition={0}
        isSmartMode={true}
        projectionState="LIVE"
        onBadgeClick={noop}
      />
    )
    expect(screen.getByRole('button').className).toContain('flow-badge--verse')
  })

  test('chorus badge has flow-badge--chorus class', () => {
    const flow = makeFlow(['chorus'])
    render(
      <WorshipFlowIndicator
        navigationFlow={flow}
        flowPosition={0}
        isSmartMode={true}
        projectionState="LIVE"
        onBadgeClick={noop}
      />
    )
    expect(screen.getByRole('button').className).toContain('flow-badge--chorus')
  })

  test('bridge badge has flow-badge--bridge class', () => {
    const flow = makeFlow(['bridge'])
    render(
      <WorshipFlowIndicator
        navigationFlow={flow}
        flowPosition={0}
        isSmartMode={true}
        projectionState="LIVE"
        onBadgeClick={noop}
      />
    )
    expect(screen.getByRole('button').className).toContain('flow-badge--bridge')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Interaction — Badge Click
// ─────────────────────────────────────────────────────────────────────────────

describe('WorshipFlowIndicator — Badge Click', () => {
  // Req 6.9: klik badge memanggil onBadgeClick dengan step dan index yang benar
  test('clicking a badge calls onBadgeClick with correct step and index', () => {
    const onBadgeClick = vi.fn()
    const flow = makeFlow(['verse', 'chorus', 'verse'])
    render(
      <WorshipFlowIndicator
        navigationFlow={flow}
        flowPosition={0}
        isSmartMode={true}
        projectionState="LIVE"
        onBadgeClick={onBadgeClick}
      />
    )
    const buttons = screen.getAllByRole('button')

    // Click the second badge (chorus, index 1)
    fireEvent.click(buttons[1])

    expect(onBadgeClick).toHaveBeenCalledTimes(1)
    expect(onBadgeClick).toHaveBeenCalledWith(flow.steps[1], 1)
  })

  test('clicking active badge still calls onBadgeClick', () => {
    const onBadgeClick = vi.fn()
    const flow = makeFlow(['verse', 'chorus'])
    render(
      <WorshipFlowIndicator
        navigationFlow={flow}
        flowPosition={0}
        isSmartMode={true}
        projectionState="LIVE"
        onBadgeClick={onBadgeClick}
      />
    )
    const buttons = screen.getAllByRole('button')
    fireEvent.click(buttons[0])
    expect(onBadgeClick).toHaveBeenCalledWith(flow.steps[0], 0)
  })

  test('each badge click passes its own step and index', () => {
    const onBadgeClick = vi.fn()
    const flow = makeFlow(['intro', 'verse', 'chorus', 'ending'])
    render(
      <WorshipFlowIndicator
        navigationFlow={flow}
        flowPosition={1}
        isSmartMode={true}
        projectionState="LIVE"
        onBadgeClick={onBadgeClick}
      />
    )
    const buttons = screen.getAllByRole('button')

    buttons.forEach((btn, i) => {
      fireEvent.click(btn)
      expect(onBadgeClick).toHaveBeenLastCalledWith(flow.steps[i], i)
    })
    expect(onBadgeClick).toHaveBeenCalledTimes(4)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Accessibility
// ─────────────────────────────────────────────────────────────────────────────

describe('WorshipFlowIndicator — Accessibility', () => {
  test('container has role="navigation"', () => {
    const flow = makeFlow(['verse', 'chorus'])
    render(
      <WorshipFlowIndicator
        navigationFlow={flow}
        flowPosition={0}
        isSmartMode={true}
        projectionState="LIVE"
        onBadgeClick={noop}
      />
    )
    expect(screen.getByRole('navigation')).toBeInTheDocument()
  })

  test('all badges have type="button"', () => {
    const flow = makeFlow(['verse', 'chorus', 'bridge'])
    render(
      <WorshipFlowIndicator
        navigationFlow={flow}
        flowPosition={0}
        isSmartMode={true}
        projectionState="LIVE"
        onBadgeClick={noop}
      />
    )
    screen.getAllByRole('button').forEach((btn) => {
      expect(btn).toHaveAttribute('type', 'button')
    })
  })

  test('mode indicator dot is aria-hidden', () => {
    const flow = makeFlow(['verse', 'chorus'])
    render(
      <WorshipFlowIndicator
        navigationFlow={flow}
        flowPosition={0}
        isSmartMode={true}
        projectionState="LIVE"
        onBadgeClick={noop}
      />
    )
    const modeDot = document.querySelector('.worship-flow-indicator__mode')
    expect(modeDot).toHaveAttribute('aria-hidden', 'true')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Smart Mode vs Linear Mode
// ─────────────────────────────────────────────────────────────────────────────

describe('WorshipFlowIndicator — Smart vs Linear Mode', () => {
  // Req 6.2: Smart_Mode menampilkan badge untuk setiap step dalam flow
  test('Smart_Mode shows all steps including repeated chorus', () => {
    // V1 → C → V2 → C (chorus appears twice)
    const flow: NavigationFlow = {
      isSmartMode: true,
      steps: [
        makeStep('verse', 'VERSE 1', 'V1', 0, 0),
        makeStep('chorus', 'CHORUS', 'C', 1, 1),
        makeStep('verse', 'VERSE 2', 'V2', 2, 2),
        makeStep('chorus', 'CHORUS', 'C', 1, 1) // same slides, repeated in flow
      ]
    }
    render(
      <WorshipFlowIndicator
        navigationFlow={flow}
        flowPosition={0}
        isSmartMode={true}
        projectionState="LIVE"
        onBadgeClick={noop}
      />
    )
    // Should show 4 badges (V1, C, V2, C)
    expect(screen.getAllByRole('button')).toHaveLength(4)
  })

  // Req 6.3: Linear_Mode menampilkan badge untuk setiap section unik
  test('Linear_Mode shows badges for each section in original order', () => {
    const flow: NavigationFlow = {
      isSmartMode: false,
      steps: [
        makeStep('verse', 'VERSE 1', 'V1', 0, 1),
        makeStep('verse', 'VERSE 2', 'V2', 2, 3),
        makeStep('verse', 'VERSE 3', 'V3', 4, 5)
      ]
    }
    render(
      <WorshipFlowIndicator
        navigationFlow={flow}
        flowPosition={1}
        isSmartMode={false}
        projectionState="LIVE"
        onBadgeClick={noop}
      />
    )
    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(3)
    // flowPosition=1 → second badge (V2) is active
    expect(buttons[1]).toHaveAttribute('aria-current', 'step')
    expect(buttons[1]).toHaveTextContent('V2')
  })
})
