import React, { useEffect, useState } from 'react'
import { useModeStore } from '../../store/useModeStore'
import { logger } from '../../utils/logger'
import {
  applyEffectiveTheme,
  buildThemeSyncPayload,
  isAppThemeMode,
  resolveEffectiveTheme,
  watchSystemThemeChanges,
  type AppThemeMode
} from '../../utils/app-theme'

interface AppThemeSettingsProps {
  settings: Record<string, string>
  updateSetting: (key: string, value: string) => Promise<void>
}

export function AppThemeSettings({
  settings,
  updateSetting
}: AppThemeSettingsProps): React.JSX.Element {
  const setTheme = useModeStore((s) => s.setTheme)
  const [activeMode, setActiveMode] = useState<AppThemeMode>('system')
  const [unwatch, setUnwatch] = useState<(() => void) | null>(null)

  useEffect(() => {
    const raw = settings.app_theme_mode
    const mode: AppThemeMode = isAppThemeMode(raw) ? raw : 'system'
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActiveMode(mode)
  }, [settings.app_theme_mode])

  const applyMode = (mode: AppThemeMode): void => {
    if (unwatch) {
      unwatch()
      setUnwatch(null)
    }
    const effective = resolveEffectiveTheme(mode)
    applyEffectiveTheme(effective)
    window.api.appTheme?.setMode(buildThemeSyncPayload(mode))
    if (mode === 'system') {
      const stop = watchSystemThemeChanges((t) => {
        applyEffectiveTheme(t)
        window.api.appTheme?.setMode(buildThemeSyncPayload('system'))
      })
      setUnwatch(() => stop)
    }
  }

  useEffect(() => {
    return () => {
      if (unwatch) unwatch()
    }
  }, [unwatch])

  const onChange = async (mode: AppThemeMode): Promise<void> => {
    setActiveMode(mode)
    setTheme(mode)

    try {
      await updateSetting('app_theme_mode', mode)
    } catch (err) {
      logger.error('Failed to update app theme mode:', err)
    }

    applyMode(mode)
  }

  return (
    <div className="space-y-8 animate-slide-up">
      <div className="flex flex-col gap-1">
        <h2 className="text-h2">Tampilan Aplikasi</h2>
        <p className="text-caption">Atur tema antarmuka operator, stage display, dan projection.</p>
      </div>

      <div className="space-y-3">
        <label className="text-micro text-text-muted block">Mode Tema</label>

        <div className="pill-tabs">
          <button
            className={`pill-tab ${activeMode === 'system' ? 'pill-tab-active' : ''}`}
            onClick={() => onChange('system')}
          >
            System
          </button>
          <button
            className={`pill-tab ${activeMode === 'dark' ? 'pill-tab-active' : ''}`}
            onClick={() => onChange('dark')}
          >
            Dark
          </button>
          <button
            className={`pill-tab ${activeMode === 'light' ? 'pill-tab-active' : ''}`}
            onClick={() => onChange('light')}
          >
            Light
          </button>
        </div>

        <div className="text-[11px] text-text-muted">
          {activeMode === 'system'
            ? 'Mengikuti pengaturan tema dari OS.'
            : activeMode === 'dark'
              ? 'Tema gelap untuk fokus maksimal.'
              : 'Tema terang untuk penggunaan siang/ruangan terang.'}
        </div>
      </div>
    </div>
  )
}
