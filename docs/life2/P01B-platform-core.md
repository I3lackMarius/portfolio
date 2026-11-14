# Life2.0 P01B - Platform Core

Status: implementation and local verification complete; Product Owner
validation is pending.

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
- Entitlements are unique per `(tenantId, moduleKey)`. Module definitions come
  from an immutable registry; `finance` is registered but marked
  `implemented: false`.
- A successful login idempotently provisions the user's personal workspace
  and owner membership. Provisioning does not promote or rewrite an existing
  membership. There is no self-provisioning endpoint; public registration
  remains disabled.
- `GET /api/life/v1/workspaces` lists only active memberships in active
  tenants. `GET /api/life/v1/context?tenantId=...` requires an explicit,
  valid tenant ID, an authenticated session, and active membership. The
  response derives roles and modules server-side and is marked `no-store`.
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

- `npm test`: **84/84 passed** on Node.js 26.13.1. Tests use synthetic
  identities and MongoDB Memory Server; login provisioning, unique indexes,
  tenant isolation, entitlement decisions, and explicit Vercel route dispatch
  are covered.
- `npm run build -- --config vite.p01b.test.config.js`: **passed** with an
  empty Vite env directory so the local `.env` was not loaded. The temporary
  config was removed after verification. Existing Browserslist,
  `three-stdlib` `eval`, and large-chunk warnings remain.
- Browser verification used an isolated MongoDB Memory Server and synthetic
  account on loopback. `/private` loaded the personal workspace and owner
  membership without requesting `/api/content/*`; at a 390px viewport there
  was no horizontal overflow. Theme switching changed the rendered
  background in both modes. The public route subsequently loaded both locale
  content endpoints successfully and rendered the existing portfolio sections.
- Non-fatal React Router v7 future-flag warnings remain. An initial browser
  attempt also received 500 responses after its short-lived synthetic API
  process exited; restarting the isolated API with synthetic content produced
  successful 200 responses. The earlier expected unauthenticated `/me` 401
  was followed by a successful synthetic login.
- The local Ollama/OpenCode workflow was used for initial B1/B2 generation.
  Defects in generated output were corrected or replaced after local tests;
  no production credentials or data were provided to those tools.

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
