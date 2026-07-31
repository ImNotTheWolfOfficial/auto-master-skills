---
name: master-qa
description: Run a full release-candidate QA gate for authorized local projects. Use for Master-QA, release QA, installer or desktop/web validation, regression sweeps, go/no-go decisions, or the final quality wall before public release. Requires baseline comparison, reproducible execution receipts, real frontend interaction, and an evidence-backed release decision.
---

# Master-QA

Run the final release wall. Everyday slice validation belongs to `auto-qa`; this skill proves the integrated release artifact is ready.

## Core Rules

- Prefer the Master-Docs surface manifest when available; otherwise inventory repo-native surfaces.
- Reuse fresh trustworthy `auto-qa` evidence for unchanged areas, but always rerun release-critical happy paths and release-only gates.
- Capture the previous release/report as the baseline and state the `REGRESSION_DELTA` for failures, performance, size, and other measured signals.
- Require an `EXECUTION_RECEIPT` for every claimed gate: exact command/flow, timestamp, exit/result, concise evidence, and material environment/profile.
- Run the Frontend Gate on every user-facing surface. A skipped or blocked required Frontend Gate cannot produce GO.
- Return GO, NO-GO, or GO WITH KNOWN ISSUES. Any Blocker is NO-GO; any unresolved High is NO-GO unless explicitly accepted.
- Confirm `master-release-review` ran and its blockers are cleared; cite that report instead of duplicating it.
- Write reports outside the repo under `~/.auto-master/artifacts/<project-slug>/qa/`.
- Do not publish, upload, spend provider credits, mutate production, or change release availability.
- Redact secrets and private values; report configuration as SET/MISSING only.
- Preserve unrelated user work and never label skipped/blocked evidence as passed.

## Workflow

1. Identify repo, project slug, release target, exact artifact/commit, environment, and scope.
2. Load the surface manifest or build an inventory; review the prior release/report and changed areas.
3. Capture the baseline, inherited failures, and reusable `auto-qa` evidence.
4. Build a release matrix before long checks. Keep automated criteria mechanically decidable and separate subjective judgment.
5. Run deterministic gates first: tests, typecheck, lint, production build, and artifact checks.
6. Run production-like user journeys with the Frontend Gate and capture evidence per flow.
7. Run relevant release-only gates: install/upgrade/rollback, metadata/checksums/signing, offline/degraded behavior, performance versus baseline, accessibility, and security sign-off.
8. Record receipts as work runs; do not reconstruct evidence from memory.
9. Calculate the regression delta and classify every new failure as release, inherited, environment, or blocked.
10. Write the evidence-backed decision and customer-safe known issues.

## References

- Read `references/workflow.md` before execution.
- Read `references/surface-inventory.md` for discovery.
- Read `references/test-matrix.md` before constructing the matrix.
- Read `references/release-gates.md` before release checks.
- Read `references/evidence-and-reporting.md` before reporting.
- Read `references/desktop-and-web-checks.md` for native/web patterns.
