/**
 * Metadata Validation Utilities
 * Enforces GMAHK musical notation standards for Key Note and Tempo.
 */

export type KeyNote = string
export type TempoBPM = number | null

/**
 * Validates key note format: A-G + optional accidental (#/b) + optional minor (m)
 * Examples of valid input: C, G, Ab, F#, Am, Dbm
 */
export function validateKeyNote(value: string): { valid: boolean; message?: string } {
  const trimmed = value.trim()
  if (!trimmed) return { valid: true } // empty is allowed (optional field)

  const regex = /^[A-Ga-g][#b]?m?$/
  if (!regex.test(trimmed)) {
    return {
      valid: false,
      message:
        'Format nada dasar tidak valid. Gunakan: A-G dengan opsional #/b dan m (contoh: C, G, Ab, F#, Am)'
    }
  }
  return { valid: true }
}

/**
 * Validates tempo BPM: numeric only, range 40-240
 */
export function validateTempo(value: string): { valid: boolean; message?: string } {
  const trimmed = value.trim()
  if (!trimmed) return { valid: true } // empty is allowed (optional field)

  const numeric = Number(trimmed)
  if (Number.isNaN(numeric) || !Number.isInteger(numeric)) {
    return { valid: false, message: 'Tempo harus berupa angka bulat' }
  }
  if (numeric < 40 || numeric > 240) {
    return { valid: false, message: 'Tempo harus di antara 40-240 BPM' }
  }
  return { valid: true }
}

/**
 * Formats key note to canonical form (uppercase root, lowercase accidental, lowercase m)
 * Examples: "  am  " → "Am", "f#" → "F#", "c" → "C"
 */
export function formatKeyNote(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ''
  const match = trimmed.match(/^([a-gA-G])([#b]?)(m?)$/)
  if (!match) return trimmed
  const [, root, accidental, minor] = match
  return root.toUpperCase() + accidental.toLowerCase() + minor.toLowerCase()
}

/**
 * Formats tempo to canonical integer string or empty string
 */
export function formatTempo(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ''
  const numeric = Number(trimmed)
  if (Number.isNaN(numeric)) return ''
  return String(Math.round(numeric))
}

/**
 * Combined validation result for song metadata
 */
export interface MetadataValidationResult {
  keyNote: { valid: boolean; message?: string }
  tempo: { valid: boolean; message?: string }
  allValid: boolean
}

export function validateSongMetadata(keyNote: string, tempo: string): MetadataValidationResult {
  const keyNoteResult = validateKeyNote(keyNote)
  const tempoResult = validateTempo(tempo)
  return {
    keyNote: keyNoteResult,
    tempo: tempoResult,
    allValid: keyNoteResult.valid && tempoResult.valid
  }
}
