import { createPrivateKey, createPublicKey, generateKeyPairSync } from 'node:crypto'
import { access, mkdir, readFile, unlink, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

async function ensureMissing(paths) {
  for (const path of paths) {
    try { await access(path); throw new Error(`Refusing to overwrite existing key file: ${path}`) }
    catch (error) {
      if (error instanceof Error && error.message.startsWith('Refusing')) throw error
      if (!(error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT')) throw error
    }
  }
}

function assertMatchingPair(privatePem, publicPem) {
  const derived = createPublicKey(createPrivateKey(privatePem)).export({ type: 'spki', format: 'der' })
  const supplied = createPublicKey(publicPem).export({ type: 'spki', format: 'der' })
  if (!derived.equals(supplied)) throw new Error('The public key does not match the private key.')
}

const [command, first, second] = process.argv.slice(2)

export async function generateUpdateKeyPair(outputDirectory = '.private-update-keys') {
  const directory = resolve(outputDirectory)
  const privatePath = join(directory, 'ANCERYX_UPDATE_MANIFEST_PRIVATE_KEY.pem')
  const publicPath = join(directory, 'ANCERYX_UPDATE_MANIFEST_PUBLIC_KEY.pem')
  await mkdir(directory, { recursive: true, mode: 0o700 })
  await ensureMissing([privatePath, publicPath])

  const { privateKey, publicKey } = generateKeyPairSync('ed25519')
  const privatePem = privateKey.export({ type: 'pkcs8', format: 'pem' })
  const publicPem = publicKey.export({ type: 'spki', format: 'pem' })
  assertMatchingPair(privatePem, publicPem)

  let privateCreated = false
  try {
    await writeFile(privatePath, privatePem, { encoding: 'utf8', flag: 'wx', mode: 0o600 })
    privateCreated = true
    await writeFile(publicPath, publicPem, { encoding: 'utf8', flag: 'wx', mode: 0o644 })
  } catch (error) {
    if (privateCreated) await unlink(privatePath).catch(() => undefined)
    throw error
  }

  return { privatePath, publicPath }
}

export async function verifyUpdateKeyPair(privatePath, publicPath) {
  const [privatePem, publicPem] = await Promise.all([readFile(privatePath, 'utf8'), readFile(publicPath, 'utf8')])
  assertMatchingPair(privatePem, publicPem)
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (command === 'generate') {
    const { privatePath, publicPath } = await generateUpdateKeyPair(first)
    console.log(`Ed25519 key pair generated and mathematically verified. Private key saved locally at: ${privatePath}`)
    console.log(`Public key saved at: ${publicPath}`)
    console.log('The private key contents were not printed. Keep it offline and out of Git; configure it only as the protected GitHub Actions secret.')
  } else if (command === 'verify' && first && second) {
    await verifyUpdateKeyPair(first, second)
    console.log('The Ed25519 key pair matches.')
  } else {
    throw new Error('Usage: node scripts/manage-update-keypair.mjs generate [output-directory] | verify <private.pem> <public.pem>')
  }
}
