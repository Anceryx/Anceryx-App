import { app, safeStorage } from 'electron'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'

const role = process.env['ANCERYX_SAFE_STORAGE_ROLE']
const userDataPath = process.env['ANCERYX_SAFE_STORAGE_USER_DATA']
const statusPath = process.env['ANCERYX_SAFE_STORAGE_STATUS']
const refreshToken = 'safe-storage-two-process-refresh-token-fixture-00000000000000000000'

function fail(message: string): never {
  process.stderr.write(`ELECTRON_SAFE_STORAGE_SMOKE_FAIL: ${message}\n`)
  throw new Error(message)
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) fail(message)
}

function requirePaths(): { root: string; status: string } {
  assert(typeof userDataPath === 'string' && userDataPath.length > 0, 'missing controlled userData')
  assert(typeof statusPath === 'string' && statusPath.length > 0, 'missing process status path')
  assert(safeStorage.isEncryptionAvailable(), 'SAFE_STORAGE_UNAVAILABLE')
  return { root: userDataPath, status: statusPath }
}

async function runProcessA(): Promise<void> {
  const { root, status } = requirePaths()
  assert(role === 'A', 'invalid process A role')
  await mkdir(root, { recursive: true })
  const encryptedPath = join(root, 'refresh-token.bin')
  assert(!existsSync(encryptedPath), 'test storage was not fresh')
  const encrypted = safeStorage.encryptString(refreshToken)
  writeFileSync(encryptedPath, encrypted)
  assert(!readFileSync(encryptedPath).includes(Buffer.from(refreshToken)), 'refresh token was written plaintext')
  writeFileSync(status, 'pass\n', 'utf8')
  console.log('PROCESS_A_PASS Electron real; safeStorage encrypted refresh token')
}

async function runProcessB(): Promise<void> {
  const { root, status } = requirePaths()
  assert(role === 'B', 'invalid process B role')
  const encryptedPath = join(root, 'refresh-token.bin')
  assert(existsSync(encryptedPath), 'process A encrypted token is missing')
  const decrypted = safeStorage.decryptString(readFileSync(encryptedPath))
  assert(decrypted === refreshToken, 'refresh token did not decrypt byte-for-byte')
  writeFileSync(status, 'pass\n', 'utf8')
  console.log('PROCESS_B_PASS new Electron process; safeStorage reopened encrypted refresh token')
}

app.whenReady().then(async () => {
  console.log(`ELECTRON_SAFE_STORAGE_ENTRY role=${role ?? 'missing'} electron=${process.versions.electron ?? 'missing'}`)
  if (userDataPath) app.setPath('userData', userDataPath)
  try {
    if (role === 'A') await runProcessA()
    else if (role === 'B') await runProcessB()
    else fail('missing role')
    process.exit(0)
  } catch (error) {
    if (error instanceof Error && error.message === 'SAFE_STORAGE_UNAVAILABLE') console.error('SAFE_STORAGE_UNAVAILABLE')
    else console.error(error instanceof Error ? error.stack ?? error.message : error)
    process.exit(1)
  }
})
