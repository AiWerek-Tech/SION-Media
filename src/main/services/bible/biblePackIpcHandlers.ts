/**
 * Bible Pack IPC Handlers
 *
 * Registers IPC handlers for external SQLite Bible pack queries.
 * Called from setupIPC() in ipc-handlers.ts.
 */

import { ipcMain } from 'electron'
import { IPC_BIBLE_PACK } from '@shared/ipc-channels'
import { requireMainWindowSender } from '../../ipc-sender-policy'
import {
  getBibleVersions,
  getBibleBooks,
  getBibleChapter,
  getBibleVerseRange,
  searchBibleVerses,
  parseReference
} from '../bible'

function toSafeError(channel: string, err: unknown): never {
  const msg = err instanceof Error ? err.message : String(err)
  throw new Error(`[${channel}] ${msg.slice(0, 240)}`)
}

function ensureString(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${field} harus berupa string non-kosong.`)
  }
  return value.trim()
}

function ensurePositiveInt(value: unknown, field: string): number {
  const n = Number(value)
  if (!Number.isInteger(n) || n < 1) {
    throw new Error(`${field} harus berupa bilangan bulat positif.`)
  }
  return n
}

export function setupBiblePackIPC(): void {
  // List all installed bible versions (from registry)
  ipcMain.handle(IPC_BIBLE_PACK.GET_VERSIONS, (event) => {
    requireMainWindowSender(event, IPC_BIBLE_PACK.GET_VERSIONS)
    try {
      return getBibleVersions()
    } catch (err) {
      toSafeError(IPC_BIBLE_PACK.GET_VERSIONS, err)
    }
  })

  // Get all books for a version
  ipcMain.handle(IPC_BIBLE_PACK.GET_BOOKS, (_event, versionCode: unknown) => {
    requireMainWindowSender(_event, IPC_BIBLE_PACK.GET_BOOKS)
    try {
      const code = ensureString(versionCode, 'versionCode')
      return getBibleBooks(code)
    } catch (err) {
      toSafeError(IPC_BIBLE_PACK.GET_BOOKS, err)
    }
  })

  // Get all verses of a chapter
  ipcMain.handle(
    IPC_BIBLE_PACK.GET_CHAPTER,
    (_event, versionCode: unknown, bookCode: unknown, chapter: unknown) => {
      requireMainWindowSender(_event, IPC_BIBLE_PACK.GET_CHAPTER)
      try {
        const vc = ensureString(versionCode, 'versionCode')
        const bc = ensureString(bookCode, 'bookCode')
        const ch = ensurePositiveInt(chapter, 'chapter')
        return getBibleChapter(vc, bc, ch)
      } catch (err) {
        toSafeError(IPC_BIBLE_PACK.GET_CHAPTER, err)
      }
    }
  )

  // Get a verse range
  ipcMain.handle(
    IPC_BIBLE_PACK.GET_VERSE_RANGE,
    (
      _event,
      versionCode: unknown,
      bookCode: unknown,
      chapter: unknown,
      verseStart: unknown,
      verseEnd: unknown
    ) => {
      requireMainWindowSender(_event, IPC_BIBLE_PACK.GET_VERSE_RANGE)
      try {
        const vc = ensureString(versionCode, 'versionCode')
        const bc = ensureString(bookCode, 'bookCode')
        const ch = ensurePositiveInt(chapter, 'chapter')
        const vs = ensurePositiveInt(verseStart, 'verseStart')
        const ve = ensurePositiveInt(verseEnd, 'verseEnd')
        if (ve < vs) throw new Error('verseEnd tidak boleh lebih kecil dari verseStart.')
        return getBibleVerseRange(vc, bc, ch, vs, ve)
      } catch (err) {
        toSafeError(IPC_BIBLE_PACK.GET_VERSE_RANGE, err)
      }
    }
  )

  // FTS5 search
  ipcMain.handle(
    IPC_BIBLE_PACK.SEARCH,
    (_event, versionCode: unknown, query: unknown, limit?: unknown) => {
      requireMainWindowSender(_event, IPC_BIBLE_PACK.SEARCH)
      try {
        const vc = ensureString(versionCode, 'versionCode')
        const q = ensureString(query, 'query')
        const lim = limit !== undefined && limit !== null ? Number(limit) : 50
        if (!Number.isInteger(lim) || lim < 1 || lim > 200) {
          throw new Error('limit harus antara 1 dan 200.')
        }
        return searchBibleVerses(vc, q, lim)
      } catch (err) {
        toSafeError(IPC_BIBLE_PACK.SEARCH, err)
      }
    }
  )

  // Parse a Bible reference string
  ipcMain.handle(IPC_BIBLE_PACK.PARSE_REFERENCE, (_event, referenceStr: unknown) => {
    requireMainWindowSender(_event, IPC_BIBLE_PACK.PARSE_REFERENCE)
    try {
      const ref = ensureString(referenceStr, 'referenceStr')
      return parseReference(ref)
    } catch (err) {
      toSafeError(IPC_BIBLE_PACK.PARSE_REFERENCE, err)
    }
  })
}
