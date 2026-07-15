import { readFileSync } from 'fs'
import { resolve } from 'path'
import { describe, expect, it } from 'vitest'

const databaseSource = readFileSync(resolve(process.cwd(), 'src/main/database.ts'), 'utf8')

function functionBlock(startMarker: string, endMarker: string): string {
  const start = databaseSource.indexOf(startMarker)
  const end = databaseSource.indexOf(endMarker, start)
  expect(start).toBeGreaterThanOrEqual(0)
  expect(end).toBeGreaterThan(start)
  return databaseSource.slice(start, end)
}

describe('media import responsiveness contract', () => {
  it('copies and validates imported files asynchronously before the SQLite transaction', () => {
    const block = functionBlock(
      'export async function importMediaAssets',
      'export async function addLocalExternalMedia'
    )
    expect(block).toContain('await stat(rawPath)')
    expect(block).toContain('await copyFile(rawPath, localPath)')
    expect(block).not.toContain('copyFileSync(')
    expect(block.indexOf('await copyFile')).toBeLessThan(block.indexOf('db.transaction'))
    expect(block).toContain('await yieldDatabaseEventLoop()')
  })

  it('removes copied files when preparation or the database transaction fails', () => {
    const block = functionBlock(
      'export async function importMediaAssets',
      'export async function addLocalExternalMedia'
    )
    expect(block).toContain('createdPaths.push(localPath)')
    expect(block).toContain('createdPaths.push(thumbnailPath)')
    expect(block).toContain('await cleanupPreparedMediaFiles(createdPaths)')
  })

  it('checks cancellation between file phases and reports bounded progress', () => {
    const block = functionBlock(
      'export async function importMediaAssets',
      'export async function addLocalExternalMedia'
    )
    expect(block.match(/throwIfMediaImportAborted/g)?.length).toBeGreaterThanOrEqual(3)
    expect(block).toContain("phase: 'preparing'")
    expect(block).toContain("phase: 'thumbnail'")
    expect(block).toContain("phase: 'committing'")
    expect(block).toContain("phase: 'complete'")
  })

  it('exposes one active import controller and a renderer cancellation API', () => {
    const handlers = readFileSync(resolve(process.cwd(), 'src/main/ipc-handlers.ts'), 'utf8')
    const preload = readFileSync(resolve(process.cwd(), 'src/preload/index.ts'), 'utf8')
    expect(handlers).toContain('activeMediaImportController')
    expect(handlers).toContain("safeIpcHandle('db:cancel-media-import'")
    expect(preload).toContain("ipcRenderer.invoke('db:cancel-media-import')")
    expect(preload).toContain("ipcRenderer.on('media:import-progress'")
  })

  it('validates external local media asynchronously before opening a transaction', () => {
    const block = functionBlock(
      'export async function addLocalExternalMedia',
      'export function updateMediaAsset'
    )
    expect(block).toContain('await stat(rawPath)')
    expect(block.indexOf('await stat(rawPath)')).toBeLessThan(block.indexOf('db.transaction'))
    expect(block).toContain('await yieldDatabaseEventLoop()')
  })
})
