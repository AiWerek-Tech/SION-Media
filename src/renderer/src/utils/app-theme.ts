export type AppThemeMode = 'dark' | 'light' | 'system'
export type EffectiveTheme = 'dark' | 'light'

export function isAppThemeMode(val: unknown): val is AppThemeMode {
  return val === 'dark' || val === 'light' || val === 'system'
}

export function getSystemEffectiveTheme(): EffectiveTheme {
  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)')?.matches
  return prefersDark ? 'dark' : 'light'
}

export function resolveEffectiveTheme(mode: AppThemeMode): EffectiveTheme {
  if (mode === 'system') return getSystemEffectiveTheme()
  return mode
}

export function applyEffectiveTheme(theme: EffectiveTheme): void {
  document.documentElement.dataset.theme = theme
}

export function buildThemeSyncPayload(mode: AppThemeMode): {
  mode: AppThemeMode
  effective: EffectiveTheme
} {
  return { mode, effective: resolveEffectiveTheme(mode) }
}

export function watchSystemThemeChanges(onChange: (theme: EffectiveTheme) => void): () => void {
  const mql = window.matchMedia?.('(prefers-color-scheme: dark)')
  if (!mql) return () => {}

  const listener = (): void => {
    onChange(getSystemEffectiveTheme())
  }

  if (typeof mql.addEventListener === 'function') {
    mql.addEventListener('change', listener)
    return () => mql.removeEventListener('change', listener)
  }

  // Safari fallback
  ;(mql as unknown as { addListener: (cb: () => void) => void }).addListener(listener)
  return () =>
    (mql as unknown as { removeListener: (cb: () => void) => void }).removeListener(listener)
}
