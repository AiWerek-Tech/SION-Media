import '@fontsource/poppins/400.css'
import '@fontsource/poppins/500.css'
import '@fontsource/poppins/600.css'
import '@fontsource/poppins/700.css'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'

import './assets/main.css'

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { ErrorBoundary } from './components/ErrorBoundary'
import './i18n'
import {
  applyEffectiveTheme,
  buildThemeSyncPayload,
  isAppThemeMode,
  resolveEffectiveTheme,
  watchSystemThemeChanges
} from './utils/app-theme'

if (navigator.userAgent.toLowerCase().includes('windows')) {
  document.body.classList.add('win-titlebar-overlay')
}

async function initTheme(): Promise<void> {
  try {
    if (!window.api?.settings) return

    const settings = await window.api.settings.getAll()
    const modeRaw = settings.app_theme_mode
    const mode = isAppThemeMode(modeRaw) ? modeRaw : 'system'
    const effective = resolveEffectiveTheme(mode)
    applyEffectiveTheme(effective)

    if (window.api.appTheme) {
      window.api.appTheme.setMode(buildThemeSyncPayload(mode))
    }

    if (mode === 'system') {
      watchSystemThemeChanges((t) => {
        applyEffectiveTheme(t)
        window.api.appTheme?.setMode(buildThemeSyncPayload('system'))
      })
    }
  } catch {
    applyEffectiveTheme('dark')
  }
}

void initTheme()

if (window.api?.appTheme) {
  window.api.appTheme.onUpdated((payload) => {
    if (payload && (payload.effective === 'dark' || payload.effective === 'light')) {
      applyEffectiveTheme(payload.effective)
    }
  })
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
)
