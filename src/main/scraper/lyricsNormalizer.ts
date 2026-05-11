export function normalizeLyrics(raw: string): string {
  const input = String(raw ?? '')

  // Normalize line endings
  const normalizedNewlines = input.replace(/\r\n?/g, '\n')

  // Remove problematic invisible characters that often break slide segmentation
  const stripped = normalizedNewlines.replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/\u00A0/g, ' ') // nbsp

  // Normalize Unicode (defensive; some sources include decomposed forms)
  const unicodeNormalized = stripped.normalize('NFKC')

  // Per-line cleanup (preserve stanza breaks by keeping empty lines)
  const lines = unicodeNormalized.split('\n').map((line) => {
    // Trim trailing whitespace, collapse multiple spaces within line
    const trimmedEnd = line.replace(/\s+$/g, '')
    const collapsedInner = trimmedEnd.replace(/\s{2,}/g, ' ')
    return collapsedInner
  })

  const joined = lines.join('\n')

  // Convert 3+ newlines into exactly 2 to preserve stanza breaks
  return joined.replace(/\n{3,}/g, '\n\n').trim()
}
