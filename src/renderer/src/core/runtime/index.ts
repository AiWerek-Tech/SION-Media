/**
 * @core/runtime
 *
 * Runtime Orchestration Core
 *
 * Central hub for deterministic command execution and event emission.
 *
 * Architecture:
 *
 * ```
 * CONTRACTS (Phase 2B.1 ✓)
 *   ↓ Define event/command types, correlation, audit
 *
 * COMMAND BUS (Phase 2B.2 ✓)
 *   ↓ Execute commands, emit events, trace correlation
 *
 * EVENT EMITTERS (Phase 2B.2 ✓)
 *   ↓ Domain-specific event publishers
 *
 * HANDLERS (Phase 2B.3 ✓)
 *   ↓ Pluggable command execution with registry discipline
 *
 * STATE MACHINES (Phase 3)
 *   ↓ Deterministic state transitions
 * ```
 *
 * Current State: Handler extraction with registry complete
 * Next: Phase 2B.3.2 - Compatibility layer + remaining handlers
 *
 * @module runtime
 */

// =============================================================================
// PHASE 2B.1: Contracts Foundation (COMPLETE)
// =============================================================================
// All runtime orchestration contracts, types, and utilities
// Transport-agnostic, replay-safe, auditable

export * from './contracts'

// =============================================================================
// PHASE 2B.2: Command Bus Bridge (COMPLETE)
// =============================================================================
// Transport-agnostic command execution and event emission
// Dumb transport: delivery, subscription, routing, correlation only

export * from './command-bus'
export * from './event-emitter'
export * from './input-adapter'

// =============================================================================
// PHASE 2B.3: Handler Extraction (COMPLETE)
// =============================================================================
// Extracted handlers with registry-based one-per-command enforcement

export * from './handlers'
export { handlerRegistry } from './registry/handler-registry'
