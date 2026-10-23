import { app, BrowserWindow, desktopCapturer, ipcMain, net, protocol, safeStorage, session, shell } from 'electron'
import { existsSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'fs'
import { isAbsolute, join, relative, resolve } from 'path'
import { pathToFileURL } from 'url'
import { randomUUID } from 'crypto'
import type { LicenseManifest } from '../shared/licenseTypes'
import { parseAppDeepLink } from '../shared/appDeepLink'
import { createDraftStore, type DraftKey, type DraftScope } from './draftStoreCore'
import { UpdateManager } from './updater/updateManager'
import { registerUpdateIpc } from './updater/updateIpc'
import { isTrustedRenderer, type RendererIpcEvent } from './ipcSecurity'

// ── Protocolos permitidos para links externos ─────────────────────────────────
const SAFE_EXTERNAL_PROTOCOLS = new Set(['https:'])
const RENDERER_SCHEME = 'app'
const RENDERER_HOST = 'anceryx'

protocol.registerSchemesAsPrivileged([{
  scheme: RENDERER_SCHEME,
  privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true },
}])
const DEFAULT_WINDOW_STATE = {
  width: 1280,
  height: 700,
  minWidth: 1024,
  minHeight: 640,
}

const OAUTH_SCHEME = 'anceryx'
app.setName('Anceryx')

const updateManager = new UpdateManager()

const OAUTH_HOST = 'oauth'
let mainWindow: BrowserWindow | null = null
let pendingGoogleHandoff: { code?: string; error?: string } | null = null
let pendingCommunityInvite: string | null = null
let pendingAppDeepLink: ReturnType<typeof parseAppDeepLink> = null
let selectedScreenSourceId: string | null = null
let selectedScreenSourceExpiresAt = 0

if (!app.requestSingleInstanceLock()) app.quit()
else app.setAsDefaultProtocolClient(OAUTH_SCHEME)

function handleAppProtocolUrl(rawUrl: string): void {
  try {
    const parsed = new URL(rawUrl)
    if (parsed.protocol !== `${OAUTH_SCHEME}:`) return
    if (parsed.hostname === 'invite' && !parsed.port && !parsed.username && !parsed.password && !parsed.search && !parsed.hash) {
      const token = parsed.pathname.slice(1)
      if (!/^[A-Za-z0-9_-]{24,128}$/.test(token)) return
      pendingCommunityInvite = token
      if (mainWindow && !mainWindow.isDestroyed()) {
        const target = mainWindow
        const deliver = () => {
          if (!pendingCommunityInvite || target.isDestroyed()) return
          target.webContents.send('community:invite', pendingCommunityInvite)
          pendingCommunityInvite = null
        }
        if (target.webContents.isLoading()) target.webContents.once('did-finish-load', deliver)
        else deliver()
      }
      return
    }
    if (parsed.hostname !== OAUTH_HOST || parsed.pathname !== '/google') {
      pendingAppDeepLink = parseAppDeepLink(rawUrl)
      if (pendingAppDeepLink && mainWindow && !mainWindow.isDestroyed()) {
        const target = mainWindow
        const deliver = () => {
          if (!pendingAppDeepLink || target.isDestroyed()) return
          target.webContents.send('app:deep-link', pendingAppDeepLink)
          pendingAppDeepLink = null
        }
        if (target.webContents.isLoading()) target.webContents.once('did-finish-load', deliver)
        else deliver()
      }
      return
    }
    const code = parsed.searchParams.get('code')
    const error = parsed.searchParams.get('error')
    if ((code && !/^[A-Za-z0-9_-]{32,512}$/.test(code)) || (error && !/^[A-Za-z0-9_-]{3,64}$/.test(error))) return
    const payload = code ? { code } : { error: error ?? 'oauth_failed' }
    pendingGoogleHandoff = payload
    if (mainWindow && !mainWindow.isDestroyed()) {
      const target = mainWindow
      const deliver = () => {
        if (!pendingGoogleHandoff || target.isDestroyed()) return
        target.webContents.send('auth:google-handoff', pendingGoogleHandoff)
        pendingGoogleHandoff = null
      }
      if (target.webContents.isLoading()) target.webContents.once('did-finish-load', deliver)
      else deliver()
    }
  } catch {
    // Ignore malformed custom-protocol URLs.
  }
}

