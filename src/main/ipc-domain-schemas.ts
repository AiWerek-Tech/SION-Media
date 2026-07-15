import { z } from 'zod'

const positiveId = z.number().int().positive()
const flag = z.union([z.literal(0), z.literal(1)])
const shortText = (max: number): z.ZodString => z.string().max(max)
const requiredText = (max: number): z.ZodString => z.string().trim().min(1).max(max)

export const hymnalCreateSchema = z.object({
  code: requiredText(32),
  name: requiredText(200),
  language: shortText(80).optional(),
  region: shortText(120).optional(),
  version: shortText(80).optional(),
  publisher: shortText(200).optional(),
  is_official: flag.optional()
})

export const hymnalUpdateSchema = hymnalCreateSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'At least one hymnal field is required.')

const songFields = {
  hymnal_id: positiveId,
  number: requiredText(32),
  title: requiredText(300),
  alternate_title: shortText(300).optional(),
  lyrics_raw: shortText(2 * 1024 * 1024),
  category: shortText(120).optional(),
  language: shortText(80).optional(),
  author: shortText(200).optional(),
  composer: shortText(200).optional(),
  key_note: shortText(32).optional(),
  time_signature: shortText(32).optional(),
  tempo: shortText(32).optional(),
  tags: shortText(2_000).optional(),
  theme: shortText(120).optional(),
  scripture_reference: shortText(300).optional(),
  song_background_config: shortText(512 * 1024).optional()
}

export const songCreateSchema = z.object(songFields)
export const songUpdateSchema = z
  .object(songFields)
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'At least one song field is required.')

export const songRelationSchema = z
  .object({
    source_song_id: positiveId,
    target_song_id: positiveId,
    relation_type: shortText(40).optional()
  })
  .refine((value) => value.source_song_id !== value.target_song_id, {
    message: 'A song cannot be related to itself.'
  })

export const playlistCreateSchema = z.object({
  name: requiredText(200),
  service_date: shortText(40).optional(),
  description: shortText(10_000).optional()
})

export const playlistUpdateSchema = playlistCreateSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'At least one playlist field is required.')

export const playlistItemCreateSchema = z.object({
  playlist_id: positiveId,
  song_id: positiveId,
  section_label: shortText(160).optional()
})

export const playlistItemUpdateSchema = z
  .object({
    song_id: positiveId.optional(),
    section_label: shortText(160).optional(),
    title: shortText(300).optional(),
    notes: shortText(100_000).optional()
  })
  .refine((value) => Object.keys(value).length > 0, 'At least one playlist item field is required.')

const customSlideFields = {
  title: requiredText(300),
  content: shortText(200_000),
  slide_type: shortText(40).optional(),
  background_color: shortText(100).optional(),
  background_image: shortText(32_767).optional(),
  text_color: shortText(100).optional(),
  font_size: z.number().finite().min(8).max(400).optional(),
  display_duration: z.number().finite().min(0).max(86_400).optional(),
  is_active: flag.optional(),
  sort_order: z.number().int().min(0).max(1_000_000).optional()
}

export const customSlideCreateSchema = z.object(customSlideFields)
export const customSlideUpdateSchema = z
  .object(customSlideFields)
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'At least one slide field is required.')

export const slideGroupCreateSchema = z.object({
  name: requiredText(200),
  description: shortText(10_000).optional(),
  loop_interval: z.number().finite().min(1).max(86_400).optional(),
  is_active: flag.optional()
})

export const slideGroupUpdateSchema = slideGroupCreateSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'At least one slide group field is required.')

export function parsePositiveId(value: unknown, field = 'id'): number {
  const result = positiveId.safeParse(value)
  if (!result.success) throw new Error(`${field} must be a positive integer.`)
  return result.data
}

const mediaId = requiredText(128)
const mediaPath = requiredText(32_767)
const mediaTag = requiredText(100)
const mediaIds = z
  .array(mediaId)
  .min(1)
  .max(5_000)
  .refine((ids) => new Set(ids).size === ids.length, {
    message: 'Media IDs must be unique.'
  })

export const mediaFiltersSchema = z
  .object({
    type: z.enum(['image', 'video', 'pdf']).optional(),
    search: shortText(300).optional(),
    favoriteOnly: z.boolean().optional(),
    category: shortText(120).optional(),
    collectionId: mediaId.optional()
  })
  .optional()

export const mediaImportSchema = z.object({
  filePaths: z
    .array(mediaPath)
    .min(1)
    .max(1_000)
    .refine((paths) => new Set(paths).size === paths.length, {
      message: 'Media paths must be unique.'
    }),
  category: shortText(120).optional(),
  tags: z.array(mediaTag).max(100).optional()
})

export const presentationImportSchema = z.object({
  filePath: mediaPath.refine((value) => value.toLowerCase().endsWith('.pptx'), {
    message: 'Presentation must use the .pptx format.'
  }),
  category: shortText(120).optional(),
  outputMode: z.enum(['auto', 'pdf', 'images']).default('auto')
})

