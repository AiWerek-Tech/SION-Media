import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, test } from 'vitest'

const ipcSource = readFileSync(resolve(process.cwd(), 'src/main/ipc-handlers.ts'), 'utf8')
const bootstrapSource = readFileSync(
  resolve(process.cwd(), 'src/renderer/src/hooks/useAppBootstrap.ts'),
  'utf8'
)

describe('projection output lifecycle contract', () => {
  test('mode changes use the preserve-visibility policy', () => {
    expect(ipcSource).toContain('resolveModeChangeProjectionAction(mode)')
  })

  test('renderer reconciles output status with the Electron window at startup', () => {
    expect(bootstrapSource).toContain('window.api.display.isProjectionVisible()')
    expect(bootstrapSource).toContain('setProjectionVisible(projectionVisible)')
  })
})
