/**
 * Bible Reference Parser — Indonesian
 *
 * Parses Indonesian Bible references like:
 *   "Yoh 3:16"          → { bookCode: 'yoh', chapter: 3, verseStart: 16, verseEnd: null }
 *   "Yohanes 3:16-17"   → { bookCode: 'yoh', chapter: 3, verseStart: 16, verseEnd: 17 }
 *   "Mzm 23"            → { bookCode: 'mzm', chapter: 23, verseStart: 1, verseEnd: null }
 *   "1 Kor 13:1-13"     → { bookCode: '1ko', chapter: 13, verseStart: 1, verseEnd: 13 }
 *   "Why 14:6-12"       → { bookCode: 'why', chapter: 14, verseStart: 6, verseEnd: 12 }
 */

import type { BibleParsedReference } from '@shared/types'

// ============================================================================
// Book Alias Map
// Keys: all acceptable aliases (lowercase, no spaces/dots)
// Value: canonical book code (matches books.json)
// ============================================================================

const BOOK_ALIASES: Record<string, string> = {
  // Genesis
  kej: 'kej',
  kejadian: 'kej',
  gen: 'kej',
  genesis: 'kej',
  // Exodus
  kel: 'kel',
  keluaran: 'kel',
  exo: 'kel',
  exodus: 'kel',
  // Leviticus
  ima: 'ima',
  imamat: 'ima',
  lev: 'ima',
  leviticus: 'ima',
  // Numbers
  bil: 'bil',
  bilangan: 'bil',
  num: 'bil',
  numbers: 'bil',
  // Deuteronomy
  ula: 'ula',
  ulangan: 'ula',
  deut: 'ula',
  deuteronomy: 'ula',
  // Joshua
  yos: 'yos',
  yosua: 'yos',
  josh: 'yos',
  joshua: 'yos',
  // Judges
  hak: 'hak',
  hakimhakim: 'hak',
  hak2: 'hak',
  judg: 'hak',
  judges: 'hak',
  // Ruth
  rut: 'rut',
  ruth: 'rut',
  // 1 Samuel
  '1sa': '1sa',
  '1sam': '1sa',
  '1samuel': '1sa',
  // 2 Samuel
  '2sa': '2sa',
  '2sam': '2sa',
  '2samuel': '2sa',
  // 1 Kings
  '1ra': '1ra',
  '1raj': '1ra',
  '1rajaraja': '1ra',
  '1kgs': '1ra',
  '1kings': '1ra',
  // 2 Kings
  '2ra': '2ra',
  '2raj': '2ra',
  '2rajaraja': '2ra',
  '2kgs': '2ra',
  '2kings': '2ra',
  // 1 Chronicles
  '1ta': '1ta',
  '1taw': '1ta',
  '1tawarikh': '1ta',
  '1chr': '1ta',
  '1chron': '1ta',
  // 2 Chronicles
  '2ta': '2ta',
  '2taw': '2ta',
  '2tawarikh': '2ta',
  '2chr': '2ta',
  '2chron': '2ta',
  // Ezra
  ezr: 'ezr',
  ezra: 'ezr',
  // Nehemiah
  neh: 'neh',
  nehemia: 'neh',
  nehemiah: 'neh',
  // Esther
  est: 'est',
  ester: 'est',
  esther: 'est',
  // Job
  ayb: 'ayb',
  ayub: 'ayb',
  job: 'ayb',
  // Psalms
  mzm: 'mzm',
  mazmur: 'mzm',
  maz: 'mzm',
  ps: 'mzm',
  psa: 'mzm',
  psalm: 'mzm',
  psalms: 'mzm',
  // Proverbs
  ams: 'ams',
  amsal: 'ams',
  prov: 'ams',
  proverbs: 'ams',
  // Ecclesiastes
  pkh: 'pkh',
  pengkhotbah: 'pkh',
  eccl: 'pkh',
  ecclesiastes: 'pkh',
  // Song of Songs
  kid: 'kid',
  kidungagung: 'kid',
  song: 'kid',
  // Isaiah
  yes: 'yes',
  yesaya: 'yes',
  isa: 'yes',
  isaiah: 'yes',
  // Jeremiah
  yer: 'yer',
  yeremia: 'yer',
  jer: 'yer',
  jeremiah: 'yer',
  // Lamentations
  rat: 'rat',
  ratapan: 'rat',
  lam: 'rat',
  lamentations: 'rat',
  // Ezekiel
  yeh: 'yeh',
  yehezkiel: 'yeh',
  ezek: 'yeh',
  ezekiel: 'yeh',
  // Daniel
  dan: 'dan',
  daniel: 'dan',
  // Hosea
  hos: 'hos',
  hosea: 'hos',
  // Joel
  yoe: 'yoe',
  yoel: 'yoe',
  joel: 'yoe',
  // Amos
  amo: 'amo',
  amos: 'amo',
  // Obadiah
  oba: 'oba',
  obaja: 'oba',
  obad: 'oba',
  obadiah: 'oba',
  // Jonah
  yun: 'yun',
  yunus: 'yun',
  jonah: 'yun',
  jon: 'yun',
  // Micah
  mik: 'mik',
  mikha: 'mik',
  mic: 'mik',
  micah: 'mik',
  // Nahum
  nah: 'nah',
  nahum: 'nah',
  // Habakkuk
  hab: 'hab',
  habakuk: 'hab',
  habakkuk: 'hab',
  // Zephaniah
  zef: 'zef',
  zefanya: 'zef',
  zeph: 'zef',
  zephaniah: 'zef',
  // Haggai
  hag: 'hag',
  hagai: 'hag',
  haggai: 'hag',
  // Zechariah
  zak: 'zak',
  zakharia: 'zak',
  zech: 'zak',
  zechariah: 'zak',
  // Malachi
  mal: 'mal',
  maleakhi: 'mal',
  malachi: 'mal',
  // Matthew
  mat: 'mat',
  matius: 'mat',
  matt: 'mat',
  matthew: 'mat',
  // Mark
  mrk: 'mrk',
  markus: 'mrk',
  mark: 'mrk',
  // Luke
  luk: 'luk',
  lukas: 'luk',
  luke: 'luk',
  // John
  yoh: 'yoh',
  yohanes: 'yoh',
  john: 'yoh',
  joh: 'yoh',
  // Acts
  kis: 'kis',
  kisahaparaasul: 'kis',
  acts: 'kis',
  // Romans
  rom: 'rom',
  roma: 'rom',
  romans: 'rom',
  // 1 Corinthians
  '1ko': '1ko',
  '1kor': '1ko',
  '1korintus': '1ko',
  '1cor': '1ko',
  '1corinthians': '1ko',
  // 2 Corinthians
  '2ko': '2ko',
  '2kor': '2ko',
  '2korintus': '2ko',
  '2cor': '2ko',
  '2corinthians': '2ko',
  // Galatians
  gal: 'gal',
  galatia: 'gal',
  galatians: 'gal',
  // Ephesians
  efe: 'efe',
  efesus: 'efe',
  eph: 'efe',
  ephesians: 'efe',
  // Philippians
  flp: 'flp',
  filipi: 'flp',
  phil: 'flp',
  philippians: 'flp',
  // Colossians
  kol: 'kol',
  kolose: 'kol',
  col: 'kol',
  colossians: 'kol',
  // 1 Thessalonians
  '1te': '1te',
  '1tes': '1te',
  '1tesalonika': '1te',
  '1thess': '1te',
  '1thessalonians': '1te',
  // 2 Thessalonians
  '2te': '2te',
  '2tes': '2te',
  '2tesalonika': '2te',
  '2thess': '2te',
  '2thessalonians': '2te',
  // 1 Timothy
  '1ti': '1ti',
  '1tim': '1ti',
  '1timotius': '1ti',
  '1timothy': '1ti',
  // 2 Timothy
  '2ti': '2ti',
  '2tim': '2ti',
  '2timotius': '2ti',
  '2timothy': '2ti',
  // Titus
  tit: 'tit',
  titus: 'tit',
  // Philemon
  flm: 'flm',
  filemon: 'flm',
  phlm: 'flm',
  philemon: 'flm',
  // Hebrews
  ibr: 'ibr',
  ibrani: 'ibr',
  heb: 'ibr',
  hebrews: 'ibr',
  // James
  yak: 'yak',
  yakobus: 'yak',
  jas: 'yak',
  james: 'yak',
  // 1 Peter
  '1pt': '1pt',
  '1pet': '1pt',
  '1petrus': '1pt',
  '1peter': '1pt',
  // 2 Peter
  '2pt': '2pt',
  '2pet': '2pt',
  '2petrus': '2pt',
  '2peter': '2pt',
  // 1 John
  '1yo': '1yo',
  '1yoh': '1yo',
  '1yohanes': '1yo',
  '1john': '1yo',
  '1joh': '1yo',
  // 2 John
  '2yo': '2yo',
  '2yoh': '2yo',
  '2yohanes': '2yo',
  '2john': '2yo',
  // 3 John
  '3yo': '3yo',
  '3yoh': '3yo',
  '3yohanes': '3yo',
  '3john': '3yo',
  // Jude
  yud: 'yud',
  yudas: 'yud',
  jude: 'yud',
  // Revelation
  why: 'why',
  wahyu: 'why',
  rev: 'why',
  revelation: 'why',
  wah: 'why'
}

