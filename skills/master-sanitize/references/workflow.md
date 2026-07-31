# Master-Sanitize Workflow

Full public-readiness review process. Load this before starting.

## Supported Scopes

1. **Current working tree review** — what is on disk right now.
2. **Branch/pre-push readiness review** — the outgoing diff and every ref (branch/tag) that would be pushed to a public remote. This is the recurring mode for pushing updates to an already-public repo.
3. **Public docs readiness review** — README, docs folders, examples, and anything customer/contributor-facing.
4. **Private-to-public export planning** — the closed-source to open-source move.
5. **Read-only historical review** — inspect history without touching it.
6. **Explicitly approved cleanup planning** — only after the user asks, per `history-cleanup-boundaries.md`.

## 1. Startup Checks

1. Confirm the active repo and project root.
2. Read project instructions (`AGENTS.md`) if present.
3. Check git branch and worktree status; identify unrelated user work and preserve it.
4. Derive `<project-slug>` from the repo name unless the user specifies otherwise.
5. Establish what is going public: which remote, which refs, whole repo or an export subset. The review must cover everything in that set — no more, no less.

## 2. Artifact Setup

- Report root:

```text
~/.auto-master/artifacts/<project-slug>/sanitize/
```

- Private denylist path (see `private-denylist.md`):

```text
~/.auto-master/artifacts/_private/sanitize-denylist.json
```

## 3. Review Mode (default: read-only)

- Run read-only checks first; prefer repo-native search and metadata inspection.
- Review the working tree and tracked files per `working-tree-review.md`.
- For pre-push scope, scan all outgoing refs, not just HEAD — side branches and tags leak too.
- Do not modify, delete, publish, or rewrite anything during the default review.

## 4. Findings

- Categorize findings by severity and public-release risk.
- Mask sensitive values — never quote a secret, even partially, beyond what identification requires.
- Include enough location context (file, line, ref) for the owner to fix items without exposing secret values.
- Flag any credential that appears live for **rotation** — cleanup does not un-leak it.
- Note candidate denylist additions: internal terms found during review that the denylist does not yet cover.

## 5. Recommendation

Use exactly one:

- **READY** — no blocking public-readiness findings.
- **READY AFTER FIXES** — specific issues to fix before release; listed with actions.
- **CLEAN EXPORT RECOMMENDED** — the public version should be a fresh clean repo/export (default for closed-to-open moves).
- **NOT READY** — serious private material or unclear ownership/licensing risk remains.
- **BLOCKED / NEEDS USER INPUT** — required context or approval is missing.

## 6. Stop Gate

- Stop after the report unless the user explicitly asks for cleanup implementation.
- If cleanup is requested, follow `history-cleanup-boundaries.md` — and still avoid destructive actions unless each is separately approved.
