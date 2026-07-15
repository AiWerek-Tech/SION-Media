export interface LrcLine {
  time: number // time in seconds
  text: string // clean lyric line text
}

/**
 * Parses raw LRC text or inline timestamped lyrics into a list of timestamped lines.
 * Handles multiple timestamps on the same line and formats like [01:23.45] or [01:23].
 */
export function parseLrc(text: string): LrcLine[] {
  if (!text) return []
  const lines = text.split('\n')
  const result: LrcLine[] = []

  // Regex to match timestamp tag: [mm:ss.xx] or [mm:ss]
  const timestampRegex = /\[(\d+):(\d+)(?:\.(\d+))?\]/g

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    // Extract all timestamps from this line
    const matches: { time: number; matchStr: string }[] = []
    let match: RegExpExecArray | null

    // Reset regex index
    timestampRegex.lastIndex = 0

    while ((match = timestampRegex.exec(trimmed)) !== null) {
      const min = parseInt(match[1], 10)
      const sec = parseInt(match[2], 10)
      const msPart = match[3] || '0'
      const fraction = parseFloat('0.' + msPart)
      const time = min * 60 + sec + fraction
      matches.push({ time, matchStr: match[0] })
    }

    if (matches.length > 0) {
      // Clean the text by stripping all matched timestamp tags from this line
      let cleanText = trimmed
      for (const m of matches) {
        cleanText = cleanText.replace(m.matchStr, '')
      }
      cleanText = cleanText.trim()

      for (const m of matches) {
        result.push({ time: m.time, text: cleanText })
      }
    }
  }

  // Sort by time ascending
  return result.sort((a, b) => a.time - b.time)
}

/**
 * Strips all LRC timestamps ([mm:ss.xx] or [mm:ss]) from a lyric block,
 * keeping section markers like [Bait 1] or [Chorus] intact.
 */
export function stripLrcTimestamps(text: string): string {
  if (!text) return ''
  return text.replace(/\[\d+:\d+(?:\.\d+)?\]/g, '')
}

/**
 * Checks if a lyric block contains any LRC timestamps.
 */
export function hasLrcTimestamps(text: string): boolean {
  if (!text) return false
  const timestampRegex = /\[\d+:\d+(?:\.\d+)?\]/
  return timestampRegex.test(text)
}
