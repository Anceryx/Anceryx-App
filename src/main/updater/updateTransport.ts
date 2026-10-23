import { createHash } from 'node:crypto'
import { request } from 'node:https'
import { createWriteStream } from 'node:fs'
import { unlink } from 'node:fs/promises'
import type { IncomingMessage } from 'node:http'
import { basename } from 'node:path'
import { Transform } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { assertInstallerIntegrity, isTrustedDownloadUrl, selectLatestBetaVersion, verifySignedUpdateManifest, type VerifiedUpdateManifest } from './manifestVerifier'
import type { UpdateChannel } from '../../shared/updateTypes'

const MANIFEST_URL = 'https://github.com/Anceryx/Anceryx-App/releases/latest/download/update-manifest.json'
const MAX_MANIFEST_BYTES = 256 * 1024
const MAX_INSTALLER_BYTES = 500 * 1024 * 1024
const TRUSTED_DOWNLOAD_HOSTS = new Set(['github.com', 'release-assets.githubusercontent.com'])
const TRUSTED_METADATA_HOSTS = new Set([...TRUSTED_DOWNLOAD_HOSTS, 'api.github.com'])

function fetchHttps(url: URL, maxBytes: number, redirects = 0, onProgress?: (percent: number) => void): Promise<Buffer> {
  if (url.protocol !== 'https:' || !TRUSTED_METADATA_HOSTS.has(url.hostname) || url.username || url.password || url.port) return Promise.reject(new Error('UPDATE_UNTRUSTED_URL'))
  if (redirects > 4) return Promise.reject(new Error('UPDATE_REDIRECT_LIMIT'))
  return new Promise((resolve, reject) => {
    const req = request(url, { method: 'GET', headers: { accept: 'application/octet-stream', 'user-agent': 'Anceryx-Updater' }, timeout: 30_000 }, (response: IncomingMessage) => {
      const status = response.statusCode ?? 0
      const location = response.headers.location
      if ([301, 302, 303, 307, 308].includes(status) && location) {
        response.resume()
        let next: URL
        try { next = new URL(location, url) } catch { reject(new Error('UPDATE_REDIRECT_INVALID')); return }
        if (next.protocol !== 'https:' || !TRUSTED_DOWNLOAD_HOSTS.has(next.hostname)) { reject(new Error('UPDATE_UNTRUSTED_URL')); return }
        fetchHttps(next, maxBytes, redirects + 1, onProgress).then(resolve, reject)
        return
      }
      if (status !== 200) { response.resume(); reject(new Error(`UPDATE_HTTP_${status}`)); return }
      const length = Number(response.headers['content-length'])
      if (Number.isFinite(length) && length > maxBytes) { response.destroy(new Error('UPDATE_SIZE_LIMIT')); return }
      const progressTotal = Number.isFinite(length) && length > 0 ? length : maxBytes
      const chunks: Buffer[] = []
      let received = 0
      response.on('data', (part: Buffer) => {
        received += part.length
        if (received > maxBytes) response.destroy(new Error('UPDATE_SIZE_LIMIT'))
        else {
          chunks.push(part)
          onProgress?.(Math.min(99, Math.floor(received / progressTotal * 100)))
        }
      })
      response.on('end', () => resolve(Buffer.concat(chunks, received)))
      response.on('error', reject)
    })
    req.on('timeout', () => req.destroy(new Error('UPDATE_NETWORK_TIMEOUT')))
    req.on('error', reject)
    req.end()
  })
}

export async function fetchVerifiedUpdateManifest(currentVersion: string, channel: UpdateChannel, publicKey: string): Promise<VerifiedUpdateManifest> {
  let manifestUrl = MANIFEST_URL
  if (channel === 'beta') {
    const releases = await fetchHttps(new URL('https://api.github.com/repos/Anceryx/Anceryx-App/releases?per_page=100'), 1024 * 1024)
    let values: unknown
    try { values = JSON.parse(releases.toString('utf8')) } catch { throw new Error('UPDATE_MANIFEST_INVALID') }
    if (!Array.isArray(values)) throw new Error('UPDATE_MANIFEST_INVALID')
    const latest = selectLatestBetaVersion(values, currentVersion)
    if (!latest) throw new Error('UPDATE_NO_UPDATE')
    manifestUrl = `https://github.com/Anceryx/Anceryx-App/releases/download/v${latest}/update-manifest.json`
  }
  const body = await fetchHttps(new URL(manifestUrl), MAX_MANIFEST_BYTES)
  let parsed: unknown
  try { parsed = JSON.parse(body.toString('utf8')) } catch { throw new Error('UPDATE_MANIFEST_INVALID') }
  try { return verifySignedUpdateManifest(parsed, currentVersion, channel, publicKey) }
  catch (error) {
    if (error instanceof Error && error.message === 'UPDATE_DOWNGRADE_BLOCKED') throw new Error('UPDATE_NO_UPDATE')
    throw error
  }
}

export async function downloadVerifiedInstaller(manifest: VerifiedUpdateManifest, destination: string, onProgress: (percent: number) => void): Promise<string> {
  const url = new URL(manifest.installer.url)
  if (basename(destination) !== manifest.installer.name || manifest.installer.size > MAX_INSTALLER_BYTES) throw new Error('UPDATE_INSTALLER_INVALID')
  const hash = createHash('sha512')
  let received = 0
  try {
    await new Promise<void>((resolve, reject) => {
      const getStream = (target: URL, redirects: number): void => {
        if (redirects > 4 || !isTrustedDownloadUrl(target.toString())) { reject(new Error('UPDATE_UNTRUSTED_URL')); return }
        const req = request(target, { method: 'GET', headers: { accept: 'application/octet-stream', 'user-agent': 'Anceryx-Updater' }, timeout: 30_000 }, (response) => {
          const status = response.statusCode ?? 0
          const location = response.headers.location
          if ([301, 302, 303, 307, 308].includes(status) && location) {
            response.resume()
            try { getStream(new URL(location, target), redirects + 1) } catch { reject(new Error('UPDATE_REDIRECT_INVALID')) }
            return
          }
          if (status !== 200) { response.resume(); reject(new Error(`UPDATE_HTTP_${status}`)); return }
          const contentLength = Number(response.headers['content-length'])
          if (Number.isFinite(contentLength) && contentLength !== manifest.installer.size) { response.resume(); reject(new Error('UPDATE_SIZE_MISMATCH')); return }
          const meter = new Transform({ transform(chunk: Buffer, _encoding, callback) {
            received += chunk.length
            if (received > manifest.installer.size || received > MAX_INSTALLER_BYTES) { callback(new Error('UPDATE_SIZE_LIMIT')); return }
            hash.update(chunk)
            onProgress(Math.min(99, Math.floor(received / manifest.installer.size * 100)))
            callback(null, chunk)
          } })
          void pipeline(response, meter, createWriteStream(destination, { flags: 'wx', mode: 0o600 })).then(resolve, reject)
        })
        req.on('timeout', () => req.destroy(new Error('UPDATE_NETWORK_TIMEOUT')))
        req.on('error', reject)
        req.end()
      }
      getStream(url, 0)
    })
    assertInstallerIntegrity(received, hash.digest('base64'), manifest.installer.size, manifest.installer.sha512)
    onProgress(100)
    return destination
  } catch (error) {
    await unlink(destination).catch(() => undefined)
    throw error
  }
}