// Book display names by code (for error messages and results)
const BOOK_NAMES: Record<string, string> = {
  kej: 'Kejadian',
  kel: 'Keluaran',
  ima: 'Imamat',
  bil: 'Bilangan',
  ula: 'Ulangan',
  yos: 'Yosua',
  hak: 'Hakim-hakim',
  rut: 'Rut',
  '1sa': '1 Samuel',
  '2sa': '2 Samuel',
  '1ra': '1 Raja-raja',
  '2ra': '2 Raja-raja',
  '1ta': '1 Tawarikh',
  '2ta': '2 Tawarikh',
  ezr: 'Ezra',
  neh: 'Nehemia',
  est: 'Ester',
  ayb: 'Ayub',
  mzm: 'Mazmur',
  ams: 'Amsal',
  pkh: 'Pengkhotbah',
  kid: 'Kidung Agung',
  yes: 'Yesaya',
  yer: 'Yeremia',
  rat: 'Ratapan',
  yeh: 'Yehezkiel',
  dan: 'Daniel',
  hos: 'Hosea',
  yoe: 'Yoel',
  amo: 'Amos',
  oba: 'Obaja',
  yun: 'Yunus',
  mik: 'Mikha',
  nah: 'Nahum',
  hab: 'Habakuk',
  zef: 'Zefanya',
  hag: 'Hagai',
  zak: 'Zakharia',
  mal: 'Maleakhi',
  mat: 'Matius',
  mrk: 'Markus',
  luk: 'Lukas',
  yoh: 'Yohanes',
  kis: 'Kisah Para Rasul',
  rom: 'Roma',
  '1ko': '1 Korintus',
  '2ko': '2 Korintus',
  gal: 'Galatia',
  efe: 'Efesus',
  flp: 'Filipi',
  kol: 'Kolose',
  '1te': '1 Tesalonika',
  '2te': '2 Tesalonika',
  '1ti': '1 Timotius',
  '2ti': '2 Timotius',
  tit: 'Titus',
  flm: 'Filemon',
  ibr: 'Ibrani',
  yak: 'Yakobus',
  '1pt': '1 Petrus',
  '2pt': '2 Petrus',
  '1yo': '1 Yohanes',
  '2yo': '2 Yohanes',
  '3yo': '3 Yohanes',
  yud: 'Yudas',
  why: 'Wahyu'
}

