import React from 'react'
import { CheckCircle, Loader2, Circle, AlertTriangle } from 'lucide-react'

type OrchestrationStep = 'IDLE' | 'FETCH' | 'NORMALIZE' | 'VALIDATE' | 'CONFLICT' | 'IMPORT'
type OrchestrationState = 'pending' | 'active' | 'completed' | 'warning'

interface StepConfig {
  id: OrchestrationStep
  label: string
  icon?: React.ReactNode
}

const STEPS: StepConfig[] = [
  { id: 'FETCH', label: 'Fetch' },
  { id: 'NORMALIZE', label: 'Normalize' },
  { id: 'VALIDATE', label: 'Validate' },
  { id: 'CONFLICT', label: 'Review' },
  { id: 'IMPORT', label: 'Import' }
]

function getStepState(
  stepId: OrchestrationStep,
  currentStep: OrchestrationStep,
  hasConflicts: boolean
): OrchestrationState {
  const stepOrder = STEPS.map((s) => s.id)
  const currentIndex = stepOrder.indexOf(currentStep)
  const stepIndex = stepOrder.indexOf(stepId)

  if (currentStep === 'IDLE') return 'pending'
  if (stepIndex < currentIndex) return 'completed'
  if (stepIndex === currentIndex) {
    if (stepId === 'CONFLICT' && hasConflicts) return 'warning'
    return 'active'
  }
  return 'pending'
}

function StepIcon({ state }: { state: OrchestrationState }): React.JSX.Element {
  const iconClass = 'w-3.5 h-3.5'

  switch (state) {
    case 'completed':
      return <CheckCircle className={`${iconClass} text-emerald-400`} />
    case 'active':
      return <Loader2 className={`${iconClass} animate-spin text-blue-400`} />
    case 'warning':
      return <AlertTriangle className={`${iconClass} text-amber-400`} />
    default:
      return <Circle className={`${iconClass} text-zinc-500`} />
  }
}

interface TimelineStepProps {
  step: StepConfig
  state: OrchestrationState
  isLast: boolean
}

function TimelineStep({ step, state, isLast }: TimelineStepProps): React.JSX.Element {
  const stateClass = `timeline-step--${state}`

  return (
    <>
      <div className={`timeline-step ${stateClass}`}>
        <span className="timeline-step__icon">
          <StepIcon state={state} />
        </span>
        <span>{step.label}</span>
      </div>
      {!isLast && (
        <div
          className={`timeline-connector ${state === 'completed' ? 'timeline-connector--active' : ''}`}
        />
      )}
    </>
  )
}

export function OrchestrationTimeline(props: {
  currentStep: OrchestrationStep
  hasConflicts?: boolean
}): React.JSX.Element {
  return (
    <div className="orchestration-timeline">
      {STEPS.map((step, index) => (
        <TimelineStep
          key={step.id}
          step={step}
          state={getStepState(step.id, props.currentStep, props.hasConflicts ?? false)}
          isLast={index === STEPS.length - 1}
        />
      ))}
    </div>
  )
}

// Compact version for smaller spaces
export function OrchestrationTimelineCompact(props: {
  currentStep: OrchestrationStep
  hasConflicts?: boolean
}): React.JSX.Element {
  const completedCount = STEPS.filter((step) => {
    const state = getStepState(step.id, props.currentStep, props.hasConflicts ?? false)
    return state === 'completed'
  }).length

  const progress = (completedCount / STEPS.length) * 100

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      <span className="text-xs text-zinc-400 font-mono">
        {completedCount}/{STEPS.length}
      </span>
    </div>
  )
}
