// TitleBarMenu.tsx
import React, { useState, useRef, useEffect, useCallback } from 'react'
import {
  useFloating,
  useClick,
  useDismiss,
  useInteractions,
  offset,
  flip,
  shift,
  FloatingPortal,
  autoUpdate
} from '@floating-ui/react'
import { useAppStore } from '../../store/useAppStore'
import { useModeStore } from '../../store/useModeStore'
import { usePlaylistStore } from '../../store/usePlaylistStore'
import { useProjectionStore } from '../../store/useProjectionStore'
import { useModalStore } from '../../store/useModalStore'
import { logger } from '../../utils/logger'
import { executeRuntimeCommand } from '@renderer/utils/runtimeCommandBus'

interface MenuItem {
  label?: string
  shortcut?: string
  action?: () => void
  disabled?: boolean
  separator?: boolean
}

interface MenuDef {
  id: string
  label: string
  items: MenuItem[]
}

/* ── Individual Menu Trigger + Dropdown ───────────────────── */
function MenuBarItem({
  menu,
  isOpen,
  onOpen,
  onClose,
  hasOpenMenu
}: {
  menu: MenuDef
  isOpen: boolean
  onOpen: () => void
  onClose: () => void
  hasOpenMenu: boolean
}): React.JSX.Element {
  const listRef = useRef<(HTMLButtonElement | null)[]>([])
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: (open) => {
      if (open) onOpen()
      else onClose()
    },
    placement: 'bottom-start',
    middleware: [offset(2), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate
  })

  const click = useClick(context)
  const dismiss = useDismiss(context)
  const { getReferenceProps, getFloatingProps } = useInteractions([click, dismiss])

  // Keyboard navigation inside dropdown
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen) return
      const actionItems = menu.items.filter((i) => !i.separator)
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIndex((prev) => {
          const next = prev === null ? 0 : Math.min(prev + 1, actionItems.length - 1)
          return next
        })
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIndex((prev) => {
          const next = prev === null ? actionItems.length - 1 : Math.max(prev - 1, 0)
          return next
        })
      } else if (e.key === 'Enter' && activeIndex !== null) {
        e.preventDefault()
        const item = actionItems[activeIndex]
        if (item && !item.disabled && item.action) {
          item.action()
          onClose()
        }
      }
    },
    [isOpen, menu.items, activeIndex, onClose]
  )

  // Reset active index when menu opens/closes
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => setActiveIndex(null), 0)
    }
  }, [isOpen])

  return (
    <>
      <button
        ref={(node) => {
          refs.setReference(node)
        }}
        {...getReferenceProps()}
        onMouseEnter={() => {
          if (hasOpenMenu && !isOpen) onOpen()
        }}
        className={`title-bar-menu-trigger ${isOpen ? 'active' : ''}`}
      >
        {menu.label}
      </button>

      {isOpen && (
        <FloatingPortal>
          <div
            ref={(node) => {
              refs.setFloating(node)
            }}
            style={floatingStyles}
            {...getFloatingProps()}
            className="title-bar-dropdown"
            onKeyDown={handleKeyDown}
            tabIndex={-1}
          >
            {(() => {
              let actionIdx = -1
              return menu.items.map((item, i) => {
                if (item.separator) {
                  return <div key={i} className="title-bar-dropdown-separator" />
                }
                actionIdx++
                const idx = actionIdx
                return (
                  <button
                    key={i}
                    ref={(el) => {
                      listRef.current[idx] = el
                    }}
                    className={`title-bar-dropdown-item ${idx === activeIndex ? 'highlighted' : ''} ${item.disabled ? 'disabled' : ''}`}
                    onClick={() => {
                      if (!item.disabled && item.action) {
                        item.action()
                        onClose()
                      }
                    }}
                    disabled={item.disabled}
                    onMouseEnter={() => setActiveIndex(idx)}
                  >
                    <span>{item.label}</span>
                    {item.shortcut && (
                      <span className="title-bar-dropdown-shortcut">{item.shortcut}</span>
                    )}
                  </button>
                )
              })
            })()}
          </div>
        </FloatingPortal>
      )}
    </>
  )
}

