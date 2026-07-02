export function formatBibleError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  const normalized = message.toLowerCase()

  if (normalized.includes('not found') || normalized.includes('enoent')) {
    return 'Paket Alkitab tidak ditemukan. Instal ulang melalui Pengaturan > Paket Alkitab.'
  }

  if (
    normalized.includes('malformed') ||
    (normalized.includes('no such table: bible_verses') &&
      !normalized.includes('bible_verses_fts')) ||
    normalized.includes('file is not a database')
  ) {
    return 'Database paket Alkitab rusak atau tidak sesuai format SION Media.'
  }

  if (normalized.includes('bible_verses_fts') || normalized.includes('fts5')) {
    return 'Indeks pencarian paket Alkitab belum tersedia.'
  }

  return 'Modul Alkitab mengalami kendala. Coba lagi atau periksa paket Alkitab di Pengaturan.'
}