app.on('second-instance', (_event, commandLine) => {
  const callbackUrl = commandLine.find((argument) => argument.startsWith(`${OAUTH_SCHEME}://`))
  if (callbackUrl) handleAppProtocolUrl(callbackUrl)
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  }
})
app.on('open-url', (event, url) => { event.preventDefault(); handleAppProtocolUrl(url) })

interface WindowState {
  width: number
  height: number
  x?: number
  y?: number
  isMaximized?: boolean
}

function getWindowStatePath(): string {
  return join(app.getPath('userData'), 'window-state.json')
}

function getRefreshTokenPath(): string {
  return join(app.getPath('userData'), 'auth-session.bin')
}

function getDraftStorePath(): string { return join(app.getPath('userData'), 'drafts.enc') }

const encryptedDraftStore = createDraftStore({
  read: () => existsSync(getDraftStorePath()) ? readFileSync(getDraftStorePath()) : null,
  write: (encrypted) => {
    const target = getDraftStorePath()
    const temporary = `${target}.${process.pid}.${randomUUID()}.tmp`
    try {
      writeFileSync(temporary, encrypted)
      renameSync(temporary, target)
    } catch (error) {
      if (existsSync(temporary)) unlinkSync(temporary)
      throw error
    }
  },
},
(plain) => safeStorage.encryptString(Buffer.from(plain).toString('utf8')),
(encrypted) => Buffer.from(safeStorage.decryptString(Buffer.from(encrypted)), 'utf8'))

function isTrustedRendererEvent(event: RendererIpcEvent): boolean {
  const developmentRendererUrl = app.isPackaged ? undefined : process.env['ELECTRON_RENDERER_URL']
  return isTrustedRenderer(event, mainWindow?.webContents ?? null, developmentRendererUrl)
}

function getTrustedMainWindow(event: RendererIpcEvent): BrowserWindow | null {
  if (!isTrustedRendererEvent(event)) return null
  const senderWindow = BrowserWindow.fromWebContents(event.sender)
  return senderWindow && senderWindow === mainWindow && !senderWindow.isDestroyed() ? senderWindow : null
}

function registerMainWindowIpc(): void {
  ipcMain.on('win:minimize', (event) => { getTrustedMainWindow(event)?.minimize() })
  ipcMain.on('win:maximize', (event) => {
    const win = getTrustedMainWindow(event)
    if (!win) return
    if (win.isMaximized()) win.unmaximize()
    else win.maximize()
  })
  ipcMain.on('win:close', (event) => { getTrustedMainWindow(event)?.close() })
  ipcMain.handle('win:isMaximized', (event) => getTrustedMainWindow(event)?.isMaximized() ?? false)
  ipcMain.handle('app:getVersion', (event) => {
    if (!isTrustedRendererEvent(event)) throw new Error('Ação indisponível para esta janela.')
    return app.getVersion()
  })
  ipcMain.handle('licenses:get-manifest', (event): LicenseManifest => {
    if (!isTrustedRendererEvent(event)) throw new Error('Ação indisponível para esta janela.')
    const licensePath = join(__dirname, '../licenses/licenses.json')
    if (!existsSync(licensePath)) return { generatedAt: '', source: 'package-lock.json', records: [], warnings: [], legalNotes: ['O inventário de licenças será gerado durante o build.'] }
    return JSON.parse(readFileSync(licensePath, 'utf8')) as LicenseManifest
  })
  ipcMain.on('shell:openExternal', (event, url: unknown) => {
    if (!isTrustedRendererEvent(event) || typeof url !== 'string' || url.length > 2048) return
    try {
      const parsed = new URL(url)
      if (
        SAFE_EXTERNAL_PROTOCOLS.has(parsed.protocol) &&
        ['www.anceryx.site', 'checkout.stripe.com', 'billing.stripe.com', 'accounts.google.com'].includes(parsed.hostname)
      ) {
        void shell.openExternal(url)
      }
    } catch {
      console.warn('[main] shell:openExternal bloqueado para URL inválida.')
    }
  })
}

registerMainWindowIpc()
registerUpdateIpc(updateManager, isTrustedRendererEvent)

function parseDraftKey(value: unknown): DraftKey | null {
  if (!value || typeof value !== 'object') return null
  const candidate = value as Partial<DraftKey>
  if (typeof candidate.userId !== 'string' || typeof candidate.resourceId !== 'string' || !['dm', 'forum-channel', 'forum-topic', 'forum-reply', 'post'].includes(String(candidate.scope))) return null
  return { userId: candidate.userId, resourceId: candidate.resourceId, scope: candidate.scope as DraftScope }
}

