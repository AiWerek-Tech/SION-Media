/**
 * useBiblePacks — React hook for content pack management
 *
 * Provides: list, install, remove, setDefault operations
 * for the Settings/Management > Bible Pack Manager UI.
 */

import { useState, useEffect, useCallback } from 'react'

export interface BiblePackItem {
  id: number
  pack_id: string
  version_code: string
  name: string
  short_name: string
  language: string
  publisher: string
  copyright: string
  installed_path: string
  is_active: number
  is_default: number
  validation_ok: number
  fts5_created: number
  books_count: number
  chapters_count: number
  verses_count: number
  created_at: string
  updated_at: string
}

interface UseBiblePacksReturn {
  packs: BiblePackItem[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  selectAndPreviewFolder: () => Promise<{
    folderPath: string
    preview: import('./useBiblePacks').BiblePackPreview
  } | null>
  install: (folderPath: string) => Promise<BiblePackItem>
  remove: (packId: string) => Promise<void>
  setDefault: (packId: string) => Promise<void>
}

export interface BiblePackPreview {
  valid: boolean
  errors: string[]
  packId: string
  manifest: {
    version_code: string
    version_name: string
    short_name: string
    language: string
    publisher: string
    copyright: string
    books: number
    chapters: number
    verses: number
    validation_ok: boolean
    fts5_created: boolean
  } | null
  importReport: {
    ok: boolean
    book_count: number
    chapter_count: number
    verse_count: number
    warnings: string[]
  } | null
  books: Array<{
    code: string
    name: string
    testament: 'OT' | 'NT'
    order: number
    chapters: number
  }>
}

export function useBiblePacks(): UseBiblePacksReturn {
  const [packs, setPacks] = useState<BiblePackItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await window.api.contentPacks.list('bible')
      setPacks(result as BiblePackItem[])
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Initial pack discovery is the hook's external synchronization boundary.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh()
  }, [refresh])

  const selectAndPreviewFolder = useCallback(async (): Promise<{
    folderPath: string
    preview: BiblePackPreview
  } | null> => {
    const folderPath = await window.api.contentPacks.selectFolder()
    if (!folderPath) return null
    const preview = await window.api.contentPacks.previewBiblePack(folderPath)
    return { folderPath, preview: preview as BiblePackPreview }
  }, [])

  const install = useCallback(
    async (folderPath: string): Promise<BiblePackItem> => {
      setLoading(true)
      setError(null)
      try {
        const record = await window.api.contentPacks.installBiblePack(folderPath)
        await refresh()
        return record as BiblePackItem
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        setError(msg)
        throw err
      } finally {
        setLoading(false)
      }
    },
    [refresh]
  )

  const remove = useCallback(
    async (packId: string): Promise<void> => {
      setLoading(true)
      setError(null)
      try {
        await window.api.contentPacks.remove(packId)
        await refresh()
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        setError(msg)
        throw err
      } finally {
        setLoading(false)
      }
    },
    [refresh]
  )

  const setDefault = useCallback(
    async (packId: string): Promise<void> => {
      setLoading(true)
      setError(null)
      try {
        await window.api.contentPacks.setDefault(packId)
        await refresh()
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        setError(msg)
        throw err
      } finally {
        setLoading(false)
      }
    },
    [refresh]
  )

  return { packs, loading, error, refresh, selectAndPreviewFolder, install, remove, setDefault }
}
