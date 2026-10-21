import { app, BrowserWindow } from 'electron'
import { autoUpdater } from 'electron-updater'
import type { UpdateSnapshot } from '../../shared/updateTypes'
import { UPDATE_GITHUB_OWNER, UPDATE_GITHUB_REPOSITORY, UPDATE_MANIFEST_SIGNATURE_VERIFICATION_ENABLED, UPDATE_MANUAL_INSTALL_MESSAGE, isSafeUpdateInfo, releaseNotesToLines, resolveUpdateChannel, safeUpdaterError } from './updateUtils'

const STARTUP_DELAY_MS = 10_000
const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000

export class UpdateManager {
  private readonly channel = resolveUpdateChannel(undefined, false, app.getVersion())
  private snapshot: UpdateSnapshot = {
    state: 'idle',
    currentVersion: app.getVersion(),
    latestVersion: null,
    channel: this.channel,
    configured: app.isPackaged && process.platform === 'win32' && UPDATE_MANIFEST_SIGNATURE_VERIFICATION_ENABLED,
    lastCheckedAt: null,
    progress: null,
    releaseNotes: [],
    message: null,
  }
  private checkPromise: Promise<UpdateSnapshot> | null = null
  private startupTimer: NodeJS.Timeout | null = null
  private intervalTimer: NodeJS.Timeout | null = null
  private listenersRegistered = false

  constructor() {
    if (!app.isPackaged) this.snapshot.message = 'Atualizações ficam desativadas em desenvolvimento.'
    else if (process.platform !== 'win32') this.snapshot.message = 'Atualizações automáticas estão disponíveis apenas para Windows.'
    else if (!UPDATE_MANIFEST_SIGNATURE_VERIFICATION_ENABLED) this.snapshot.message = UPDATE_MANUAL_INSTALL_MESSAGE
  }

  start(): void {
    if (!this.snapshot.configured || this.listenersRegistered) return
    this.configureUpdater()
    this.startupTimer = setTimeout(() => { void this.check() }, STARTUP_DELAY_MS)
    this.intervalTimer = setInterval(() => { void this.check() }, CHECK_INTERVAL_MS)
  }

  stop(): void {
    if (this.startupTimer) clearTimeout(this.startupTimer)
    if (this.intervalTimer) clearInterval(this.intervalTimer)
    this.startupTimer = null
    this.intervalTimer = null
  }

  getSnapshot(): UpdateSnapshot {
    return { ...this.snapshot, releaseNotes: [...this.snapshot.releaseNotes] }
  }

  async check(): Promise<UpdateSnapshot> {
    if (!this.snapshot.configured) return this.getSnapshot()
    if (this.checkPromise) return this.checkPromise
    if (this.snapshot.state === 'downloading' || this.snapshot.state === 'downloaded' || this.snapshot.state === 'installing') return this.getSnapshot()

    this.setSnapshot({ state: 'checking', message: null, progress: null })
    this.checkPromise = autoUpdater.checkForUpdates()
      .then(() => this.getSnapshot())
      .catch(() => {
        this.setSnapshot({ state: 'error', message: safeUpdaterError(), lastCheckedAt: new Date().toISOString() })
        return this.getSnapshot()
      })
      .finally(() => { this.checkPromise = null })
    return this.checkPromise
  }

  async download(): Promise<UpdateSnapshot> {
    if (!this.snapshot.configured || this.snapshot.state !== 'available') return this.getSnapshot()
    this.setSnapshot({ state: 'downloading', progress: 0, message: 'Baixando atualização...' })
    try {
      await autoUpdater.downloadUpdate()
    } catch {
      this.setSnapshot({ state: 'error', message: safeUpdaterError() })
    }
    return this.getSnapshot()
  }

  restart(): UpdateSnapshot {
    if (!this.snapshot.configured || this.snapshot.state !== 'downloaded') return this.getSnapshot()
    this.setSnapshot({ state: 'installing', message: 'Atualização será instalada após reiniciar.' })
    autoUpdater.quitAndInstall(false, true)
    return this.getSnapshot()
  }

  private configureUpdater(): void {
    if (this.listenersRegistered) return
    autoUpdater.setFeedURL({ provider: 'github', owner: UPDATE_GITHUB_OWNER, repo: UPDATE_GITHUB_REPOSITORY, private: false })
    autoUpdater.channel = this.channel === 'beta' ? 'beta' : 'latest'
    autoUpdater.autoDownload = false
    autoUpdater.autoInstallOnAppQuit = false
    autoUpdater.allowPrerelease = this.channel === 'beta'
    // Setting channel enables downgrade in electron-updater; enforce our policy after it.
    autoUpdater.allowDowngrade = false

    autoUpdater.on('checking-for-update', () => this.setSnapshot({ state: 'checking', message: null }))
    autoUpdater.on('update-available', (info) => {
      if (!isSafeUpdateInfo(info, app.getVersion(), this.channel)) {
        this.setSnapshot({ state: 'error', latestVersion: null, releaseNotes: [], progress: null, lastCheckedAt: new Date().toISOString(), message: safeUpdaterError() })
        return
      }
      this.setSnapshot({
        state: 'available',
        latestVersion: info.version,
        releaseNotes: releaseNotesToLines(info.releaseNotes),
        progress: null,
        lastCheckedAt: new Date().toISOString(),
        message: 'Nova versão da Anceryx disponível.',
      })
    })
    autoUpdater.on('update-not-available', (info) => this.setSnapshot({
      state: 'not-available',
      latestVersion: info.version,
      progress: null,
      lastCheckedAt: new Date().toISOString(),
      message: 'Você já está usando a versão mais recente.',
    }))
    autoUpdater.on('download-progress', (progress) => this.setSnapshot({
      state: 'downloading',
      progress: Number.isFinite(progress.percent) ? Math.max(0, Math.min(100, Math.round(progress.percent))) : 0,
      message: 'Baixando atualização...',
    }))
    autoUpdater.on('update-downloaded', (info) => this.setSnapshot({
      state: 'downloaded',
      latestVersion: info.version,
      releaseNotes: releaseNotesToLines(info.releaseNotes),
      progress: 100,
      message: 'Atualização pronta para instalar.',
    }))
    autoUpdater.on('error', () => this.setSnapshot({ state: 'error', message: safeUpdaterError() }))
    this.listenersRegistered = true
  }

  private setSnapshot(patch: Partial<UpdateSnapshot>): void {
    this.snapshot = { ...this.snapshot, ...patch, currentVersion: app.getVersion() }
    for (const win of BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed()) win.webContents.send('updater:state', this.getSnapshot())
    }
  }
}
