import type { IpcMainEvent, IpcMainInvokeEvent } from 'electron'
import { getMainWindow, getProjectionWindow, getStageDisplayWindow } from './windows'

export type AppWindowRole = 'main' | 'projection' | 'stage'

export function getAppWindowRole(senderId: number): AppWindowRole | null {
  if (getMainWindow()?.webContents.id === senderId) return 'main'
  if (getProjectionWindow()?.webContents.id === senderId) return 'projection'
  if (getStageDisplayWindow()?.webContents.id === senderId) return 'stage'
  return null
}

export function requireMainWindowSender(
  event: IpcMainEvent | IpcMainInvokeEvent,
  channel: string
): void {
  const role = getAppWindowRole(event.sender.id)
  if (role === 'main') return
  console.warn('[IPC] Rejected non-main sender', { channel, senderId: event.sender.id, role })
  throw new Error(`[${channel}] Unauthorized IPC sender`)
}
