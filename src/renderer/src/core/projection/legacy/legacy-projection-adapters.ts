/**
 * Legacy Projection Adapters
 *
 * Compatibility layer for deprecated Zustand projection methods.
 * Bridges old imperative API to new state-machine authority.
 *
 * @module legacy/legacy-projection-adapters
 */

import { requestTransition } from '../state-machine/projection-machine'
import { extractProjectionSnapshotFromStore, syncProjectionSnapshotToStore } from '../sync'
import { executeProjectionEffects } from '../state-machine/effects'
import { logger } from '@renderer/utils/logger'

/**
 * DEPRECATED: Legacy adapter for goToSlide
 *
 * @deprecated Use state-machine transition 'projection:go-to-slide' instead
 * @param index - Slide index to navigate to
 */
export function legacyGoToSlide(index: number): void {
  logger.warn('[Legacy Adapter] goToSlide called - migrate to state-machine transition')

  try {
    const currentSnapshot = extractProjectionSnapshotFromStore()
    const result = requestTransition(currentSnapshot, {
      type: 'projection:go-to-slide',
      payload: { slideIndex: index }
    })

    syncProjectionSnapshotToStore(result.nextState)
    executeProjectionEffects(result.effects)

    logger.info('[Legacy Adapter] goToSlide migrated successfully', {
      slideIndex: index,
      previousSnapshotId: result.previousSnapshotId,
      nextSnapshotId: result.nextSnapshotId
    })
  } catch (error) {
    logger.error('[Legacy Adapter] goToSlide migration failed:', error)
    // Fallback disabled: direct store mutation violates authority rules
    logger.warn('[Legacy Adapter] goToSlide fallback disabled - authority violation prevented')
  }
}

/**
 * DEPRECATED: Legacy adapter for goToLiveSlide
 *
 * @deprecated Use state-machine transition 'projection:go-to-slide' instead
 * @param index - Slide index to navigate to
 */
export function legacyGoToLiveSlide(index: number): void {
  logger.warn('[Legacy Adapter] goToLiveSlide called - migrate to state-machine transition')

  try {
    const currentSnapshot = extractProjectionSnapshotFromStore()
    const result = requestTransition(currentSnapshot, {
      type: 'projection:go-to-slide',
      payload: { slideIndex: index }
    })

    syncProjectionSnapshotToStore(result.nextState)
    executeProjectionEffects(result.effects)

    logger.info('[Legacy Adapter] goToLiveSlide migrated successfully', {
      slideIndex: index,
      previousSnapshotId: result.previousSnapshotId,
      nextSnapshotId: result.nextSnapshotId
    })
  } catch (error) {
    logger.error('[Legacy Adapter] goToLiveSlide migration failed:', error)
    // Fallback disabled: direct store mutation violates authority rules
    logger.warn('[Legacy Adapter] goToLiveSlide fallback disabled - authority violation prevented')
  }
}

/**
 * DEPRECATED: Legacy adapter for goToLiveSection
 *
 * @deprecated Use state-machine transition 'projection:go-to-section' instead
 * @param section - Section name to navigate to
 */
export function legacyGoToLiveSection(section: string): void {
  logger.warn('[Legacy Adapter] goToLiveSection called - migrate to state-machine transition')

  try {
    const currentSnapshot = extractProjectionSnapshotFromStore()
    const result = requestTransition(currentSnapshot, {
      type: 'projection:go-to-section',
      payload: { section }
    })

    syncProjectionSnapshotToStore(result.nextState)
    executeProjectionEffects(result.effects)

    logger.info('[Legacy Adapter] goToLiveSection migrated successfully', {
      section,
      previousSnapshotId: result.previousSnapshotId,
      nextSnapshotId: result.nextSnapshotId
    })
  } catch (error) {
    logger.error('[Legacy Adapter] goToLiveSection migration failed:', error)
    // Fallback disabled: direct store mutation violates authority rules
    logger.warn(
      '[Legacy Adapter] goToLiveSection fallback disabled - authority violation prevented'
    )
  }
}

/**
 * DEPRECATED: Legacy adapter for goToLiveAddress
 *
 * @deprecated Use state-machine transition 'projection:go-to-address' instead
 * @param address - Slide address to navigate to
 */
