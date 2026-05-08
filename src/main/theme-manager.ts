/**
 * Theme Manager Module
 * Handles projection theme merging and state management
 */

let latestProjectionTheme: unknown = null

/**
 * Merge incoming theme with the latest stored theme.
 * Incoming theme takes precedence over stored values.
 */
export function mergeProjectionTheme(theme: unknown): unknown {
  let merged: unknown
  if (
    latestProjectionTheme &&
    typeof latestProjectionTheme === 'object' &&
    theme &&
    typeof theme === 'object'
  ) {
    merged = { ...latestProjectionTheme, ...theme }
  } else {
    merged = theme
  }
  latestProjectionTheme = merged
  return merged
}

/**
 * Get the current stored projection theme
 */
export function getLatestProjectionTheme(): unknown {
  return latestProjectionTheme
}

/**
 * Update the stored projection theme
 */
export function setLatestProjectionTheme(theme: unknown): void {
  latestProjectionTheme = theme
}
