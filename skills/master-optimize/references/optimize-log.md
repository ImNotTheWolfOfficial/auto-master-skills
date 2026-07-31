# Optimize Log

The outside-repo memory of Master-Optimize. Every run **reads it first** and **appends to it last** — it is what keeps periodic audits cumulative instead of repetitive.

Path:

```text
~/.codex/artifacts/<project-slug>/optimize/optimize-log.md
```

Append-only and compact. Future sessions scan the summary table, not the full history.

## Format

Top of the file is the summary table; per-run detail entries follow below it, newest last.

```md
| Date | Mode | Findings (H/M/L) | Reviewed | Outcome | Notes |
|---|---|---|---|---|---|
| 2026-01-01 | full | 2/3/4 | yes | presented | top: listener leak in example area |
```

Each run entry includes:

- date, mode (full / focus + scope), branch/commit audited
- findings with severity and verdict — including dropped and "not recommended" ones
- **checked-clean areas** — what was scanned and found fine, so the next run can skim instead of re-audit (unless the area changed since)
- **dismissed findings** — refuted in review or declined by the user, with the reason; never re-reported without new evidence
- peer-review outcome: reviewer verdicts summary, additions accepted/rejected
- what the user did with the report (handed to master-refactor, deferred, declined)
- follow-up notes for the next run (areas to re-check, measurements worth setting up)

## Rules

- Keep the log outside the repo; never write it into the project.
- Read it at startup of every run: skip fixed findings, honor checked-clean areas for unchanged code, don't re-report dismissed findings without new evidence.
- Runs where nothing significant was found still get logged — checked-clean coverage is the payoff.
- Do not include secrets or private runtime values.
- Keep entries scannable in seconds; link to the report files in the same folder rather than duplicating content.
