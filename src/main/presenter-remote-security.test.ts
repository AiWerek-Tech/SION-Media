import { describe, expect, it } from 'vitest'
import { AuthRateLimiter } from './presenter-remote-security'

describe('AuthRateLimiter', () => {
  it('blocks repeated failures and reports a retry delay', () => {
    const limiter = new AuthRateLimiter(3, 1_000, 5_000)
    expect(limiter.recordFailure('device', 100).allowed).toBe(true)
    expect(limiter.recordFailure('device', 200).allowed).toBe(true)
    const blocked = limiter.recordFailure('device', 300)
    expect(blocked.allowed).toBe(false)
    expect(blocked.retryAfterSeconds).toBe(5)
    expect(limiter.check('device', 4_000).allowed).toBe(false)
    expect(limiter.check('device', 5_301).allowed).toBe(true)
  })

  it('clears failure history after successful authentication', () => {
    const limiter = new AuthRateLimiter(2, 1_000, 5_000)
    limiter.recordFailure('device', 100)
    limiter.recordSuccess('device')
    expect(limiter.recordFailure('device', 200).allowed).toBe(true)
  })

  it('isolates attempts by client address', () => {
    const limiter = new AuthRateLimiter(1, 1_000, 5_000)
    expect(limiter.recordFailure('attacker', 100).allowed).toBe(false)
    expect(limiter.check('other-device', 100).allowed).toBe(true)
  })
})
