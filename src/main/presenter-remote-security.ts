export interface AuthRateLimitResult {
  allowed: boolean
  retryAfterSeconds: number
}

interface AttemptState {
  failures: number[]
  blockedUntil: number
}

export class AuthRateLimiter {
  private readonly attempts = new Map<string, AttemptState>()

  constructor(
    private readonly maxFailures = 8,
    private readonly windowMs = 60_000,
    private readonly blockMs = 5 * 60_000
  ) {}

  check(key: string, now = Date.now()): AuthRateLimitResult {
    const state = this.attempts.get(key)
    if (!state || state.blockedUntil <= now) {
      if (state?.blockedUntil) this.attempts.delete(key)
      return { allowed: true, retryAfterSeconds: 0 }
    }
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((state.blockedUntil - now) / 1000))
    }
  }

  recordFailure(key: string, now = Date.now()): AuthRateLimitResult {
    const cutoff = now - this.windowMs
    const previous = this.attempts.get(key)
    const failures = (previous?.failures ?? []).filter((timestamp) => timestamp > cutoff)
    failures.push(now)
    const blockedUntil = failures.length >= this.maxFailures ? now + this.blockMs : 0
    this.attempts.set(key, { failures, blockedUntil })
    return this.check(key, now)
  }

  recordSuccess(key: string): void {
    this.attempts.delete(key)
  }

  clear(): void {
    this.attempts.clear()
  }
}
