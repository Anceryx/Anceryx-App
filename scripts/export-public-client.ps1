[CmdletBinding()]
param(
  [string]$Destination,
  [switch]$RunBuild
)

$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
if ([string]::IsNullOrWhiteSpace($Destination)) {
  $Destination = Join-Path ([System.IO.Path]::GetTempPath()) ("anceryx-desktop-export-" + [guid]::NewGuid().ToString('N'))
}
$destinationPath = [System.IO.Path]::GetFullPath($Destination)
if (Test-Path -LiteralPath $destinationPath) { throw "Destination already exists: $destinationPath" }
New-Item -ItemType Directory -Path $destinationPath | Out-Null

function Copy-Allowlisted([string]$relativePath) {
  $source = Join-Path $repo $relativePath
  if (-not (Test-Path -LiteralPath $source)) { throw "Allowlisted path is missing: $relativePath" }
  $target = Join-Path $destinationPath $relativePath
  $parent = Split-Path -Parent $target
  if (-not (Test-Path -LiteralPath $parent)) { New-Item -ItemType Directory -Path $parent -Force | Out-Null }
  Copy-Item -LiteralPath $source -Destination $target -Recurse -Force
}

$allowlist = @(
  'README.md', 'README.en.md', 'LICENSE', 'NOTICE', 'ASSETS_LICENSE.md', 'SECURITY.md', 'CONTRIBUTING.md', '.github/PULL_REQUEST_TEMPLATE.md', '.github/assets/anceryx-banner.png',
  'package.json', 'package-lock.json', '.env.example', 'tsconfig.json', 'tsconfig.node.json',
  'electron.vite.config.ts', 'electron-builder.yml', 'postcss.config.js', 'tailwind.config.js',
  'src/main', 'src/preload', 'src/renderer', 'src/shared', 'resources', 'scripts/generate-license-assets.mjs', 'scripts/audit-licenses.mjs',
  'docs/legal/licensing-notes.md', 'docs/legal/third-party-notices.md', 'docs/legal/third-party-license-inventory.md',
  'docs/legal/license-content.md', 'docs/legal/public-distribution-checklist.md', 'docs/brand/brand-assets.md',
  'docs/project/public-repository-scope.md', 'docs/project/public-client-boundary.md', 'docs/project/changelog.md',
  'docs/DEPENDENCY_ADOPTION_POLICY.md'
)
foreach ($item in $allowlist) { Copy-Allowlisted $item }

$secretPatterns = @(
  @{ Name = 'PRIVATE_KEY_BLOCK'; Pattern = '-----BEGIN [A-Z ]*PRIVATE KEY-----' },
  @{ Name = 'SECRET_ASSIGNMENT'; Pattern = '(?im)^\s*[A-Z0-9_]*(SECRET|TOKEN|PASSWORD|API_KEY|PRIVATE_KEY|WEBHOOK_SECRET)\s*=\s*[^#\r\n]+$' },
  @{ Name = 'CREDENTIAL_URL'; Pattern = '(?i)(postgres(?:ql)?|mysql|redis)://[^\s"''`]+' },
  @{ Name = 'STRIPE_LIVE_KEY'; Pattern = '(?i)\b(sk_live|rk_live|whsec)_[A-Za-z0-9]+' }
)
$findings = @()
foreach ($file in Get-ChildItem -LiteralPath $destinationPath -Recurse -File) {
  try { $content = Get-Content -LiteralPath $file.FullName -Raw -ErrorAction Stop } catch { continue }
  foreach ($rule in $secretPatterns) {
    if ($content -match $rule.Pattern) { $findings += [pscustomobject]@{ File = $file.FullName.Substring($destinationPath.Length + 1); Category = $rule.Name } }
  }
}
if ($findings.Count -gt 0) {
  $findings | Format-Table -AutoSize | Out-String | Write-Error
  throw 'Secret-shaped content was found in the generated export.'
}

$manifest = Get-ChildItem -LiteralPath $destinationPath -Recurse -File | ForEach-Object { $_.FullName.Substring($destinationPath.Length + 1).Replace('\', '/') } | Sort-Object
$manifest | Set-Content -LiteralPath (Join-Path $destinationPath 'EXPORT_MANIFEST.txt') -Encoding utf8

$forbidden = @('anceryx-api', '.agents', '.git', '.env', 'dist', 'out')
foreach ($name in $forbidden) { if (Test-Path -LiteralPath (Join-Path $destinationPath $name)) { throw "Forbidden path exported: $name" } }

if ($RunBuild) {
  Push-Location $destinationPath
  try {
    npm ci
    npm run typecheck
    npm run build
    npm audit --omit=dev
  } finally { Pop-Location }
}

Write-Output "PUBLIC_CLIENT_EXPORT=$destinationPath"
Write-Output "FILES=$($manifest.Count)"
