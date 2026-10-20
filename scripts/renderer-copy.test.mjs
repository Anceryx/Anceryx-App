import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import { join, relative } from 'node:path'
import test from 'node:test'

const root = join(import.meta.dirname, '..', 'src', 'renderer')
const sourceExtensions = new Set(['.ts', '.tsx', '.html'])
const mojibake = /(?:\u00c3[\u0080-\u00bf]|\u00c2[\u0080-\u00bf]|\u00c3\u00a2[\u0080-\u00bf]|\u00c3\u00b0\u00c5\u00b8|\u00c3\u00af\u00c2\u00bf\u00c2\u00bd|\uFFFD)/u

async function collectSources(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) files.push(...await collectSources(path))
    else if (sourceExtensions.has(path.slice(path.lastIndexOf('.')))) files.push(path)
  }
  return files
}

test('renderer has no common mojibake or developer-facing API copy', async () => {
  const findings = []
  for (const path of await collectSources(root)) {
    const content = await readFile(path, 'utf8')
    if (mojibake.test(content)) findings.push(`${relative(root, path)}: encoding corruption`)
    if (/(?:API real|endpoint dispon[i\u00ed]vel|Pol\u00edticas efetivamente aplicadas pelo backend)/iu.test(content)) findings.push(`${relative(root, path)}: developer-facing copy`)
  }
  assert.deepEqual(findings, [])
})
