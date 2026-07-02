import { closeSync, existsSync, openSync, readSync, statSync } from 'fs'
import { extname, isAbsolute } from 'path'
import { readSheet, type CellValue, type SheetData } from 'read-excel-file/node'

const ALLOWED_EXTENSIONS = ['.xlsx']
const MAX_FILE_SIZE_MB = 10
const MAX_ROWS = 5000
const MAX_COLS = 50
const XLSX_SIGNATURES = [
  Buffer.from([0x50, 0x4b, 0x03, 0x04]),
  Buffer.from([0x50, 0x4b, 0x05, 0x06]),
  Buffer.from([0x50, 0x4b, 0x07, 0x08])
]
const PARSE_TIMEOUT_MS = 30_000

export type ImportedExcelSong = {
  hymnal_id: number
  number: string
  title: string
  lyrics_raw: string
  category: string
  language: string
  author: string
  composer: string
  key_note: string
  tempo: string
  tags: string
}

function ensureAbsoluteXlsxPath(filePath: string): void {
  if (typeof filePath !== 'string' || filePath.trim().length === 0) {
    throw new Error('Invalid file path.')
  }

  const normalizedPath = filePath.trim()
  if (!isAbsolute(normalizedPath)) {
    throw new Error('Excel path must be absolute.')
  }

  if (!existsSync(normalizedPath)) {
    throw new Error('Excel file does not exist.')
  }

  const extension = extname(normalizedPath).toLowerCase()
  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    throw new Error(`File type not allowed. Only ${ALLOWED_EXTENSIONS.join(', ')} are supported.`)
  }

  const stats = statSync(normalizedPath)
  const fileSizeMB = stats.size / (1024 * 1024)
  if (fileSizeMB > MAX_FILE_SIZE_MB) {
    throw new Error(`File too large. Maximum size is ${MAX_FILE_SIZE_MB}MB.`)
  }

  const fd = openSync(normalizedPath, 'r')
  try {
    const header = Buffer.alloc(4)
    readSync(fd, header, 0, 4, 0)
    const isZip = XLSX_SIGNATURES.some((expected) => header.equals(expected))
    if (!isZip) {
      throw new Error('Excel file is not a valid ZIP archive.')
    }
  } finally {
    closeSync(fd)
  }
}

async function withTimeout<T>(promise: Promise<T>): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new Error('Excel parse timeout.')), PARSE_TIMEOUT_MS)
      })
    ])
  } finally {
    if (timeout) clearTimeout(timeout)
  }
}

function normalizeCell(value: unknown): string {
  if (value == null) return ''
  if (value instanceof Date) return value.toISOString()
  return String(value).trim()
}

function normalizeHeader(value: CellValue | null): string {
  return normalizeCell(value).toLocaleLowerCase('id-ID')
}

export function mapExcelRows(rows: SheetData): ImportedExcelSong[] {
  if (rows.length === 0) throw new Error('No rows found in the first sheet.')
  if (rows.length > MAX_ROWS + 1) {
    throw new Error(`Too many rows. Maximum is ${MAX_ROWS} rows.`)
  }

  const headers = rows[0] ?? []
  if (headers.length > MAX_COLS) {
    throw new Error(`Too many columns. Maximum is ${MAX_COLS} columns.`)
  }

  const indexes = new Map<string, number>()
  headers.forEach((header, index) => {
    const normalized = normalizeHeader(header)
    if (normalized && !indexes.has(normalized)) indexes.set(normalized, index)
  })

  const getCell = (
    row: readonly (CellValue | null)[],
    aliases: string[]
  ): CellValue | null | undefined => {
    for (const alias of aliases) {
      const index = indexes.get(alias.toLocaleLowerCase('id-ID'))
      if (index !== undefined) return row[index]
    }
    return undefined
  }

  return rows
    .slice(1)
    .filter((row) => row.some((cell) => normalizeCell(cell).length > 0))
    .map((row) => ({
      hymnal_id: Number(getCell(row, ['hymnal_id']) ?? 0) || 0,
      number: normalizeCell(getCell(row, ['Nomor', 'number'])),
      title: normalizeCell(getCell(row, ['Judul', 'title'])),
      lyrics_raw: normalizeCell(getCell(row, ['Lirik', 'lyrics_raw'])),
      category: normalizeCell(getCell(row, ['Kategori', 'category'])),
      language: normalizeCell(getCell(row, ['Bahasa', 'language'])) || 'Indonesia',
      author: normalizeCell(getCell(row, ['Penulis', 'author'])),
      composer: normalizeCell(getCell(row, ['Komposer', 'composer'])),
      key_note: normalizeCell(getCell(row, ['Nada Dasar', 'key_note'])),
      tempo: normalizeCell(getCell(row, ['Tempo', 'tempo'])),
      tags: normalizeCell(getCell(row, ['Tags', 'tags']))
    }))
}

export async function parseExcelFile(filePath: string): Promise<ImportedExcelSong[]> {
  ensureAbsoluteXlsxPath(filePath)

  const rows = await withTimeout(readSheet(filePath, { trim: true }))
  return mapExcelRows(rows)
}