ipcMain.handle('drafts:get', (event, input: unknown) => {
  if (!isTrustedRendererEvent(event) || !safeStorage.isEncryptionAvailable()) return { ok: false, content: null }
  const key = parseDraftKey(input)
  if (!key) return { ok: false, content: null }
  try { return { ok: true, content: encryptedDraftStore.get(key) } }
  catch { return { ok: false, content: null } }
})
ipcMain.handle('drafts:save', (event, input: unknown, content: unknown) => {
  if (!isTrustedRendererEvent(event) || !safeStorage.isEncryptionAvailable()) return false
  const key = parseDraftKey(input)
  if (!key) return false
  try { encryptedDraftStore.save(key, content); return true }
  catch { return false }
})
ipcMain.handle('drafts:delete', (event, input: unknown) => {
  if (!isTrustedRendererEvent(event) || !safeStorage.isEncryptionAvailable()) return false
  const key = parseDraftKey(input)
  if (!key) return false
  try { encryptedDraftStore.delete(key); return true }
  catch { return false }
})

function resolveRendererAsset(requestUrl: string): string | null {
  const url = new URL(requestUrl)
  if (url.hostname !== RENDERER_HOST) return null
  const root = resolve(__dirname, '../renderer')
  const requested = decodeURIComponent(url.pathname).replace(/^\/+/, '') || 'index.html'
  const target = resolve(root, requested)
  const rel = relative(root, target)
  if (!rel || rel.startsWith('..') || isAbsolute(rel)) return null
  return target
}

ipcMain.handle('auth:refresh-token:get', (event) => {
  if (!isTrustedRendererEvent(event)) return null
  try {
    const tokenPath = getRefreshTokenPath()
    if (!safeStorage.isEncryptionAvailable() || !existsSync(tokenPath)) return null
    return safeStorage.decryptString(readFileSync(tokenPath))
  } catch {
    return null
  }
})
ipcMain.handle('auth:refresh-token:set', (event, token: unknown) => {
  if (!isTrustedRendererEvent(event)) return false
  if (typeof token !== 'string' || token.length < 32 || !safeStorage.isEncryptionAvailable()) return false
  writeFileSync(getRefreshTokenPath(), safeStorage.encryptString(token))
  return true
})
ipcMain.handle('auth:refresh-token:clear', (event) => {
  if (!isTrustedRendererEvent(event)) return false
  const tokenPath = getRefreshTokenPath()
  if (existsSync(tokenPath)) unlinkSync(tokenPath)
  return true
})

function loadWindowState(): WindowState {
  const fallback: WindowState = {
    width: DEFAULT_WINDOW_STATE.width,
    height: DEFAULT_WINDOW_STATE.height,
  }

  try {
    const statePath = getWindowStatePath()
    if (!existsSync(statePath)) return fallback

    const parsed = JSON.parse(readFileSync(statePath, 'utf8')) as Partial<WindowState>
    if (
      typeof parsed.width !== 'number' ||
      typeof parsed.height !== 'number' ||
      parsed.width < DEFAULT_WINDOW_STATE.minWidth ||
      parsed.height < DEFAULT_WINDOW_STATE.minHeight
    ) {
      return fallback
    }

    return {
      width: parsed.width,
      height: parsed.height,
      x: typeof parsed.x === 'number' ? parsed.x : undefined,
      y: typeof parsed.y === 'number' ? parsed.y : undefined,
      isMaximized: parsed.isMaximized === true,
    }
  } catch {
    return fallback
  }
}

function saveWindowState(win: BrowserWindow): void {
  try {
    const bounds = win.getBounds()
    const state: WindowState = {
      width: bounds.width,
      height: bounds.height,
      x: bounds.x,
      y: bounds.y,
      isMaximized: win.isMaximized(),
    }
    writeFileSync(getWindowStatePath(), JSON.stringify(state, null, 2), 'utf8')
  } catch (error) {
    console.warn('[main] Nao foi possivel salvar estado da janela:', error)
  }
}

