# Life2.0 P01B - Platform Core

Status: final acceptance checks complete; ready for Product Owner acceptance.

## Scope and branch

- Implemented on `life2/p01b-platform-core`, based on the P01A checkpoint
  `dd258b1` on `develop/life2`.
- Adds the initial tenant, membership, entitlement, workspace-provisioning,
  versioned API, and private-area foundations. It does not implement finance
  or other application modules, add public registration, or migrate production
  data.
- Portfolio routes and APIs remain in place. The private UI is isolated under
  `src/life/`, backend services under `backend/life/`, and Vercel handlers under
  `api/life/`.
- No push, merge, deployment, production database access, Vercel setting
  changes, or MongoDB Atlas changes were performed.

## Platform Core

- Tenants have `personal` or `shared` types and `active` or `suspended` status.
  A partial unique index allows at most one personal tenant per owner.
- Memberships are unique per `(tenantId, userId)` and have an `owner` or
  `member` role plus `active`, `suspended`, or `disabled` status.
- Entitlements are unique per `(tenantId, moduleKey)`. The immutable registry
  declares Finance, Productivity, Health, and Journal, all with
  `implemented: false`; an entitlement cannot make an unimplemented module
  available.
- Login authenticates the user and creates a session only. It creates no
  workspace, membership, or entitlement. Public registration remains disabled.
- Workspace/module provisioning is an explicit local administrative operation:
  `node backend/scripts/provisionLifeWorkspace.js --user-id <id> --modules <module,...>`
  defaults to dry-run; writes require the additional `--apply` flag. The
  required module list is validated against the registry, only requested
  entitlements are created, existing memberships are not promoted, and
  existing entitlements (including suspended ones) are left unchanged.
  The command requires `MONGODB_URI` from its environment and does not load
  `.env` or print user, credential, or connection-string values.
- `GET /api/life/v1/workspaces` lists only active memberships in active
  tenants; an authenticated user without a workspace receives
  `{ "workspaces": [] }`. `GET /api/life/v1/context?tenantId=<id>` requires
  an authenticated session, an explicit valid tenant ID, and active
  membership. Missing/invalid IDs are rejected and guessed tenant IDs are
  forbidden. Its response derives roles and the `implemented`, `entitled`,
  and `available` module flags server-side and is marked `no-store`.
- There is no Life2.0 bootstrap endpoint. The legacy `/api/auth/private`
  endpoint is preserved, but `src/life/LifeProvider.jsx` calls the versioned
  workspaces/context APIs through the `/api` client and does not depend on it.
- Module authorization checks tenant status, active membership, entitlement
  status, and registry implementation status. An entitlement alone cannot
  enable an unimplemented module; `isAdmin`, client body fields, and guessed
  tenant IDs do not grant access.
- Each versioned API route has an explicit Vercel Function adapter. No
  catch-all API route or existing API rewrite was added.

## Private UI and portfolio isolation

- `/private/*` renders the authenticated Life2.0 area; it no longer depends on
  the legacy `isAdmin` gate. The UI displays server-derived workspace and
  module context, supports selecting among multiple workspaces, and provides
  light/dark theme switching.
- Life2.0 styles are scoped to `.life-shell` and `body.life-active`; the
  portfolio's existing global stylesheet was not changed.
- i18next starts with only the small authentication strings needed before
  sign-in. Portfolio locale content is fetched only by the public portfolio
  route, not during application startup or private-area initialization.
- The separate `frontend/src/` tree and duplicate legacy configuration areas
  were not cleaned up or removed.

## Verification

- `npm test`: **90/90 passed** on Node.js 26.13.1. Integration tests use
  MongoDB Memory Server 7.0.14 and synthetic identities; they cover login
  without provisioning, Finance-only and all-module explicit provisioning,
  concurrent idempotency, suspended-entitlement retention/denial,
  `isAdmin` membership isolation, empty workspaces, and the versioned API.
  The Vercel Function adapter is exercised in the local test harness; no
  deployed Vercel environment was used.
- `npm run build -- --config vite.p01b.test.config.js`: **passed** on
  Node.js 26.13.1 with an empty Vite env directory; the temporary config was
  removed. Existing Browserslist, `three-stdlib` `eval`, and large-chunk
  warnings remain.
- Browser flow used Vite plus the real Express backend and an ephemeral
  MongoDB Memory Server with a synthetic user, workspace, entitlements, and
  portfolio content: login → `/private` → refresh → logout → public portfolio
  → `/private` redirected to login. The private page showed the explicitly
  provisioned four-module workspace after refresh. No API mocks were used.
  The public page rendered its portfolio sections; the final browser
  observation had no uncaught page errors. Expected unauthenticated
  `/api/auth/me` 401 and non-fatal React Router/WebGL warnings were observed.
- Tests/build/browser checks did not load `.env` or access production data.
- OpenCode/Ollama was attempted in a sanitized workspace. Its edit attempts
  produced invalid/no-op changes and stalled during correction; those outputs
  were not transferred. Copilot made and verified the final surgical changes.
  No production credentials or data were sent to the local model.

## Outstanding items and limits

- This milestone is local-only and awaits Product Owner validation. Do not
  merge it into `develop/life2` or begin P02 before approval.
- Vercel deployment behavior and production settings were not tested or
  changed. Verify explicit Vercel Function routing in a non-production
  deployment before release.
- Rotation of the MongoDB credential historically exposed in public Git
  history remains unconfirmed. Keep treating it as compromised until the
  Product Owner confirms rotation; coordinate any history cleanup separately.
- The previously reported Atlas `0.0.0.0/0` network rule remains outside this
  milestone and was not inspected or changed.
- Continue to keep all tenant and module decisions server-authoritative.
  Product modules, shared-workspace management APIs, billing, and broader
  multi-tenant workflows require their own approved milestones.
