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
