import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')
const qa = read('../.github/workflows/windows-release.yml')
const publish = read('../.github/workflows/publish-windows-release.yml')
const ci = read('../.github/workflows/ci.yml')

function assertStandaloneStep(workflow, command, workflowName) {
  const escaped = command.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const standalone = new RegExp(`^\\s+(?:-\\s*)?run:\\s+${escaped}\\s*$`, 'gm')
  const matches = workflow.match(standalone) ?? []
  assert.equal(matches.length, 1, `${workflowName} must execute "${command}" in exactly one standalone Actions step`)
  assert.equal(workflow.split(command).length - 1, 1, `${workflowName} must not hide or duplicate "${command}" in a shell block`)
}

assert.throws(() => assertStandaloneStep('- name: checks\n  run: |\n    npm run typecheck\n    npm run test:connection-config', 'npm run test:connection-config', 'masked-failure fixture'))
assertStandaloneStep(ci, 'npm run test:workflow-fail-fast', 'Pull request CI')

const qaCommands = [
  'npm ci',
  'npm run test:workflow-fail-fast',
  'npm run typecheck',
  'npm run build',
  'npm run audit:licenses',
  'npm run test:license-audit',
  'npm run test:update-security',
  'npm run test:connection-config',
  'npm run test:encoding',
  'npm audit --omit=dev --audit-level=moderate',
  'npm run test:electron-safe-storage',
  'npm run electron:build',
]
const publishCommands = [
  'npm ci',
  'npm run test:workflow-fail-fast',
  'npm run typecheck',
  'npm run build',
  'npm run audit:licenses',
  'npm run test:license-audit',
  'npm run test:update-security',
  'npm run test:connection-config',
  'npm run test:encoding',
  'npm run test:electron-safe-storage',
  'npm audit --audit-level=moderate',
  'npm audit --omit=dev --audit-level=moderate',
]

for (const command of qaCommands) assertStandaloneStep(qa, command, 'Windows QA workflow')
for (const command of publishCommands) assertStandaloneStep(publish, command, 'Protected publication workflow')

assert.match(publish, /git fetch origin main\s+if \(\$LASTEXITCODE -ne 0\)/)
assert.match(publish, /git rev-list -n 1 \$env:TAG\s+if \(\$LASTEXITCODE -ne 0 -or -not \$tagCommit\)/)
assert.match(publish, /releaseLookupExitCode = \$LASTEXITCODE[\s\S]*release not found/)
assert.match(publish, /npx electron-builder[\s\S]*?if \(\$LASTEXITCODE -ne 0\)/)
assert.match(publish, /\$version = node -p[\s\S]*?if \(\$LASTEXITCODE -ne 0\)[\s\S]*create-update-manifest\.mjs/)
assert.match(publish, /create-update-manifest\.mjs[\s\S]*?if \(\$LASTEXITCODE -ne 0\)/)

console.log('workflow fail-fast regression checks passed')
