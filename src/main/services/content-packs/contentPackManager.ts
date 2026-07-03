/**
 * Content Pack Manager
 *
 * Orchestrates the full lifecycle of content pack installation:
 * 1. Preview folder (read manifest + import_report + books.json, validate)
 * 2. Install from folder (copy files to userData, register in DB)
 * 3. Remove pack (delete registry entry + optionally delete folder)
 */

import { dialog, BrowserWindow } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync, copyFileSync, rmSync, readdirSync, statSync } from 'fs'
import { readFileSync } from 'fs'
import type {
  BiblePackManifest,
  BiblePackImportReport,
  BiblePackBookEntry,
  BiblePackPreview,
  ContentPackRecord,
  ContentPackType
} from '@shared/types'
import { getBiblePackDirectory, getBundledBiblesDir } from './contentPackPaths'
import {
  registerPack,
  removePack as removePackFromRegistry,
  getPackByPackId,
  listPacks,
  setDefaultPack
} from './contentPackRegistry'

// ============================================================================
// Constants
// ============================================================================

const REQUIRED_MANIFEST_BOOKS = 66
const REQUIRED_MANIFEST_CHAPTERS = 1189
const REQUIRED_MANIFEST_VERSES = 31102

// ============================================================================
// Folder Dialog
// ============================================================================

export async function selectContentPackFolder(): Promise<string | null> {
  const window = BrowserWindow.getFocusedWindow()
  const result = await dialog.showOpenDialog(window!, {
    title: 'Pilih Folder Bible Pack',
    properties: ['openDirectory'],
    buttonLabel: 'Pilih Folder'
  })
  if (result.canceled || result.filePaths.length === 0) return null
  return result.filePaths[0]
}

// ============================================================================
// Validation Helpers
// ============================================================================

