# Project Status

Status date: 2026-11-14

## Verified implementation

- The active client is the repository-root Vite/React app in `src/`; the root
  `index.html` loads `src/main.jsx`.
- Express and Mongoose code is in `backend/`. Vercel Function adapters are in
  `api/`.
- Existing API prefixes are `/api/content`, `/api/portfolio` and `/api/auth`.
  Portfolio HTTP routes currently expose read-only GET operations.
- Authentication uses bcrypt password hashes and opaque, revocable,
  server-side sessions. Only a SHA-256 hash of each session token is stored in
  MongoDB; the browser receives an HttpOnly session cookie in production.
  State-changing API calls require an exact allowlisted Origin and a
  double-submit CSRF token. Login failures are rate-limited using atomic
  MongoDB records. Server middleware checks authentication and `isAdmin`;
  public registration remains disabled.
- Existing account records/password hashes remain unchanged. Previously issued
  JWTs are no longer accepted, so users must authenticate again.
- `frontend/src/` is not referenced by the root app entry or npm scripts and is
  treated as legacy pending a separate review.

## Runtime and verification

- Vercel project settings select Node.js `26.x`; `package.json` declares
  `26.x`. This P01A work was verified locally with Node `24.5.0` and npm
  `10.2.3`; P01A-specific verification on Node 26 remains outstanding.
- `npm test` passes 62/62 tests, including integration tests against an
  ephemeral MongoDB Memory Server. Test setup forces synthetic environment
  values and does not read the local `.env` or connect to production.
- `npm run build` succeeds from a temporary copy that excludes `.env`,
  `.git`, and the repository's `node_modules` directory (dependencies are
  linked locally). Existing warnings remain for stale Browserslist data,
  `eval` in a dependency, and a minified JavaScript chunk over 500 kB.
- No lint script is defined in `package.json`.

## Life2.0

P00 was audit and documentation only. P01A adds the authentication/session
foundation for the existing private area; it does not add Life2.0 product
modules, tenant, membership, or entitlement behavior. See
[P00](./docs/life2/P00-discovery.md) and
[P01A](./docs/life2/P01A-security-foundation.md).

## Critical security action

The root `.env` has been removed from the Git index and is ignored locally, but
the public Git history still contains a credential-bearing MongoDB URI in
seven commits. Treat the credential as compromised. Rotation is not confirmed;
Git history was not rewritten. Do not print environment-variable values. See
the P00 report for remediation steps.

## Branch and deployment state

The current milestone branch is `life2/p01a-security-foundation`. No push,
merge, production deployment, MongoDB configuration change, or Vercel setting
change was performed. `main` remains unchanged.
