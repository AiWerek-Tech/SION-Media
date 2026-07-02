import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, test } from 'vitest'

const operatorSource = readFileSync(
  resolve(process.cwd(), 'src/renderer/src/components/LivePreviewPanel.tsx'),
  'utf8'
)
const projectorSource = readFileSync(
  resolve(process.cwd(), 'src/renderer/src/projection/ProjectionApp.tsx'),
  'utf8'
)

describe('operator and projector live-surface parity', () => {
  test('both live surfaces render through the shared LiveProjectionCanvas', () => {
    expect(operatorSource).toContain('<LiveProjectionCanvas')
    expect(projectorSource).toContain('<LiveProjectionCanvas')
  })

  test('operator does not apply a private transition speed multiplier', () => {
    expect(operatorSource).not.toContain('transitionSpeedMultiplier')
  })
})
