# Evidence And Reporting

Write a report a future owner can trust without rerunning the release sweep.

## Path

`~/.auto-master/artifacts/<project-slug>/qa/<date>-master-qa-report.md`

Store screenshots and supporting artifacts beside it under `<date>-evidence/`. Keep them outside the repo unless repo policy explicitly requires in-repo QA records.

## Template

```markdown
# Master-QA Report - <project> - <date>

Decision: GO | NO-GO | GO WITH KNOWN ISSUES
Release target: <version/artifact/deployment surface>
Scope: <repo-wide/feature/installer/patch>
Commit: <sha>

## Summary
<plain-language decision and why>

## Baseline Block
- Prior release/report:
- Artifact/commit:
- Environment/profile:
- Inherited failures:
- Measured signals:

## Blockers And High-Priority Issues
| Severity | Area | Issue | Evidence | Required action |
|---|---|---|---|---|

## QA Matrix
| Area | Check | Method | Evidence | Result | Notes |
|---|---|---|---|---|---|

## Release Gates
| Gate | Result | Evidence | Notes |
|---|---|---|---|

## Evidence Reuse
| Evidence | Artifact | Captured | Why still valid |
|---|---|---|---|

## Execution Receipts
| Gate | Exact command/flow | Timestamp | Exit/result | Evidence | Environment |
|---|---|---|---|---|---|

## Regression Delta
| Signal | Baseline | Current | Delta | Classification |
|---|---|---|---|---|

## Judgment Gates
| Criterion | Reviewer/method | Result | Evidence | Notes |
|---|---|---|---|---|

## Not Tested / Blocked
<what, why, risk, and exact unblocker>

## Known Issues For Release Notes
<customer-safe plain language; no internal paths/identifiers>

## Final Recommendation
<clear release action>
```

## Rules

- Every claimed gate has a receipt. A summary without exit/result and evidence is not proof.
- Cite reused `auto-qa` evidence by artifact and date; reverify anything changed since capture.
- Do not paste secrets, auth values, or giant raw logs. Use SET/MISSING or masked values and concise output/artifact paths.
- Treat the report as the next release's baseline.
