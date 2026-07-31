# Master-QA Workflow

Load this before a release-candidate QA run.

## Supported Scopes

Repo-wide, feature, desktop, web, installer/package, and patch/regression release QA.

## 1. Startup

1. Confirm repo/project root, project slug, branch, commit, and unrelated dirty work.
2. Identify the exact release target: version, package, installer, build artifact, or deployment surface. Test the artifact or a production-like build, not only the dev tree.
3. Read project instructions and relevant QA/release docs.
4. Locate the prior Master-QA report under `~/.auto-master/artifacts/<project-slug>/qa/` and review release evidence.
5. Capture a `BASELINE_BLOCK`: previous release/report, artifact/commit, environment, inherited failures, and available performance/size signals.

## 2. Discovery

Prefer the Master-Docs manifest. Otherwise inspect entry points, routes/screens, packages, tests, build/release/installer/updater config, CI, docs, and recent changes. Mark each meaningful surface in or out of scope with a reason.

## 3. QA Plan

- Build the matrix before long checks.
- Prioritize release-critical journeys, changed surfaces, and prior known issues.
- Reuse fresh trustworthy `auto-qa` evidence only where code/config has not changed. Always rerun integrated happy paths and release-only gates.
- Keep automated acceptance criteria mechanically decidable. Put visual quality, tone, and product judgment in explicit judgment rows; `needs judgment` is not mechanical failure.
- Mark stale or missing evidence as needing verification.

## 4. Execution

Run cheapest deterministic work first:

1. tests, typecheck, lint, production build, and artifact integrity;
2. focused checks for changed areas;
3. production-like core journeys with the mandatory Frontend Gate;
4. relevant install/upgrade/rollback, offline/degraded, performance, accessibility, metadata/signing, monitoring, and security-signoff gates.

Capture an `EXECUTION_RECEIPT` as each gate runs: exact command or manual flow, timestamp, exit/pass/fail/blocked result, concise relevant output/evidence, and material environment/profile. Never reconstruct receipts from memory.

Calculate the `REGRESSION_DELTA`: compare final failures and measured signals to baseline, then classify each difference as resolved, inherited, new release regression, environment-only, or blocked.

## 5. Reporting

Write GO, NO-GO, or GO WITH KNOWN ISSUES per `evidence-and-reporting.md`. Put Blocker/High issues first. State passed, failed, blocked, skipped, and reused coverage honestly. Include customer-safe known issues when release proceeds.

## Rules

- Do not publish, deploy, upload, spend credits, or modify production availability.
- Do not use production customer data, real payments, live sends, or irreversible external actions without explicit authority.
- Mark credential/hardware/external blockers rather than dropping their gates.
- Redact secrets and report sensitive configuration as SET/MISSING only.
