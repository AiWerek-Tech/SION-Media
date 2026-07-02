/**
 * Safe Mode Startup — Phase 4
 *
 * Detects crash loops: if the app has crashed 3+ times within 60 seconds,
 * enters safe mode which disables projection window auto-launch and
 * heavy media preloading.
 *
 * Crash tracking is stored in `app_state` table keyed by 'crash_log'.
 *
 * @see phase2-part2-runtime-engine.md §7.2.4
 */

import { existsSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { app } from 'electron'

const CRASH_THRESHOLD = 3
const CRASH_WINDOW_MS = 60_000 // 60 seconds

interface CrashEntry {
  timestamp: number
}

interface SafeModeState {
  crashes: CrashEntry[]
  safeMode: boolean
}

let _safeMode = false

function getCrashLogPath(): string {
  return join(app.getPath('userData'), 'crash-log.json')
}

function readCrashLog(): SafeModeState {
  const path = getCrashLogPath()
  try {
    if (existsSync(path)) {
      const raw = readFileSync(path, 'utf-8')
      return JSON.parse(raw) as SafeModeState
    }
  } catch {
    // Corrupted file — reset
  }
  return { crashes: [], safeMode: false }
}

function writeCrashLog(state: SafeModeState): void {
  try {
    writeFileSync(getCrashLogPath(), JSON.stringify(state, null, 2), 'utf-8')
  } catch (err) {
    console.error('[SafeMode] Failed to write crash log:', err)
  }
}

/**
 * Check if the app should enter safe mode.
 * Called at startup BEFORE creating windows.
 *
 * Records current startup as a potential crash. If 3+ crashes
 * happened in the last 60s, returns true (safe mode).
 */
export function checkSafeMode(): boolean {
  const state = readCrashLog()
  const now = Date.now()

  // Record this startup
  state.crashes.push({ timestamp: now })

  // Prune old entries outside the crash window
  state.crashes = state.crashes.filter((c) => now - c.timestamp < CRASH_WINDOW_MS)

  // Check if threshold exceeded
  if (state.crashes.length >= CRASH_THRESHOLD) {
    console.warn(`[SafeMode] ${state.crashes.length} crashes in last 60s — entering safe mode`)
    state.safeMode = true
    _safeMode = true
    writeCrashLog(state)
    return true
  }

  state.safeMode = false
  writeCrashLog(state)
  return false
}

/**
 * Mark a successful startup (clears crash log).
 * Called after the app has been running stable for 10+ seconds.
 */
export function markStableStartup(): void {
  writeCrashLog({ crashes: [], safeMode: false })
  _safeMode = false
  console.info('[SafeMode] Stable startup confirmed — crash log cleared')
}

/**
 * Check if safe mode is currently active.
 */
export function isSafeMode(): boolean {
  return _safeMode
}
