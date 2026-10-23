import type { IpcMainEvent, IpcMainInvokeEvent, WebContents } from 'electron'

export type RendererIpcEvent = IpcMainEvent | IpcMainInvokeEvent

export function isTrustedRenderer(
  event: RendererIpcEvent,
  mainWebContents: WebContents | null,
  developmentRendererUrl?: string,
): boolean {
  if (!mainWebContents || event.sender !== mainWebContents || event.senderFrame !== event.sender.mainFrame) return false

  try {
    const actual = new URL(event.senderFrame.url)
    if (actual.protocol === 'app:' && actual.hostname === 'anceryx' && !actual.username && !actual.password && !actual.port) return true
    return Boolean(developmentRendererUrl && new URL(developmentRendererUrl).origin === actual.origin)
  } catch {
    return false
  }
}
