import type { OpenDialogOptions, SaveDialogOptions } from 'electron'

export function requireBoundedString(
  value: unknown,
  field: string,
  maxLength: number,
  allowEmpty = false
): string {
  if (typeof value !== 'string') throw new Error(`${field} must be a string.`)
  if (!allowEmpty && value.trim().length === 0) throw new Error(`${field} is required.`)
  if (value.length > maxLength) throw new Error(`${field} exceeds ${maxLength} characters.`)
  return value
}

export function requireSerializableSize(value: unknown, field: string, maxBytes: number): void {
  let serialized: string
  try {
    serialized = JSON.stringify(value)
  } catch {
    throw new Error(`${field} must be JSON serializable.`)
  }
  if (serialized === undefined) throw new Error(`${field} must be JSON serializable.`)
  if (Buffer.byteLength(serialized, 'utf8') > maxBytes) {
    throw new Error(`${field} exceeds ${maxBytes} bytes.`)
  }
}

export function validateSettingPayload(
  key: unknown,
  value: unknown
): { key: string; value: string } {
  const safeKey = requireBoundedString(key, 'Setting key', 80)
  if (!/^[a-zA-Z0-9_.:-]+$/.test(safeKey))
    throw new Error('Setting key contains invalid characters.')
  const safeValue = requireBoundedString(value, 'Setting value', 65_536, true)
  return { key: safeKey, value: safeValue }
}

export function validateReorderPayload(value: unknown): Array<{ id: number; sort_order: number }> {
  if (!Array.isArray(value) || value.length > 5_000) {
    throw new Error('Reorder payload must contain at most 5000 items.')
  }
  const ids = new Set<number>()
  return value.map((entry) => {
    if (!entry || typeof entry !== 'object') throw new Error('Invalid reorder item.')
    const raw = entry as Record<string, unknown>
    if (!Number.isInteger(raw.id) || Number(raw.id) <= 0) throw new Error('Invalid reorder id.')
    if (!Number.isInteger(raw.sort_order) || Number(raw.sort_order) < 0) {
      throw new Error('Invalid reorder position.')
    }
    const id = Number(raw.id)
    if (ids.has(id)) throw new Error('Duplicate reorder id.')
    ids.add(id)
    return { id, sort_order: Number(raw.sort_order) }
  })
}

const OPEN_PROPERTIES = new Set<NonNullable<OpenDialogOptions['properties']>[number]>([
  'openFile',
  'openDirectory',
  'multiSelections',
  'showHiddenFiles',
  'createDirectory',
  'promptToCreate',
  'noResolveAliases',
  'treatPackageAsDirectory',
  'dontAddToRecent'
])

function sanitizeFilters(
  value: unknown
): Array<{ name: string; extensions: string[] }> | undefined {
  if (value === undefined) return undefined
  if (!Array.isArray(value) || value.length > 20) throw new Error('Invalid dialog filters.')
  return value.map((filter) => {
    if (!filter || typeof filter !== 'object') throw new Error('Invalid dialog filter.')
    const raw = filter as Record<string, unknown>
    const name = requireBoundedString(raw.name, 'Filter name', 80)
    if (!Array.isArray(raw.extensions) || raw.extensions.length > 30) {
      throw new Error('Invalid dialog extensions.')
    }
    const extensions = raw.extensions.map((extension) => {
      const safe = requireBoundedString(extension, 'File extension', 20)
      if (safe !== '*' && !/^[a-zA-Z0-9]+$/.test(safe)) throw new Error('Invalid file extension.')
      return safe
    })
    return { name, extensions }
  })
}

export function sanitizeOpenDialogOptions(value: unknown): OpenDialogOptions {
  const raw = value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
  const properties = Array.isArray(raw.properties)
    ? raw.properties.map((property) => {
        if (typeof property !== 'string' || !OPEN_PROPERTIES.has(property as never)) {
          throw new Error('Invalid open dialog property.')
        }
        return property as NonNullable<OpenDialogOptions['properties']>[number]
      })
    : undefined
  return {
    title:
      raw.title === undefined ? undefined : requireBoundedString(raw.title, 'Dialog title', 160),
    defaultPath:
      raw.defaultPath === undefined
        ? undefined
        : requireBoundedString(raw.defaultPath, 'Default path', 32_767),
    buttonLabel:
      raw.buttonLabel === undefined
        ? undefined
        : requireBoundedString(raw.buttonLabel, 'Button label', 80),
    filters: sanitizeFilters(raw.filters),
    properties
  }
}

export function sanitizeSaveDialogOptions(value: unknown): SaveDialogOptions {
  const raw = value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
  return {
    title:
      raw.title === undefined ? undefined : requireBoundedString(raw.title, 'Dialog title', 160),
    defaultPath:
      raw.defaultPath === undefined
        ? undefined
        : requireBoundedString(raw.defaultPath, 'Default path', 32_767),
    buttonLabel:
      raw.buttonLabel === undefined
        ? undefined
        : requireBoundedString(raw.buttonLabel, 'Button label', 80),
    filters: sanitizeFilters(raw.filters),
    showsTagField: typeof raw.showsTagField === 'boolean' ? raw.showsTagField : undefined
  }
}
