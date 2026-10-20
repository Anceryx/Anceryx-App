import { readdir, readFile } from 'node:fs/promises'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const ignoredDirectories = new Set(['.git', '.agents', '.codex', 'node_modules', 'out', 'dist', 'artifacts', 'coverage'])
const textExtensions = new Set(['.cjs', '.css', '.env', '.example', '.html', '.js', '.json', '.md', '.mjs', '.ps1', '.sh', '.sql', '.toml', '.ts', '.tsx', '.txt', '.yml', '.yaml'])
const mojibakePattern = /(?:\u00c3(?:\u0192|\u201e|[\u00a9\u00aa\u00ad\u00b0\u00b9\u00ba\u00a3\u00a7\u00b4-\u00b8\u00bc-\u00be])|\u00c2[\u0080-\u00bf]|\u00e2(?:\u20ac|\u201a)|\u00f0\u0178|\u00c3\u00af\u00c2\u00bf\u00c2\u00bd|\ufffd)/u

export function isMojibake(value) {
  return mojibakePattern.test(value)
}

function isHistoricalMigration(path) {
  return /^anceryx-api[\\/]migrations[\\/]00(?:0[0-9]|1[0-9]|2[0-6])_.+\.sql$/u.test(path)
}

async function scan(directory, findings = []) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) await scan(path, findings)
      continue
    }
    const extension = path.slice(path.lastIndexOf('.'))
    if (!textExtensions.has(extension) || isHistoricalMigration(relative(root, path))) continue
    const content = await readFile(path, 'utf8')
    const lines = content.split(/\r?\n/u)
    lines.forEach((line, index) => {
      if (isMojibake(line)) findings.push(`${relative(root, path)}:${index + 1}: probable mojibake`)
    })
  }
  return findings
}

const findings = await scan(root)
if (findings.length) {
  process.stderr.write(`${findings.join('\n')}\n`)
  process.exitCode = 1
} else {
  process.stdout.write('Encoding scan passed for maintained text files (published historical SQL migrations excluded).\n')
}
