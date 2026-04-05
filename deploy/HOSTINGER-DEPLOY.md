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
