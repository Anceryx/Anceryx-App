export function resolveMediaUrl(publicUrl: string, apiBaseUrl: string): string {
  const value = publicUrl.trim()
  if (!value) return ''
  if (value.startsWith('data:image/') || value.startsWith('blob:')) return value
  try {
    const resolved = new URL(value, `${apiBaseUrl.replace(/\/$/, '')}/`)
    return resolved.protocol === 'https:' || resolved.protocol === 'http:' ? resolved.toString() : ''
  } catch {
    return ''
  }
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const match = /^data:(image\/(?:png|jpeg|webp|gif));base64,([A-Za-z0-9+/]*={0,2})$/.exec(dataUrl)
  if (!match) throw new Error('Imagem processada inválida.')
  const binary = atob(match[2])
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  return new Blob([bytes], { type: match[1] })
}

export async function detachTracksFromPeer(peer: RTCPeerConnection, stream: MediaStream): Promise<void> {
  for (const track of stream.getTracks()) {
    const sender = peer.getSenders().find((item) => item.track === track)
    if (sender) await sender.replaceTrack(null)
  }
}
