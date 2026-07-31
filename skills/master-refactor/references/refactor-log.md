# Refactor Log

The outside-repo memory of Master-Refactor. Every run **reads it first** and **appends to it last** — it is what makes periodic runs cumulative instead of repetitive.

Path:

```text
~/.codex/artifacts/<project-slug>/refactor/refactor-log.md
```

Append-only and compact. Future sessions scan the summary table, not the full history.

## Format

Top of the file is the summary table; per-run detail entries follow below it, newest last.

```md
| Date | Scope | Verdict | Outcome | Metrics Delta | Notes |
|---|---|---|---|---|---|
| 2026-01-01 | example area | recommended | completed | tests pass, bundle -2% | no behavior change |
```

Each run entry includes:

- date
- scope (repo-wide or feature)
- branch/worktree used
- candidates reviewed (with verdicts, including declined ones)
- approved slices, if any
- files/areas touched
- QA run (gates, results, evidence pointers)
- metrics delta (before/after)
- outcome: completed / partial / declined / failed
- follow-up notes for the next run
- **negative findings** — attempted approaches that failed or were rejected, and why ("tried X, broke Y, don't retry without Z"). These are the most valuable entries: they stop future runs from burning tokens re-proposing or re-attempting dead ends.

## Rules

- Keep the log outside the repo; never write it into the project.
- Read it at startup of every run: skip completed candidates, don't re-propose rejected ones without new evidence, honor recorded gotchas.
- Analysis-only runs where the user declined everything still get logged — candidates reviewed and verdicts are useful history.
- Do not include secrets or private runtime values.
- Prefer concise entries a future agent can scan in seconds; link out to candidate reports and QA artifacts in the same folder rather than duplicating them.
