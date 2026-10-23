import { readFile } from 'node:fs/promises'
import { assertUpdateSigningKeyMatches } from './update-signing-key.mjs'

const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
const [trust, policy] = await Promise.all([
  readFile(new URL('../src/main/updater/updateTrust.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/main/updater/updateUtils.ts', import.meta.url), 'utf8'),
])

if (process.env.RELEASE_TAG !== `v${pkg.version}` || !/^0\.17\.1(?:-beta\.\d+)?$/.test(pkg.version)) throw new Error('The reviewed tag must exactly match the prepared 0.17.1 package version.')
if (!/UPDATE_MANIFEST_SIGNATURE_VERIFICATION_ENABLED\s*=\s*true/.test(policy)) throw new Error('The application updater remains disabled pending owner-approved Windows QA.')
assertUpdateSigningKeyMatches(trust, process.env.ANCERYX_UPDATE_MANIFEST_PRIVATE_KEY)
