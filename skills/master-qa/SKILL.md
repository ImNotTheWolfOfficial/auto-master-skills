---
name: master-qa
description: Test release artifact functionality. Use for Master-QA, installer validation, release QA, a full regression sweep or a go/no-go decision.
---

# Master-QA

Validate an authorized local project's integrated release artifact. Use `auto-qa` for a change.

## Core Rules

- Test the release artifact or a production-like build, not only the dev tree.
- Reuse fresh, trustworthy `auto-qa` evidence for areas whose code and config did not change. Always rerun release-critical happy paths and release-only gates.
- Every claimed gate has an `EXECUTION_RECEIPT`: exact command or manual flow, exit code or pass/fail/blocked, one line of evidence or an evidence path, time taken from the shell, and the environment/profile. Record receipts as gates run; never reconstruct them from memory.
- Send long output to a file and read only the exit code and the failing lines. Do not paste full logs.
- **Frontend Gate:** on every user-facing surface, launch the real build, drive each flow as a user, verify what the user experiences, and capture evidence per flow.
- Automated criteria are mechanically decidable. Visual quality, tone, and product judgment go in separate judgment rows; `needs judgment` is not a mechanical failure.
- Require independent security sign-off for this artifact. Cite the report or equivalent evidence meeting `references/release-gates.md`.
- Write reports outside the repo under `~/.auto-master/artifacts/<project-slug>/qa/`. If home is read-only, keep the suffix privately under `<os-temp>/.auto-master/artifacts/` outside every repo and tell the user the path.
- Never publish, deploy, upload, spend provider credits, mutate production, or change release availability. Do not use production customer data, real payments, or live sends without explicit authority.
- Redact secrets and private values; report configuration as SET/MISSING only.
- Preserve unrelated user work. Never label skipped or blocked evidence as passed.

## Decision

Return exactly one of **GO**, **NO-GO**, or **GO WITH KNOWN ISSUES**.

- Any Blocker -> NO-GO.
- An unresolved High in a required security gate always means NO-GO. Elsewhere an explicitly user-accepted High gives GO WITH KNOWN ISSUES only if all required gates pass. Record who accepted, when and the customer disclosure text. Any other unresolved High means NO-GO.
- A required gate that is blocked or skipped, including the Frontend Gate on any user surface -> NO-GO with the reason `blocked` and the exact unblocker.
- Medium/Low only -> GO WITH KNOWN ISSUES, each in the customer-safe known-issues list.
- All required gates green with no outstanding issues -> GO.

## Workflow

1. **Startup** - confirm the repo, project slug, branch, commit, unrelated dirty work, and the exact release target (version, package, installer, build artifact, or deployment surface). Read project instructions and QA/release docs.
2. **Baseline** - locate the prior Master-QA report in the report folder. Capture a `BASELINE_BLOCK`: previous release or report, artifact/commit, environment, inherited failures, and available performance and size signals.
3. **Discovery** - read `references/surface-inventory.md`: reconcile documented scope and revision with discovery from the candidate. Mark each meaningful surface in or out of scope with a reason.
4. **Matrix** - read `references/test-matrix.md` and build the release matrix before any long check. Carry forward every unresolved required row. Bind evidence to artifact digest, configuration and environment. A newly available or replaced artifact needs its applicable checks even at the same commit. Prioritize release-critical journeys, changed surfaces, and prior known issues. Mark stale or missing evidence as needing verification.
5. **Deterministic gates first** - tests, typecheck, lint, production build, artifact integrity; then focused checks for changed areas.
6. **User journeys** - production-like core journeys with the Frontend Gate. Read `references/desktop-and-web-checks.md` for the app type under test.
7. **Release-only gates** - only at step 7, if sign-off is missing, read `master-release-review`. Read `references/release-gates.md` and run the ones that apply: install/upgrade/rollback, metadata/checksums/signing, offline and degraded behavior, performance versus baseline, accessibility, monitoring, and security sign-off. Mark the rest not applicable. Mark a gate that needs credentials, hardware, or an external system as blocked with what is needed; never drop it.
8. **Regression delta** - compare final failures and measured signals with the baseline. Classify each difference as resolved, inherited, new release regression, environment-only, or blocked.
9. **Report** - read `references/evidence-and-reporting.md` and write the decision, with Blocker and High issues first and customer-safe known issues when the release proceeds.

## Cost Rules

- Run cheap checks first. Record an executed packaging or build error as `failed` with its receipt. Record a missing build prerequisite as `blocked` with the unblocker. Both require NO-GO and stop artifact journeys. For other failures, finish the sweep and collect every finding.
- Run each expensive gate (production build, installer, full suite) once and reuse its output for every check that needs it.
- Prefer a DOM/accessibility snapshot or console/network evidence per flow; take screenshots where the look itself is under test or the release needs visual evidence.
- When the runtime supports workers and lets you choose a model tier, independent journeys can run in parallel on a standard tier; keep the decision and the report in the main context.
