# Life2.0 P01A-R - Local-agent workflow and validation

Status: local validation and documentation complete; Product Owner validation
is pending.

## Scope and delivery

- Performed on `life2/p01a-security-foundation`, after commits `301fdcb` and
  `578fd9c`.
- This review tested the local OpenCode/Ollama workflow, independently checked
  local-model review findings, and verified the project on Node 26.
- No application source, credentials, Git history, production database,
  MongoDB Atlas settings, Vercel settings, or deployment were changed.
- No push, merge, or next milestone was started.

## OpenCode and Ollama findings

- Verified local versions: OpenCode `1.18.31` and Ollama `0.34.0`; available
  models included `qwen3-coder:30b` and `gemma4:26b`.
- The prior failed delegation session could not be recovered, so its exact
  agent, model, and failure cause are unconfirmed. The inspected global
  configuration makes two plausible causes: `explore` is read-only and `plan`
  denies edits; `external_directory: deny` can also block a workspace outside
  the project. These are explanations supported by configuration, not proof of
  what happened in that earlier session.
- A disposable V1 configuration with the explicit `build` agent and local
  Qwen model successfully allowed file reads and edits only in its synthetic
  workspace. Shell, web access, external directories, and MCP were denied.
  The configured `unityMCP` server was explicitly disabled.
- `OPENCODE_CONFIG` and a custom config directory do not, on their own,
  guarantee isolation from global settings. Inspect the resolved configuration
  with `opencode debug config` before delegation.
- The model created and corrected fixture files; the final synthetic
  in-process Node test passed **4/4**. The model was not given shell access.
  Docker and a WSL distribution were unavailable, so no OS container was used.
- The local model was used for sequential review passes R1-R4 on sanitized,
  read-only copies that excluded `.env`, `.git`, and dependencies. No suggested
  application change was accepted automatically. Manual verification rejected
  the main R1-R3 findings as false positives, including the 43-character
  base64url session token, per-request revocation checks, CSRF middleware
  enforcement, and the HMAC used to pseudonymize rate-limit keys rather than
  hash passwords.
- R4 identified a real, pre-existing bootstrap limitation: `src/main.jsx`
  waits for both locale API responses before mounting the router and private
  area. A locale API failure therefore prevents the entire app from rendering.
  This was already recorded as a P00 follow-up and was not changed in P01A-R.

## Node 26 and application validation

- The project declares Node `26.x`. Node `26.13.1` was available in the local
  npm cache and was checked offline with
  `npm exec --offline --yes --package=node@26.13.1 -- node --version`.
  The machine's default Node remained `24.5.0`; no global Node installation was
  changed.
- In a temporary copy without `.env` or `.git`, with dependencies linked from
  the local installation, `npm test` passed **62/62** and `npm run build`
  passed under Node `26.13.1`. Tests used `backend/testEnv.js`, synthetic
  identities, and MongoDB Memory Server; no production database was used.
- Build warnings remained for stale Browserslist data, `eval` in the existing
  `three-stdlib` bundle, and a minified chunk above 500 kB. They did not fail
  the build.
- A temporary, permission-restricted Node preview served the built frontend
  and synthetic API responses on loopback only. The `/private` route rendered
  the synthetic user and verified-access status. The browser reported only
  the two existing, non-fatal React Router v7 future-flag warnings on that
  route.
- The synthetic locale response intentionally contained only private-area
  strings. Clicking logout navigated to `/`, where the public portfolio
  expected additional content arrays and emitted a `map` error. This means
  the public route after logout was **not** validated by this mock; it is not
  evidence of a production API failure. No real API or production data was
  used in this preview.
- The actual runtime configured for a current Vercel deployment was not
  verified. The project target is Node 26.x; deployment compatibility remains
  unconfirmed until checked against the live Vercel project/runtime.

## Remaining risks and follow-up

1. **Critical:** the MongoDB URI previously exposed in public Git history is
   present in seven historical commits. Rotation is not confirmed. Create a
   least-privilege replacement user, update local and Vercel configuration,
   verify a later deployment, then revoke the old user. Coordinate any history
   rewrite separately. No credential value is included here.
2. The previously reported Atlas `0.0.0.0/0` network rule was not inspected
   or changed. Restrict access where the hosting plan and networking support
   it.
3. Before deploying P01A, confirm the production `APP_ORIGINS` and
   `LOGIN_RATE_LIMIT_SECRET` configuration described in
   `P01A-security-foundation.md`. No Vercel environment or deployment was
   inspected or changed for this review.
4. Treat local-model review as a source of hypotheses, not a security
   verdict. Verify each report against the implementation and tests.
5. Keep the P00 locale-bootstrap limitation as a separate follow-up; this
   milestone made no application behavior change.

P01A-R is complete locally and awaits Product Owner validation. Do not merge,
push, deploy, or start P01B before approval.
