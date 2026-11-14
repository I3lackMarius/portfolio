# Portfolio MERN

The Vite/React portfolio loads its Italian (`it`) and English (`gb`) content from
MongoDB through the Express API. The existing 3D portfolio presentation is kept;
authentication protects the private area at `/private`.

## Local setup

Create a root `.env` file with:

```env
MONGODB_URI=<your MongoDB connection string>
JWT_SECRET=<a long, random signing secret>
PORT=5000
```

Install dependencies, preview the seed input, then seed only missing locale
documents:

```powershell
npm install
npm run seed:content:dry
npm run seed:content
npm run dev
```

The seed command does not overwrite existing documents. To intentionally replace
both locale documents with the current `src/locales` JSON files, run
`npm run seed:content -- --replace`.

The development Vite server proxies `/api` to the backend on port 5000. On
Vercel, `api/[...path].js` exposes the Express API as a serverless function.
Configure `MONGODB_URI` and `JWT_SECRET` in the Vercel project's Production
environment variables before deploying. The client uses the same-origin `/api`
path by default; set `VITE_API_URL` only when deploying the backend on another
host. Never set a public `localhost` API URL.

## Authentication

Public registration is disabled. To grant admin access to an existing account,
set `ADMIN_EMAIL` temporarily and run the promotion command; it fails rather
than creating a user when that email is not already in MongoDB:

```powershell
$env:ADMIN_EMAIL = "existing-user@example.com"
npm run promote:admin
Remove-Item Env:ADMIN_EMAIL
```

Sign in at `/login`; successful admin sessions can access `/private`. JWT signing
requires `JWT_SECRET` and expires after one day.

## Validation

```powershell
npm test
npm run build
```
