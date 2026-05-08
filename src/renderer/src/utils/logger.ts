export const logger = {
  log: (...args: unknown[]): void => {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[SION Media]', ...args)
    }
  },
  warn: (...args: unknown[]): void => {
    console.warn('[SION Media WARNING]', ...args)
  },
  error: (...args: unknown[]): void => {
    console.error('[SION Media ERROR]', ...args)
  },
  info: (...args: unknown[]): void => {
    console.info('[SION Media INFO]', ...args)
  }
}
