import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

const root = process.cwd()
const lock = JSON.parse(readFileSync(join(root, 'package-lock.json'), 'utf8'))
const direct = new Set([...Object.keys(lock.packages['']?.dependencies ?? {}), ...Object.keys(lock.packages['']?.devDependencies ?? {})])
const runtime = new Set(Object.keys(lock.packages['']?.dependencies ?? {}))
const records = []
const warnings = []
const licenseNames = new Set(['LICENSE', 'LICENSE.md', 'LICENSE.txt', 'COPYING', 'COPYING.md', 'NOTICE', 'NOTICE.md', 'NOTICE.txt'])

function classify(license) {
  const value = String(license ?? '').toUpperCase()
  if (!license) return 'unknown'
  if (value.includes('MPL-2.0')) return 'review'
  if (value.includes('AGPL') || value.includes('GPL') || value.includes('LGPL')) return 'copyleft'
  if (value.includes('CC-BY')) return 'attribution'
  return 'permissive'
}
function readText(packageDir) {
  try {
    const candidate = readdirSync(packageDir).find((name) => licenseNames.has(name.toUpperCase()))
    if (!candidate || statSync(join(packageDir, candidate)).size > 150_000) return undefined
    return readFileSync(join(packageDir, candidate), 'utf8').slice(0, 150_000)
  } catch { return undefined }
}

for (const [packagePath, entry] of Object.entries(lock.packages ?? {})) {
  if (!packagePath || !packagePath.includes('node_modules/')) continue
  const packageDir = join(root, packagePath)
  const packageJsonPath = join(packageDir, 'package.json')
  if (!existsSync(packageJsonPath)) {
    if (!entry.optional) warnings.push({ type: 'missing-metadata', packagePath })
    continue
  }
  const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf8'))
  const name = pkg.name
  const license = typeof pkg.license === 'string' ? pkg.license : Array.isArray(pkg.licenses) ? pkg.licenses.map((item) => item.type).filter(Boolean).join(' OR ') : ''
  const isDirect = direct.has(name)
  const licenseText = readText(packageDir)
  const review = classify(license)
  const record = { name, version: pkg.version || entry.version || 'unknown', license: license || 'UNKNOWN', scope: isDirect ? (runtime.has(name) ? 'runtime' : 'development') : 'transitive', direct: isDirect, optional: Boolean(entry.optional), author: typeof pkg.author === 'string' ? pkg.author : pkg.author?.name, repository: typeof pkg.repository === 'string' ? pkg.repository : pkg.repository?.url, licenseText, review }
  records.push(record)
  if (review === 'unknown') warnings.push({ type: 'unknown-license', name, version: record.version, license: record.license })
  if (!licenseText) warnings.push({ type: 'missing-license-text', name, version: record.version })
}

const unique = [...new Map(records.map((record) => [`${record.name}@${record.version}`, record])).values()].sort((a, b) => a.name.localeCompare(b.name))
const manifest = { generatedAt: new Date().toISOString(), source: 'package-lock.json', packageCount: unique.length, records: unique, warnings, legalNotes: ['This offline inventory is generated from installed metadata and the committed lockfile; it is not legal advice.', 'The package count is the number of unique installed package records; it can differ from the number of lockfile entries or audit findings.', 'Electron, Chromium, Node.js, native binaries and installer notices require release-time verification.'] }
const output = join(root, 'out', 'licenses', 'licenses.json')
mkdirSync(dirname(output), { recursive: true })
writeFileSync(output, JSON.stringify(manifest, null, 2) + '\n', 'utf8')
console.log(`Generated ${unique.length} license records at ${output}`)
