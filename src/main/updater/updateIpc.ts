import { ipcMain, type IpcMainInvokeEvent } from 'electron'
import type { UpdateManager } from './updateManager'

type RendererGuard = (event: IpcMainInvokeEvent) => boolean

export function registerUpdateIpc(manager: UpdateManager, isTrustedRenderer: RendererGuard): void {
  ipcMain.handle('updater:get-state', (event) => {
    if (!isTrustedRenderer(event)) throw new Error('Ação indisponível para esta janela.')
    return manager.getSnapshot()
  })
  ipcMain.handle('updater:check', (event) => {
    if (!isTrustedRenderer(event)) throw new Error('Ação indisponível para esta janela.')
    return manager.check()
  })
  ipcMain.handle('updater:download', (event) => {
    if (!isTrustedRenderer(event)) throw new Error('Ação indisponível para esta janela.')
    return manager.download()
  })
  ipcMain.handle('updater:restart', (event) => {
    if (!isTrustedRenderer(event)) throw new Error('Ação indisponível para esta janela.')
    return manager.restart()
  })
}
