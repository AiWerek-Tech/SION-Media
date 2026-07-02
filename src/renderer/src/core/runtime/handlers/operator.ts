/**
 * Operator Handlers
 *
 * Runtime operator commands are responsible for updating global settings
 * and configuration values. This module isolates the settings update seam
 * that will later transition to a runtime-managed configuration state.
 *
 * @module handlers/operator
 */

import { useAppStore } from '@renderer/store/useAppStore'
import { useProjectionStore } from '@renderer/store/useProjectionStore'
import { logger } from '@renderer/utils/logger'
import type { RuntimeCommand, RuntimeCommandResult } from '../contracts'

const appStore = useAppStore.getState
const projectionStore = useProjectionStore.getState

function operatorStoreAdapter(): {
  updateSetting: (key: string, value: unknown) => Promise<unknown>
  updateLocalState: (key: string, value: unknown) => void
} {
  return {
    updateSetting: (key: string, value: unknown) => window.api.settings.update(key, String(value)),
    updateLocalState: (key: string, value: unknown) => {
      if (key === 'workspace_name' && typeof value === 'string') {
        appStore().setWorkspaceName(value)
      }

      if (key === 'transition_duration' && typeof value === 'number') {
        projectionStore().setFadeSpeed(value)
      }
    }
  }
}

export async function handleOperatorUpdateSettings(
  cmd: RuntimeCommand
): Promise<RuntimeCommandResult> {
  try {
    const setting = cmd.payload?.setting as string | undefined
    const value = cmd.payload?.value as unknown

    if (!setting) {
      return {
        id: `operator_update_settings_invalid_${Date.now()}`,
        success: false,
        status: 'ERROR',
        level: 'WARN',
        error: 'Missing setting key',
        durationMs: 0,
        timestamp: Date.now()
      }
    }

    operatorStoreAdapter().updateLocalState(setting, value)
    await operatorStoreAdapter().updateSetting(setting, value)

    logger.info('[OperatorHandler] operator:update-settings executed', {
      setting,
      value,
      source: cmd.source
    })

    return {
      id: `operator_update_settings_${Date.now()}`,
      success: true,
      status: 'SUCCESS',
      level: 'INFO',
      result: { setting, value },
      durationMs: 0,
      timestamp: Date.now()
    }
  } catch (err) {
    logger.error('[OperatorHandler] operator:update-settings failed', err)
    return {
      id: `operator_update_settings_err_${Date.now()}`,
      success: false,
      status: 'ERROR',
      level: 'ERROR',
      error: String(err),
      durationMs: 0,
      timestamp: Date.now()
    }
  }
}
