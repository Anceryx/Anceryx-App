param(
  [string]$SourceRef = $env:SOURCE_REF
)

$ErrorActionPreference = 'Stop'

if ([string]::IsNullOrWhiteSpace($SourceRef)) {
  throw 'A source ref is required.'
}

$tag = $null
if ($SourceRef.StartsWith('refs/tags/')) {
  $tag = $SourceRef.Substring('refs/tags/'.Length)
} else {
  git show-ref --verify --quiet "refs/tags/$SourceRef"
  $tagLookupExitCode = $LASTEXITCODE
  $global:LASTEXITCODE = 0

  if ($tagLookupExitCode -eq 0) {
    $tag = $SourceRef
  } elseif ($tagLookupExitCode -ne 1) {
    throw "Could not inspect selected ref '$SourceRef' for a tag (git exit code $tagLookupExitCode)."
  }
}

if ($tag) {
  if ($tag -notmatch '^v(?<version>\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)$') {
    throw "Selected tag '$tag' is not a supported version tag (expected vMAJOR.MINOR.PATCH)."
  }

  $checkedOutTag = git describe --tags --exact-match HEAD
  $describeExitCode = $LASTEXITCODE
  $global:LASTEXITCODE = 0
  if ($describeExitCode -ne 0 -or $checkedOutTag -ne $tag) {
    throw "Selected tag '$tag' does not match the checked-out commit."
  }

  $tagVersion = $Matches.version
  $packageVersion = node -p "require('./package.json').version"
  $nodeExitCode = $LASTEXITCODE
  $global:LASTEXITCODE = 0
  if ($nodeExitCode -ne 0 -or $packageVersion -ne $tagVersion) {
    throw "Tag '$tag' does not match package.json version '$packageVersion'."
  }

  Write-Host "Validated source tag $tag at package version $packageVersion."
} else {
  $selectedCommit = git rev-parse --verify --quiet "$SourceRef^{commit}"
  $resolveExitCode = $LASTEXITCODE
  $global:LASTEXITCODE = 0
  if ($resolveExitCode -ne 0) {
    throw "Selected source ref '$SourceRef' is not a valid branch or commit SHA."
  }

  $checkedOutCommit = git rev-parse --verify HEAD
  $headExitCode = $LASTEXITCODE
  $global:LASTEXITCODE = 0
  if ($headExitCode -ne 0 -or $selectedCommit -ne $checkedOutCommit) {
    throw "Selected source ref '$SourceRef' does not match the checked-out commit."
  }

  Write-Host "Selected source ref: $SourceRef"
}
