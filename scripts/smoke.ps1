# ─────────────────────────────────────────────────────────────
# Knapsack – smoke tests (Windows PowerShell)
# Hits the /health and /health/deep endpoints on the running
# stack and fails if any check returns a non-200 status or
# reports ok:false.
#
# Usage:
#   .\scripts\smoke.ps1                          # defaults
#   .\scripts\smoke.ps1 -ApiUrl http://localhost:4000 -WebUrl http://localhost:3000
#
# Requires the stack to be running (docker compose up or local
# dev servers). Start it first with .\scripts\start.ps1.
# ─────────────────────────────────────────────────────────────
#Requires -Version 5.1
[CmdletBinding()]
param(
    [string]$ApiUrl = 'http://localhost:4000',
    [string]$WebUrl = 'http://localhost:3000'
)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Write-Info    ($msg) { Write-Host "[smoke] $msg" -ForegroundColor Cyan   }
function Write-Success ($msg) { Write-Host "[smoke] $msg" -ForegroundColor Green  }
function Write-Warn    ($msg) { Write-Host "[smoke] $msg" -ForegroundColor Yellow }
function Write-Err     ($msg) { Write-Host "[smoke] FAIL: $msg" -ForegroundColor Red }

$failed = @()

function Invoke-Check {
    param(
        [string]$Label,
        [string]$Url
    )
    Write-Info "Checking $Label -> $Url"
    try {
        $resp = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 10
        if ($resp.StatusCode -ne 200) {
            Write-Err "$Label returned HTTP $($resp.StatusCode)"
            return $false
        }
        $body = $resp.Content | ConvertFrom-Json
        if ($body.ok -eq $false) {
            Write-Err "$Label responded ok:false"
            Write-Host ($resp.Content) -ForegroundColor Red
            return $false
        }
        Write-Success "$Label OK (HTTP $($resp.StatusCode))"
        return $true
    } catch {
        Write-Err "$Label unreachable: $_"
        return $false
    }
}

# ── API shallow health ────────────────────────────────────────
if (-not (Invoke-Check -Label 'API /health'      -Url "$ApiUrl/health"))       { $failed += 'api/health' }

# ── API deep health ───────────────────────────────────────────
if (-not (Invoke-Check -Label 'API /health/deep' -Url "$ApiUrl/health/deep"))  { $failed += 'api/health/deep' }

# ── Web shallow health ────────────────────────────────────────
if (-not (Invoke-Check -Label 'Web /health'      -Url "$WebUrl/health"))       { $failed += 'web/health' }

# ── Web deep health ───────────────────────────────────────────
if (-not (Invoke-Check -Label 'Web /health/deep' -Url "$WebUrl/health/deep"))  { $failed += 'web/health/deep' }

# ── Summary ───────────────────────────────────────────────────
Write-Host ""
if ($failed.Count -eq 0) {
    Write-Success "All smoke tests passed."
    exit 0
} else {
    Write-Err "Failed checks: $($failed -join ', ')"
    exit 1
}
