import { createPrivateKey, createPublicKey } from 'node:crypto'
import { readFile } from 'node:fs/promises'

const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
if (process.env.RELEASE_TAG !== `v${pkg.version}` || !/^0\.17\.1(?:-beta\.\d+)?$/.test(pkg.version)) throw new Error('The reviewed tag must exactly match the prepared 0.17.1 package version.')
const [trust, policy] = await Promise.all([
  readFile(new URL('../src/main/updater/updateTrust.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/main/updater/updateUtils.ts', import.meta.url), 'utf8'),
])
const keyMatch = /UPDATE_MANIFEST_PUBLIC_KEY_PEM\s*=\s*`([\s\S]*?)`/.exec(trust)
if (!keyMatch?.[1]?.trim()) throw new Error('A production update-manifest public key is not pinned in the app.')
if (!/UPDATE_MANIFEST_SIGNATURE_VERIFICATION_ENABLED\s*=\s*true/.test(policy)) throw new Error('The application updater remains disabled pending owner-approved Windows QA.')
if (!process.env.ANCERYX_UPDATE_MANIFEST_PRIVATE_KEY) throw new Error('The protected Ed25519 signing key is not configured.')
const publicPem = keyMatch[1].replace(/\\n/g, '\n')
const derived = createPublicKey(createPrivateKey(process.env.ANCERYX_UPDATE_MANIFEST_PRIVATE_KEY)).export({ type: 'spki', format: 'der' })
const pinned = createPublicKey(publicPem).export({ type: 'spki', format: 'der' })
if (!derived.equals(pinned)) throw new Error('The protected signing key does not match the app public key.')
