$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$electron = (Resolve-Path (Join-Path $repo 'node_modules/electron/dist/electron.exe')).Path
$entry = 'out/main/electronSafeStorageSmoke.js'
if (-not (Test-Path -LiteralPath (Join-Path $repo $entry))) { throw 'Missing built smoke entry. Run npm run build first.' }

$root = Join-Path ([System.IO.Path]::GetTempPath()) ('anceryx-safe-storage-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $root | Out-Null
$statusA = "$root.process-a.pass"
$statusB = "$root.process-b.pass"
$oldElectronRunAsNode = $env:ELECTRON_RUN_AS_NODE
$oldRole = $env:ANCERYX_SAFE_STORAGE_ROLE
$oldUserData = $env:ANCERYX_SAFE_STORAGE_USER_DATA

try {
  Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue
  $env:ANCERYX_SAFE_STORAGE_USER_DATA = $root
  $env:ANCERYX_SAFE_STORAGE_STATUS = $statusA
  $env:ANCERYX_SAFE_STORAGE_ROLE = 'A'
  $logA = "$root.process-a.log"
  $errA = "$root.process-a.err.log"
  $processA = Start-Process -WindowStyle Hidden -FilePath $electron -ArgumentList @('--no-sandbox', '--disable-gpu', $entry) -WorkingDirectory $repo -RedirectStandardOutput $logA -RedirectStandardError $errA -PassThru
  for ($attempt = 0; $attempt -lt 150 -and -not (Test-Path -LiteralPath $statusA) -and -not $processA.HasExited; $attempt++) { Start-Sleep -Milliseconds 200 }
  if (Test-Path -LiteralPath $logA) { Get-Content -LiteralPath $logA }
  if (Test-Path -LiteralPath $errA) { Get-Content -LiteralPath $errA }
  if (-not (Test-Path -LiteralPath $statusA)) { if (-not $processA.HasExited) { Stop-Process -Id $processA.Id -Force }; throw 'Process A did not produce a PASS marker' }
  for ($attempt = 0; $attempt -lt 25 -and -not $processA.HasExited; $attempt++) { Start-Sleep -Milliseconds 200 }
  if (-not $processA.HasExited) { Stop-Process -Id $processA.Id -Force }

  $env:ANCERYX_SAFE_STORAGE_STATUS = $statusB
  $env:ANCERYX_SAFE_STORAGE_ROLE = 'B'
  $logB = "$root.process-b.log"
  $errB = "$root.process-b.err.log"
  $processB = Start-Process -WindowStyle Hidden -FilePath $electron -ArgumentList @('--no-sandbox', '--disable-gpu', $entry) -WorkingDirectory $repo -RedirectStandardOutput $logB -RedirectStandardError $errB -PassThru
  for ($attempt = 0; $attempt -lt 150 -and -not (Test-Path -LiteralPath $statusB) -and -not $processB.HasExited; $attempt++) { Start-Sleep -Milliseconds 200 }
  if (Test-Path -LiteralPath $logB) { Get-Content -LiteralPath $logB }
  if (Test-Path -LiteralPath $errB) { Get-Content -LiteralPath $errB }
  if (-not (Test-Path -LiteralPath $statusB)) { if (-not $processB.HasExited) { Stop-Process -Id $processB.Id -Force }; throw 'Process B did not produce a PASS marker' }
  for ($attempt = 0; $attempt -lt 25 -and -not $processB.HasExited; $attempt++) { Start-Sleep -Milliseconds 200 }
  if (-not $processB.HasExited) { Stop-Process -Id $processB.Id -Force }
  Write-Output 'ELECTRON_SAFE_STORAGE_TWO_PROCESS=PASS'
} finally {
  if ($null -eq $oldElectronRunAsNode) { Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue } else { $env:ELECTRON_RUN_AS_NODE = $oldElectronRunAsNode }
  if ($null -eq $oldRole) { Remove-Item Env:ANCERYX_SAFE_STORAGE_ROLE -ErrorAction SilentlyContinue } else { $env:ANCERYX_SAFE_STORAGE_ROLE = $oldRole }
  if ($null -eq $oldUserData) { Remove-Item Env:ANCERYX_SAFE_STORAGE_USER_DATA -ErrorAction SilentlyContinue } else { $env:ANCERYX_SAFE_STORAGE_USER_DATA = $oldUserData }
  Remove-Item Env:ANCERYX_SAFE_STORAGE_STATUS -ErrorAction SilentlyContinue
  if (Test-Path -LiteralPath $statusA) { Remove-Item -LiteralPath $statusA -Force }
  if (Test-Path -LiteralPath $statusB) { Remove-Item -LiteralPath $statusB -Force }
  if (Test-Path -LiteralPath $root) { Remove-Item -LiteralPath $root -Recurse -Force }
}
