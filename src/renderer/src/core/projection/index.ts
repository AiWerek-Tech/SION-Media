/**
 * @core/projection
 *
 * Projection engine: slide generation, navigation, and confidence payload
 *
 * This module handles all projection-related computation:
 * - Slide generation from lyrics
 * - Slide addressing/navigation
 * - Confidence display payload building
 *
 * Does NOT handle UI rendering or state management.
 * Does NOT perform I/O or network operations.
 * Does NOT maintain projection state.
 */

// ============================================================================
// SLIDE ENGINE (PRODUCTION)
// ============================================================================

export {
  generateSlides,
  generateSlidesForSong,
  generateSlidesForPlaylistItem,
  autoFormatLyrics,
  setGlobalSlideConfig
} from './slideEngine'

export {
  parseSlideAddress,
  resolveSlideAddress,
  buildSectionIndexMap
} from './slideAddressResolver'

export {
  buildConfidencePayload,
  formatElapsedTime,
  getNextSectionName,
  getSlideProgress
} from './confidencePayloadBuilder'

// ============================================================================
// STATE MACHINE - CLEAN ARCHITECTURE SEPARATION
// ============================================================================

/**
 * PRODUCTION RUNTIME (ONLY THIS RUNS IN PRODUCTION)
 * Pure deterministic state transitions - no verification/instrumentation
 */
export {
  requestTransition,
  type ProjectionStateMachineState,
  type ProjectionTransitionRequest,
  type ProjectionTransitionResult
} from './runtime'

export type { ProjectionEvent } from './projection-events'

/**
 * DEVELOPMENT INSTRUMENTATION (DEV MODE ONLY)
 * Mutation detection, state inspection, effect logging
 */
export {
  requestInstrumentedTransition,
  DebugAPI,
  isDevelopment,
  isInstrumentationEnabled
} from './instrumentation'

/**
 * VERIFICATION SUITE (CI ONLY - NEVER IN PRODUCTION)
 * Not exported from barrel to avoid bundling Node.js modules in renderer.
 * Import directly from './verification' in CI scripts only.
 */
// export { ProjectionVerificationSuite } from './verification';

// ============================================================================
// EVENT TRACE SYSTEM - OBSERVABILITY LAYER
// ============================================================================

/**
 * DEVELOPMENT OBSERVABILITY
 * Event logging, debugging, and audit trails
 */
export {
  eventLogger,
  logCommand,
  logTransition,
  logEffect,
  logError,
  queryTraces,
  getTraceStats,
  withTransitionLogging,
  type EventTrace,
  type TraceQuery,
  type TraceStats
} from './event-trace'

/**
 * INTEGRATION ADAPTER
 * UI ↔ FSM bridge for production workflow
 */
export { initializeProjectionAdapter, executeProjectionCommand } from './integration-adapter'

// ============================================================================
// PROJECTION SESSION AGGREGATE - UNIFIED STATE MODEL
// ============================================================================

/**
 * COMPREHENSIVE SESSION STATE
 * Unified model combining FSM + UI + Media + Operator state
 */
export {
  createInitialProjectionSession,
  updateSessionFSMState,
  updateSessionMediaState,
  updateSessionOperatorContext,
  updateSessionOutputConfig,
  updateSessionSyncState,
  validateSessionState,
  serializeSession,
  deserializeSession,
  mapUIStateToFSMState,
  type ProjectionSession,
  type ProjectionMediaState,
  type ProjectionOperatorContext,
  type ProjectionOutputConfig,
  type ProjectionSyncState
} from './projection-session'
