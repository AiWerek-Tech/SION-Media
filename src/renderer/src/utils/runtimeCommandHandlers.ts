/**
 * Runtime Command Handlers
 *
 * Connects the command bus to actual store actions.
 * All runtime operations flow through this registration.
 *
 * @module runtimeCommandHandlers
 */

import { commandBus } from './runtimeCommandBus'
import { useProjectionStore } from '../store/useProjectionStore'
import { logger } from './logger'
import type { RuntimeCommandType } from './runtimeCommandBus'
import type { SlideAddress, Song, SlideData } from '../types'

let handlersRegistered = false
let validatorsRegistered = false

// ============================================================================
// Command Handlers
// ============================================================================

/**
 * Register all command handlers
 * Called once during app initialization
 */
export function registerCommandHandlers(): void {
  if (handlersRegistered) return
  handlersRegistered = true

  const store = useProjectionStore.getState

  // ═══════════════════════════════════════════════════════════════
  // NAVIGATION COMMANDS
  // ═══════════════════════════════════════════════════════════════

  commandBus.registerHandler('NAV_NEXT_SLIDE', (cmd) => {
    try {
      store().nextSlide()
      logger.info('[CommandBus] NAV_NEXT_SLIDE executed', { source: cmd.source })
      return { id: '', command: cmd, status: 'SUCCESS', success: true, timestamp: Date.now() }
    } catch (err) {
      return {
        id: '',
        command: cmd,
        status: 'ERROR',
        success: false,
        error: String(err),
        timestamp: Date.now()
      }
    }
  })

  commandBus.registerHandler('NAV_PREV_SLIDE', (cmd) => {
    try {
      store().prevSlide()
      logger.info('[CommandBus] NAV_PREV_SLIDE executed', { source: cmd.source })
      return { id: '', command: cmd, status: 'SUCCESS', success: true, timestamp: Date.now() }
    } catch (err) {
      return {
        id: '',
        command: cmd,
        status: 'ERROR',
        success: false,
        error: String(err),
        timestamp: Date.now()
      }
    }
  })

  commandBus.registerHandler('NAV_GOTO_SLIDE', (cmd) => {
    try {
      const index = cmd.payload?.slideIndex
      if (typeof index !== 'number') {
        return {
          id: '',
          command: cmd,
          status: 'ERROR',
          success: false,
          error: 'Missing slideIndex',
          timestamp: Date.now()
        }
      }
      store().goToSlide(index)
      logger.info('[CommandBus] NAV_GOTO_SLIDE executed', { index, source: cmd.source })
      return {
        id: '',
        command: cmd,
        status: 'SUCCESS',
        success: true,
        result: { index },
        timestamp: Date.now()
      }
    } catch (err) {
      return {
        id: '',
        command: cmd,
        status: 'ERROR',
        success: false,
        error: String(err),
        timestamp: Date.now()
      }
    }
  })

  commandBus.registerHandler('NAV_GOTO_SECTION', (cmd) => {
    try {
      const section = cmd.payload?.section as string | undefined
      if (!section) {
        return {
          id: '',
          command: cmd,
          status: 'ERROR',
          success: false,
          error: 'Missing section',
          timestamp: Date.now()
        }
      }
      store().goToLiveSection(section)
      logger.info('[CommandBus] NAV_GOTO_SECTION executed', { section, source: cmd.source })
      return {
        id: '',
        command: cmd,
        status: 'SUCCESS',
        success: true,
        result: { section },
        timestamp: Date.now()
      }
    } catch (err) {
      return {
        id: '',
        command: cmd,
        status: 'ERROR',
        success: false,
        error: String(err),
        timestamp: Date.now()
      }
    }
  })

  commandBus.registerHandler('NAV_GOTO_ADDRESS', (cmd) => {
    try {
      const address = cmd.payload?.address as SlideAddress | undefined
      if (!address) {
        return {
          id: '',
          command: cmd,
          status: 'ERROR',
          success: false,
          error: 'Missing address',
          timestamp: Date.now()
        }
      }
      store().goToLiveAddress(address)
      logger.info('[CommandBus] NAV_GOTO_ADDRESS executed', { source: cmd.source })
      return { id: '', command: cmd, status: 'SUCCESS', success: true, timestamp: Date.now() }
    } catch (err) {
      return {
        id: '',
        command: cmd,
        status: 'ERROR',
        success: false,
        error: String(err),
        timestamp: Date.now()
      }
    }
  })

  commandBus.registerHandler('NAV_CUE_NEXT', (cmd) => {
    try {
      store().cueNextSlide()
      logger.info('[CommandBus] NAV_CUE_NEXT executed', { source: cmd.source })
      return { id: '', command: cmd, status: 'SUCCESS', success: true, timestamp: Date.now() }
    } catch (err) {
      return {
        id: '',
        command: cmd,
        status: 'ERROR',
        success: false,
        error: String(err),
        timestamp: Date.now()
      }
    }
  })

  commandBus.registerHandler('NAV_CUE_PREV', (cmd) => {
    try {
      store().cuePrevSlide()
      logger.info('[CommandBus] NAV_CUE_PREV executed', { source: cmd.source })
      return { id: '', command: cmd, status: 'SUCCESS', success: true, timestamp: Date.now() }
    } catch (err) {
      return {
        id: '',
        command: cmd,
        status: 'ERROR',
        success: false,
        error: String(err),
        timestamp: Date.now()
      }
    }
  })

  commandBus.registerHandler('NAV_CUE_GOTO', (cmd) => {
    try {
      const index = cmd.payload?.slideIndex
      if (typeof index !== 'number') {
        return {
          id: '',
          command: cmd,
          status: 'ERROR',
          success: false,
          error: 'Missing slideIndex',
          timestamp: Date.now()
        }
      }
      store().cueGoToSlide(index)
      logger.info('[CommandBus] NAV_CUE_GOTO executed', { index, source: cmd.source })
      return {
        id: '',
        command: cmd,
        status: 'SUCCESS',
        success: true,
        result: { index },
        timestamp: Date.now()
      }
    } catch (err) {
      return {
        id: '',
        command: cmd,
        status: 'ERROR',
        success: false,
        error: String(err),
        timestamp: Date.now()
      }
    }
  })

  commandBus.registerHandler('NAV_CUE_GOTO_ADDRESS', (cmd) => {
    try {
      const address = cmd.payload?.address as SlideAddress | undefined
      if (!address) {
        return {
          id: '',
          command: cmd,
          status: 'ERROR',
          success: false,
          error: 'Missing address',
          timestamp: Date.now()
        }
      }
      store().cueGoToAddress(address)
      logger.info('[CommandBus] NAV_CUE_GOTO_ADDRESS executed', { source: cmd.source })
      return { id: '', command: cmd, status: 'SUCCESS', success: true, timestamp: Date.now() }
    } catch (err) {
      return {
        id: '',
        command: cmd,
        status: 'ERROR',
        success: false,
        error: String(err),
        timestamp: Date.now()
      }
    }
  })

  commandBus.registerHandler('NAV_LIVE_GOTO', (cmd) => {
    try {
      const index = cmd.payload?.slideIndex
      if (typeof index !== 'number') {
        return {
          id: '',
          command: cmd,
          status: 'ERROR',
          success: false,
          error: 'Missing slideIndex',
          timestamp: Date.now()
        }
      }
      store().goToLiveSlide(index)
      logger.info('[CommandBus] NAV_LIVE_GOTO executed', { index, source: cmd.source })
      return {
        id: '',
        command: cmd,
        status: 'SUCCESS',
        success: true,
        result: { index },
        timestamp: Date.now()
      }
    } catch (err) {
      return {
        id: '',
        command: cmd,
        status: 'ERROR',
        success: false,
        error: String(err),
        timestamp: Date.now()
      }
    }
  })

  commandBus.registerHandler('NAV_LIVE_GOTO_ADDRESS', (cmd) => {
    try {
      const address = cmd.payload?.address as SlideAddress | undefined
      if (!address) {
        return {
          id: '',
          command: cmd,
          status: 'ERROR',
          success: false,
          error: 'Missing address',
          timestamp: Date.now()
        }
      }
      store().goToLiveAddress(address)
      logger.info('[CommandBus] NAV_LIVE_GOTO_ADDRESS executed', { source: cmd.source })
      return { id: '', command: cmd, status: 'SUCCESS', success: true, timestamp: Date.now() }
    } catch (err) {
      return {
        id: '',
        command: cmd,
        status: 'ERROR',
        success: false,
        error: String(err),
        timestamp: Date.now()
      }
    }
  })

  // ═══════════════════════════════════════════════════════════════
  // PROJECTION STATE COMMANDS
  // ═══════════════════════════════════════════════════════════════

  commandBus.registerHandler('PROJ_TAKE_CUE', (cmd) => {
    try {
      store().takeCue()
      logger.info('[CommandBus] PROJ_TAKE_CUE executed', { source: cmd.source })
      return { id: '', command: cmd, status: 'SUCCESS', success: true, timestamp: Date.now() }
    } catch (err) {
      return {
        id: '',
        command: cmd,
        status: 'ERROR',
        success: false,
        error: String(err),
        timestamp: Date.now()
      }
    }
  })

  commandBus.registerHandler('PROJ_BLACK', (cmd) => {
    try {
      store().toggleBlack()
      logger.info('[CommandBus] PROJ_BLACK executed', { source: cmd.source })
      return { id: '', command: cmd, status: 'SUCCESS', success: true, timestamp: Date.now() }
    } catch (err) {
      return {
        id: '',
        command: cmd,
        status: 'ERROR',
        success: false,
        error: String(err),
        timestamp: Date.now()
      }
    }
  })

  commandBus.registerHandler('PROJ_FREEZE', (cmd) => {
    try {
      store().toggleFreeze()
      logger.info('[CommandBus] PROJ_FREEZE executed', { source: cmd.source })
      return { id: '', command: cmd, status: 'SUCCESS', success: true, timestamp: Date.now() }
    } catch (err) {
      return {
        id: '',
        command: cmd,
        status: 'ERROR',
        success: false,
        error: String(err),
        timestamp: Date.now()
      }
    }
  })

  commandBus.registerHandler('PROJ_CLEAR', (cmd) => {
    try {
      store().clearScreen()
      logger.info('[CommandBus] PROJ_CLEAR executed', { source: cmd.source })
      return { id: '', command: cmd, status: 'SUCCESS', success: true, timestamp: Date.now() }
    } catch (err) {
      return {
        id: '',
        command: cmd,
        status: 'ERROR',
        success: false,
        error: String(err),
        timestamp: Date.now()
      }
    }
  })

  commandBus.registerHandler('PROJ_LIVE', (cmd) => {
    try {
      const current = store().programSlide
      if (current) {
        store().setProjectionState('LIVE')
        logger.info('[CommandBus] PROJ_LIVE executed', { source: cmd.source })
      }
      return { id: '', command: cmd, status: 'SUCCESS', success: true, timestamp: Date.now() }
    } catch (err) {
      return {
        id: '',
        command: cmd,
        status: 'ERROR',
        success: false,
        error: String(err),
        timestamp: Date.now()
      }
    }
  })

  // ═══════════════════════════════════════════════════════════════
  // TIMER COMMANDS
  // ═══════════════════════════════════════════════════════════════

  commandBus.registerHandler('TIMER_START', (cmd) => {
    try {
      store().timerStart()
      logger.info('[CommandBus] TIMER_START executed', { source: cmd.source })
      return { id: '', command: cmd, status: 'SUCCESS', success: true, timestamp: Date.now() }
    } catch (err) {
      return {
        id: '',
        command: cmd,
        status: 'ERROR',
        success: false,
        error: String(err),
        timestamp: Date.now()
      }
    }
  })

  commandBus.registerHandler('TIMER_STOP', (cmd) => {
    try {
      store().timerStop()
      logger.info('[CommandBus] TIMER_STOP executed', { source: cmd.source })
      return { id: '', command: cmd, status: 'SUCCESS', success: true, timestamp: Date.now() }
    } catch (err) {
      return {
        id: '',
        command: cmd,
        status: 'ERROR',
        success: false,
        error: String(err),
        timestamp: Date.now()
      }
    }
  })

  commandBus.registerHandler('TIMER_RESET', (cmd) => {
    try {
      store().timerReset()
      logger.info('[CommandBus] TIMER_RESET executed', { source: cmd.source })
      return { id: '', command: cmd, status: 'SUCCESS', success: true, timestamp: Date.now() }
    } catch (err) {
      return {
        id: '',
        command: cmd,
        status: 'ERROR',
        success: false,
        error: String(err),
        timestamp: Date.now()
      }
    }
  })

  // ═══════════════════════════════════════════════════════════════
  // PROTECTION COMMANDS
  // ═══════════════════════════════════════════════════════════════

  commandBus.registerHandler('PROTECTION_UPDATE_LIVE', (cmd) => {
    try {
      store().updateLive()
      logger.info('[CommandBus] PROTECTION_UPDATE_LIVE executed', { source: cmd.source })
      return { id: '', command: cmd, status: 'SUCCESS', success: true, timestamp: Date.now() }
    } catch (err) {
      return {
        id: '',
        command: cmd,
        status: 'ERROR',
        success: false,
        error: String(err),
        timestamp: Date.now()
      }
    }
  })

  commandBus.registerHandler('PROTECTION_DISCARD', (cmd) => {
    try {
      store().discardChanges()
      logger.info('[CommandBus] PROTECTION_DISCARD executed', { source: cmd.source })
      return { id: '', command: cmd, status: 'SUCCESS', success: true, timestamp: Date.now() }
    } catch (err) {
      return {
        id: '',
        command: cmd,
        status: 'ERROR',
        success: false,
        error: String(err),
        timestamp: Date.now()
      }
    }
  })

  // ═══════════════════════════════════════════════════════════════
  // NEXT STATE COMMANDS
  // ═══════════════════════════════════════════════════════════════

  commandBus.registerHandler('NEXT_LOAD_SONG', (cmd) => {
    try {
      const song = cmd.payload?.song as Song | undefined
      const slides = cmd.payload?.slides as SlideData[] | undefined
      if (!song || !slides) {
        return {
          id: '',
          command: cmd,
          status: 'ERROR',
          success: false,
          error: 'Missing song or slides',
          timestamp: Date.now()
        }
      }
      store().loadNextSong(song, slides)
      logger.info('[CommandBus] NEXT_LOAD_SONG executed', { songId: song.id, source: cmd.source })
      return { id: '', command: cmd, status: 'SUCCESS', success: true, timestamp: Date.now() }
    } catch (err) {
      return {
        id: '',
        command: cmd,
        status: 'ERROR',
        success: false,
        error: String(err),
        timestamp: Date.now()
      }
    }
  })

  commandBus.registerHandler('NEXT_CLEAR', (cmd) => {
    try {
      store().clearNextSong()
      logger.info('[CommandBus] NEXT_CLEAR executed', { source: cmd.source })
      return { id: '', command: cmd, status: 'SUCCESS', success: true, timestamp: Date.now() }
    } catch (err) {
      return {
        id: '',
        command: cmd,
        status: 'ERROR',
        success: false,
        error: String(err),
        timestamp: Date.now()
      }
    }
  })

  logger.info('[CommandBus] All command handlers registered')
}

