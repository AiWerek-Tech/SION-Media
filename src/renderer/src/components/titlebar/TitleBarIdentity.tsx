import React, { useState, useRef, useEffect } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { usePlaylistStore } from '../../store/usePlaylistStore'
import { useModeStore } from '../../store/useModeStore'
import { logger } from '../../utils/logger'
import LogoTransparent from '../../assets/logo-transparent.svg?react'

export function TitleBarIdentity(): React.JSX.Element {
  const { workspaceName, setWorkspaceName } = useAppStore()
  const { activePlaylist } = usePlaylistStore()
  const { currentMode } = useModeStore()
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState('')
  const [appVersion, setAppVersion] = useState('3.0')
  const inputRef = useRef<HTMLInputElement>(null)

  // Load saved workspace name on mount
  useEffect(() => {
    window.api.settings
      .getAll()
      .then((settings) => {
        if (settings.workspace_name) {
          useAppStore.getState().setWorkspaceName(settings.workspace_name)
        }
      })
      .catch((err) => logger.error('Failed to load workspace name:', err))
  }, [])

  // FIX: load actual app version from main process instead of hardcoding
  useEffect(() => {
    window.api.window
      .getVersion()
      .then((v: string) => {
        if (v) setAppVersion(v)
      })
      .catch(() => {
        /* keep fallback */
      })
  }, [])

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleSave = (): void => {
    const trimmed = editValue.trim()
    setWorkspaceName(trimmed)
    window.api.settings
      .update('workspace_name', trimmed)
      .catch((err) => logger.error('Failed to save workspace name:', err))
    setIsEditing(false)
  }

  const displayName = workspaceName || activePlaylist?.name || ''
  const modeLabel =
    currentMode === 'LIBRARY'
      ? 'Library'
      : currentMode === 'PROJECTION'
        ? 'Presenter'
        : currentMode === 'BROADCAST'
          ? 'Broadcast'
          : 'Management'

  return (
    <div className="title-bar-identity no-drag">
      <LogoTransparent className="title-bar-logo" />
      <span className="title-bar-appname">
        SION <span className="text-accent">{modeLabel}</span>
      </span>
      <span className="title-bar-version">v{appVersion}</span>

      {/* Workspace name - editable on double-click */}
      {currentMode !== 'LIBRARY' && (displayName || isEditing) && (
        <>
          <div className="title-bar-separator" />
          {isEditing ? (
            <input
              ref={inputRef}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleSave}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave()
                if (e.key === 'Escape') {
                  setIsEditing(false)
                  setEditValue(workspaceName)
                }
              }}
              className="title-bar-workspace-input"
              placeholder="Nama event..."
            />
          ) : (
            <span
              className="title-bar-workspace"
              onDoubleClick={() => {
                setEditValue(workspaceName || activePlaylist?.name || '')
                setIsEditing(true)
              }}
              title="Double-click to edit workspace name"
            >
              {displayName}
            </span>
          )}
        </>
      )}
    </div>
  )
}
