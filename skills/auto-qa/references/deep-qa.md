# Auto-QA Deep Reference

Load this only when a detailed QA matrix/report is needed.

## Profiles

- Focused change: trace the diff to affected surfaces; test those deeply plus one adjacent regression path.
- Full sweep: inventory every reachable meaningful surface; mark each tested, skipped, blocked, manual_review, or not applicable.
- Release candidate: combine deterministic gates, focused/manual flows, rollback, monitoring, and go/no-go criteria.
- Maintenance automation: consume structured change summary, run the smallest complete profile, and return machine-readable status.
- Incident/regression: reproduce original failure, verify fix, then test nearby failure modes and recovery.

## Surface Modules

Use only modules supported by the change: UI/UX, backend/API, data/migrations, auth/security/privacy, external integrations, CLI/jobs, infra/deploy/release, desktop/native/mobile, performance/reliability, observability/support, docs/developer experience.

## Test Matrix Fields

For each gate capture setup, action, expected result, negative result to watch for, evidence, cleanup/reset, owner/blocker, and whether required. Cover happy path, invalid input, cancel/back/close, retry/recovery, timeout/offline/provider failure, denied/expired auth, first-run and existing-user states, cross-platform/responsive behavior, accessibility/keyboard path, redaction, persistence/migration/rollback, and monitoring.

## Hostile Interaction

For touched UI/CLI/workflow controls, test normal activation, repeat/rapid activation, keyboard-only path, visible focus, disabled-state honesty, menu/popover reopen behavior, malformed/long/special input, cancellation, reload/restart, provider failure, expired session, permission denied, and stored-state persistence where relevant.

## Artifact Template

```markdown
# QA Report: <subject>

## Decision
- Status: pass | fail | blocked | accepted-risk | findings-only
- Date:
- Reviewer:
- Branch:
- Commit:
- Risk:
- QA Profile:
- Environment:
- Rationale:

## Objective
- What changed:
- Intended behavior:
- User/business impact:

## Surface Map
| Surface | Why included | Risk | Required gates |
|---|---|---|---|

## Test Matrix
| Gate | Steps/command | Expected | Evidence | Required |
|---|---|---|---|---|

## Surface Coverage
| Surface/item | Status | Evidence | Notes |
|---|---|---|---|

## Execution Evidence
| Gate | Result | Evidence | Notes |
|---|---|---|---|

## Findings
| ID | Severity | Surface | Finding | Repro/evidence | Expected | Actual | Owner/next |
|---|---|---|---|---|---|---|---|

## Blocked Or Skipped Gates
| Gate | Reason | Risk | Owner/action |
|---|---|---|---|

## Security, Privacy, Data, Rollback
- Secrets/log redaction:
- Permissions/privacy:
- Data/migration/recovery:
- Rollback/monitoring:

## Final Recommendation
- Ready:
- Manual review required:
- Conditions:
```

## Automation Return

```json
{
  "qaStatus": "pass | fail | blocked | accepted-risk",
  "qaReportPath": "string",
  "qaSummary": "string",
  "blockingFindings": ["string"],
  "manualReviewRequired": true,
  "readyForNextStep": false
}
```