// ============================================================================
// Normalize & resolve
// ============================================================================

/**
 * Normalize a book name string for lookup:
 * - lowercase
 * - remove dots, dashes, extra spaces
 */
export function normalizeBookName(input: string): string {
  return input.toLowerCase().replace(/\./g, '').replace(/-/g, '').replace(/\s+/g, '').trim()
}

/**
 * Resolve a book name or alias to canonical book code.
 * Returns null if not recognized.
 */
export function resolveBookCode(bookNameOrAlias: string): string | null {
  const normalized = normalizeBookName(bookNameOrAlias)
  return BOOK_ALIASES[normalized] ?? null
}

/**
 * Get a book's display name from its code.
 */
export function getBookDisplayName(bookCode: string): string {
  return BOOK_NAMES[bookCode] ?? bookCode
}

// ============================================================================
// Main Parser
// ============================================================================

/**
 * Parse an Indonesian Bible reference string.
 *
 * Supported formats:
 *   "Yoh 3:16"            → book=yoh, ch=3, v1=16, v2=null
 *   "Yohanes 3:16-17"     → book=yoh, ch=3, v1=16, v2=17
 *   "Mzm 23"              → book=mzm, ch=23, v1=1, v2=null (full chapter)
 *   "1 Kor 13:1-13"       → book=1ko, ch=13, v1=1, v2=13
 *   "1Korintus 13:4"      → book=1ko, ch=13, v1=4, v2=null
 */
