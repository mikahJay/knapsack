# ─────────────────────────────────────────────────────────────
# Knapsack – run all unit test suites (Windows PowerShell)
# Usage:  .\scripts\test.ps1
# ─────────────────────────────────────────────────────────────
#Requires -Version 5.1
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$RootDir = (Resolve-Path "$PSScriptRoot\..").Path

function Write-Info    ($msg) { Write-Host "[test] $msg" -ForegroundColor Cyan   }
function Write-Success ($msg) { Write-Host "[test] $msg" -ForegroundColor Green  }
function Write-Err     ($msg) { Write-Host "[test] ERROR: $msg" -ForegroundColor Red }

$failed = @()

# ── API unit tests ────────────────────────────────────────────
Write-Info "Running API unit tests..."
Push-Location "$RootDir\api"
try {
    npx jest --runInBand --no-coverage
    if ($LASTEXITCODE -ne 0) { $failed += 'api' }
    else { Write-Success "API tests passed." }
} catch {
    Write-Err "API tests threw an exception: $_"
    $failed += 'api'
} finally {
    Pop-Location
}

# ── Web unit tests ────────────────────────────────────────────
Write-Info "Running web unit tests..."
Push-Location "$RootDir\web"
try {
    npx jest --runInBand --no-coverage
    if ($LASTEXITCODE -ne 0) { $failed += 'web' }
    else { Write-Success "Web tests passed." }
} catch {
    Write-Err "Web tests threw an exception: $_"
    $failed += 'web'
} finally {
    Pop-Location
}

# ── Summary ───────────────────────────────────────────────────
Write-Host ""
if ($failed.Count -eq 0) {
    Write-Success "All test suites passed."
    exit 0
} else {
    Write-Err "Failed suites: $($failed -join ', ')"
    exit 1
}