function readJsonFile<T>(filePath: string): T | null {
  try {
    const raw = readFileSync(filePath, 'utf-8')
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

function validateBiblePackFolder(folderPath: string): BiblePackPreview {
  const errors: string[] = []

  // Detect pack_id from folder name (e.g. "out_tb" → infer from manifest)
  // We'll read manifest first to get version_code
  const files = existsSync(folderPath) ? readdirSync(folderPath) : []

  // Find manifest file
  const manifestFile = files.find((f) => f.endsWith('.manifest.json'))
  const importReportFile = files.find((f) => f.endsWith('.import_report.json'))
  const booksFile = files.find((f) => f.endsWith('.books.json'))
  const sqliteFile = files.find((f) => f.endsWith('.sqlite'))

  if (!manifestFile) errors.push('File manifest.json tidak ditemukan di folder.')
  if (!importReportFile) errors.push('File import_report.json tidak ditemukan di folder.')
  if (!booksFile) errors.push('File books.json tidak ditemukan di folder.')
  if (!sqliteFile) errors.push('File .sqlite tidak ditemukan di folder.')

  if (errors.length > 0) {
    return { valid: false, errors, manifest: null, importReport: null, books: [], packId: '' }
  }

  const manifest = readJsonFile<BiblePackManifest>(join(folderPath, manifestFile!))
  const importReport = readJsonFile<BiblePackImportReport>(join(folderPath, importReportFile!))
  const books = readJsonFile<BiblePackBookEntry[]>(join(folderPath, booksFile!))

  if (!manifest) errors.push('Gagal membaca manifest.json — format tidak valid.')
  if (!importReport) errors.push('Gagal membaca import_report.json — format tidak valid.')
  if (!books) errors.push('Gagal membaca books.json — format tidak valid.')

  if (errors.length > 0) {
    return { valid: false, errors, manifest, importReport, books: books ?? [], packId: '' }
  }

  // Validate import report
  if (!importReport!.ok) {
    errors.push(`Import report menunjukkan status GAGAL (ok=false).`)
  }

  // Validate manifest
  if (!manifest!.validation_ok) {
    errors.push('Manifest validation_ok = false. Data tidak valid.')
  }
  if (!manifest!.fts5_created) {
    errors.push('Manifest fts5_created = false. FTS5 search tidak tersedia.')
  }
  if (manifest!.pack_type !== 'bible') {
    errors.push(`Pack type tidak dikenali: ${manifest!.pack_type}`)
  }

  // For TB specifically — exact count validation
  if (manifest!.books !== REQUIRED_MANIFEST_BOOKS) {
    errors.push(
      `Jumlah kitab tidak sesuai: ditemukan ${manifest!.books}, expected ${REQUIRED_MANIFEST_BOOKS}.`
    )
  }
  if (manifest!.chapters !== REQUIRED_MANIFEST_CHAPTERS) {
    errors.push(
      `Jumlah pasal tidak sesuai: ditemukan ${manifest!.chapters}, expected ${REQUIRED_MANIFEST_CHAPTERS}.`
    )
  }
  if (manifest!.verses !== REQUIRED_MANIFEST_VERSES) {
    errors.push(
      `Jumlah ayat tidak sesuai: ditemukan ${manifest!.verses}, expected ${REQUIRED_MANIFEST_VERSES}.`
    )
  }
  if (!Array.isArray(books) || books!.length !== REQUIRED_MANIFEST_BOOKS) {
    errors.push(
      `books.json berisi ${books?.length ?? 0} kitab, expected ${REQUIRED_MANIFEST_BOOKS}.`
    )
  }

  // Derive a stable packId from version_code
  const stablePackId = `bible_${manifest!.version_code.toLowerCase()}`

  return {
    valid: errors.length === 0,
    errors,
    manifest: manifest!,
    importReport: importReport!,
    books: books ?? [],
    packId: stablePackId
  }
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Preview a folder to determine if it contains a valid Bible pack.
 * Returns metadata without modifying anything.
 */
export function previewBiblePackFolder(folderPath: string): BiblePackPreview {
  if (!folderPath || !existsSync(folderPath)) {
    return {
      valid: false,
      errors: ['Folder tidak ditemukan atau path tidak valid.'],
      manifest: null,
      importReport: null,
      books: [],
      packId: ''
    }
  }
  return validateBiblePackFolder(folderPath)
}

/**
 * Install a Bible pack from a source folder to userData content-packs dir.
 * Copies only essential files (sqlite, books.json, manifest.json, import_report.json).
 * Skips large files (.jsonl, .csv) that are not needed at runtime.
 */
export function installBiblePackFromFolder(folderPath: string): ContentPackRecord {
  const preview = validateBiblePackFolder(folderPath)
  if (!preview.valid || !preview.manifest) {
    throw new Error(`Validasi gagal:\n${preview.errors.join('\n')}`)
  }

  const { manifest, packId } = preview
  const sourceFiles = readdirSync(folderPath)

  const sqliteFile = sourceFiles.find((f) => f.endsWith('.sqlite'))!
  const manifestFile = sourceFiles.find((f) => f.endsWith('.manifest.json'))!
  const booksFile = sourceFiles.find((f) => f.endsWith('.books.json'))!
  const importReportFile = sourceFiles.find((f) => f.endsWith('.import_report.json'))!

  // Create target directory
  const targetDir = getBiblePackDirectory(packId)
  if (!existsSync(targetDir)) {
    mkdirSync(targetDir, { recursive: true })
  }

  // Copy essential files only (NOT .jsonl and .csv — too large, not needed at runtime)
  const filesToCopy = [sqliteFile, manifestFile, booksFile, importReportFile]
  for (const file of filesToCopy) {
    const src = join(folderPath, file)
    const dst = join(targetDir, file)
    if (existsSync(src)) {
      copyFileSync(src, dst)
      console.info(`[ContentPack] Copied: ${file}`)
    } else {
      console.warn(`[ContentPack] Source file not found, skipping: ${file}`)
    }
  }

  // Register in database
  const record = registerPack({
    pack_id: packId,
    pack_type: 'bible',
    version_code: manifest.version_code,
    name: manifest.version_name,
    short_name: manifest.short_name,
    language: manifest.language,
    publisher: manifest.publisher,
    copyright: manifest.copyright,
    license_status: manifest.license_status,
    source_type: manifest.source_type,
    source_base_url: manifest.source_base_url,
    installed_path: targetDir,
    sqlite_filename: sqliteFile,
    manifest_filename: manifestFile,
    books_filename: booksFile,
    import_report_filename: importReportFile,
    validation_ok: manifest.validation_ok,
    fts5_created: manifest.fts5_created,
    books_count: manifest.books,
    chapters_count: manifest.chapters,
    verses_count: manifest.verses
  })

  console.info(`[ContentPack] Installed pack: ${packId} → ${targetDir}`)
  return record
}

/**
 * Remove an installed pack from registry + delete its files from disk.
 */
export function removeContentPack(packId: string): boolean {
  const pack = getPackByPackId(packId)
  if (!pack) throw new Error(`Pack tidak ditemukan: ${packId}`)

  // Remove from registry
  const removed = removePackFromRegistry(packId)

  // Remove files from disk
  if (removed && existsSync(pack.installed_path)) {
    try {
      rmSync(pack.installed_path, { recursive: true, force: true })
      console.info(`[ContentPack] Removed files: ${pack.installed_path}`)
    } catch (err) {
      console.error(`[ContentPack] Failed to remove files for ${packId}:`, err)
    }
  }

  return removed
}

/**
 * List all installed content packs (optionally filtered by type).
 */
export function listInstalledPacks(packType?: ContentPackType): ContentPackRecord[] {
  return listPacks(packType)
}

/**
 * Set a pack as the default for its type.
 */
export function setDefaultContentPack(packId: string): void {
  setDefaultPack(packId)
}

/**
 * Open the installed pack folder in system file explorer.
 */
export async function openPackFolder(packId: string): Promise<void> {
  const { shell } = await import('electron')
  const pack = getPackByPackId(packId)
  if (!pack) throw new Error(`Pack tidak ditemukan: ${packId}`)
  if (!existsSync(pack.installed_path)) {
    throw new Error(`Folder pack tidak ditemukan di disk: ${pack.installed_path}`)
  }
  await shell.openPath(pack.installed_path)
}

/**
 * Scan resources/content-packs/bibles/ and auto-register valid Bible packs.
 * This runs at startup to ensure default bundled packs are registered and
 * correct paths are maintained when the installation folder moves.
 */
export function autoRegisterBundledPacks(): void {
  const biblesDir = getBundledBiblesDir()
  console.info(`[ContentPack] Scanning bundled bibles in: ${biblesDir}`)

  if (!existsSync(biblesDir)) {
    console.info('[ContentPack] No bundled bibles directory found.')
    return
  }

  try {
    const items = readdirSync(biblesDir)
    for (const item of items) {
      const fullPath = join(biblesDir, item)
      if (statSync(fullPath).isDirectory()) {
        try {
          const preview = validateBiblePackFolder(fullPath)
          if (preview.valid && preview.manifest) {
            const { manifest, packId } = preview
            const files = readdirSync(fullPath)
            const sqliteFile = files.find((f) => f.endsWith('.sqlite'))!
            const manifestFile = files.find((f) => f.endsWith('.manifest.json'))!
            const booksFile = files.find((f) => f.endsWith('.books.json'))!
            const importReportFile = files.find((f) => f.endsWith('.import_report.json'))!

            registerPack({
              pack_id: packId,
              pack_type: 'bible',
              version_code: manifest.version_code,
              name: manifest.version_name,
              short_name: manifest.short_name,
              language: manifest.language,
              publisher: manifest.publisher,
              copyright: manifest.copyright,
              license_status: manifest.license_status,
              source_type: manifest.source_type,
              source_base_url: manifest.source_base_url,
              installed_path: fullPath,
              sqlite_filename: sqliteFile,
              manifest_filename: manifestFile,
              books_filename: booksFile,
              import_report_filename: importReportFile,
              validation_ok: manifest.validation_ok,
              fts5_created: manifest.fts5_created,
              books_count: manifest.books,
              chapters_count: manifest.chapters,
              verses_count: manifest.verses
            })
            console.info(`[ContentPack] Auto-registered/updated bundled pack: ${packId}`)
          } else {
            console.warn(`[ContentPack] Invalid bundled pack folder skipped: ${item}`, preview.errors.join(', '))
          }
        } catch (packErr) {
          console.error(`[ContentPack] Error auto-registering bundled pack ${item}:`, packErr)
        }
      }
    }
  } catch (err) {
    console.error('[ContentPack] Failed to scan bundled bibles directory:', err)
  }
}

