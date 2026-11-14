# Life2.0 repository guidance

## Scope and compatibility

- Life2.0 is an incremental extension of this repository, not a new monorepo or framework migration.
- Preserve the public portfolio's routes, behavior, appearance, and existing APIs.
- Keep future Life2.0 UI under `src/life/`, backend modules under `backend/life/`, and Vercel adapters under `api/life/`.
- Keep public registration disabled. Do not start tenant, membership, entitlement, payment, or product-module work before its approved milestone.
- For future Life2.0 UI, use the official v0.4 Figma prototype as the visual reference when the Product Owner supplies it.

## Milestones and Git

- `main` is production; never modify it directly.
- Integrate only accepted milestones into `develop/life2`.
- Create one dedicated branch per milestone from the latest accepted `develop/life2` checkpoint.
- Do not push, merge, deploy, rewrite history, or change cloud resources without explicit Product Owner approval.
- Do not discard or overwrite user changes. Inspect branch and working-tree state before Git operations.
- Commit completed milestone work on its dedicated branch and report the commit and validation results.

## Credentials and data

- Never print, commit, or send credentials, tokens, private keys, connection strings, or personal data to an LLM.
- Keep local environment files and private key material untracked; `.env.example` must contain placeholders only.
- Treat credentials present in public Git history as compromised until the Product Owner confirms rotation. Do not claim rotation or revocation without confirmation.
- Never access production databases or use production credentials for development, tests, seeds, or delegated work.
- Do not change MongoDB Atlas, GitHub, or Vercel settings, or run production migrations, without explicit approval.

## Local model delegation and testing

- Delegate implementation and test authoring to locally available OpenCode/Ollama models when requested; do not fall back to cloud models without authorization.
- Before delegation, use a sanitized context and enforce file-system/tool restrictions. A worktree alone is not a security boundary.
- Exclude `.env`, `.git`, dependencies, production data, and private keys from delegated contexts. Disable shell/network access unless a separately isolated environment makes the exact operation safe.
- For file edits, select the `build` agent explicitly; `plan` and `explore` are read-only and cannot perform the requested edits. Pin the approved local model and inspect the resolved settings with `opencode debug config`; `OPENCODE_CONFIG` alone does not guarantee that global permissions have been overridden.
- Use a disposable workspace and an explicit allowlist limited to reading and editing files there. Deny shell, web access, external directories, and MCP servers unless separately approved and isolated; explicitly disable configured MCP servers rather than assuming they are inactive.
- Let the model edit or author tests, but run tests and builds separately with sanitized environment and synthetic data. Do not broaden model permissions to work around test-runner or isolation limitations.
- Run tests only with synthetic configuration and an isolated test database or injected fakes. Never allow tests to inherit production database settings.
- Preserve existing tests and behavior; report commands and actual outcomes, not planned checks.

## Delivery

- Keep milestone scope narrow and update the corresponding `docs/life2/` report.
- Include branch, commits, changed files, local-model delegation, test/build results, manual owner actions, and residual risks in the final report.
- Do not begin the next milestone or merge the current milestone until the Product Owner validates it.
