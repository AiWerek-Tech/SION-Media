/**
 * Display Monitor Module
 * Handles display change detection and window repositioning
 */

import { screen } from 'electron'
import { getMainWindow, getProjectionWindow } from './windows'

/**
 * Get all displays information
 */
export function getAllDisplays(): Array<{
  id: number
  label: string
  width: number
  height: number
  isPrimary: boolean
}> {
  return screen.getAllDisplays().map((d) => ({
    id: d.id,
    label: d.label,
    width: d.bounds.width,
    height: d.bounds.height,
    isPrimary: d.id === screen.getPrimaryDisplay().id
  }))
}

/**
 * Setup display change event listeners
 */
export function setupDisplayMonitor(): void {
  screen.on('display-added', () => {
    const mainWindow = getMainWindow()
    mainWindow?.webContents.send('display:changed', screen.getAllDisplays().length)
  })

  screen.on('display-removed', () => {
    const mainWindow = getMainWindow()
    mainWindow?.webContents.send('display:changed', screen.getAllDisplays().length)

    // Auto-recovery: move projection to remaining display
    const projectionWindow = getProjectionWindow()
    if (projectionWindow && !projectionWindow.isDestroyed()) {
      const displays = screen.getAllDisplays()
      const target =
        displays.find((d) => d.id !== screen.getPrimaryDisplay().id) || screen.getPrimaryDisplay()
      projectionWindow.setBounds(target.bounds)
    }
  })
}

/**
 * Get current display count
 */
export function getDisplayCount(): number {
  return screen.getAllDisplays().length
}
