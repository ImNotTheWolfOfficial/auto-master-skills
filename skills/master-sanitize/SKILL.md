---
name: master-sanitize
description: Review authorized local repos for public-release readiness and accidental private material before open-source publishing or public sharing. Use when the user asks for Master-Sanitize, master-sanitize, repo sanitization, open-source readiness, public repo review, private-to-public cleanup, confidential material review, denylist scan, sensitive file review, or safe export planning. Defaults to review/report only and writes findings outside the repo.
---

# Master-Sanitize

Use this skill to review a repo, branch, or export candidate before public sharing, an open-source push, or a closed-source to open-source move.

## Core Rules

- Default to review/report only. No file deletion, history editing, force-pushing, or publishing without explicit approval for that exact action.
- Review everything that would go public: for pre-push reviews, scan all outgoing refs (branches and tags), not just HEAD — a secret on a side branch leaks the moment it is pushed.
- Write reports outside the repo under `~/.codex/artifacts/<project-slug>/sanitize/`.
- Read private denylist entries only from outside repos. Never copy the denylist into a repo. Never print full denylist contents.
- Never print secrets, tokens, private keys, certs, passwords, auth headers, cookies, signed URLs, or private environment values.
- Report sensitive findings as masked, summarized, or SET/MISSING.
- A leaked live credential must be rotated — removing it from files or history does not un-leak it. Always say so in the report.
- For private-to-public transitions, recommend a clean fresh-history export by default.
- Treat historical cleanup as opt-in and isolated in a mirror clone only.
- Never name generated files or doc content after AI models or providers.
- Preserve unrelated user work.

## Workflow

1. Identify the active repo, project slug, branch, worktree state, and what is intended to go public.
2. Read project instructions such as `AGENTS.md` if present.
3. Load the private denylist if present.
4. Review the working tree, tracked files, and outgoing refs for public-readiness concerns.
5. Review docs/comments/public text for internal-only wording, competitor mentions, and denylist hits.
6. Review ignored-file rules and sensitive file patterns.
7. If requested, review branch/tag history in read-only mode.
8. Produce a masked findings report outside the repo.
9. Recommend one of: READY, READY AFTER FIXES, CLEAN EXPORT RECOMMENDED, NOT READY, or BLOCKED.
10. Stop before any cleanup action unless the user explicitly approves the action.

## References

Read these references as needed:

- `references/workflow.md` for the full public-readiness review process.
- `references/working-tree-review.md` for files/content checks.
- `references/private-denylist.md` before loading private denylist terms.
- `references/public-release-readiness.md` before recommending open-source/public release.
- `references/history-cleanup-boundaries.md` before any history-related discussion.
- `references/reporting.md` before writing the final report.
