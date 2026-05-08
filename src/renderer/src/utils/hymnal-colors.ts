/**
 * Hymnal Color Utility
 * Generates deterministic unique accent colors for each hymnal collection.
 */

/** Known hymnal color palette — curated for dark backgrounds */
const HYMNAL_COLORS: Record<string, string> = {
  LS: 'hsl(215, 72%, 56%)', // Royal Blue
  SDAH: 'hsl(270, 60%, 58%)', // Amethyst Purple
  PK: 'hsl(340, 65%, 55%)', // Rose Pink
  LG: 'hsl(160, 55%, 45%)', // Emerald Teal
  LPMI: 'hsl(35, 80%, 50%)', // Amber Gold
  LST: 'hsl(190, 60%, 48%)', // Cyan
  SS: 'hsl(50, 70%, 50%)' // Warm Yellow
}

/**
 * Returns a CSS color string for a given hymnal code.
 * Known codes get curated colors; unknown codes get deterministic HSL from hash.
 */
export function getHymnalColor(code: string): string {
  if (HYMNAL_COLORS[code]) return HYMNAL_COLORS[code]

  // Deterministic fallback: hash code to a hue value
  let hash = 0
  for (const char of code) {
    hash = char.charCodeAt(0) + ((hash << 5) - hash)
  }
  const hue = Math.abs(hash) % 360
  return `hsl(${hue}, 58%, 52%)`
}

/**
 * Returns a softer background-friendly version of the hymnal color (lower opacity).
 */
export function getHymnalBgColor(code: string): string {
  const color = getHymnalColor(code)
  // Convert to a CSS color with alpha
  return color.replace('hsl(', 'hsla(').replace(')', ', 0.15)')
}

/**
 * Returns a border-friendly version of the hymnal color.
 */
export function getHymnalBorderColor(code: string): string {
  const color = getHymnalColor(code)
  return color.replace('hsl(', 'hsla(').replace(')', ', 0.35)')
}
