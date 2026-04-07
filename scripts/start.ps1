# ─────────────────────────────────────────────────────────────
# Knapsack – start script (Windows PowerShell)
# Usage:
#   .\scripts\start.ps1           # local dev (ts-node-dev + next dev)
#   .\scripts\start.ps1 -Docker   # Docker Compose stack
# ─────────────────────────────────────────────────────────────
#Requires -Version 5.1
[CmdletBinding()]
param(
    [switch]$Docker
)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$RootDir = (Resolve-Path "$PSScriptRoot\..").Path

function Write-Info    ($msg) { Write-Host "[start] $msg" -ForegroundColor Cyan   }
function Write-Success ($msg) { Write-Host "[start] $msg" -ForegroundColor Green  }
function Write-Warn    ($msg) { Write-Host "[start] $msg" -ForegroundColor Yellow }
function Write-Err     ($msg) { Write-Host "[start] ERROR: $msg" -ForegroundColor Red; exit 1 }

# ── Guard: dependencies installed ────────────────────────────
if (-not (Test-Path "$RootDir\node_modules")) {
    Write-Warn "Root node_modules missing. Running setup first..."
    & "$PSScriptRoot\setup.ps1"
}

if (-not (Test-Path "$RootDir\api\node_modules") -or -not (Test-Path "$RootDir\web\node_modules")) {
    Write-Warn "Service node_modules missing. Running setup first..."
    & "$PSScriptRoot\setup.ps1"
}

# ── Guard: .env exists ────────────────────────────────────────
if (-not (Test-Path "$RootDir\.env")) {
    Write-Err ".env not found. Run '.\scripts\setup.ps1' first."
}

# ── Start ─────────────────────────────────────────────────────
if ($Docker) {
    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
        Write-Err "Docker not found. Install Docker Desktop from https://docker.com"
    }

    Write-Host "`nStarting Knapsack via Docker Compose...`n" -ForegroundColor White
    Write-Info "API  ->  http://localhost:4000"
    Write-Info "Web  ->  http://localhost:3000"
    Write-Info "DB   ->  localhost:5432"
    Write-Host ""

    Set-Location $RootDir
    docker compose up --build
} else {
    if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
        Write-Err "Node.js not found. Install it from https://nodejs.org"
    }

    Write-Host "`nStarting Knapsack in local dev mode...`n" -ForegroundColor White
    Write-Info "API  ->  http://localhost:4000  (ts-node-dev, hot-reload)"
    Write-Info "Web  ->  http://localhost:3000  (Next.js dev server)"
    Write-Warn "Requires a running Postgres instance on localhost:5432."
    Write-Warn "If you don't have one, use:  .\scripts\start.ps1 -Docker"
    Write-Host ""

    # Load .env key=value pairs into the current process environment
    Get-Content "$RootDir\.env" |
        Where-Object { $_ -match '^\s*[^#]\S+=' } |
        ForEach-Object {
            $parts = $_ -split '=', 2
            $key   = $parts[0].Trim()
            $value = if ($parts.Count -gt 1) { $parts[1].Trim() } else { '' }
            [System.Environment]::SetEnvironmentVariable($key, $value, 'Process')
        }

    Set-Location $RootDir
    npm run dev
}
