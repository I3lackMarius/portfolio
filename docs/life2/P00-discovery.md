# Life2.0 P00 - Discovery audit

Audit date: 2026-11-14

Status: audit and documentation only; Product Owner approval is pending.

## Scope and branch state

- Production `main` was not modified. The local `develop/life2` branch was
  created from verified `main` commit `860254d`; `life2/p00-discovery` is based
  on that integration branch.
- Both branches are local. No push, merge, deployment, production migration,
  credential rotation, Git-history rewrite, or MongoDB/Vercel configuration
  change was performed.
- P00 contains no application implementation. The only intended changes are
  audit and developer documentation.
- A read-only review of the core architecture was delegated to local
  OpenCode/Ollama (`qwen3-coder:30b`) with `.env`, Git history and dependencies
  explicitly excluded. Its observations were cross-checked against the working
  copy; this report is the verified source of record.

## Executive summary

1. **Critical credential exposure:** the tracked root `.env` contains a
   credential-bearing MongoDB URI. The local redacted scan found the file in
   seven commits reachable from local Git refs. The repository is public, so
   the database credential must be treated as compromised even if it is later
   rotated.
2. The user reports that Atlas now allows `0.0.0.0/0` and the production API
   works. This makes rotation especially urgent; the network access change was
   not rechecked or modified during P00.
3. The active application is the repository-root Vite app in `src/`; the
   separate `frontend/src/` tree is not referenced by the root entry point or
   npm scripts and appears to be legacy.
4. Vercel Project Settings currently selects Node.js `26.x` and the default
   repository root. The local default is Node `24.5.0`; baseline tests and
   build were additionally verified with Node `26.13.1`.
5. Life2.0 can be added incrementally in `src/life/` and `backend/life/`,
   preserving the public portfolio and current APIs. The Figma prototype named
   in the request was not found in the working copy, so design comparison is
   still blocked.

## Verified current architecture

| Area | Observed state |
| --- | --- |
| Frontend | Root `index.html` loads `/src/main.jsx`; root npm scripts run Vite. The active app uses React 18, React Router 6 and Tailwind CSS 3. |
| Backend | Express 4 in `backend/`, MongoDB via Mongoose 7, JavaScript ESM, one root `package.json`. |
| API deployment | Four Vercel Function entry points exist under `api/` for content, auth and portfolio routes. They reuse the Express app and database handler. |
| Existing routes | Express mounts `/api/content`, `/api/portfolio` and `/api/auth`. Portfolio routes currently expose GET collection and GET by ID; controller functions for writes are not routed. |
| Private UI | `/login` and `/private` exist. There is no Life2.0 module or `/private/*` route tree yet. Public registration returns 403. |
| Legacy frontend | `frontend/src/` is present, but the root HTML/Vite entry and package scripts point to `src/`. No root-source imports of `frontend/src/` were found. Keep it until its history/use is separately confirmed; do not delete as part of P00. |
| Duplicate controller | `backend/controller/portfolioController.js` duplicates the plural-directory controller. `backend/routes/portfolioRoutes.js` imports `backend/controllers/portfolioController.js`; the singular copy has no current import found. |
| Tailwind configuration | `tailwind.config.js` and `tailwind.config.cjs` both contain the active CommonJS config; the `.js` file also has a commented starter config. `postcss.config.js` invokes Tailwind without an explicit config path. Both files are retained; no cleanup was done. |
| Design reference | `life2-figma-prototype-v04.html` is absent from tracked files and the working tree. The only tracked path containing `figma` is the portfolio technology icon. |

### Runtime and baseline

- Root `package.json` declares `"engines": { "node": "26.x" }`.
- The Vercel project's Build and Development Settings page selects `26.x`.
  The page states that this setting applies to builds and Serverless Functions
  and that a redeploy is needed after changing it. The root-directory setting
  is blank/default (`./`). No deployment was triggered by this audit.
- The workstation's default runtime is Node `24.5.0` with npm `10.2.3`. For a
  target-runtime check, Node `26.13.1` was invoked ephemerally; the repository
  manifests were not changed.
- With `DOTENV_CONFIG_PATH` pointing to a nonexistent temporary file, a
  loopback-only dummy MongoDB URI, and a dummy JWT secret, `node --test` passed
  all 26 tests and the Vite production build succeeded under Node 26. No test
  connected to production data.
- The package exposes no lint script; there are no React component or E2E test
  suites in the current repository.
- Existing build warnings: stale `caniuse-lite` data, `eval` in
  `three-stdlib`'s Lottie bundle, and a minified JavaScript chunk above 500 kB.
  These did not fail the build and are not changed in P00.

## Security findings

### Critical - tracked MongoDB credential

The local scanner examined 10,633 reachable Git blob objects and the current
working copy. Output was redacted: no credential, URI, token, or key value was
printed. It found:

- `.env` is tracked and is not excluded by the current `.gitignore`.
- The current `.env` has a non-placeholder `MONGODB_URI` containing embedded
  authentication. Seven commits in reachable Git history contain `.env`.
- The scan did not find a `JWT_SECRET` variable in the `.env` revisions it
  examined. Vercel environment-variable values were not read. This pattern-based
  scan is not proof that no other secret exists.
- Placeholder documentation and a low-entropy token-like string in a historical
  vendored README were not classified as live credentials.

Assume the database password in the URI is compromised. Required remediation,
not performed in P00:

1. In Atlas **Database Access**, create a replacement application user with a
   fresh password and only the permissions the app needs. This allows rotation
   without taking the currently deployed app offline.
2. Set the replacement URI in Vercel's Production environment and local `.env`,
   redeploy Production, and verify the API. Do not paste the URI into chat,
   terminal output, logs, or documentation.
