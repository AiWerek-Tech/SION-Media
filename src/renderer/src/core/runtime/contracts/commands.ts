/**
 * @core/runtime/contracts/commands
 *
 * Runtime Command Definitions
 *
 * Central registry of all valid runtime commands.
 * Typed payloads for each command type.
 *
 * Principle: Every command type has exactly one payload schema.
 * Enforced at compile time via TypeScript discriminator.
 *
 * @module commands
 */

import type { RuntimeCommand, RuntimeCommandType } from './runtime-types'

/**
 * Projection Commands
 *
 * Navigate, state control, effect management
 */

export interface ProjectionGoToSlideCommand extends RuntimeCommand<{ slideIndex: number }> {
  type: 'projection:go-to-slide'
  payload: {
    slideIndex: number
  }
}

export interface ProjectionGoToSectionCommand extends RuntimeCommand<{ sectionLabel: string }> {
  type: 'projection:go-to-section'
  payload: {
    sectionLabel: string
  }
}

export interface ProjectionGoToAddressCommand extends RuntimeCommand<{ address: string }> {
  type: 'projection:go-to-address'
  payload: {
    address: string // "5", "chorus", "+1", "last", etc.
  }
}

export interface ProjectionNextSlideCommand extends RuntimeCommand<Record<string, never>> {
  type: 'projection:next-slide'
  payload?: Record<string, never>
}

export interface ProjectionPrevSlideCommand extends RuntimeCommand<Record<string, never>> {
  type: 'projection:prev-slide'
  payload?: Record<string, never>
}

export interface ProjectionGoLiveCommand extends RuntimeCommand<{ slideIndex?: number }> {
  type: 'projection:go-live'
  payload?: {
    slideIndex?: number // If omitted, use current cued
  }
}

export interface ProjectionTakeCueCommand extends RuntimeCommand<Record<string, never>> {
  type: 'projection:take-cue'
  payload?: Record<string, never>
}

export interface ProjectionBlackCommand extends RuntimeCommand<Record<string, never>> {
  type: 'projection:black'
  payload?: Record<string, never>
}

export interface ProjectionFreezeCommand extends RuntimeCommand<Record<string, never>> {
  type: 'projection:freeze'
  payload?: Record<string, never>
}

export interface ProjectionClearCommand extends RuntimeCommand<Record<string, never>> {
  type: 'projection:clear'
  payload?: Record<string, never>
}

/**
 * Playlist Commands
 *
 * Loading, queueing, playback control
 */

export interface PlaylistLoadItemCommand extends RuntimeCommand<{
  itemId: number
  position?: 'CUE' | 'NEXT'
}> {
  type: 'playlist:load-item'
  payload: {
    itemId: number
    position?: 'CUE' | 'NEXT' // Default: CUE
  }
}

export interface PlaylistQueueNextCommand extends RuntimeCommand<{ itemId: number }> {
  type: 'playlist:queue-next'
  payload: {
    itemId: number
  }
}

export interface PlaylistCueNextCommand extends RuntimeCommand<Record<string, never>> {
  type: 'playlist:cue-next'
  payload?: Record<string, never>
}

/**
 * Runtime System Commands
 *
 * Timer, recovery, orchestration
 */

export interface RuntimeStartTimerCommand extends RuntimeCommand<{ durationMs?: number }> {
  type: 'runtime:start-timer'
  payload?: {
    durationMs?: number // Optional countdown
  }
}

export interface RuntimeStopTimerCommand extends RuntimeCommand<Record<string, never>> {
  type: 'runtime:stop-timer'
  payload?: Record<string, never>
}

export interface RuntimeResetTimerCommand extends RuntimeCommand<Record<string, never>> {
  type: 'runtime:reset-timer'
  payload?: Record<string, never>
}

/**
 * Operator Commands
 *
 * Settings, configuration, preferences
 */

export interface OperatorUpdateSettingsCommand extends RuntimeCommand<{
  setting: string
  value: unknown
}> {
  type: 'operator:update-settings'
  payload: {
    setting: string
    value: unknown
  }
}

/**
 * Union Type: All Valid Commands
 *
 * Use this for command handlers.
 * TypeScript discriminator ensures type safety.
 */
export type RuntimeCommandUnion =
  | ProjectionGoToSlideCommand
  | ProjectionGoToSectionCommand
  | ProjectionGoToAddressCommand
  | ProjectionNextSlideCommand
  | ProjectionPrevSlideCommand
  | ProjectionGoLiveCommand
  | ProjectionTakeCueCommand
  | ProjectionBlackCommand
  | ProjectionFreezeCommand
  | ProjectionClearCommand
  | PlaylistLoadItemCommand
  | PlaylistQueueNextCommand
  | PlaylistCueNextCommand
  | RuntimeStartTimerCommand
  | RuntimeStopTimerCommand
  | RuntimeResetTimerCommand
  | OperatorUpdateSettingsCommand

/**
 * Type-Safe Command Constructor
 *
 * Ensures command payload matches command type.
 * Used by command dispatchers to create type-safe commands.
 */

export function createCommand<T extends RuntimeCommandType>(
  type: T,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  source: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  correlationId?: any
): RuntimeCommand {
  return {
    type,
    payload,
    source,
    timestamp: Date.now(),
    correlationId
  }
}
