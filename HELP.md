# Local Setup and Troubleshooting

## Environment variables

The backend reads `MONGODB_URI`, `APP_ORIGINS`, and
`LOGIN_RATE_LIMIT_SECRET`. `SESSION_MAX_AGE_MS` is optional and cannot exceed
24 hours. Local development can use a root `.env` file copied from
[.env.example](./.env.example). Never print environment-variable values or
paste them into logs, chat, source files, or documentation.

**Critical security warning:** `.env` is now excluded from Git, but the
repository's public history still contains a credential-bearing MongoDB URI.
Treat that credential as compromised. Rotation has not been confirmed; do not
reuse it. Do not copy the historical `.env` to another environment. See
[the P00 audit](./docs/life2/P00-discovery.md) and
[the P01A security foundation](./docs/life2/P01A-security-foundation.md).

In Vercel Production, configure:

- `MONGODB_URI`: the replacement MongoDB connection string.
- `APP_ORIGINS`: comma-separated exact browser origins, including the scheme
  and any `www` hostname used by the site; do not include paths or wildcards.
- `LOGIN_RATE_LIMIT_SECRET`: a private random value of at least 32 characters.
- `SESSION_MAX_AGE_MS` (optional): a positive integer no greater than
  `86400000`.

The application does not use `JWT_SECRET` for authentication anymore. These
settings were not changed in Vercel, and a Production deployment was not
performed. Redeploy only after the values are configured and the MongoDB
credential has been rotated.

To check configuration without displaying values:

```powershell
node --input-type=module -e "import('dotenv/config').then(() => console.log('MONGODB_URI configured:', Boolean(process.env.MONGODB_URI), 'APP_ORIGINS configured:', Boolean(process.env.APP_ORIGINS), 'LOGIN_RATE_LIMIT_SECRET configured:', Boolean(process.env.LOGIN_RATE_LIMIT_SECRET)))"
```

Never put database credentials in `vercel.json` or any `VITE_` variable.

## Start the application

Install dependencies and run the existing scripts from the repository root:

```powershell
npm install
npm run dev
```

The Vite development server proxies `/api` to Express on port 5000. The backend
can also be started separately with `npm run dev:server`.

## API behavior

- `GET /api/content/it` and `GET /api/content/gb` load portfolio translations.
- `GET /api/portfolio` and `GET /api/portfolio/:id` read portfolio items.
- `POST /api/auth/register` is intentionally disabled.
- Sign-in is at `/login`; the admin-only area is `/private`. Authentication now
  uses a revocable server-side session cookie and CSRF tokens, not a JWT in
  `localStorage`. Existing accounts and password hashes are preserved, but
  previous JWT sessions are no longer accepted; users need to sign in again.

`npm test` sets synthetic test configuration and uses a disposable in-memory
MongoDB instance. It does not use the local `.env` or production database.

For production database connection failures, check Vercel Function runtime logs
and MongoDB Atlas Network Access. Do not broaden network access or change
credentials without considering the security implications documented in the
P00 report.
