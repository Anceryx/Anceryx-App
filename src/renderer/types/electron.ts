import type { UpdateSnapshot } from '../../shared/updateTypes'
import type { LicenseManifest } from '../../shared/licenseTypes'
export interface ElectronAPI {
  platform: string
  getVersion(): Promise<string>
  authTokens: {
    getRefreshToken(): Promise<string | null>
    setRefreshToken(token: string): Promise<boolean>
    clearRefreshToken(): Promise<boolean>
  }
  auth: {
    onGoogleHandoff(callback: (payload: { code?: string; error?: string }) => void): () => void
  }
  community: {
    onInvite(callback: (token: string) => void): () => void
  }
  windowControls: {
    minimize(): void
    maximize(): void
    close(): void
    isMaximized(): Promise<boolean>
    onMaximizedChange(callback: (isMaximized: boolean) => void): () => void
  }
  updater: {
    getState(): Promise<UpdateSnapshot>
    check(): Promise<UpdateSnapshot>
    download(): Promise<UpdateSnapshot>
    restart(): Promise<UpdateSnapshot>
    onState(callback: (state: UpdateSnapshot) => void): () => void
  }
  screenCapture: {
    listSources(): Promise<Array<{ id: string; name: string; thumbnail: string | null }>>
    selectSource(sourceId: string): Promise<boolean>
  }
  licenses: {
    getManifest(): Promise<LicenseManifest>
  }
  openExternal(url: string): void
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}
