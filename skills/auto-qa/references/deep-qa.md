# Auto-QA Deep Reference

Load this only when a detailed QA matrix/report is needed.

## Profiles

- Focused change: trace the diff to affected surfaces; test those deeply plus one adjacent regression path.
- Full sweep: inventory every meaningful surface; mark each tested, skipped, blocked, manual-review, or not applicable.
- Release candidate: combine deterministic gates, user flows, rollback, monitoring, baseline comparison, and go/no-go criteria.
- Maintenance automation: consume a structured change summary, run the smallest complete profile, and return machine-readable status.
- Incident/regression: reproduce the original failure, verify the fix, then test nearby failure modes and recovery.

## Surface Modules

Use only modules supported by the change: UI/UX, backend/API, data/migrations, auth/security/privacy, external integrations, CLI/jobs, infra/deploy/release, desktop/native/mobile, performance/reliability, observability/support, and docs/developer experience.

## Test Matrix Fields

For each gate capture setup, action, expected result, negative result to watch for, baseline, execution receipt, cleanup/reset, owner/blocker, and whether required. Cover happy path, invalid input, cancel/back/close, retry/recovery, timeout/offline/provider failure, denied/expired auth, first-run and existing-user states, cross-platform/responsive behavior, accessibility/keyboard path, redaction, persistence/migration/rollback, and monitoring.

Mechanical gates contain only deterministic criteria. Put visual quality, tone, taste, or other subjective judgments in a separate manual/model judgment row; `needs judgment` is not a mechanical failure.

## Hostile Interaction

For touched UI/CLI/workflow controls, test normal activation, repeat/rapid activation, keyboard-only path, visible focus, disabled-state honesty, menu/popover reopen behavior, malformed/long/special input, cancellation, reload/restart, provider failure, expired session, permission denied, and stored-state persistence where relevant.

## Artifact Template

```markdown
# QA Report: <subject>

## Decision
- Status: pass | fail | blocked | accepted-risk | findings-only
- Date:
- Reviewer:
- Branch / commit:
- Risk / QA profile:
- Environment:
- Rationale:

## Objective
- What changed:
- Intended behavior:
- User/business impact:

## Baseline Block
- Environment / profile:
- Pre-change failure, symptom, or trusted result:
- Known inherited failures:

## Surface Map
| Surface | Why included | Risk | Required gates |
|---|---|---|---|

## Test Matrix
| Gate | Steps/command | Expected | Baseline | Required |
|---|---|---|---|---|

## Surface Coverage
| Surface/item | Status | Evidence | Notes |
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
