# QA Matrix

Build the matrix before running long checks. It is the plan, the tracker, and (filled in) the core of the final report.

## Format

```md
| Area | Check | Method | Evidence | Result | Notes |
|---|---|---|---|---|---|
| Build | Production build | repo command | command output summary | pass/failed/blocked | |
| Main journey | First-run happy path | browser/app check | screenshot/path | pass/failed/blocked | |
```

Valid results: `pass`, `failed` (executed check failed), `blocked`, `reused` (fresh `auto-qa` evidence accepted — cite the artifact), `skipped` (with reason). A required gate can never move from `blocked`/`skipped` to `pass` without actually running.

## Recommended Categories

- install/setup
- first-run experience
- main happy paths
- key error paths
- settings/configuration
- file/data import/export when relevant
- offline or degraded-network behavior when relevant
- update/upgrade path when relevant
- accessibility basics (keyboard-only journey, visible focus, readable labels)
- performance baseline checks when available
- release metadata
- checksums/signatures when applicable
- rollback readiness
- docs/customer-support readiness when relevant (are public docs current for what ships?)

## Severity Labels

- **Blocker** — prevents release or causes serious user/data failure.
- **High** — likely user-visible failure or release trust issue.
- **Medium** — meaningful issue with a workaround.
- **Low** — polish or documentation gap.
- **Info** — note only.

## Decision Rules

The decision rules are in the Decision section of `SKILL.md`; apply them to the filled matrix.
