export const APP_MODES = ['LIBRARY', 'PROJECTION', 'BROADCAST', 'MANAGEMENT'] as const

export type AppMode = (typeof APP_MODES)[number]
export type ModeChangeProjectionAction = 'PRESERVE'

/** Projection visibility belongs to the operator output control, not workspace navigation. */
export function resolveModeChangeProjectionAction(mode: string): ModeChangeProjectionAction {
  if (!APP_MODES.includes(mode as AppMode)) {
    throw new Error(`Unsupported app mode: ${mode}`)
  }
  return 'PRESERVE'
}