function createWindow(): void {
  const windowState = loadWindowState()
  const win = new BrowserWindow({
    title: 'Anceryx',
    width: windowState.width,
    height: windowState.height,
    x: windowState.x,
    y: windowState.y,
    minWidth: DEFAULT_WINDOW_STATE.minWidth,
    minHeight: DEFAULT_WINDOW_STATE.minHeight,
    resizable: true,
    maximizable: true,
    minimizable: true,
    closable: true,
    frame: false,
    icon: join(__dirname, '../../resources/icon.png'),
    webPreferences: {
      contextIsolation: true,       // renderer não acessa APIs Node diretamente
      nodeIntegration: false,       // Node.js desabilitado no renderer
      sandbox: true,                // processo renderer isolado em sandbox
      preload: join(__dirname, '../preload/preload.js'),
      // Desabilita WebSecurity apenas em dev com Vite (hot-reload exige)
      webSecurity: !process.env['ELECTRON_RENDERER_URL'],
      allowRunningInsecureContent: false,
      // Desabilita APIs deprecadas e perigosas
      experimentalFeatures: false,
    }
  })
  mainWindow = win

  if (windowState.isMaximized) {
    win.maximize()
  }

  // ── Content Security Policy ───────────────────────────────────────────────
  // Bloqueia eval, inline scripts não autorizados e fontes externas não listadas.
  // Em DEV: relaxa script-src para permitir hot-reload do Vite.
  const mediaRanges = new Map<number, string>()
  win.webContents.session.webRequest.onBeforeSendHeaders((details, callback) => {
    if (details.resourceType === 'media') {
      const range = details.requestHeaders.Range ?? details.requestHeaders.range
      if (range) mediaRanges.set(details.id, String(range))
    }
    callback({ requestHeaders: details.requestHeaders })
  })
  win.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    const isDev = !!process.env['ELECTRON_RENDERER_URL']
    const scriptSrc = isDev
      ? "'self' 'unsafe-inline' 'unsafe-eval'"   // necessário apenas para Vite HMR
      : "'self'"

    if (details.resourceType === 'media') {
      const responseHeaders = details.responseHeaders ?? {}
      const readHeader = (name: string) => Object.entries(responseHeaders).find(([key]) => key.toLowerCase() === name)?.[1]?.join(', ') ?? null
      console.info('[media-network] response', {
        statusCode: details.statusCode,
        mimeType: readHeader('content-type'),
        contentLength: readHeader('content-length'),
        contentDisposition: readHeader('content-disposition'),
        acceptRanges: readHeader('accept-ranges'),
        contentRange: readHeader('content-range'),
        rangeRequested: mediaRanges.get(details.id) ?? null,
      })
    }

    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          [
            `default-src 'self'`,
            `script-src ${scriptSrc}`,
            `style-src 'self' 'unsafe-inline'`,  // Tailwind injeta estilos inline
            `img-src 'self' data: blob: https:${isDev ? ' http://localhost:3000' : ''}`,
            `font-src 'self' data:`,
            `connect-src 'self' https: wss:${isDev ? ' http://localhost:3000 ws://localhost:3000' : ''}`,
            `media-src 'self' blob: https://admin-anceryx.site https://blob.squarecloud.dev https://public-blob.squarecloud.dev${isDev ? ' http://localhost:3000' : ''}`,
            `object-src 'none'`,
            `base-uri 'self'`,
            `form-action 'self'`,
            `frame-ancestors 'none'`,
          ].join('; ')
        ]
      }
    })
  })
  win.webContents.session.webRequest.onBeforeRedirect((details) => {
    if (details.resourceType !== 'media') return
    let targetOrigin: string | null = null
    try { targetOrigin = new URL(details.redirectURL).origin } catch { /* Keep malformed redirect targets out of diagnostics. */ }
    console.info('[media-network] redirect', { statusCode: details.statusCode, targetOrigin })
  })
  win.webContents.session.webRequest.onErrorOccurred((details) => {
    if (details.resourceType === 'media') {
      mediaRanges.delete(details.id)
      console.warn('[media-network] request failed', { error: details.error })
    }
  })
  win.webContents.session.webRequest.onCompleted((details) => {
    if (details.resourceType === 'media') {
      mediaRanges.delete(details.id)
      console.info('[media-network] request completed', { statusCode: details.statusCode })
    }
  })

  // ── Bloquear navegação arbitrária ─────────────────────────────────────────
  // Impede que conteúdo da página redirecione a janela para URLs externas.
  win.webContents.on('will-navigate', (event, url) => {
    const parsed = new URL(url)
    const isLocalDev  = url.startsWith(process.env['ELECTRON_RENDERER_URL'] ?? '__never__')
    const isLocalFile = parsed.protocol === 'file:'

    if (!isLocalDev && !isLocalFile) {
      event.preventDefault()
      console.warn('[main] Navegação bloqueada:', url)
    }
  })

  // ── Impedir abertura de novas janelas não autorizadas ──────────────────────
  win.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const parsed = new URL(url)
      if (SAFE_EXTERNAL_PROTOCOLS.has(parsed.protocol)) {
        // Abre links HTTPS externos no browser padrão do SO, nunca em nova BrowserWindow
        void shell.openExternal(url)
      } else {
        console.warn('[main] window.open bloqueado para protocolo inseguro:', parsed.protocol)
      }
    } catch {
      console.warn('[main] window.open bloqueado para URL inválida:', url)
    }
    // Sempre retorna deny — nunca cria uma nova BrowserWindow a partir do renderer
    return { action: 'deny' }
  })

  // ── Carregar a aplicação ───────────────────────────────────────────────────
  if (process.env['ELECTRON_RENDERER_URL']) {
    void win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    void win.loadURL('app://anceryx/index.html')
  }

  win.webContents.once('did-finish-load', () => {
    if (pendingGoogleHandoff) win.webContents.send('auth:google-handoff', pendingGoogleHandoff)
    if (pendingCommunityInvite) { win.webContents.send('community:invite', pendingCommunityInvite); pendingCommunityInvite = null }
    if (pendingAppDeepLink) { win.webContents.send('app:deep-link', pendingAppDeepLink); pendingAppDeepLink = null }
    pendingGoogleHandoff = null
  })

  win.on('maximize', () => {
    win.webContents.send('win:maximized-change', true)
  })
  win.on('unmaximize', () => {
    win.webContents.send('win:maximized-change', false)
  })
  win.on('close', () => {
    saveWindowState(win)
  })
}

