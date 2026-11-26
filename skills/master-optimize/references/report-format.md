# Optimization Report Format

Save to `~/.auto-master/artifacts/<project-slug>/optimize/optimization-report-<date>.md`.

## Template

```markdown
# Master-Optimize Report

Project: <slug>
Mode: <full | focus: scope>
Date: <date>
Branch / commit: <branch @ sha>
Status: DRAFT (independent review blocked) | FINAL (self-verified) | FINAL (independently reviewed)

## Summary
<resource health, top findings, biggest user-facing wins>

## Findings Overview
| # | Finding | Category | Resource | Severity | Confidence | Effort | Verdict |
|---:|---|---|---|---|---|---|---|

## Findings

### <#>. <name>
- Category / resource:
- Severity / confidence / effort / verdict:
- Location: <file:line>
- Evidence type: measured | read in source | hypothesis
- Mechanism:
- User impact:
- Leaner alternative and behavior impact:
- Measurement or reason unavailable:

## Coverage
<categories/areas scanned, skipped with reason, and checked-clean areas>

## Measurement Receipts And Baseline Delta
| Measurement | Exact command | Timestamp | Exit/result | Evidence | Prior baseline | Delta |
|---|---|---|---|---|---|---|

## Verification And Review
- Self-verification performed:
- Independent-review trigger:
- Independent review: used | skipped | blocked, with reason
- When used: verdicts, verified additions, rejected suggestions, disputes

## History Check
<prior fixed/dismissed findings and why they were or were not re-reported>

## In-Scope Handoff
<findings suitable for master-refactor versus a separately authorized behavior-change proposal>
```

## Rules

- Rank by user impact and confidence, not discovery order.
- Include not-recommended findings so ruled-out work is visible.
- Separate measured evidence from estimates/hypotheses.
- Coverage and Verification And Review are mandatory. If required review is blocked, the report remains a draft.
- Internal paths are acceptable; secrets are not.

## Optimize Log

`~/.auto-master/artifacts/<project-slug>/optimize/optimize-log.md` is the compact memory that makes the next audit cheaper. Keep a summary table at the top and append one entry per run, newest last:

```markdown
| Date | Mode | Findings H/M/L | Review mode | Outcome | Notes |
|---|---|---|---|---|---|
| 2026-01-01 | full | 2/3/4 | independently reviewed | presented | top: example listener leak |
```

Each entry records the date, mode/scope, branch/commit, findings and verdicts, checked-clean areas, dismissed findings with reasons, links to measurement receipts, the delta against the prior baseline, review mode and outcome, user disposition, and in-scope follow-up. Link to the report instead of repeating it.

Log clean runs too: their checked-clean coverage lets the next audit skip unchanged areas. Never include secrets or raw private values.
