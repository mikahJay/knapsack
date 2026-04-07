# ─────────────────────────────────────────────────────────────
# Knapsack – setup script (Windows PowerShell)
# Usage: .\scripts\setup.ps1
# ─────────────────────────────────────────────────────────────
#Requires -Version 5.1
[CmdletBinding()]
param()
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$RootDir = (Resolve-Path "$PSScriptRoot\..").Path

function Write-Info    ($msg) { Write-Host "[setup] $msg" -ForegroundColor Cyan    }
function Write-Success ($msg) { Write-Host "[setup] $msg" -ForegroundColor Green   }
function Write-Warn    ($msg) { Write-Host "[setup] $msg" -ForegroundColor Yellow  }
function Write-Err     ($msg) { Write-Host "[setup] ERROR: $msg" -ForegroundColor Red; exit 1 }

Write-Host "`nKnapsack - local dev setup`n" -ForegroundColor White

# ── Check prerequisites ───────────────────────────────────────
Write-Info "Checking prerequisites..."

if (-not (Get-Command node  -ErrorAction SilentlyContinue)) { Write-Err  "Node.js not found. Install it from https://nodejs.org" }
if (-not (Get-Command npm   -ErrorAction SilentlyContinue)) { Write-Err  "npm not found. It should ship with Node.js." }
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) { Write-Warn "Docker not found - needed only for '.\scripts\start.ps1 -Docker' mode." }

$nodeVer = node -e "process.stdout.write(process.versions.node)"
$npmVer  = npm --version
Write-Success "Node $nodeVer  /  npm $npmVer"

# ── Install dependencies ──────────────────────────────────────
Write-Info "Installing root dependencies..."
npm install --prefix $RootDir --silent

Write-Info "Installing API dependencies..."
npm install --prefix "$RootDir\api" --silent

Write-Info "Installing web dependencies..."
npm install --prefix "$RootDir\web" --silent

Write-Success "All dependencies installed."

# ── Environment file ──────────────────────────────────────────
$EnvFile    = Join-Path $RootDir ".env"
$EnvExample = Join-Path $RootDir ".env.example"

if (Test-Path $EnvFile) {
    Write-Warn ".env already exists - skipped."
} elseif (Test-Path $EnvExample) {
    Copy-Item $EnvExample $EnvFile
    Write-Success ".env created from .env.example"
    Write-Host "  -> Open .env and fill in any required values before starting." -ForegroundColor Yellow
} else {
    Write-Warn ".env.example not found - skipping .env creation."
}

# ── Done ──────────────────────────────────────────────────────
Write-Host ""
Write-Host "Setup complete. Next steps:" -ForegroundColor White
Write-Host "  Local dev :  " -NoNewline; Write-Host ".\scripts\start.ps1" -ForegroundColor Cyan
Write-Host "  Docker    :  " -NoNewline; Write-Host ".\scripts\start.ps1 -Docker" -ForegroundColor Cyan
Write-Host ""