export const mediaAssetUpdateSchema = z
  .object({
    name: requiredText(300).optional(),
    category: shortText(120).optional(),
    tags: z.array(mediaTag).max(100).optional(),
    isFavorite: z.boolean().optional()
  })
  .refine((value) => Object.keys(value).length > 0, 'At least one media field is required.')

export const mediaCollectionCreateSchema = z.object({
  name: requiredText(200),
  description: shortText(10_000).optional(),
  assetIds: mediaIds.optional()
})

export const mediaCollectionUpdateSchema = z
  .object({
    name: requiredText(200).optional(),
    description: shortText(10_000).optional(),
    coverAssetId: z.union([mediaId, z.literal('')]).optional()
  })
  .refine((value) => Object.keys(value).length > 0, 'At least one collection field is required.')

export const mediaIdSchema = mediaId
export const mediaIdsSchema = mediaIds

export const mediaBulkUpdateSchema = z
  .object({
    ids: mediaIds,
    category: shortText(120).optional(),
    tags: z.array(mediaTag).max(100).optional(),
    isFavorite: z.boolean().optional()
  })
  .refine(
    (value) =>
      value.category !== undefined || value.tags !== undefined || value.isFavorite !== undefined,
    'At least one bulk update field is required.'
  )

export const bibleTranslationSchema = z.object({
  code: requiredText(32),
  name: requiredText(200),
  language: requiredText(80),
  source: shortText(500).optional(),
  is_default: flag.optional()
})

export const bibleBookSchema = z.object({
  translation_id: positiveId,
  book_number: z.number().int().min(1).max(200),
  short_name: requiredText(40),
  long_name: requiredText(120),
  testament: z.enum(['OT', 'NT']),
  chapter_count: z.number().int().min(1).max(500)
})

export const bibleVerseSchema = z.object({
  translation_id: positiveId,
  book_id: positiveId,
  chapter: z.number().int().min(1).max(500),
  verse: z.number().int().min(1).max(500),
  text: requiredText(20_000)
})

export const bibleVersesBatchSchema = z.array(bibleVerseSchema).min(1).max(50_000)

export const playlistBibleSchema = z
  .object({
    bible_version_code: requiredText(32),
    bible_version_short_name: requiredText(80),
    bible_book_code: requiredText(40),
    bible_book_name: requiredText(120),
    bible_chapter: z.number().int().min(1).max(500),
    bible_verse_start: z.number().int().min(1).max(500),
    bible_verse_end: z.number().int().min(1).max(500),
    bible_reference: requiredText(300),
    bible_text_json: requiredText(2 * 1024 * 1024).refine((value) => {
      try {
        JSON.parse(value)
        return true
      } catch {
        return false
      }
    }, 'Bible text must be valid JSON.'),
    bible_copyright: shortText(1_000).optional(),
    notes: shortText(100_000).optional()
  })
  .refine((value) => value.bible_verse_end >= value.bible_verse_start, {
    message: 'Bible verse end must not precede verse start.'
  })

export const playlistInfoSchema = z.object({
  title: requiredText(300),
  body: requiredText(200_000)
})

const jsonImportItemSchema = z.object({
  hymnal_id: positiveId.optional(),
  number: shortText(32).optional(),
  title: shortText(300).optional(),
  alternate_title: shortText(300).optional(),
  lyrics_raw: shortText(2 * 1024 * 1024).optional(),
  category: shortText(120).optional(),
  language: shortText(80).optional(),
  author: shortText(200).optional(),
  composer: shortText(200).optional(),
  key_note: shortText(32).optional(),
  time_signature: shortText(32).optional(),
  tempo: z.union([shortText(32), z.number().finite().min(0).max(1_000)]).optional(),
  tags: shortText(2_000).optional(),
  theme: shortText(120).optional(),
  scripture_reference: shortText(300).optional()
})

const conflictPolicy = z.enum(['skip', 'overwrite', 'append'])

export const songJsonImportSchema = z.object({
  items: z.array(jsonImportItemSchema).min(1).max(20_000),
  defaultHymnalId: positiveId.nullable().optional(),
  hymnalIdRemap: z.record(z.string().regex(/^\d+$/), positiveId).optional(),
  conflictPolicy: conflictPolicy.optional(),
  perItemPolicy: z.record(z.string().max(100), conflictPolicy).optional(),
  dryRun: z.boolean().optional()
})

export const songSearchSchema = z.object({
  query: shortText(80),
  hymnalId: positiveId.optional(),
  options: z
    .object({
      offset: z.number().int().min(0).max(10_000_000).optional(),
      limit: z.number().int().min(1).max(500).optional()
    })
    .optional()
})

export const excelImportRowsSchema = z
  .array(
    z.object({
      hymnal_id: z.number().int().min(0),
      number: requiredText(32),
      title: requiredText(300),
      lyrics_raw: requiredText(2 * 1024 * 1024),
      category: shortText(120),
      language: shortText(80),
      author: shortText(200),
      composer: shortText(200),
      key_note: shortText(32),
      tempo: shortText(32),
      tags: shortText(2_000)
    })
  )
  .max(5_000)
