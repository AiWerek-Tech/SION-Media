/**
 * Session Crash Report — Beta Debug Export
 *
 * Collects runtime environment info, crash logs, settings snapshot,
 * and app state into a single JSON file that beta testers can export
 * and send for debugging.
 *
 * Exposed via IPC channel 'system:export-debug-report'.
 */

import { app, dialog } from 'electron'
import { join } from 'path'
import { existsSync, readFileSync, writeFileSync, readdirSync, statSync } from 'fs'
import { getSettings, getAllAppState } from './database'
import { healthRegistry } from './ipc-health'
import { isSafeMode } from './safe-mode'

interface DebugReport {
  generatedAt: string
  appVersion: string
  electronVersion: string
  nodeVersion: string
  chromeVersion: string
  platform: string
  arch: string
  safeMode: boolean
  userData: string
  settings: Record<string, string>
  healthStatus: unknown[]
  crashLog: unknown
  appState: Record<string, string>
  memoryUsage: NodeJS.MemoryUsage
  uptime: number
  recentLogs: string[]
}

function readCrashLog(): unknown {
  const crashLogPath = join(app.getPath('userData'), 'crash-log.json')
  try {
    if (existsSync(crashLogPath)) {
      return JSON.parse(readFileSync(crashLogPath, 'utf-8'))
    }
  } catch {
    return { error: 'Failed to read crash log' }
  }
  return null
}

function getAppStateSnapshot(): Record<string, string> {
  try {
    return getAllAppState()
  } catch {
    return {}
  }
}

function collectRecentLogs(): string[] {
  const logsDir = join(app.getPath('userData'), 'logs')
  const lines: string[] = []
  try {
    if (!existsSync(logsDir)) return lines
    const files = readdirSync(logsDir)
      .filter((f) => f.endsWith('.log'))
      .map((f) => ({ name: f, path: join(logsDir, f), mtime: statSync(join(logsDir, f)).mtimeMs }))
      .sort((a, b) => b.mtime - a.mtime)
      .slice(0, 3)

    for (const file of files) {
      try {
        const content = readFileSync(file.path, 'utf-8')
        const tail = content.split('\n').slice(-50).join('\n')
        lines.push(`--- ${file.name} ---`, tail)
      } catch {
        lines.push(`--- ${file.name} --- (unreadable)`)
      }
    }
  } catch {
    lines.push('(no log directory)')
  }
  return lines
}

export async function generateDebugReport(): Promise<DebugReport> {
  const settings = getSettings()

  return {
    generatedAt: new Date().toISOString(),
    appVersion: app.getVersion(),
    electronVersion: process.versions.electron,
    nodeVersion: process.versions.node,
    chromeVersion: process.versions.chrome,
    platform: `${process.platform} ${process.arch}`,
    arch: process.arch,
    safeMode: isSafeMode(),
    userData: app.getPath('userData'),
    settings,
    healthStatus: healthRegistry.getState(),
    crashLog: readCrashLog(),
    appState: getAppStateSnapshot(),
    memoryUsage: process.memoryUsage(),
    uptime: process.uptime(),
    recentLogs: collectRecentLogs()
  }
}

export async function exportDebugReport(): Promise<{ success: boolean; path?: string }> {
  try {
    const report = await generateDebugReport()
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const defaultPath = join(app.getPath('desktop'), `sion-media-debug-${timestamp}.json`)

    const { canceled, filePath } = await dialog.showSaveDialog({
      title: 'Export Debug Report',
      defaultPath,
      filters: [{ name: 'JSON Report', extensions: ['json'] }]
    })

    if (canceled || !filePath) {
      return { success: false }
    }

    writeFileSync(filePath, JSON.stringify(report, null, 2), 'utf-8')
    return { success: true, path: filePath }
  } catch (err) {
    console.error('[DebugReport] Export failed:', err)
    return { success: false }
  }
}
