import { contextBridge, ipcRenderer } from 'electron'
import type { UpdateSnapshot } from '../shared/updateTypes'
import type { LicenseManifest } from '../shared/licenseTypes'

const googleHandoffListeners = new Set<(payload: { code?: string; error?: string }) => void>()
const pendingGoogleHandoffs: Array<{ code?: string; error?: string }> = []
const communityInviteListeners = new Set<(token: string) => void>()
const pendingCommunityInvites: string[] = []
ipcRenderer.on('auth:google-handoff', (_event, payload: { code?: string; error?: string }) => {
  if (googleHandoffListeners.size === 0) pendingGoogleHandoffs.push(payload)
  else googleHandoffListeners.forEach((callback) => callback(payload))
})
ipcRenderer.on('community:invite', (_event, token: string) => {
  if (!/^[A-Za-z0-9_-]{24,128}$/.test(token)) return
  if (communityInviteListeners.size === 0) {
    if (pendingCommunityInvites.length >= 20) pendingCommunityInvites.shift()
    pendingCommunityInvites.push(token)
  } else communityInviteListeners.forEach((callback) => callback(token))
})

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  getVersion: (): Promise<string> => ipcRenderer.invoke('app:getVersion') as Promise<string>,
  authTokens: {
    getRefreshToken: (): Promise<string | null> => ipcRenderer.invoke('auth:refresh-token:get') as Promise<string | null>,
    setRefreshToken: (token: string): Promise<boolean> => ipcRenderer.invoke('auth:refresh-token:set', token) as Promise<boolean>,
    clearRefreshToken: (): Promise<boolean> => ipcRenderer.invoke('auth:refresh-token:clear') as Promise<boolean>,
  },
  auth: {
    onGoogleHandoff: (callback: (payload: { code?: string; error?: string }) => void): (() => void) => {
      googleHandoffListeners.add(callback)
      while (pendingGoogleHandoffs.length > 0) callback(pendingGoogleHandoffs.shift()!)
      return () => { googleHandoffListeners.delete(callback) }
    },
  },
  community: {
    onInvite: (callback: (token: string) => void): (() => void) => {
      communityInviteListeners.add(callback)
      while (pendingCommunityInvites.length > 0) callback(pendingCommunityInvites.shift()!)
      return () => { communityInviteListeners.delete(callback) }
    },
  },
  windowControls: {
    minimize: (): void => { ipcRenderer.send('win:minimize') },
    maximize: (): void => { ipcRenderer.send('win:maximize') },
    close: (): void => { ipcRenderer.send('win:close') },
    isMaximized: (): Promise<boolean> => ipcRenderer.invoke('win:isMaximized') as Promise<boolean>,
    onMaximizedChange: (callback: (isMaximized: boolean) => void): (() => void) => {
      const listener = (_event: Electron.IpcRendererEvent, isMaximized: boolean) => callback(isMaximized)
      ipcRenderer.on('win:maximized-change', listener)
      return () => ipcRenderer.removeListener('win:maximized-change', listener)
    }
  },
  updater: {
    getState: (): Promise<UpdateSnapshot> => ipcRenderer.invoke('updater:get-state') as Promise<UpdateSnapshot>,
    check: (): Promise<UpdateSnapshot> => ipcRenderer.invoke('updater:check') as Promise<UpdateSnapshot>,
    download: (): Promise<UpdateSnapshot> => ipcRenderer.invoke('updater:download') as Promise<UpdateSnapshot>,
    restart: (): Promise<UpdateSnapshot> => ipcRenderer.invoke('updater:restart') as Promise<UpdateSnapshot>,
    onState: (callback: (state: UpdateSnapshot) => void): (() => void) => {
      const listener = (_event: Electron.IpcRendererEvent, state: UpdateSnapshot) => callback(state)
      ipcRenderer.on('updater:state', listener)
      return () => ipcRenderer.removeListener('updater:state', listener)
    }
  },
  licenses: {
    getManifest: (): Promise<LicenseManifest> => ipcRenderer.invoke('licenses:get-manifest') as Promise<LicenseManifest>,
  },
  openExternal: (url: string): void => {
    // Apenas URLs do domínio oficial do Anceryx são permitidas.
    // Usar URL parsing para evitar bypass via prefix trick.
    try {
      const parsed = new URL(url)
      const allowedHosts = new Set(['www.anceryx.site', 'checkout.stripe.com', 'billing.stripe.com', 'accounts.google.com'])
      if (parsed.protocol === 'https:' && allowedHosts.has(parsed.hostname)) {
        ipcRenderer.send('shell:openExternal', url)
      }
    } catch {
      // URL inválida — ignorar silenciosamente
    }
  }
})
