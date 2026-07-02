/**
 * Effect Purity Guard
 *
 * Ensures effects maintain purity: they should not mutate
 * the state machine, store, or any global state.
 *
 * This prevents "effect leakage" where side effects
 * inadvertently change application state.
 */

import { executeProjectionEffects } from '../state-machine/effects'
import type { ProjectionEffect } from '../state-machine/effects'

// Global flag for mutation detection (development only)
declare global {
  var __PROJECTION_STORE_MUTATED__: boolean
  var __PROJECTION_STATE_MACHINE_MUTATED__: boolean
}

export type PurityReport = {
  ok: boolean
  violations: string[]
  executionTime: number
  effectCount: number
}

/**
 * Wrap effect executor with purity guards
 * Detects if effects mutate store or state machine
 */
export function createPurityGuardedExecutor() {
  return async function executeEffectsWithPurityCheck(
    effects: ProjectionEffect[]
  ): Promise<PurityReport> {
    const startTime = performance.now()

    // Reset global flags
    globalThis.__PROJECTION_STORE_MUTATED__ = false
    globalThis.__PROJECTION_STATE_MACHINE_MUTATED__ = false

    const violations: string[] = []

    try {
      // Execute effects through normal path
      await executeProjectionEffects(effects)
    } catch (error) {
      violations.push(`EFFECT_EXECUTION_FAILED: ${error}`)
    }

    // Check for mutations
    if (globalThis.__PROJECTION_STORE_MUTATED__) {
      violations.push('EFFECT_MUTATED_STORE_DIRECTLY')
    }

    if (globalThis.__PROJECTION_STATE_MACHINE_MUTATED__) {
      violations.push('EFFECT_MUTATED_STATE_MACHINE')
    }

    const executionTime = performance.now() - startTime

    return {
      ok: violations.length === 0,
      violations,
      executionTime,
      effectCount: effects.length
    }
  }
}

/**
 * Validate individual effect purity
 * Useful for testing effects in isolation
 */
export async function validateEffectPurity(effect: ProjectionEffect): Promise<{
  ok: boolean
  violations: string[]
  executionTime: number
}> {
  const startTime = performance.now()

  // Reset flags
  globalThis.__PROJECTION_STORE_MUTATED__ = false
  globalThis.__PROJECTION_STATE_MACHINE_MUTATED__ = false

  const violations: string[] = []

  try {
    // Execute single effect (this would need to be implemented in effects/index.ts)
    // For now, we'll simulate by calling the executor with single effect
    const report = await createPurityGuardedExecutor()([effect])

    violations.push(...report.violations)
  } catch (error) {
    violations.push(`EFFECT_VALIDATION_FAILED: ${error}`)
  }

  // Check mutations
  if (globalThis.__PROJECTION_STORE_MUTATED__) {
    violations.push('EFFECT_MUTATED_STORE')
  }

  if (globalThis.__PROJECTION_STATE_MACHINE_MUTATED__) {
    violations.push('EFFECT_MUTATED_STATE_MACHINE')
  }

  const executionTime = performance.now() - startTime

  return {
    ok: violations.length === 0,
    violations,
    executionTime
  }
}

/**
 * Create a proxy that detects mutations to critical objects
 * Used in development to set global mutation flags
 */
export function createMutationDetectionProxy<T extends object>(
  target: T,
  mutationFlag: keyof typeof globalThis
): T {
  return new Proxy(target, {
    set(target, property, value) {
      // Set mutation flag
      ;(globalThis as any)[mutationFlag] = true

      // Allow the mutation
      return Reflect.set(target, property, value)
    },

    deleteProperty(target, property) {
      ;(globalThis as any)[mutationFlag] = true
      return Reflect.deleteProperty(target, property)
    }
  })
}

/**
 * Install mutation detection on store (development only)
 * This wraps the store with proxies that set global flags on mutation
 */
export function installStoreMutationDetection() {
  if (process.env.NODE_ENV === 'development') {
    // This would need to be integrated with the store creation
    // For now, it's a placeholder for the concept
    console.warn('Store mutation detection not yet implemented - requires store proxy integration')
  }
}

/**
 * Validate effect dependencies
 * Ensures effects only depend on their declared inputs
 */
export function validateEffectDependencies(effect: ProjectionEffect): {
  ok: boolean
  violations: string[]
} {
  const violations: string[] = []

  // Check for common illegal dependencies
  const illegalPatterns = [
    { pattern: /useProjectionStore/, violation: 'EFFECT_ACCESSES_STORE_DIRECTLY' },
    { pattern: /window\.api\.projection/, violation: 'EFFECT_ACCESSES_WINDOW_API_IN_PAYLOAD' },
    { pattern: /extractProjectionSnapshot/, violation: 'EFFECT_ACCESSES_SNAPSHOT_EXTRACTION' }
  ]

  // This is a simplified check - in practice, you'd analyze the effect function AST
  const effectString = JSON.stringify(effect)

  for (const { pattern, violation } of illegalPatterns) {
    if (pattern.test(effectString)) {
      violations.push(violation)
    }
  }

  return {
    ok: violations.length === 0,
    violations
  }
}

/**
 * Runtime purity monitor for production
 * Logs violations without failing (for production stability)
 */
export class PurityMonitor {
  private violations: string[] = []

  logViolation(violation: string) {
    this.violations.push(`${Date.now()}: ${violation}`)
    console.warn(`[PURITY VIOLATION] ${violation}`)
  }

  getReport() {
    return {
      totalViolations: this.violations.length,
      violations: [...this.violations],
      lastViolation: this.violations[this.violations.length - 1]
    }
  }

  reset() {
    this.violations = []
  }
}

// Global monitor instance
export const purityMonitor = new PurityMonitor()