app.whenReady().then(() => {
  updateManager.start()
  session.defaultSession.setDisplayMediaRequestHandler(async (request, callback) => {
    if (!request.frame || request.frame !== request.frame.top || request.frame !== mainWindow?.webContents.mainFrame) { callback({}); return }
    const requestedSourceId = selectedScreenSourceId
    selectedScreenSourceId = null
    const selectionValid = Date.now() <= selectedScreenSourceExpiresAt
    selectedScreenSourceExpiresAt = 0
    if (!requestedSourceId || !selectionValid) { callback({}); return }
    try {
      const sources = await desktopCapturer.getSources({ types: ['screen', 'window'], thumbnailSize: { width: 0, height: 0 } })
      const source = sources.find((item) => item.id === requestedSourceId)
      callback(source ? { video: source } : {})
    } catch {
      callback({})
    }
  })
  ipcMain.handle('screen-capture:list-sources', async (event) => {
    if (!isTrustedRendererEvent(event)) throw new Error('Ação indisponível para esta janela.')
    const sources = await desktopCapturer.getSources({ types: ['screen', 'window'], thumbnailSize: { width: 320, height: 180 } })
    return sources.map(({ id, name, thumbnail }) => ({ id, name, thumbnail: thumbnail.isEmpty() ? null : thumbnail.toDataURL() }))
  })
  ipcMain.handle('screen-capture:select-source', async (event, sourceId: unknown) => {
    if (!isTrustedRendererEvent(event) || typeof sourceId !== 'string') throw new Error('Fonte de captura inválida.')
    const sources = await desktopCapturer.getSources({ types: ['screen', 'window'], thumbnailSize: { width: 0, height: 0 } })
    if (!sources.some((source) => source.id === sourceId)) throw new Error('A fonte de captura não está mais disponível.')
    selectedScreenSourceId = sourceId
    selectedScreenSourceExpiresAt = Date.now() + 30_000
    return true
  })
  protocol.handle(RENDERER_SCHEME, async (request) => {
    try {
      const asset = resolveRendererAsset(request.url)
      if (!asset) return new Response('Not found', { status: 404 })
      return net.fetch(pathToFileURL(asset).toString())
    } catch {
      return new Response('Not found', { status: 404 })
    }
  })
  // Desativa o menu padrão do Electron (evita acesso a DevTools em produção)
  if (!process.env['ELECTRON_RENDERER_URL']) {
    app.applicationMenu = null
  }

  const initialProtocolUrl = process.argv.find((argument) => argument.startsWith(`${OAUTH_SCHEME}://`))
  if (initialProtocolUrl) handleAppProtocolUrl(initialProtocolUrl)
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('will-quit', () => updateManager.stop())

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
