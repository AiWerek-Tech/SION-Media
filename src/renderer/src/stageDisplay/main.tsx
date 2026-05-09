import '@fontsource/poppins/400.css'
import '@fontsource/poppins/500.css'
import '@fontsource/poppins/600.css'
import '@fontsource/poppins/700.css'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'

import '../assets/main.css'

import React from 'react'
import ReactDOM from 'react-dom/client'
import { StageDisplayApp } from './StageDisplayApp'
import { ErrorBoundary } from '../components/ErrorBoundary'
import {
  applyEffectiveTheme,
  buildThemeSyncPayload,
  isAppThemeMode,
  resolveEffectiveTheme,
  watchSystemThemeChanges
} from '../utils/app-theme'

async function initTheme(): Promise<void> {
  try {
    const settings = await window.api.settings.getAll()
    const modeRaw = settings.app_theme_mode
    const mode = isAppThemeMode(modeRaw) ? modeRaw : 'system'
    const effective = resolveEffectiveTheme(mode)
    applyEffectiveTheme(effective)
    window.api.appTheme?.setMode(buildThemeSyncPayload(mode))
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

window.api.appTheme?.onUpdated((payload) => {
  if (payload && (payload.effective === 'dark' || payload.effective === 'light')) {
    applyEffectiveTheme(payload.effective)
  }
})

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <StageDisplayApp />
    </ErrorBoundary>
  </React.StrictMode>
)
