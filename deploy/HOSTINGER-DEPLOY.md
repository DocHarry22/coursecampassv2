# Hostinger Deployment

## Scope boundary

- Hostinger serves the frontend static bundle only.
- The backend remains a separately hosted Node/Express API.
- Set `VITE_API_URL` to the external backend URL before building for production.

## Build

From `clients/`:

```powershell
npm install
$env:VITE_API_URL="https://api.your-domain.example"
npm run build
```

Or build and refresh the deployment package in one step:

```powershell
Set-Location .\deploy
.\Build-HostingerPackage.ps1 -ApiUrl "https://api.your-domain.example"
```

## Faster redeploy over FTP or SFTP

If you have Hostinger FTP access, use the publish script to rebuild and upload in one step:

```powershell
Set-Location .\deploy
.\Publish-HostingerFrontend.ps1 -Protocol "ftp" -Host "ftp.docheng.co.za" -Username "u836398163.Admin" -RemotePath "/home/u836398163/domains/docheng.co.za/public_html/desk" -ApiUrl "https://api.your-domain.example" -CleanRemoteAssets
```

Notes:

- For FTP, the script uses the Windows `curl.exe` client and will prompt for the password if you do not pass `-Password`.
- For SFTP or SCP, set `-Protocol "scp"` and optionally pass `-KeyFile`.
- It uploads the contents of the generated Hostinger package folder, including `.htaccess`.
- `-CleanRemoteAssets` removes the current top-level deployed files and clears the remote `assets/` folder before uploading the new build.
- Plain FTP is not encrypted. If Hostinger offers FTPS, use `-Protocol "ftps"` instead.

For this specific project, there is also a root shortcut script with the Hostinger defaults already filled in:

```powershell
Set-Location ..
.\deploy-live.ps1
```

Useful options:

- `.\deploy-live.ps1 -Protocol "ftps"`
- `.\deploy-live.ps1 -SkipBuild`
- `.\deploy-live.ps1 -NoClean`

## Upload target

Upload the contents of `clients/dist/` to the Hostinger subdomain document root.

Examples:
- Main domain: `public_html/`
- Subdomain: the folder mapped to that subdomain in hPanel

Upload the files inside `dist/`, not the `dist` folder itself.

## SPA routing

The build includes `public/.htaccess`, which rewrites unknown routes to `index.html` so `BrowserRouter` paths such as `/dashboard` work on direct refresh.

## Do not upload

- `clients/src/`
- `clients/node_modules/`
- `server/`
- backend `.env` files
