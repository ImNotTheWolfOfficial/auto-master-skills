# Optimize Log

Maintain compact outside-repo memory for cumulative audits.

Path: `~/.auto-master/artifacts/<project-slug>/optimize/optimize-log.md`

Read it first and append one entry last. Keep a summary table at the top:

```markdown
| Date | Mode | Findings H/M/L | Review mode | Outcome | Notes |
|---|---|---|---|---|---|
| 2026-01-01 | full | 2/3/4 | independently reviewed | presented | top: example listener leak |
```

Each entry includes date, mode/scope, branch/commit, findings/verdicts, checked-clean areas, dismissed findings and reasons, measurement receipts or links, prior-baseline delta, review mode/outcome, user disposition, and in-scope follow-up.

Do not re-report fixed/dismissed findings without new evidence. Log clean runs because their checked-clean coverage makes the next audit cheaper. Never include secrets or raw private values.
