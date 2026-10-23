import { app, BrowserWindow, shell } from 'electron'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { UpdateSnapshot } from '../../shared/updateTypes'
import { UPDATE_MANIFEST_SIGNATURE_VERIFICATION_ENABLED, UPDATE_MANUAL_INSTALL_MESSAGE, releaseNotesToLines, resolveUpdateChannel, safeUpdaterError } from './updateUtils'
import { UPDATE_MANIFEST_PUBLIC_KEY_PEM } from './updateTrust'
import { downloadVerifiedInstaller, fetchVerifiedUpdateManifest } from './updateTransport'

const STARTUP_DELAY_MS = 10_000
const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000

export class UpdateManager {
  private readonly channel = resolveUpdateChannel(undefined, false, app.getVersion())
  private snapshot: UpdateSnapshot = {
    state: 'idle', currentVersion: app.getVersion(), latestVersion: null, channel: this.channel,
    configured: app.isPackaged && process.platform === 'win32' && UPDATE_MANIFEST_SIGNATURE_VERIFICATION_ENABLED && Boolean(UPDATE_MANIFEST_PUBLIC_KEY_PEM),
    lastCheckedAt: null, progress: null, releaseNotes: [], message: null,
  }
  private checkPromise: Promise<UpdateSnapshot> | null = null
  private startupTimer: NodeJS.Timeout | null = null
  private intervalTimer: NodeJS.Timeout | null = null
  private installerPath: string | null = null

  constructor() {
    if (!app.isPackaged) this.snapshot.message = 'As atualizações ficam desativadas no ambiente de desenvolvimento.'
    else if (process.platform !== 'win32') this.snapshot.message = 'As atualizações integradas estão disponíveis apenas para Windows.'
    else if (!this.snapshot.configured) this.snapshot.message = UPDATE_MANUAL_INSTALL_MESSAGE
  }

  start(): void {
    if (!this.snapshot.configured || this.startupTimer || this.intervalTimer) return
    this.startupTimer = setTimeout(() => { this.startupTimer = null; void this.check() }, STARTUP_DELAY_MS)
    this.intervalTimer = setInterval(() => { void this.check() }, CHECK_INTERVAL_MS)
  }

  stop(): void {
    if (this.startupTimer) clearTimeout(this.startupTimer)
    if (this.intervalTimer) clearInterval(this.intervalTimer)
    this.startupTimer = null
    this.intervalTimer = null
  }

  getSnapshot(): UpdateSnapshot { return { ...this.snapshot, releaseNotes: [...this.snapshot.releaseNotes] } }

  async check(): Promise<UpdateSnapshot> {
    if (!this.snapshot.configured) return this.getSnapshot()
    if (this.checkPromise) return this.checkPromise
    if (['downloading', 'downloaded', 'installing'].includes(this.snapshot.state)) return this.getSnapshot()
    this.setSnapshot({ state: 'checking', message: null, progress: null })
    this.checkPromise = fetchVerifiedUpdateManifest(app.getVersion(), this.channel, UPDATE_MANIFEST_PUBLIC_KEY_PEM)
      .then((manifest) => {
        this.setSnapshot(manifest.version === app.getVersion()
          ? { state: 'not-available', latestVersion: manifest.version, releaseNotes: [], progress: null, lastCheckedAt: new Date().toISOString(), message: 'Você já está usando a versão mais recente.' }
          : { state: 'available', latestVersion: manifest.version, releaseNotes: releaseNotesToLines(manifest.notes), progress: null, lastCheckedAt: new Date().toISOString(), message: 'Há uma nova versão da Anceryx disponível.' })
        return this.getSnapshot()
      })
      .catch((error) => {
        const code = error && typeof error === 'object' && 'message' in error ? String((error as { message: unknown }).message) : ''
        if (code === 'UPDATE_NO_UPDATE') this.setSnapshot({ state: 'not-available', latestVersion: app.getVersion(), releaseNotes: [], lastCheckedAt: new Date().toISOString(), message: 'Você já está usando a versão mais recente.' })
        else this.setSnapshot({ state: 'error', message: safeUpdaterError(error), lastCheckedAt: new Date().toISOString() })
        return this.getSnapshot()
      })
      .finally(() => { this.checkPromise = null })
    return this.checkPromise
  }

  async download(): Promise<UpdateSnapshot> {
    if (!this.snapshot.configured || this.snapshot.state !== 'available') return this.getSnapshot()
    this.setSnapshot({ state: 'downloading', progress: 0, message: 'Baixando atualização verificada…' })
    try {
      const manifest = await fetchVerifiedUpdateManifest(app.getVersion(), this.channel, UPDATE_MANIFEST_PUBLIC_KEY_PEM)
      if (manifest.version !== this.snapshot.latestVersion) throw new Error('UPDATE_MANIFEST_CHANGED')
      const directory = await mkdtemp(join(tmpdir(), 'anceryx-update-'))
      const target = join(directory, manifest.installer.name)
      this.installerPath = await downloadVerifiedInstaller(manifest, target, (progress) => this.setSnapshot({ progress }))
      this.setSnapshot({ state: 'downloaded', latestVersion: manifest.version, releaseNotes: releaseNotesToLines(manifest.notes), progress: 100, message: 'A atualização foi verificada e está pronta para instalar.' })
    } catch (error) {
      this.setSnapshot({ state: 'error', progress: null, message: safeUpdaterError(error) })
    }
    return this.getSnapshot()
  }

  async restart(): Promise<UpdateSnapshot> {
    if (!this.snapshot.configured || this.snapshot.state !== 'downloaded' || !this.installerPath) return this.getSnapshot()
    this.setSnapshot({ state: 'installing', message: 'O instalador abrirá para você confirmar a atualização.' })
    const error = await shell.openPath(this.installerPath)
    if (error) {
      this.setSnapshot({ state: 'error', message: 'Não foi possível abrir o instalador verificado. Você pode instalar a versão manualmente.' })
      return this.getSnapshot()
    }
    app.quit()
    return this.getSnapshot()
  }

  private setSnapshot(patch: Partial<UpdateSnapshot>): void {
    this.snapshot = { ...this.snapshot, ...patch, currentVersion: app.getVersion() }
    for (const win of BrowserWindow.getAllWindows()) if (!win.isDestroyed()) win.webContents.send('updater:state', this.getSnapshot())
  }
}
