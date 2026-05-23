import { closeSync, existsSync, openSync, readSync, statSync } from 'fs'
import { extname, isAbsolute } from 'path'
import * as xlsx from 'xlsx'

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

function parseWithTimeout<T>(fn: () => T): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Excel parse timeout.')), PARSE_TIMEOUT_MS)
    try {
      const result = fn()
      clearTimeout(timeout)
      resolve(result)
    } catch (error) {
      clearTimeout(timeout)
      reject(error)
    }
  })
}

function normalizeCell(value: unknown): string {
  if (value == null) return ''
  return String(value).trim()
}

export async function parseExcelFile(filePath: string): Promise<ImportedExcelSong[]> {
  ensureAbsoluteXlsxPath(filePath)

  const workbook = await parseWithTimeout(() =>
    xlsx.readFile(filePath, {
      type: 'buffer',
      cellFormula: false,
      cellHTML: false,
      cellNF: false,
      cellStyles: false,
      sheetStubs: false
    })
  )

  if (workbook.SheetNames.length === 0) {
    throw new Error('No sheets found in the Excel file.')
  }

  const worksheet = workbook.Sheets[workbook.SheetNames[0]]
  if (!worksheet) {
    throw new Error('Unable to read the first sheet from the Excel file.')
  }

  const range = xlsx.utils.decode_range(worksheet['!ref'] || 'A1')
  const rowCount = range.e.r - range.s.r + 1
  const colCount = range.e.c - range.s.c + 1

  if (rowCount > MAX_ROWS) {
    throw new Error(`Too many rows. Maximum is ${MAX_ROWS} rows.`)
  }
  if (colCount > MAX_COLS) {
    throw new Error(`Too many columns. Maximum is ${MAX_COLS} columns.`)
  }

  const jsonData = xlsx.utils.sheet_to_json<Record<string, string | number>>(worksheet, {
    defval: '',
    raw: false
  })

  return jsonData.map((row) => ({
    hymnal_id: Number(row['hymnal_id'] || 0) || 0,
    number: normalizeCell(row['Nomor'] || row['number']),
    title: normalizeCell(row['Judul'] || row['title']),
    lyrics_raw: normalizeCell(row['Lirik'] || row['lyrics_raw']),
    category: normalizeCell(row['Kategori'] || row['category']),
    language: normalizeCell(row['Bahasa'] || row['language'] || 'Indonesia'),
    author: normalizeCell(row['Penulis'] || row['author']),
    composer: normalizeCell(row['Komposer'] || row['composer']),
    key_note: normalizeCell(row['Nada Dasar'] || row['key_note']),
    tempo: normalizeCell(row['Tempo'] || row['tempo']),
    tags: normalizeCell(row['Tags'] || row['tags'])
  }))
}
