/**
 * Content Pack IPC Handlers
 *
 * Registers IPC handlers for content pack management operations.
 * Called from setupIPC() in ipc-handlers.ts.
 */

import { ipcMain } from 'electron'
import { IPC_CONTENT_PACKS } from '@shared/ipc-channels'
import {
  selectContentPackFolder,
  previewBiblePackFolder,
  installBiblePackFromFolder,
  removeContentPack,
  listInstalledPacks,
  setDefaultContentPack
} from '../content-packs/contentPackManager'
import type { ContentPackType } from '@shared/types'
import { requireMainWindowSender } from '../../ipc-sender-policy'

function toSafeError(channel: string, err: unknown): never {
  const msg = err instanceof Error ? err.message : String(err)
  throw new Error(`[${channel}] ${msg.slice(0, 240)}`)
}

export function setupContentPackIPC(): void {
  // Open folder picker dialog
  ipcMain.handle(IPC_CONTENT_PACKS.SELECT_FOLDER, async (event) => {
    requireMainWindowSender(event, IPC_CONTENT_PACKS.SELECT_FOLDER)
    try {
      return await selectContentPackFolder()
    } catch (err) {
      toSafeError(IPC_CONTENT_PACKS.SELECT_FOLDER, err)
    }
  })

  // Preview a bible pack folder (validate without installing)
  ipcMain.handle(IPC_CONTENT_PACKS.PREVIEW_BIBLE_PACK, (_event, folderPath: unknown) => {
    requireMainWindowSender(_event, IPC_CONTENT_PACKS.PREVIEW_BIBLE_PACK)
    if (typeof folderPath !== 'string' || !folderPath.trim()) {
      throw new Error('[contentPacks:previewBiblePack] folderPath harus berupa string non-kosong.')
    }
    try {
      return previewBiblePackFolder(folderPath.trim())
    } catch (err) {
      toSafeError(IPC_CONTENT_PACKS.PREVIEW_BIBLE_PACK, err)
    }
  })

  // Install a bible pack from a folder
  ipcMain.handle(IPC_CONTENT_PACKS.INSTALL_BIBLE_PACK, (_event, folderPath: unknown) => {
    requireMainWindowSender(_event, IPC_CONTENT_PACKS.INSTALL_BIBLE_PACK)
    if (typeof folderPath !== 'string' || !folderPath.trim()) {
      throw new Error('[contentPacks:installBiblePack] folderPath harus berupa string non-kosong.')
    }
    try {
      return installBiblePackFromFolder(folderPath.trim())
    } catch (err) {
      toSafeError(IPC_CONTENT_PACKS.INSTALL_BIBLE_PACK, err)
    }
  })

  // List installed packs (optional type filter)
  ipcMain.handle(IPC_CONTENT_PACKS.LIST, (_event, packType?: unknown) => {
    requireMainWindowSender(_event, IPC_CONTENT_PACKS.LIST)
    const type =
      typeof packType === 'string' && ['bible', 'hymnal', 'reading', 'media'].includes(packType)
        ? (packType as ContentPackType)
        : undefined
    try {
      return listInstalledPacks(type)
    } catch (err) {
      toSafeError(IPC_CONTENT_PACKS.LIST, err)
    }
  })

  // Remove a pack
  ipcMain.handle(IPC_CONTENT_PACKS.REMOVE, (_event, packId: unknown) => {
    requireMainWindowSender(_event, IPC_CONTENT_PACKS.REMOVE)
    if (typeof packId !== 'string' || !packId.trim()) {
      throw new Error('[contentPacks:remove] packId harus berupa string non-kosong.')
    }
    try {
      return removeContentPack(packId.trim())
    } catch (err) {
      toSafeError(IPC_CONTENT_PACKS.REMOVE, err)
    }
  })

  // Set a pack as default for its type
  ipcMain.handle(IPC_CONTENT_PACKS.SET_DEFAULT, (_event, packId: unknown) => {
    requireMainWindowSender(_event, IPC_CONTENT_PACKS.SET_DEFAULT)
    if (typeof packId !== 'string' || !packId.trim()) {
      throw new Error('[contentPacks:setDefault] packId harus berupa string non-kosong.')
    }
    try {
      setDefaultContentPack(packId.trim())
      return { success: true }
    } catch (err) {
      toSafeError(IPC_CONTENT_PACKS.SET_DEFAULT, err)
    }
  })
}
