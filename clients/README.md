# CourseCompass Frontend

## Stack

- React 18
- Vite 5
- React Router with `BrowserRouter`
- MUI for UI components

## Scripts

From `clients/`:

- `npm start` or `npm run dev`: start the Vite dev server
- `npm run build`: create the production bundle in `dist/`
- `npm run preview`: preview the production bundle locally

## Deployment boundary

- This frontend is a static Vite app.
- Hostinger should host only the built static files from `dist/`.
- The backend remains an external Node/Express API and must be deployed separately.

## Production API configuration

The app reads the backend URL from `VITE_API_URL`.

- Development fallback: `http://localhost:5001`
- Production: `VITE_API_URL` is required

Use `.env.production.example` as the template:

```env
VITE_API_URL=https://api.your-domain.example
```

## Hostinger notes

- `vite.config.mjs` uses `base: "/"`, which is correct for a root-hosted domain or subdomain.
- `public/.htaccess` rewrites unknown paths to `index.html`, which is required because the app uses `BrowserRouter`.
- Upload the contents of `dist/` to the Hostinger document root for the site or subdomain.

## Build for production

Example PowerShell flow:

```powershell
Set-Location .\clients
$env:VITE_API_URL = "https://api.your-domain.example"
npm install
npm run build
```

To generate a Hostinger-ready folder and zip in one step:

```powershell
Set-Location ..\deploy
.\Build-HostingerPackage.ps1 -ApiUrl "https://api.your-domain.example"
```

To rebuild and upload directly to Hostinger over SFTP:

```powershell
Set-Location ..\deploy
.\Publish-HostingerFrontend.ps1 -Protocol "ftp" -Host "ftp.docheng.co.za" -Username "u836398163.Admin" -RemotePath "/home/u836398163/domains/docheng.co.za/public_html/desk" -CleanRemoteAssets
```

For this repo, the quickest shortcut is from the project root:

```powershell
.\deploy-live.ps1
```