export function parseReference(input: string): BibleParsedReference {
  const raw = input.trim()
  if (!raw) {
    return {
      valid: false,
      bookCode: '',
      bookName: '',
      chapter: 0,
      verseStart: 0,
      verseEnd: null,
      error: 'Referensi kosong.'
    }
  }

  // Regex: optional number prefix + book name + chapter + optional :verse(-verse)
  // Group 1: optional leading number (1, 2, 3)
  // Group 2: book name text
  // Group 3: chapter number
  // Group 4: verse start (optional)
  // Group 5: verse end (optional)
  const pattern = /^(\d\s*)?([a-zA-Z\s]+?)\s+(\d+)(?:\s*:\s*(\d+)(?:\s*[-–]\s*(\d+))?)?$/u

  const match = raw.match(pattern)
  if (!match) {
    return {
      valid: false,
      bookCode: '',
      bookName: '',
      chapter: 0,
      verseStart: 0,
      verseEnd: null,
      error: `Format tidak dikenali: "${raw}". Contoh: "Yoh 3:16", "Mzm 23", "1 Kor 13:1-13"`
    }
  }

  const prefix = (match[1] ?? '').trim() // "1", "2", "3" or ""
  const bookRaw = (match[2] ?? '').trim() // "Kor", "Yohanes", etc.
  const chapter = parseInt(match[3], 10)
  const verseStart = match[4] ? parseInt(match[4], 10) : 1
  const verseEnd = match[5] ? parseInt(match[5], 10) : null
  const hasExplicitVerse = !!match[4]

  // Combine prefix with book name
  const bookInput = prefix ? `${prefix}${bookRaw}` : bookRaw

  const bookCode = resolveBookCode(bookInput)
  if (!bookCode) {
    return {
      valid: false,
      bookCode: '',
      bookName: bookInput,
      chapter,
      verseStart,
      verseEnd,
      error: `Kitab "${bookInput}" tidak dikenali. Coba: "Kejadian", "Kej", "Yoh", "1Kor", "Why", dll.`
    }
  }

  const bookName = getBookDisplayName(bookCode)

  if (isNaN(chapter) || chapter < 1) {
    return {
      valid: false,
      bookCode,
      bookName,
      chapter: 0,
      verseStart: 0,
      verseEnd: null,
      error: `Nomor pasal tidak valid.`
    }
  }

  if (verseEnd !== null && verseEnd < verseStart) {
    return {
      valid: false,
      bookCode,
      bookName,
      chapter,
      verseStart,
      verseEnd,
      error: `Range ayat tidak valid: ${verseStart}-${verseEnd}`
    }
  }

  return {
    valid: true,
    bookCode,
    bookName,
    chapter,
    verseStart: hasExplicitVerse ? verseStart : 1,
    verseEnd,
    error: null
  }
}
