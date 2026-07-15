import { opendir, stat } from 'fs/promises'
import { basename, extname, isAbsolute, join } from 'path'

const MAX_DIRECTORY_ENTRIES = 50_000
const YIELD_EVERY_ENTRIES = 250
const AUDIO_EXTENSIONS = new Set(['.mp3', '.wav', '.m4a', '.ogg'])
const CODES_PATTERN =
  '(KIDUNGJEMAAT|KIDUNG|KJ|NYANYIKANLAHKIDUNGBARU|NKB|PELENGKAPKIDUNGJEMAAT|PKJ|LAGUSION|LS|LSEL|LAGUSIONEDISILENGKAP|KPPK)'
const CODE_FIRST_PATTERN = new RegExp(
  `(?:^|[^a-zA-Z])${CODES_PATTERN}[-_\\s]*0*(\\d+)(?:[^0-9]|$)`,
  'i'
)
const NUMBER_FIRST_PATTERN = new RegExp(
  `(?:^|[^0-9])0*(\\d+)[-_\\s]*${CODES_PATTERN}(?:[^a-zA-Z]|$)`,
  'i'
)

export interface InstrumentScanResult {
  hymnalCode: string
  number: number
  filePath: string
}

function normalizeHymnalCode(code: string): string {
  if (['KIDUNGJEMAAT', 'KIDUNG', 'KJ'].includes(code)) return 'KJ'
  if (['NYANYIKANLAHKIDUNGBARU', 'NKB'].includes(code)) return 'NKB'
  if (['PELENGKAPKIDUNGJEMAAT', 'PKJ'].includes(code)) return 'PKJ'
  if (['LAGUSION', 'LS', 'LSEL', 'LAGUSIONEDISILENGKAP'].includes(code)) return 'LSEL'
  return code
}

export function parseInstrumentFilename(
  filename: string
): Omit<InstrumentScanResult, 'filePath'> | null {
  const extension = extname(filename).toLowerCase()
  if (!AUDIO_EXTENSIONS.has(extension)) return null
  const name = basename(filename, extension).trim()
  const codeFirst = name.match(CODE_FIRST_PATTERN)
  const numberFirst = codeFirst ? null : name.match(NUMBER_FIRST_PATTERN)
  const code = (codeFirst?.[1] ?? numberFirst?.[2] ?? '').toUpperCase()
  const numberText = codeFirst?.[2] ?? numberFirst?.[1] ?? ''
  const number = Number(numberText)
  if (!code || !Number.isSafeInteger(number) || number <= 0) return null
  return { hymnalCode: normalizeHymnalCode(code), number }
}

function yieldToEventLoop(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve))
}

export async function scanInstrumentFolder(folderPath: string): Promise<InstrumentScanResult[]> {
  if (!isAbsolute(folderPath)) throw new Error('Instrument folder path must be absolute.')
  const folderStat = await stat(folderPath)
  if (!folderStat.isDirectory()) throw new Error('Instrument path is not a directory.')

  const directory = await opendir(folderPath)
  const results: InstrumentScanResult[] = []
  let entryCount = 0
  try {
    for await (const entry of directory) {
      entryCount += 1
      if (entryCount > MAX_DIRECTORY_ENTRIES) {
        throw new Error('Folder contains too many entries. Maximum is 50,000.')
      }
      if (entryCount % YIELD_EVERY_ENTRIES === 0) await yieldToEventLoop()
      if (!entry.isFile()) continue
      const parsed = parseInstrumentFilename(entry.name)
      if (!parsed) continue
      results.push({ ...parsed, filePath: join(folderPath, entry.name) })
    }
  } finally {
    await directory.close().catch(() => undefined)
  }
  return results
}
