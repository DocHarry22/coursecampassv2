param(
    [Parameter(Mandatory = $true)]
    [string]$ServerHost,

    [Parameter(Mandatory = $true)]
    [string]$Username,

    [Parameter(Mandatory = $true)]
    [string]$RemotePath,

    [ValidateSet("ftp", "ftps", "scp")]
    [string]$Protocol = "ftp",

    [int]$Port,
    [string]$ApiUrl,
    [string]$PackageDate = (Get-Date -Format "yyyyMMdd"),
    [string]$KeyFile,
    [string]$Password,
    [switch]$CleanRemoteAssets,
    [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"

$buildScript = Join-Path $PSScriptRoot "Build-HostingerPackage.ps1"
$packageDir = Join-Path $PSScriptRoot ("hostinger-subdomain-" + $PackageDate)

if ($Protocol -eq "scp" -and -not (Get-Command scp -ErrorAction SilentlyContinue)) {
    throw "OpenSSH scp is not available on this machine. Install the Windows OpenSSH Client first."
}

if (($Protocol -eq "ftp" -or $Protocol -eq "ftps") -and -not (Get-Command curl.exe -ErrorAction SilentlyContinue)) {
    throw "curl.exe is not available on this machine. Install curl or use the scp protocol instead."
}

if (-not $SkipBuild) {
    $buildParams = @{
        PackageDate = $PackageDate
    }

    if ($ApiUrl) {
        $buildParams.ApiUrl = $ApiUrl
    }

    & $buildScript @buildParams
}

if (-not (Test-Path $packageDir)) {
    throw "Package directory not found: $packageDir"
}

if (-not $Port) {
    $Port = switch ($Protocol) {
        "scp" { 22 }
        default { 21 }
    }
}

function Get-PlainTextPassword {
    param([string]$ProvidedPassword)

    if ($ProvidedPassword) {
        return $ProvidedPassword
    }

    $securePassword = Read-Host "Enter FTP password" -AsSecureString
    $credential = New-Object System.Management.Automation.PSCredential ($Username, $securePassword)
    return $credential.GetNetworkCredential().Password
}

function Publish-WithScp {
    if ($CleanRemoteAssets) {
        throw "-CleanRemoteAssets is currently supported only for ftp or ftps uploads."
    }

    $scpBaseArgs = @("-P", $Port)

    if ($KeyFile) {
        $scpBaseArgs += @("-i", $KeyFile)
    }

    $remoteTarget = "{0}@{1}:{2}/" -f $Username, $ServerHost, $RemotePath.TrimEnd("/")
    $itemsToUpload = Get-ChildItem -Path $packageDir -Force

    foreach ($item in $itemsToUpload) {
        $scpArgs = @($scpBaseArgs)

        if ($item.PSIsContainer) {
            $scpArgs += "-r"
        }

        $scpArgs += @($item.FullName, $remoteTarget)

        Write-Host "Uploading $($item.Name) to $remoteTarget"
        & scp @scpArgs

        if ($LASTEXITCODE -ne 0) {
            throw "scp upload failed for $($item.FullName)"
        }
    }

    Write-Host "Hostinger frontend publish complete."
    Write-Host "Remote target: $remoteTarget"
    Write-Host "Uploaded package: $packageDir"
}

function Publish-WithFtp {
    $plainTextPassword = Get-PlainTextPassword -ProvidedPassword $Password
    $normalizedRemotePath = "/" + $RemotePath.Trim().TrimStart("/").TrimEnd("/")
    $baseUri = "{0}://{1}:{2}{3}" -f $Protocol, $ServerHost, $Port, $normalizedRemotePath
    $auth = "{0}:{1}" -f $Username, $plainTextPassword
    $curlBaseArgs = @("--silent", "--show-error", "--user", $auth, "--ftp-create-dirs")

    if ($Protocol -eq "ftps") {
        $curlBaseArgs += "--ssl-reqd"
    }

    function Invoke-CurlCommand {
        param(
            [string[]]$CommandOptions,
            [switch]$IgnoreFailure
        )

        $output = & curl.exe @CommandOptions 2>$null
        $exitCode = $LASTEXITCODE

        if ($exitCode -ne 0 -and -not $IgnoreFailure) {
            throw "curl upload command failed with exit code $exitCode"
        }

        return $output
    }

    function Remove-RemoteFile {
        param([string]$RelativePath)

        $deleteArgs = $curlBaseArgs + @("-Q", "-DELE $RelativePath", "$baseUri/")
        Invoke-CurlCommand -CommandOptions $deleteArgs -IgnoreFailure | Out-Null
    }

    if ($CleanRemoteAssets) {
        Write-Host "Cleaning remote frontend files at $baseUri/"

        $rootFiles = Get-ChildItem -Path $packageDir -File -Force

        foreach ($file in $rootFiles) {
            Remove-RemoteFile -RelativePath $file.Name
        }

        $assetsListArgs = $curlBaseArgs + @("--list-only", "$baseUri/assets/")
        $remoteAssetFiles = Invoke-CurlCommand -CommandOptions $assetsListArgs -IgnoreFailure |
            Where-Object { $_ -and $_.Trim() } |
            ForEach-Object { $_.Trim() }

        foreach ($remoteAssetFile in $remoteAssetFiles) {
            Remove-RemoteFile -RelativePath ("assets/" + $remoteAssetFile)
        }
    }

    $filesToUpload = Get-ChildItem -Path $packageDir -File -Force -Recurse
    $packageRoot = (Resolve-Path $packageDir).Path.TrimEnd('\')

    foreach ($file in $filesToUpload) {
        $relativePath = $file.FullName.Substring($packageRoot.Length).TrimStart('\', '/').Replace('\', '/')
        $targetUri = "{0}/{1}" -f $baseUri, $relativePath
        $curlArgs = $curlBaseArgs + @("--upload-file", $file.FullName, $targetUri)

        Write-Host "Uploading $relativePath to $targetUri"
        & curl.exe @curlArgs

        if ($LASTEXITCODE -ne 0) {
            throw "FTP upload failed for $($file.FullName)"
        }
    }

    Write-Host "Hostinger frontend publish complete."
    Write-Host "Remote target: $baseUri/"
    Write-Host "Uploaded package: $packageDir"
}

switch ($Protocol) {
    "scp" { Publish-WithScp }
    default { Publish-WithFtp }
}