/**
 * Content Pack Path Utilities
 *
 * Manages directory paths for content packs:
 * - Bundled: resources/content-packs/ (baked into installer, read-only)
 * - Runtime: userData/content-packs/ (user-installed packs, writable)
 */

import { app } from 'electron'
import { join } from 'path'
import { mkdirSync, existsSync } from 'fs'

const CONTENT_PACKS_DIR = 'content-packs'
const BIBLES_DIR = 'bibles'
const HYMNALS_DIR = 'hymnals'
const READINGS_DIR = 'readings'
const MEDIA_DIR = 'media'

// ============================================================================
// Runtime (userData) paths — writable, user-installed packs
// ============================================================================

export function getUserContentPackRoot(): string {
  return join(app.getPath('userData'), CONTENT_PACKS_DIR)
}

export function getUserBiblesDir(): string {
  return join(getUserContentPackRoot(), BIBLES_DIR)
}

export function getUserHymnalsDir(): string {
  return join(getUserContentPackRoot(), HYMNALS_DIR)
}

export function getUserReadingsDir(): string {
  return join(getUserContentPackRoot(), READINGS_DIR)
}

export function getUserMediaDir(): string {
  return join(getUserContentPackRoot(), MEDIA_DIR)
}

export function getBiblePackDirectory(packId: string): string {
  return join(getUserBiblesDir(), packId)
}

// ============================================================================
// Bundled (resources) paths — read-only, baked into installer
// ============================================================================

export function getBundledContentPackRoot(): string {
  if (!app.isPackaged) {
    // In dev: projectRoot/resources/content-packs/
    return join(app.getAppPath(), 'resources', 'content-packs')
  }
  // In production (asar-unpacked): win-unpacked/resources/app.asar.unpacked/resources/content-packs
  return join(
    app.getAppPath().replace('app.asar', 'app.asar.unpacked'),
    'resources',
    'content-packs'
  )
}

export function getBundledBiblesDir(): string {
  return join(getBundledContentPackRoot(), BIBLES_DIR)
}

// ============================================================================
// Directory Initialization
// ============================================================================

/**
 * Ensures all content pack directories exist at startup.
 * Safe to call multiple times — uses mkdirSync with recursive flag.
 */
export function ensureContentPackDirectories(): void {
  const dirs = [getUserBiblesDir(), getUserHymnalsDir(), getUserReadingsDir(), getUserMediaDir()]

  for (const dir of dirs) {
    if (!existsSync(dir)) {
      try {
        mkdirSync(dir, { recursive: true })
        console.info(`[ContentPack] Created directory: ${dir}`)
      } catch (err) {
        console.error(`[ContentPack] Failed to create directory ${dir}:`, err)
      }
    }
  }
}