3. Revoke/delete the old database user after the new deployment is verified. If
   creating a second user is not possible, coordinate a password rotation and
   deployment to minimize downtime.
4. With approval, remove `.env` from Git tracking, add it to `.gitignore`, and
   provide a values-free `.env.example`. Rotation must happen first; ignoring or
   deleting the current file alone does not remove its history.
5. With approval and coordination, rewrite public Git history to remove the
   file, then force-update affected refs and notify collaborators. History
   cleanup cannot guarantee removal from forks, clones, caches, or prior
   copies.
6. Replace Atlas `0.0.0.0/0` with a narrower egress policy when the hosting
   arrangement permits it. The user reports the broad rule is currently needed
   for Vercel's dynamic egress on the current plan; Atlas still requires database
   authentication, but the network boundary is open to all source IPs.

P00 did not modify `.env`, `.gitignore`, Git history, Atlas, Vercel, or any
credential.

### Authentication and authorization baseline

- Passwords are hashed with bcrypt; the User model has a single `isAdmin`
  boolean. Public registration is disabled in the controller.
- Login issues a JWT valid for one day. The React auth context stores it in
  `localStorage`.
- The frontend checks `isAdmin` for navigation, and the Express middleware also
  verifies the JWT, loads the user and enforces `isAdmin` on the private API.
  The server-side check is authoritative; a client-side flag is not an access
  control.
- There are no tenant, membership, entitlement, session-revocation or
  refresh-token models/routes today.

Recommended evolution, after approval:

1. Keep public registration disabled. Move authentication away from a
   long-lived browser-readable token toward a short-lived, revocable session
   delivered by a `Secure`, `HttpOnly`, `SameSite` cookie. Add CSRF protection
   for state-changing requests and explicit logout/session revocation.
2. Keep global user identity separate from tenant membership. Add tenant and
   membership records with a unique `(userId, tenantId)` constraint, role and
   active status.
3. Resolve tenant context on the server and verify membership on every request.
   Never authorize from a client-supplied tenant ID, role, `isAdmin` flag or
   entitlement. Scope every read/write query by the authorized tenant and test
   cross-tenant access explicitly.
4. Model entitlements as server-side feature/plan grants separate from roles;
   enforce them in middleware/service boundaries rather than only hiding UI.

## Incremental Life2.0 architecture proposal

This proposal keeps the existing repository, toolchain and public URLs; it does
not introduce a monorepo or another framework.

### Frontend and startup

- Place private modules under `src/life/`; keep the current portfolio components
  and visual behavior in their existing locations.
- Add a `/private/*` route subtree ahead of the public fallback. Keep `/login`
  behavior and the portfolio's current public routes unchanged.
- `src/main.jsx` currently awaits both locale API requests before rendering the
  entire router. A failure renders an error in place of every route, including
  login/private routes. Initialize the router first and load portfolio content
  within the public portfolio route; lazy-load the private area and give it
  independent translations/error handling.

### Backend and Vercel Functions

- Place platform/core and Life2.0 domain modules under `backend/life/`.
- Mount a versioned Express router at `/api/life/v1`; leave the existing
  `/api/content`, `/api/portfolio` and `/api/auth` mounts unchanged.
- Keep Vercel entry points under `api/` and reuse the existing Express app,
  database connection helper and `createVercelHandler`. For initial resources,
  follow the repository's explicit endpoint pattern (including explicit
  `[id]` files) rather than adding a broad API catch-all. The existing SPA
  rewrite must continue to exclude `/api`.
- Validate every new function path and nested parameter with `vercel dev` or an
  isolated Preview deployment before production. No Vercel deployment was
  performed in P00.

### Style isolation

`src/index.css` applies a portfolio-wide font and reset, a dark color scheme,
and `body` animation/custom-cursor rules. For implementation, preserve the
public appearance but make the body-level portfolio behavior route-aware (for
example, a `portfolio-active` body class) and turn it off for Life2.0. Put
private styles in `src/life/`, scope tokens and component styles under a root
such as `.life-shell`, and explicitly override the inherited/direct universal
rules that affect private descendants. Do not add a second global Tailwind base
layer or new unscoped `body`, universal-selector, reset or keyframe rules. Verify
the public route against before/after screenshots. Keep the Tailwind pipeline
until a deliberate, tested style boundary is approved. The missing prototype
must be supplied before visual acceptance against the official design.

## Incremental test strategy

Preserve the current Node Test Runner suite and keep every test isolated from
production environment variables and data.

1. **React units:** after approval, add a Vite-compatible component runner and
   Testing Library for route guards, forms, loading/error states, and public
   portfolio regression checks.
2. **API contracts:** continue unit tests for controllers/middleware; add route
   tests for versioned Life2.0 endpoints and invalid inputs. Use injected
   repositories or an isolated disposable test database, never Production
   `MONGODB_URI`.
3. **Tenant security:** create users in two tenants and prove tenant A cannot
   list, read, update, or delete tenant B data, including guessed IDs and
   client-supplied tenant values. Cover roles and entitlement denial on the
   server.
4. **E2E:** use a dedicated test identity/database to cover login, logout,
   session expiry, direct navigation to `/private/*`, forbidden access and
   portfolio behavior.
5. **Responsive and themes:** verify mobile, tablet and desktop breakpoints,
   keyboard/accessibility behavior, and both light/dark themes. Keep snapshots
   or screenshots for the private area separate from the unchanged public
   portfolio.

## Documentation and approval notes

- `STATUS.md` and `HELP.md` are updated in this milestone to remove stale
  endpoint claims and commands that print the database URI.
- P00 is complete as an audit/documentation milestone only. The critical
  credential rotation and any repository/service remediation require owner
  action/approval. Life2.0 application work must wait for Product Owner approval
  and start from the accepted `develop/life2` checkpoint.
