param(
    [string]$ApiUrl,
    [string]$PackageDate = (Get-Date -Format "yyyyMMdd")
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$clientDir = Join-Path $repoRoot "clients"
$distDir = Join-Path $clientDir "dist"
$deployDir = $PSScriptRoot
$packageDir = Join-Path $deployDir ("hostinger-subdomain-" + $PackageDate)
$zipPath = Join-Path $deployDir ("coursecompass-hostinger-subdomain-" + $PackageDate + ".zip")
$envFile = Join-Path $clientDir ".env.production"

function Get-ConfiguredApiUrl {
    param([string]$Path)

    if (-not (Test-Path $Path)) {
        return $null
    }

    $match = Select-String -Path $Path -Pattern '^\s*VITE_API_URL\s*=\s*(.+?)\s*$' | Select-Object -First 1

    if (-not $match) {
        return $null
    }

    return $match.Matches[0].Groups[1].Value.Trim().Trim('"').Trim("'")
}

$resolvedApiUrl = $ApiUrl

if (-not $resolvedApiUrl) {
    $resolvedApiUrl = Get-ConfiguredApiUrl -Path $envFile
}

if (-not $resolvedApiUrl) {
    throw "VITE_API_URL is required. Pass -ApiUrl or set VITE_API_URL in clients/.env.production before packaging for Hostinger."
}

$env:VITE_API_URL = $resolvedApiUrl.TrimEnd("/")

Push-Location $clientDir
try {
    npm run build
}
finally {
    Pop-Location
}

if (Test-Path $packageDir) {
    Remove-Item $packageDir -Recurse -Force
}

if (Test-Path $zipPath) {
    Remove-Item $zipPath -Force
}

New-Item -ItemType Directory -Path $packageDir | Out-Null
Copy-Item (Join-Path $distDir "*") -Destination $packageDir -Recurse -Force
Compress-Archive -Path (Join-Path $packageDir "*") -DestinationPath $zipPath -Force

Write-Host "Built frontend with VITE_API_URL=$($env:VITE_API_URL)"
Write-Host "Package folder: $packageDir"
Write-Host "Package zip: $zipPath"