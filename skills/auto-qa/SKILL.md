---
name: auto-qa
description: Use when the user asks for /autoQA, autoQA, auto-qa, QA, release QA, smoke/regression testing, or validation before review, merge, deploy, release, or notification.
---

# Auto-QA

Plan or execute risk-matched QA and write the result to a `.md` artifact before final chat. Use `docs/qa/` when present, otherwise `docs/plans/`; for non-repo work, use the relevant workspace.

## Mode

- Planning only: create the QA plan and stop.
- Execution: create/update the QA artifact, run selected gates, record evidence, and return pass/fail/blocked/accepted-risk/findings-only.
- If ambiguous and the work is destructive, production, payment, security, privacy, or data-changing, default to planning only. For ordinary local validation, execute focused QA.

## Lean Flow

1. Identify subject, branch/commit, environment, intended behavior, changed files/config/dependencies, affected surfaces, and out-of-scope surfaces.
2. Classify risk: critical for auth/secrets/privacy/payments/data/migrations/deploys/external accounts/agent automation; elevated for user-facing, APIs, integrations, infra, dependency/runtime changes; normal for isolated docs/tests/format/copy.
3. Choose the smallest credible profile: focused change, full sweep, release candidate, maintenance automation, or incident/regression.
4. Build a surface inventory: backend, API, data, auth, integration, CLI/job, infra/release, native, performance, observability, and docs surfaces — plus UI surfaces, which trigger the Frontend Gate below.
5. Run deterministic gates first (tests, type check, lint, build). Cheapest first, so failures surface before any UI session is spent.
6. Run the Frontend Gate for every changed UI surface.
7. Record commands, exit codes, concise evidence, screenshots/logs when useful, skipped/blocked gates, findings, redactions, rollback/monitoring notes, and final recommendation.

## Frontend Gate (mandatory when UI changed)

Passing tests are not frontend QA. If the change touches anything a user sees or interacts with, this gate is required and ranks equal to the test suite:

1. **Launch the real app** (dev server, desktop shell, or preview tooling). Attempt the launch even when you expect it to fail; "not runnable" may only be claimed with the exact command and error recorded as evidence.
2. **Drive the changed flows as a user.** Click/tap/type through every changed control in the running UI — do not substitute code reading or unit renders. Cover the happy path plus close/cancel/back, disabled states, and keyboard activation for each changed control.
3. **Verify what the user experiences:** the visible result, side effects (persistence, navigation, emitted state), a browser console free of new errors, and no failed network requests on the exercised flows.
4. **Capture one piece of evidence per flow:** screenshot, DOM/accessibility snapshot, or console/network log excerpt. "Should work" and "renders in tests" are not evidence.

Cost bounds — stay cheap without going shallow:

- Test changed surfaces plus one adjacent regression path; no full-app sweeps unless the profile is release candidate or full sweep.
- Reuse one running server and one browser/session for all flows; batch console/network checks per page load.
- One desktop viewport by default; add mobile, reduced-motion, or theme variants only when the change touches responsive, motion, or theme code.

Honesty rule: a QA result may not be `pass` while a required Frontend Gate was skipped. Report `blocked` with the recorded launch attempt, or `accepted-risk` only when the user explicitly waived that gate.

## Safety

Never use production customer data, real payments, irreversible provider actions, live sends, destructive operations, or privileged account changes without explicit approval for that exact action. Redact secrets, tokens, cookies, keys, signed URLs, customer data, and unnecessary local identity details. Do not mark skipped or blocked required gates as passed.

## Findings

Severity: Blocker, High, Medium, Low, Polish. Recheck Blocker/High once when safe. If autonomous remediation is requested and the defect is local, safe, and reproducible, record the failure, debug/fix it, rerun the failed gate, and keep both failure and fix evidence.

## Deep QA

For release candidates, full sweeps, incident/regression QA, critical surfaces, or when writing a detailed matrix/template, read `references/deep-qa.md`. Otherwise keep the hot path lean.
