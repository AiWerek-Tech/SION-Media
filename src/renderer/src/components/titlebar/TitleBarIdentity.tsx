import React, { useState, useRef, useEffect } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { usePlaylistStore } from '../../store/usePlaylistStore'
import { logger } from '../../utils/logger'

export function TitleBarIdentity(): React.JSX.Element {
  const { workspaceName, setWorkspaceName } = useAppStore()
  const { activePlaylist } = usePlaylistStore()
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState('')
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

  return (
    <div className="title-bar-identity no-drag">
      <img
        src={new URL('../../assets/logo.png', import.meta.url).href}
        alt="SION"
        className="title-bar-logo"
      />
      <span className="title-bar-appname">
        SION <span className="text-accent">Presenter</span>
      </span>
      <span className="title-bar-version">v2.1</span>

      {/* Workspace name - editable on double-click */}
      {(displayName || isEditing) && (
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
