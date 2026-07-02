export type PlaylistScheduleMode = 'anytime' | 'dated'

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

function parseIsoCalendarDate(serviceDate?: string): Date | null {
  const value = serviceDate?.trim() ?? ''
  const match = ISO_DATE_PATTERN.exec(value)
  if (!match) return null

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
    ? date
    : null
}

export function formatPlaylistSchedule(serviceDate?: string): string {
  const date = parseIsoCalendarDate(serviceDate)
  if (!date) return 'Kapan saja'

  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC'
  }).format(date)
}

export function normalizePlaylistServiceDate(
  mode: PlaylistScheduleMode,
  serviceDate?: string
): string {
  if (mode === 'anytime') return ''
  const value = serviceDate?.trim() ?? ''
  return parseIsoCalendarDate(value) ? value : ''
}

export function getPlaylistScheduleMode(serviceDate?: string): PlaylistScheduleMode {
  return parseIsoCalendarDate(serviceDate) ? 'dated' : 'anytime'
}
