export const logger = {
  log: (...args: unknown[]): void => {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[SION Media]', ...args)
    }
  },
  warn: (...args: unknown[]): void => {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[SION Media WARNING]', ...args)
    }
  },
  error: (...args: unknown[]): void => {
    // error always passes through — required for crash diagnostics in production
    console.error('[SION Media ERROR]', ...args)
  },
  info: (...args: unknown[]): void => {
    if (process.env.NODE_ENV !== 'production') {
      console.info('[SION Media INFO]', ...args)
    }
  }
}
