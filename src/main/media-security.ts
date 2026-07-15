import { realpathSync, statSync } from 'fs'
import { fileURLToPath } from 'url'

export interface ByteRange {
  start: number
  end: number
}

export function parseSingleByteRange(header: string, fileSize: number): ByteRange | null {
  if (!Number.isSafeInteger(fileSize) || fileSize <= 0) return null

  const match = /^bytes=(\d*)-(\d*)$/i.exec(header.trim())
  if (!match || (!match[1] && !match[2])) return null

  if (!match[1]) {
    const suffixLength = Number(match[2])
    if (!Number.isSafeInteger(suffixLength) || suffixLength <= 0) return null
    return { start: Math.max(0, fileSize - suffixLength), end: fileSize - 1 }
  }

  const start = Number(match[1])
  const requestedEnd = match[2] ? Number(match[2]) : fileSize - 1
  if (
    !Number.isSafeInteger(start) ||
    !Number.isSafeInteger(requestedEnd) ||
    start < 0 ||
    start >= fileSize ||
    requestedEnd < start
  ) {
    return null
  }

  return { start, end: Math.min(requestedEnd, fileSize - 1) }
}

function toFilesystemPath(value: string): string {
  if (/^file:/i.test(value)) return fileURLToPath(value)
  return value
}

function canonicalRegularFile(value: string): string | null {
  try {
    const canonicalPath = realpathSync.native(toFilesystemPath(value))
    return statSync(canonicalPath).isFile() ? canonicalPath : null
  } catch {
    return null
  }
}

export function resolveAuthorizedMediaPath(
  requestedPath: string,
  publishedPaths: ReadonlyArray<string | null | undefined>
): string | null {
  if (!requestedPath) return null
  const requestedCanonical = canonicalRegularFile(requestedPath)
  if (!requestedCanonical) return null

  for (const publishedPath of publishedPaths) {
    if (!publishedPath) continue
    const publishedCanonical = canonicalRegularFile(publishedPath)
    if (publishedCanonical === requestedCanonical) return requestedCanonical
  }
  return null
}
