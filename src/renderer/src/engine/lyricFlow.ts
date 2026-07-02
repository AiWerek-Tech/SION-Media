const LYRIC_LINE_SEPARATOR = '\uE000'

/**
 * Preserve semantic lyric-line boundaries while the wrapping algorithm estimates
 * slide capacity. The private marker stays attached to the final word, so an
 * automatically wrapped long line never receives a false semicolon.
 */
export function markLyricLineSeparators(lines: string[]): string[] {
  const nonEmptyIndexes = lines.flatMap((line, index) => (line.trim() ? [index] : []))
  const lastLineIndex = nonEmptyIndexes.at(-1)

  return lines.map((line, index) => {
    if (!line.trim()) return line
    const withoutTrailingSeparator = line.replace(/\s*;+\s*$/, '')
    return index === lastLineIndex
      ? withoutTrailingSeparator
      : `${withoutTrailingSeparator}${LYRIC_LINE_SEPARATOR}`
  })
}

/** Convert a slide chunk into flowing prose without leaving terminal punctuation. */
export function formatLyricChunk(chunk: string[]): string {
  return chunk
    .join(' ')
    .replaceAll(LYRIC_LINE_SEPARATOR, '; ')
    .replace(/\s+/g, ' ')
    .replace(/;\s*$/, '')
    .trim()
}
