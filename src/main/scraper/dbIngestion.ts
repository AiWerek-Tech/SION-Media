import type { ScrapedSong, ScraperConflictPolicy } from './types'
import { importSongsFromJson } from '../database'

export function importScrapedSongs(params: {
  items: ScrapedSong[]
  targetHymnalId: number
  conflictPolicy: ScraperConflictPolicy
  perItemPolicy?: Record<string, 'skip' | 'overwrite' | 'append'>
  dryRun?: boolean
}): ReturnType<typeof importSongsFromJson> {
  const conflictPolicyForDb = params.conflictPolicy === 'overwrite' ? 'overwrite' : 'skip'

  return importSongsFromJson({
    items: params.items.map((s) => ({
      hymnal_id: params.targetHymnalId,
      number: s.sourceSongNumber,
      title: s.title,
      lyrics_raw: s.lyrics_raw,
      author: s.author,
      composer: s.composer,
      key_note: s.key_note,
      time_signature: s.time_signature,
      category: s.category,
      tags: s.tags
    })),
    defaultHymnalId: params.targetHymnalId,
    conflictPolicy: conflictPolicyForDb,
    perItemPolicy: params.perItemPolicy,
    dryRun: params.dryRun
  })
}
