# Royce Labs — deploy helper
# Loads secrets from .env (git-ignored) and deploys the site to Cloudflare Pages.
# Usage:  ./deploy.ps1
# The token is read from .env and is NEVER printed to the console.

$ErrorActionPreference = "Stop"
$envPath = Join-Path $PSScriptRoot ".env"

if (-not (Test-Path $envPath)) {
  Write-Error "No .env file found. Create one with: CLOUDFLARE_API_TOKEN=your_token"
  exit 1
}

# Parse .env into environment variables (KEY=VALUE, ignores # comments / blanks)
Get-Content $envPath | ForEach-Object {
  $line = $_.Trim()
  if ($line -eq "" -or $line.StartsWith("#")) { return }
  $eq = $line.IndexOf("=")
  if ($eq -lt 1) { return }
  $key = $line.Substring(0, $eq).Trim()
  $val = $line.Substring($eq + 1).Trim().Trim('"').Trim("'")
  [System.Environment]::SetEnvironmentVariable($key, $val, "Process")
}

if (-not $env:CLOUDFLARE_API_TOKEN) {
  Write-Error "CLOUDFLARE_API_TOKEN not set in .env"
  exit 1
}

# Account ID is not a secret; set a default if not provided in .env
if (-not $env:CLOUDFLARE_ACCOUNT_ID) {
  $env:CLOUDFLARE_ACCOUNT_ID = "b12e136229d418718e4dc3e23686b646"
}

Write-Host "Deploying to Cloudflare Pages (token loaded from .env, not shown)..."
# Deploy ONLY the public/ folder (website assets). Secrets/scripts stay at project
# root and are never uploaded. Functions are picked up from ./functions automatically.
# wrangler writes warnings to stderr; don't let "Stop" turn those into fatal errors.
$ErrorActionPreference = "Continue"
npx wrangler pages deploy public --project-name roycelabs --commit-dirty=true
if ($LASTEXITCODE -ne 0) {
  Write-Error "wrangler deploy failed (exit code $LASTEXITCODE)"
  exit $LASTEXITCODE
}
