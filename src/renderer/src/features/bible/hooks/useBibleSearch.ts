/**
 * useBibleSearch — FTS5 full-text search + reference parsing hook
 */

import { useState, useCallback, useRef } from 'react'
import { formatBibleError } from '../utils/bibleErrors'

export interface BibleSearchResult {
  book_code: string
  book_name: string
  chapter: number
  verse: number
  text: string
  snippet: string
}

export interface BibleParsedRef {
  valid: boolean
  bookCode: string
  bookName: string
  chapter: number
  verseStart: number
  verseEnd: number | null
  error: string | null
}

interface UseBibleSearchReturn {
  query: string
  results: BibleSearchResult[]
  parsedRef: BibleParsedRef | null
  isSearching: boolean
  error: string | null
  setQuery: (q: string) => void
  search: (versionCode: string, currentQuery?: string) => Promise<void>
  clearSearch: () => void
}

export function useBibleSearch(): UseBibleSearchReturn {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<BibleSearchResult[]>([])
  const [parsedRef, setParsedRef] = useState<BibleParsedRef | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const search = useCallback(
    async (versionCode: string, currentQuery?: string): Promise<void> => {
      const trimmed = (currentQuery ?? query).trim()
      if (!trimmed || !versionCode) return
      if (currentQuery !== undefined) setQuery(currentQuery)

      // Cancel previous search
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      setIsSearching(true)
      setError(null)
      setResults([])
      setParsedRef(null)

      try {
        // Try reference parse first
        const ref = await window.api.biblePack.parseReference(trimmed)
        const parsedResult = ref as BibleParsedRef

        if (parsedResult.valid) {
          setParsedRef(parsedResult)
          const range = await window.api.biblePack.getVerseRange(
            versionCode,
            parsedResult.bookCode,
            parsedResult.chapter,
            parsedResult.verseStart,
            parsedResult.verseEnd ?? 999
          )
          if (!controller.signal.aborted) {
            setResults(
              (range as Array<Omit<BibleSearchResult, 'snippet'>>).map((verse) => ({
                ...verse,
                snippet: verse.text
              }))
            )
          }
        } else {
          // Keyword search only
          const searchResults = await window.api.biblePack.search(versionCode, trimmed, 50)
          if (!controller.signal.aborted) {
            setResults(searchResults as BibleSearchResult[])
          }
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(formatBibleError(err))
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsSearching(false)
        }
      }
    },
    [query]
  )

  const clearSearch = useCallback(() => {
    abortRef.current?.abort()
    setQuery('')
    setResults([])
    setParsedRef(null)
    setError(null)
    setIsSearching(false)
  }, [])

  return {
    query,
    results,
    parsedRef,
    isSearching,
    error,
    setQuery,
    search,
    clearSearch
  }
}
