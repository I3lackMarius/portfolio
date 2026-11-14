# Project Status

Status date: 2026-11-14

## Verified implementation

- The active client is the repository-root Vite/React app in `src/`; the root
  `index.html` loads `src/main.jsx`.
- Express and Mongoose code is in `backend/`. Vercel Function adapters are in
  `api/`.
- Existing API prefixes are `/api/content`, `/api/portfolio` and `/api/auth`.
  Portfolio HTTP routes currently expose read-only GET operations.
- Authentication uses bcrypt password hashes and one-day JWTs stored by the
  browser in `localStorage`. Server middleware checks authentication and
  `isAdmin`; public registration remains disabled.
- `frontend/src/` is not referenced by the root app entry or npm scripts and is
  treated as legacy pending a separate review.

## Baseline verification

- Vercel project settings select Node.js `26.x`; `package.json` declares
  `26.x`. The workstation's default Node is `24.5.0`.
- Under isolated Node `26.13.1`, `node --test` passes 26/26 tests and the
  production Vite build succeeds.
- The build reports existing Browserslist, dependency `eval`, and large-chunk
  warnings; none blocks the build.

## Life2.0

P00 is audit and documentation only. No Life2.0 UI, API, tenant, membership or
entitlement implementation has been added. The proposal and audit findings are
in [docs/life2/P00-discovery.md](./docs/life2/P00-discovery.md).

## Critical security action

The tracked root `.env` contains a credential-bearing MongoDB URI and appears in
seven commits in local Git history. Treat the credential as compromised and
rotate it before further production use. Rotation and Git-history cleanup were
not performed in P00. See the P00 report for the redacted scan evidence and
remediation sequence. Never print environment-variable values.
