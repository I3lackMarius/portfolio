# Life2.0 P01A - Security foundation

Status: implementation and local verification complete; Product Owner
validation is pending.

## Scope and branch

- Implemented on `life2/p01a-security-foundation`, based on the accepted P00
  checkpoint in `develop/life2`.
- This milestone replaces the existing login session mechanism for the
  portfolio's current private area. It does not add Life2.0 product modules,
  tenant/membership/entitlement models, or public registration.
- No push, merge, production deployment, Atlas configuration change, Vercel
  setting change, or Git-history rewrite was performed.
- The root `.env` was removed from the Git index and added to `.gitignore`;
  the local file was not read or deleted. Its historic copies remain in public
  Git history.

## Implementation

### Authentication sessions

- Replaced browser-stored one-day JWT authentication with random opaque session
  tokens. MongoDB stores only the SHA-256 token hash, user reference, expiry,
  and revocation timestamp.
- The authentication cookie is host-only, HttpOnly, SameSite=Lax, and scoped
  to `/`; production uses the `__Host-` prefix and Secure. Session expiration
  is checked on every authenticated request, independently of MongoDB TTL
  cleanup. Logout revokes the server record and clears both cookies.
- Session age defaults to 24 hours and may be shortened with
  `SESSION_MAX_AGE_MS`; values above 24 hours are rejected.
- Existing user accounts and password hashes are preserved. JWTs issued before
  this change are not accepted; users must sign in again. Public registration
  remains disabled.

### CSRF, origins, and login rate limits

- Added a double-submit CSRF token cookie and `X-CSRF-Token` header requirement
  for unsafe API methods, and exact Origin validation for those requests.
- CORS and CSRF use the same explicit origin allowlist. Production requires
  `APP_ORIGINS`; wildcard, path, malformed and non-HTTP(S) origins are rejected.
- Login failures are limited per normalized account and source-network prefix
  using atomic MongoDB updates. The database stores keyed hashes rather than
  raw account/network identifiers. Production requires a private
  `LOGIN_RATE_LIMIT_SECRET` of at least 32 characters.
- Authentication responses are marked `Cache-Control: no-store`; errors do
  not expose database connection details.

### Client

- Updated the active React client to send cookie credentials, acquire and keep
  CSRF tokens in memory, and remove the retired `portfolioUser` localStorage
  value. It no longer reads or sends a JWT bearer token.
- The separate legacy `frontend/src/` tree was not modified.

### Console-error follow-up

- Fixed an undefined `loading` reference in the private-area logout button and
  corrected the contact form's React `className` property.
- Allocated the stars position buffer as exactly three coordinates per point,
  eliminating a non-finite vertex and the Three.js bounding-sphere error.
- Added intrinsic dimensions to the Three.js SVG icon used as a WebGL texture;
  this eliminated the browser's invalid-image/immutable-texture warnings.
- Verified the private route and portfolio page in a browser with auth/content
  requests intercepted and synthetic responses. No JavaScript or WebGL errors
  remained. React Router's two v7 future-flag notices remain non-fatal.

## Required environment configuration

Before deploying this change, configure these values in Vercel Production:

| Variable | Requirement |
| --- | --- |
| `MONGODB_URI` | Use a replacement database credential. Do not reuse the credential in public Git history. |
| `APP_ORIGINS` | Comma-separated exact browser origins, including scheme and actual hostnames (for example, both apex and `www` only if both serve the app); no wildcard or path. |
| `LOGIN_RATE_LIMIT_SECRET` | Private random value, at least 32 characters. |
| `SESSION_MAX_AGE_MS` | Optional; positive integer no greater than `86400000`. Defaults to 24 hours. |

`JWT_SECRET` is no longer used for this authentication flow. Do not place
secrets in `vercel.json` or `VITE_` variables. Settings were not changed in
Vercel and no deployment was triggered. The exact production origins need to be
confirmed against the configured domain before deployment.

Locally, start from `.env.example` and use only development credentials. The
test preloader assigns synthetic configuration and skips loading `.env`.

## Verification

- `npm test`: **62/62 passed**, including HTTP integration tests for public
  portfolio APIs, login, current user, admin authorization, logout/revocation,
  CSRF, CORS, session expiry, and atomic concurrent rate limiting. Tests use
  MongoDB Memory Server and synthetic test identities.
- `npm run build`: **passed** in a temporary project copy excluding `.env`,
  `.git`, and `node_modules`; dependencies were linked from the local install.
- Local runtime: Node `24.5.0`, npm `10.2.3`. The project and Vercel settings
  target Node `26.x`; P01A still needs a verification run on Node 26 before
  production.
- Build warnings remain for stale Browserslist data, `eval` in the existing
  `three-stdlib` bundle, and a minified chunk above 500 kB. They did not block
  the build.
- Dependency installation previously reported 24 transitive vulnerabilities
  (1 low, 8 moderate, 15 high); this milestone did not attempt unrelated
  dependency remediation.

## Outstanding security work

1. **Critical:** the credential-bearing MongoDB URI remains in seven public
   Git-history commits. Rotation is not confirmed. Create a least-privilege
   replacement database user, update local/Vercel configuration, verify a
   later deployment, then revoke the old user. Coordinate any history rewrite
   separately; this milestone did not rewrite history.
2. The user previously reported using Atlas `0.0.0.0/0` for Vercel connectivity.
   This milestone did not inspect or change Atlas Network Access. Restrict
   access where the hosting plan/networking allows.
3. Configure and verify `APP_ORIGINS` and `LOGIN_RATE_LIMIT_SECRET` in Vercel
   before deployment. No Production or Preview deployment was tested.
4. The P00 follow-on remains: tenant, membership and entitlement authorization
   must be designed and tested server-side before adding multi-tenant Life2.0
   resources.
