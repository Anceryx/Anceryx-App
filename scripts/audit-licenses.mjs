import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { classifyLicenseExpression } from './license-policy.mjs'

export function collectLicenseAudit(root) {
  const lock = JSON.parse(readFileSync(join(root, 'package-lock.json'), 'utf8'))
  const direct = new Set([...Object.keys(lock.packages['']?.dependencies ?? {}), ...Object.keys(lock.packages['']?.devDependencies ?? {})])
  const records = []
  const findings = []
  for (const [packagePath, entry] of Object.entries(lock.packages ?? {})) {
    if (!packagePath || !packagePath.includes('node_modules/')) continue
    const packageJsonPath = join(root, packagePath, 'package.json')
    if (!existsSync(packageJsonPath)) {
      if (!entry.optional) findings.push({ severity: 'unknown', packagePath, reason: 'installed package metadata is missing' })
      continue
    }
    const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf8'))
    const expression = typeof pkg.license === 'string' ? pkg.license : Array.isArray(pkg.licenses) ? pkg.licenses.map((item) => item.type).filter(Boolean).join(' OR ') : ''
    const value = expression || 'UNKNOWN'
    const classification = classifyLicenseExpression(value)
    const record = { name: pkg.name, version: pkg.version || entry.version, license: value, direct: direct.has(pkg.name), optional: Boolean(entry.optional), path: packagePath, review: classification.review }
    records.push(record)
    if (classification.review === 'unknown') findings.push({ severity: 'unknown', ...record, reason: classification.parsed.reason })
    if (classification.review === 'copyleft') findings.push({ severity: 'policy', ...record, reason: 'copyleft license requires explicit policy approval' })
    if (classification.review === 'review') findings.push({ severity: 'review', ...record, reason: 'recognized license requires documented technical/legal review; it is not an automatic approval' })
  }
  return { generatedAt: new Date().toISOString(), lockfile: 'package-lock.json', packageCount: records.length, records, findings }
}

export function runLicenseAudit(root = process.cwd(), output = process.env.LICENSE_AUDIT_OUTPUT || join(root, 'artifacts', 'license-audit.json')) {
  const report = collectLicenseAudit(root)
  mkdirSync(dirname(output), { recursive: true })
  writeFileSync(output, JSON.stringify(report, null, 2) + '\n', 'utf8')
  console.log(`Audited ${report.packageCount} installed lockfile packages; ${report.findings.length} finding(s). Report: ${output}`)
  for (const finding of report.findings) console.log(`${finding.severity}: ${finding.name || finding.packagePath} ${finding.reason}`)
  return report
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const report = runLicenseAudit()
  if (report.findings.some((finding) => finding.severity === 'unknown' || finding.severity === 'policy')) process.exitCode = 1
}
