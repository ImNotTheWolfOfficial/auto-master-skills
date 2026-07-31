# History Review and Cleanup Boundaries

History is where sanitization goes wrong. Load this before any history-related discussion.

## Defaults (always in force)

- Do not alter git history.
- Do not force-push.
- Do not delete branches or tags.
- Do not publish or make repos public.

## Read-Only Historical Review

Permitted without approval — inspection only:

- branch names
- tag names
- commit messages
- tracked file paths over time
- whether sensitive-looking paths or patterns ever appeared in history (any ref, not just HEAD)

Rules for historical findings:

- Do not print secret values from history — masked summaries only.
- Summarize the finding type and affected commit/path context.
- **Rotation rule:** a credential that ever existed in history is compromised the moment that history is (or was) public — rewriting history later does not un-leak it. Flag it for rotation explicitly, regardless of what cleanup path is chosen.
- Recommend clean fresh-history export by default for private-to-public moves.

## Opt-In Cleanup Planning (only when the user explicitly asks)

When the user explicitly requests historical cleanup planning:

1. **Backup first** — a full mirror copy kept outside the repo (`~/.codex/artifacts/<project-slug>/sanitize/backup-<date>/`).
2. **Mirror clone** — plan all cleanup against an isolated `git clone --mirror`, never the working repo.
3. **Rewrite in the isolated copy only** — `git filter-repo` is the preferred tool (over `filter-branch`) for removing leaked paths/blobs and redacting patterns. Record every rule applied.
4. **Re-scan the isolated result** — run the full working-tree review over all refs of the rewritten mirror; confirm leaks are gone from history, not just from HEAD.
5. **Report exactly what changed**, ref by ref.
6. **Stop before force-push or publication.**

Keep this at planning level: do not emit step-by-step destructive commands unless the user has explicitly requested implementation and accepted the risk in the active conversation.

## Force-Push Rule

Never force-push rewritten history unless the user explicitly approves that exact push, against that exact remote, after seeing the final re-scan report. When they do, warn that:

- collaborators must re-clone (their local clones still carry the old history);
- platform-side caches and forks may retain old blobs — purging cached views can require platform support;
- any credential in the old history still needs rotation regardless.
