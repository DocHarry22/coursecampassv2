param(
    [ValidateSet("ftp", "ftps", "scp")]
    [string]$Protocol = "ftp",
    [string]$ApiUrl,
    [string]$Password,
    [switch]$SkipBuild,
    [switch]$NoClean
)

$ErrorActionPreference = "Stop"

$publishScript = Join-Path $PSScriptRoot "deploy\Publish-HostingerFrontend.ps1"

if (-not (Test-Path $publishScript)) {
    throw "Publish script not found: $publishScript"
}

$publishParams = @{
    Protocol = $Protocol
    Host = "ftp.docheng.co.za"
    Username = "u836398163.Admin"
    RemotePath = "/home/u836398163/domains/docheng.co.za/public_html/desk"
}

if ($ApiUrl) {
    $publishParams.ApiUrl = $ApiUrl
}

if ($Password) {
    $publishParams.Password = $Password
}

if ($SkipBuild) {
    $publishParams.SkipBuild = $true
}

if (-not $NoClean) {
    $publishParams.CleanRemoteAssets = $true
}

& $publishScript @publishParams