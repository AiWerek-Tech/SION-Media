import { readFileSync } from 'fs'
import { resolve } from 'path'
import { describe, expect, it } from 'vitest'

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8')
}

describe('IPC sender isolation contract', () => {
  it('routes setupIPC handlers through explicit sender policies', () => {
    const ipcSource = source('src/main/ipc-handlers.ts')
    const setupBody = ipcSource.slice(ipcSource.indexOf('export function setupIPC'))
    expect(setupBody).not.toContain('ipcMain.handle(')
    expect(setupBody).not.toContain('ipcMain.on(')
    expect(setupBody).toContain("appWindowHandle('db:get-settings'")
    expect(setupBody).toContain("policyOn('projection', 'projection:instrument-timeupdate'")
  })

  it('protects delegated content-pack and Bible-pack handlers', () => {
    const contentPackSource = source('src/main/services/content-packs/contentPackIpcHandlers.ts')
    const biblePackSource = source('src/main/services/bible/biblePackIpcHandlers.ts')
    expect(contentPackSource.match(/requireMainWindowSender\(/g)?.length).toBeGreaterThanOrEqual(6)
    expect(biblePackSource.match(/requireMainWindowSender\(/g)?.length).toBeGreaterThanOrEqual(6)
  })

  it('binds health identities to their actual renderer windows', () => {
    const healthSource = source('src/main/ipc-health.ts')
    expect(healthSource).toContain("role === 'projection'")
    expect(healthSource).toContain("? 'PROJECTION_WINDOW'")
    expect(healthSource).toContain("role === 'stage'")
    expect(healthSource).toContain("? 'STAGE_DISPLAY'")
    expect(healthSource).toContain("requireMainWindowSender(event, 'health:get-status')")
  })

  it('guards instrument folder scans against pathological directories', () => {
    const scanSource = source('src/main/services/instruments/scanInstruments.ts')
    expect(scanSource).toContain('opendir(folderPath)')
    expect(scanSource).toContain('entryCount > MAX_DIRECTORY_ENTRIES')
    expect(scanSource).toContain('if (!entry.isFile()) continue')
    expect(scanSource).toContain('await yieldToEventLoop()')
  })
})
