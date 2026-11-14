# Local Setup and Troubleshooting

## Environment variables

The backend reads `MONGODB_URI` and `JWT_SECRET` from the process environment;
local development can use a root `.env` file. Never print their values or paste
them into logs, chat, source files, or documentation.

**Security warning:** the root `.env` is currently tracked in this repository
and its history contains a credential-bearing MongoDB URI. Treat that
credential as compromised and rotate it before reuse. Do not copy the
historical `.env` to another environment. See
[the P00 audit](./docs/life2/P00-discovery.md).

To check configuration without displaying values:

```powershell
node --input-type=module -e "import('dotenv/config').then(() => console.log('MONGODB_URI configured:', Boolean(process.env.MONGODB_URI)))"
```

In Vercel, configure `MONGODB_URI` and `JWT_SECRET` as environment variables,
then redeploy Production after changing them. Do not put database credentials
in `vercel.json` or any `VITE_` variable.

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
- Sign-in is at `/login`; the admin-only area is `/private`.

For production database connection failures, check Vercel Function runtime logs
and MongoDB Atlas Network Access. Do not broaden network access or change
credentials without considering the security implications documented in the
P00 report.
