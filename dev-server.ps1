# Royce Labs — local dev server
# Usage: .\dev-server.ps1
# Opens the site at http://localhost:8788 with Pages Functions + AI binding (mocked).
# Requires Node.js 18+ and internet access (npx downloads wrangler on first run).

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Royce Labs — local dev (wrangler pages)" -ForegroundColor Cyan
Write-Host "  http://localhost:8788" -ForegroundColor Yellow
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "NOTE: The chat widget in local dev talks to the LIVE Worker at"
Write-Host "  https://leadqual-worker.officialroycelabs-ai.workers.dev/api/chat"
Write-Host "The legacy /api/chat Pages Function (Workers AI + Resend) will be"
Write-Host "available at http://localhost:8788/api/chat but needs env vars."
Write-Host ""
Write-Host "Press Ctrl+C to stop." -ForegroundColor Gray
Write-Host ""

# Change to site root so wrangler can pick up wrangler.toml + functions/
Set-Location $PSScriptRoot

npx --yes wrangler@3 pages dev public `
  --compatibility-date 2024-11-01 `
  --port 8788 `
  --binding AI=AI
