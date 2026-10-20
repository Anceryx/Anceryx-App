import { ipcMain } from 'electron'
import type { UpdateManager } from './updateManager'

export function registerUpdateIpc(manager: UpdateManager): void {
  ipcMain.handle('updater:get-state', () => manager.getSnapshot())
  ipcMain.handle('updater:check', () => manager.check())
  ipcMain.handle('updater:download', () => manager.download())
  ipcMain.handle('updater:restart', () => manager.restart())
}