export function legacyGoToLiveAddress(address: any): void {
  logger.warn('[Legacy Adapter] goToLiveAddress called - migrate to state-machine transition')

  try {
    const currentSnapshot = extractProjectionSnapshotFromStore()
    const result = requestTransition(currentSnapshot, {
      type: 'projection:go-to-address',
      payload: { address }
    })

    syncProjectionSnapshotToStore(result.nextState)
    executeProjectionEffects(result.effects)

    logger.info('[Legacy Adapter] goToLiveAddress migrated successfully', {
      address: JSON.stringify(address),
      previousSnapshotId: result.previousSnapshotId,
      nextSnapshotId: result.nextSnapshotId
    })
  } catch (error) {
    logger.error('[Legacy Adapter] goToLiveAddress migration failed:', error)
    // Fallback disabled: direct store mutation violates authority rules
    logger.warn(
      '[Legacy Adapter] goToLiveAddress fallback disabled - authority violation prevented'
    )
  }
}

/**
 * DEPRECATED: Legacy adapter for takeCue
 *
 * @deprecated Use state-machine transition 'projection:take-cue' instead
 */
export function legacyTakeCue(): void {
  logger.warn('[Legacy Adapter] takeCue called - migrate to state-machine transition')

  try {
    const currentSnapshot = extractProjectionSnapshotFromStore()
    const result = requestTransition(currentSnapshot, {
      type: 'projection:take-cue',
      payload: {}
    })

    syncProjectionSnapshotToStore(result.nextState)
    executeProjectionEffects(result.effects)

    logger.info('[Legacy Adapter] takeCue migrated successfully', {
      previousSnapshotId: result.previousSnapshotId,
      nextSnapshotId: result.nextSnapshotId
    })
  } catch (error) {
    logger.error('[Legacy Adapter] takeCue migration failed:', error)
    // Fallback disabled: direct store mutation violates authority rules
    logger.warn('[Legacy Adapter] takeCue fallback disabled - authority violation prevented')
  }
}

/**
 * DEPRECATED: Legacy adapter for toggleBlack
 *
 * @deprecated Use state-machine transition 'projection:black' instead
 */
export function legacyToggleBlack(): void {
  logger.warn('[Legacy Adapter] toggleBlack called - migrate to state-machine transition')

  try {
    const currentSnapshot = extractProjectionSnapshotFromStore()
    const result = requestTransition(currentSnapshot, {
      type: 'projection:black',
      payload: {}
    })

    syncProjectionSnapshotToStore(result.nextState)
    executeProjectionEffects(result.effects)

    logger.info('[Legacy Adapter] toggleBlack migrated successfully', {
      previousSnapshotId: result.previousSnapshotId,
      nextSnapshotId: result.nextSnapshotId
    })
  } catch (error) {
    logger.error('[Legacy Adapter] toggleBlack migration failed:', error)
    // Fallback disabled: direct store mutation violates authority rules
    logger.warn('[Legacy Adapter] toggleBlack fallback disabled - authority violation prevented')
  }
}

/**
 * DEPRECATED: Legacy adapter for toggleFreeze
 *
 * @deprecated Use state-machine transition 'projection:freeze' instead
 */
export function legacyToggleFreeze(): void {
  logger.warn('[Legacy Adapter] toggleFreeze called - migrate to state-machine transition')

  try {
    const currentSnapshot = extractProjectionSnapshotFromStore()
    const result = requestTransition(currentSnapshot, {
      type: 'projection:freeze',
      payload: {}
    })

    syncProjectionSnapshotToStore(result.nextState)
    executeProjectionEffects(result.effects)

    logger.info('[Legacy Adapter] toggleFreeze migrated successfully', {
      previousSnapshotId: result.previousSnapshotId,
      nextSnapshotId: result.nextSnapshotId
    })
  } catch (error) {
    logger.error('[Legacy Adapter] toggleFreeze migration failed:', error)
    // Fallback disabled: direct store mutation violates authority rules
    logger.warn('[Legacy Adapter] toggleFreeze fallback disabled - authority violation prevented')
  }
}

/**
 * DEPRECATED: Legacy adapter for clearScreen
 *
 * @deprecated Use state-machine transition 'projection:clear' instead
 */
export function legacyClearScreen(): void {
  logger.warn('[Legacy Adapter] clearScreen called - migrate to state-machine transition')

  try {
    const currentSnapshot = extractProjectionSnapshotFromStore()
    const result = requestTransition(currentSnapshot, {
      type: 'projection:clear',
      payload: {}
    })

    syncProjectionSnapshotToStore(result.nextState)
    executeProjectionEffects(result.effects)

    logger.info('[Legacy Adapter] clearScreen migrated successfully', {
      previousSnapshotId: result.previousSnapshotId,
      nextSnapshotId: result.nextSnapshotId
    })
  } catch (error) {
    logger.error('[Legacy Adapter] clearScreen migration failed:', error)
    // Fallback disabled: direct store mutation violates authority rules
    logger.warn('[Legacy Adapter] clearScreen fallback disabled - authority violation prevented')
  }
}
