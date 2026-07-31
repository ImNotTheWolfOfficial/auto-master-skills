---
name: master-optimize
description: Audit an authorized local repo or feature for wasted memory, CPU, rendering, network, disk, battery, and unnecessary complexity. Use for Master-Optimize, performance review, resource audits, leak hunts, rendering bloat, or lean-code opportunities. Produces an evidence-backed analysis report with measurement receipts and risk-triggered independent review; it never changes project code.
---

# Master-Optimize

Produce a source-grounded resource-efficiency report. Do not implement fixes in this run.

## Core Rules

- Cite `file:line`, the waste mechanism, path temperature, user impact, confidence, and a leaner alternative for every finding.
- Label evidence as measured, read in source, or hypothesis. Never present estimates as measurements.
- Capture execution receipts for benchmarks or measurement commands and compare with the last trustworthy baseline/report when available.
- Read the optimize log first; do not re-report fixed/dismissed findings without new evidence.
- Use **full** or **focus** mode. Periodic full audits may narrow unchanged clean areas using the log.
- Independently verify every cited finding yourself. Trigger one fresh-context reviewer only when the report contains a High finding, a critical security/auth/data/execution/release boundary, a broad architectural recommendation, or a high-impact claim dependent on nontrivial measurement.
- Ordinary Medium/Low focus reports may finish self-verified. Record why independent review was used or skipped; never imply review occurred.
- Verify reviewer additions against source before accepting them. Reviewer advice is not authority.
- Write reports under `~/.auto-master/artifacts/<project-slug>/optimize/`.
- Preserve unrelated work, do not expose secrets, and never automatically delete or refactor anything.

## Pipeline

1. **Startup** - confirm repo/branch, choose full/focus, read the log, and identify the prior baseline.
2. **Map** - use `auto-research` or a lean inline map for architecture, hot paths, resource lifecycles, and existing measurement tools.
3. **Scan** - apply `references/finding-categories.md`; read actual code and record checked-clean areas.
4. **Measure** - run only cheap relevant repo-native measurements and record receipts. After the same measurement failure twice, diagnose rather than retry blindly.
5. **Draft** - rank findings by user impact and confidence using `references/report-format.md`.
6. **Review decision** - self-verify citations; invoke the selective review in `references/peer-review.md` only at a defined risk trigger.
7. **Correct** - confirm reviewer corrections/additions in source; record disputes honestly.
8. **Present** - save the final or explicitly unreviewed draft report and summarize only findings already in scope.
9. **Log** - append findings, dismissed claims, checked-clean areas, receipts, baseline delta, and review mode.

Hand approved behavior-preserving fixes to `master-refactor`; hand behavior changes to the Auto pipeline as a separate authorized run.

## References

- Read `references/workflow.md` before auditing.
- Read `references/finding-categories.md` before scanning.
- Read `references/report-format.md` before drafting.
- Read `references/peer-review.md` when deciding or running independent review.
- Read `references/optimize-log.md` before log access.
