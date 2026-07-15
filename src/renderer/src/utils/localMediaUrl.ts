/**
 * Build a URL for Electron's local-media protocol without letting characters
 * such as #, %, ? or non-ASCII file names change the parsed resource path.
 */
export function toLocalMediaUrl(path?: string): string {
  if (!path) return ''
  if (/^(?:https?:|data:|blob:|local-media:)/i.test(path)) return path

  const withoutFileScheme = path.replace(/^file:\/\/\/?/i, '')
  const normalized = withoutFileScheme.replace(/\\/g, '/').replace(/^\/+/, '')
  const encodedPath = normalized
    .split('/')
    .map((segment, index) =>
      index === 0 && /^[a-zA-Z]:$/.test(segment) ? segment : encodeURIComponent(segment)
    )
    .join('/')

  return `local-media:///${encodedPath}`
}
