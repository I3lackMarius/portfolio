# Portfolio MERN

The Vite/React portfolio loads its Italian (`it`) and English (`gb`) content from
MongoDB through the Express API. The existing 3D portfolio presentation is kept;
authentication protects the private area at `/private`.

> **Critical security notice:** the root `.env` is excluded from Git, but public
> Git history still contains a credential-bearing MongoDB URI. Treat that
> database credential as compromised; rotation has not been confirmed. Never
> print environment-variable values. See the
> [P00 audit and remediation steps](./docs/life2/P00-discovery.md).

## Local setup

Configure local environment variables without committing their values:

```env
MONGODB_URI=<your MongoDB connection string>
PORT=5000
APP_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
SESSION_MAX_AGE_MS=86400000
LOGIN_RATE_LIMIT_SECRET=<a private random value of at least 32 characters>
```

For local development, copy `.env.example` to `.env` and replace its
placeholders. `.env` is ignored by Git. Never reuse the historical MongoDB
credential: the public Git history contains it, and rotation has not been
confirmed. See the [P00 audit](./docs/life2/P00-discovery.md) and
[P01A report](./docs/life2/P01A-security-foundation.md).

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
Vercel, functions under `api/` expose the Express API as serverless endpoints.
Configure `MONGODB_URI`, exact comma-separated `APP_ORIGINS`, and a private
`LOGIN_RATE_LIMIT_SECRET` of at least 32 characters in the Vercel project's
Production environment. `SESSION_MAX_AGE_MS` is optional and capped at 24
hours. Do not put secrets in `vercel.json` or any `VITE_` variable. These
settings have not been changed in Vercel; no deployment was performed. See
[HELP.md](./HELP.md) for deployment configuration details.

The client uses the same-origin `/api` path by default; set `VITE_API_URL` only
when deploying the backend on another host. Never set a public `localhost` API
URL.

## Authentication

Public registration is disabled. To grant admin access to an existing account,
set `ADMIN_EMAIL` temporarily and run the promotion command; it fails rather
than creating a user when that email is not already in MongoDB:

```powershell
$env:ADMIN_EMAIL = "existing-user@example.com"
npm run promote:admin
Remove-Item Env:ADMIN_EMAIL
```

Sign in at `/login`; successful admin sessions can access `/private`.
Authentication uses an opaque, revocable server-side session and secure cookies
in production. The browser does not store a bearer token. Existing account
records/password hashes are preserved, but JWT sessions issued before this
change are not accepted; sign in again. Public registration remains disabled.

## Validation

```powershell
npm test
npm run build
```

`npm test` runs with synthetic environment values and a disposable MongoDB
Memory Server; it does not connect to production.