// ============================================================================
// Validators (Optional - for commands that need pre-execution checks)
// ============================================================================

/**
 * Register command validators
 * Called once during app initialization
 */
export function registerCommandValidators(): void {
  if (validatorsRegistered) return
  validatorsRegistered = true

  const store = useProjectionStore.getState

  // Validate navigation commands against LIVE_LOCK
  const navigationCommands: RuntimeCommandType[] = [
    'NAV_GOTO_SLIDE',
    'NAV_GOTO_SECTION',
    'NAV_GOTO_ADDRESS',
    'NAV_LIVE_GOTO',
    'NAV_LIVE_GOTO_ADDRESS'
  ]

  navigationCommands.forEach((type) => {
    commandBus.registerValidator(type, (cmd) => {
      const { programLockState } = store()
      if (programLockState === 'LIVE_LOCK') {
        logger.warn('[CommandBus] Command blocked by LIVE_LOCK', { type: cmd.type })
        return { valid: false, error: 'LIVE_LOCK active - navigation blocked' }
      }
      return { valid: true }
    })
  })

  // Validate slide index bounds
  commandBus.registerValidator('NAV_GOTO_SLIDE', (cmd) => {
    const index = cmd.payload?.slideIndex
    const { programSlides } = store()
    if (typeof index !== 'number') {
      return { valid: false, error: 'Invalid slide index' }
    }
    if (index < 0 || index >= programSlides.length) {
      return { valid: false, error: `Slide index ${index} out of bounds` }
    }
    return { valid: true }
  })

  logger.info('[CommandBus] All command validators registered')
}
