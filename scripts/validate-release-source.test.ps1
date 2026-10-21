$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$validator = Join-Path $PSScriptRoot 'validate-release-source.ps1'
$fixture = Join-Path ([IO.Path]::GetTempPath()) ("anceryx-release-source-test-" + [guid]::NewGuid().ToString('N'))

function Invoke-Git([string[]]$Arguments) {
  & git @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "git $($Arguments -join ' ') failed with exit code $LASTEXITCODE."
  }
}

function Assert-ValidatorResult([string]$SourceRef, [bool]$ShouldPass) {
  $previousLocation = Get-Location
  try {
    Set-Location $fixture
    $env:SOURCE_REF = $SourceRef
    $failure = $null
    try {
      & $validator
    } catch {
      $failure = $_
    }

    if ($ShouldPass -and $failure) {
      throw "Expected '$SourceRef' to pass, but it failed: $failure"
    }
    if (-not $ShouldPass -and -not $failure) {
      throw "Expected '$SourceRef' to be rejected, but it passed."
    }
  } finally {
    Remove-Item Env:\SOURCE_REF -ErrorAction SilentlyContinue
    Set-Location $previousLocation
  }
}

try {
  New-Item -ItemType Directory -Path $fixture | Out-Null
  Invoke-Git @('init', '--quiet', $fixture)
  Set-Location $fixture
  Invoke-Git @('config', 'user.name', 'Anceryx Release Validation Test')
  Invoke-Git @('config', 'user.email', 'release-validation@example.invalid')

  $packageJson = '{"name":"release-validation-fixture","version":"1.0.0"}'
  [IO.File]::WriteAllText((Join-Path $fixture 'package.json'), $packageJson, (New-Object Text.UTF8Encoding($false)))
  Invoke-Git @('add', 'package.json')
  Invoke-Git @('commit', '--quiet', '-m', 'test fixture')
  Invoke-Git @('branch', '-M', 'main')
  Invoke-Git @('tag', 'v1.0.1')
  $validSha = (& git rev-parse HEAD).Trim()
  if ($LASTEXITCODE -ne 0) {
    throw 'Could not resolve fixture commit SHA.'
  }

  Assert-ValidatorResult 'main' $true
  Assert-ValidatorResult $validSha $true
  Assert-ValidatorResult 'v1.0.1' $false
  Invoke-Git @('tag', '-d', 'v1.0.1')
  Invoke-Git @('tag', 'v1.0.0')
  Assert-ValidatorResult 'v1.0.0' $true
  Assert-ValidatorResult 'missing-ref' $false
  Assert-ValidatorResult 'v1.0.2' $false
  Invoke-Git @('tag', 'release-candidate')
  Assert-ValidatorResult 'release-candidate' $false

  Write-Host 'Release source validation tests passed (branch, SHA, versioned tag, and invalid refs).'
} finally {
  Set-Location $repoRoot
  Remove-Item -LiteralPath $fixture -Recurse -Force -ErrorAction SilentlyContinue
}
