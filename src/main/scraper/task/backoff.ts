export function computeBackoffMs(baseDelayMs: number, attempt: number): number {
  const base = Math.max(0, baseDelayMs)
  const a = Math.max(0, attempt)
  const jitter = Math.floor(Math.random() * 150)
  return base + Math.min(30_000, Math.pow(2, a) * 250 + jitter)
}