/* ── Menu Bar Container ───────────────────────────────────── */
export function TitleBarMenu(): React.JSX.Element {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const { setScreen, isFocusMode, toggleFocusMode } = useAppStore()
  const { currentMode, setMode } = useModeStore()
  const projStore = useProjectionStore()
  const plStore = usePlaylistStore()

  const focusPrimarySearch = (): void => {
    const targetId = currentMode === 'LIBRARY' ? 'library-pro-search' : 'song-search-input'
    document.getElementById(targetId)?.focus()
  }

  const openSettings = (): void => {
    setMode('MANAGEMENT')
    setScreen('settings')
  }

  const showFocusLive = currentMode === 'PROJECTION'
  const showPlaylistMenu = currentMode === 'PROJECTION'
  const showProjectionMenu = currentMode === 'PROJECTION'
  const showToolsMenu =
    currentMode === 'LIBRARY' || currentMode === 'PROJECTION' || currentMode === 'MANAGEMENT'
  const showLibraryTools = currentMode === 'LIBRARY' || currentMode === 'MANAGEMENT'

  const menus: MenuDef[] = [
    {
      id: 'file',
      label: 'File',
      items: [
        {
          label: 'New Playlist',
          shortcut: 'Ctrl+N',
          action: () => {
            document.dispatchEvent(new CustomEvent('sion:create-playlist'))
          }
        },
        {
          label: 'Search Song',
          shortcut: 'Ctrl+F',
          action: focusPrimarySearch
        },
        { separator: true },
        { label: 'Import / Export', shortcut: 'Ctrl+I', action: () => setScreen('import-export') },
        {
          label: 'Backup Database',
          action: () => {
            window.api.system
              .createBackup()
              .then(() => useAppStore.getState().showToast('Backup created', 'success'))
              .catch((err) => {
                logger.error('Backup failed:', err)
                useAppStore.getState().showToast('Backup failed', 'error')
              })
          }
        },
        { separator: true },
        { label: 'Preferences', action: openSettings },
        { separator: true },
        { label: 'Exit', shortcut: 'Alt+F4', action: () => window.api.window.close() }
      ]
    },
    {
      id: 'view',
      label: 'View',
      items: [
        {
          label: 'Command Palette',
          shortcut: 'Ctrl+P',
          action: () => document.dispatchEvent(new CustomEvent('sion:toggle-command-palette'))
        },
        // DUI-003: Bible menu item
        {
          label: 'Bible',
          shortcut: 'Ctrl+B',
          action: () => setScreen('bible')
        },
        ...(!showFocusLive
          ? []
          : [
              {
                label: isFocusMode ? 'Exit Focus Live Mode' : 'Focus Live Mode',
                shortcut: 'Ctrl+Shift+F',
                action: () => toggleFocusMode()
              }
            ]),
        ...(showPlaylistMenu
          ? [
              { separator: true },
              {
                label: 'Next Song',
                shortcut: 'Ctrl+Right',
                action: () => {
                  const ps = usePlaylistStore.getState()
                  if (ps.activeItemIndex < ps.playlistItems.length - 1) {
                    ps.setActiveItemIndex(ps.activeItemIndex + 1)
                    const item = ps.playlistItems[ps.activeItemIndex + 1]
                    const song = useAppStore.getState().songs.find((s) => s.id === item.song_id)
                    if (song) useAppStore.getState().setSelectedSong(song)
                  }
                },
                disabled: !plStore.activePlaylist
              },
              {
                label: 'Previous Song',
                shortcut: 'Ctrl+Left',
                action: () => {
                  const ps = usePlaylistStore.getState()
                  if (ps.activeItemIndex > 0) {
                    ps.setActiveItemIndex(ps.activeItemIndex - 1)
                    const item = ps.playlistItems[ps.activeItemIndex - 1]
                    const song = useAppStore.getState().songs.find((s) => s.id === item.song_id)
                    if (song) useAppStore.getState().setSelectedSong(song)
                  }
                },
                disabled: !plStore.activePlaylist
              }
            ]
          : []),
        ...(showProjectionMenu
          ? [
              { separator: true },
              {
                label: projStore.projectionState === 'LIVE' ? 'Projector ON' : 'Projector ON/OFF',
                action: () => {
                  const appState = useAppStore.getState()
                  if (appState.isProjectionVisible) {
                    window.api.projection.hide()
                    appState.setProjectionVisible(false)
                  } else {
                    window.api.projection.show()
                    appState.setProjectionVisible(true)
                  }
                }
              },
              {
                label: 'Scene Presets Config',
                shortcut: 'Ctrl+Shift+S',
                action: () => useModalStore.getState().open('scene-config', 'scene-config')
              },
              { separator: true },
              {
                label: 'Black Screen',
                shortcut: 'B',
                action: () => executeRuntimeCommand('PROJ_BLACK', undefined, 'UI_BUTTON')
              },
              {
                label: 'Freeze Screen',
                shortcut: 'F',
                action: () => executeRuntimeCommand('PROJ_FREEZE', undefined, 'UI_BUTTON')
              },
              {
                label: 'Clear Screen',
                shortcut: 'Esc',
                action: () => executeRuntimeCommand('PROJ_CLEAR', undefined, 'UI_BUTTON')
              }
            ]
          : [])
      ]
    },
    ...(showToolsMenu
      ? [
          {
            id: 'tools',
            label: 'Tools',
            items: [
              {
                label: 'Song Manager',
                shortcut: 'Ctrl+Shift+N',
                action: () => {
                  setMode('MANAGEMENT')
                  useAppStore.getState().setEditingSong(null)
                  setScreen('song-editor')
                }
              },
              ...(showLibraryTools
                ? [
                    {
                      label: 'Library Search',
                      shortcut: 'Ctrl+F',
                      action: focusPrimarySearch
                    },
                    {
                      label: 'Import / Export',
                      shortcut: 'Ctrl+I',
                      action: () => setScreen('import-export')
                    }
                  ]
                : []),
              { separator: true },
              {
                label: 'Tag Manager',
                action: () => {
                  useModalStore.getState().open('tag-manager', 'tag-manager')
                }
              },
              {
                label: 'Cek Integritas Database',
                action: () => {
                  window.api.system.checkMultiHymnalIntegrity().then((result) => {
                    const issues = (result as { issues: Array<unknown> }).issues
                    const issueCount = issues.length
                    useAppStore
                      .getState()
                      .showToast(
                        issueCount > 0 ? `Ditemukan ${issueCount} isu` : 'Integritas database aman',
                        issueCount > 0 ? 'error' : 'success'
                      )
                  })
                }
              },
              {
                label: 'Reseed Database',
                action: () => {
                  window.api.system
                    .reseed()
                    .then(() => {
                      useAppStore.getState().loadSongs()
                      useAppStore.getState().showToast('Database reseeded', 'success')
                    })
                    .catch((err) => {
                      logger.error('Reseed failed:', err)
                      useAppStore.getState().showToast('Reseed failed', 'error')
                    })
                }
              }
            ]
          }
        ]
      : []),
    {
      id: 'help',
      label: 'Help',
      items: [
        {
          label: 'Keyboard Shortcuts',
          shortcut: '?',
          action: () => document.dispatchEvent(new CustomEvent('sion:show-shortcuts'))
        },
        { separator: true },
        {
          label: 'About SION Media',
          action: () =>
            useAppStore.getState().showToast('SION Media - Worship Multimedia Platform', 'info')
        }
      ]
    }
  ]

  // ALT+key shortcuts to open menus
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (!e.altKey) return
      const key = e.key.toLowerCase()
      const menuMap: Record<string, string> = {
        f: 'file',
        v: 'view',
        h: 'help'
      }

      if (showToolsMenu) {
        menuMap.t = 'tools'
      }

      if (menuMap[key]) {
        e.preventDefault()
        setOpenMenuId((prev) => (prev === menuMap[key] ? null : menuMap[key]))
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showToolsMenu])

  return (
    <div className="title-bar-menu no-drag">
      {menus.map((menu) => (
        <MenuBarItem
          key={menu.id}
          menu={menu}
          isOpen={openMenuId === menu.id}
          onOpen={() => setOpenMenuId(menu.id)}
          onClose={() => setOpenMenuId(null)}
          hasOpenMenu={openMenuId !== null}
        />
      ))}
    </div>
  )
}
