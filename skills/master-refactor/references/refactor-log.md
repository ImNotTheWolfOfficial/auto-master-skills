# Refactor Log

Maintain compact outside-repo memory so periodic runs do not repeat failed or rejected work.

Path: `~/.auto-master/artifacts/<project-slug>/refactor/refactor-log.md`

Read it first and append one entry last. Keep a summary table at the top and details newest-last.

```markdown
| Date | Scope | Verdict | Outcome | Regression delta | Notes |
|---|---|---|---|---|---|
| 2026-01-01 | example | recommended | completed | tests unchanged, bundle -2% | no behavior change |
```

Each entry includes date, scope/mode, branch/worktree, baseline commit and dirty state, candidates/verdicts, approved slices, files/areas, execution-receipt links, QA and regression delta, outcome, and follow-up items already in scope.

Record negative findings and stable recurrence keys for confirmed failed/rejected approaches so future runs do not retry them without new evidence. Analysis-only and clean runs still get entries.

Do not include secrets or private runtime values. Keep entries scannable and link to detailed artifacts rather than duplicating them.
