---
name: master-qa
description: Run a full release-candidate QA gate for authorized local projects. Use when the user asks for Master-QA, master-qa, release QA, full app QA, pre-release testing, patch validation, installer validation, desktop app QA, web app QA, regression sweep, go/no-go report, or final quality gate before public release. Produces an evidence-backed GO / NO-GO report outside the repo.
---

# Master-QA

Use this skill to perform a release-candidate QA sweep for the current repo, app, feature, installer, or website. This is the final quality gate before a product or patch ships to the public — everyday change validation stays in `$auto-qa`; Master-QA is the final wall.

## Core Rules

- Treat this as a final quality gate, not a quick smoke test.
- Prefer the Master-Docs manifest for surface coverage when available; fall back to repo-native discovery.
- Reuse fresh, trustworthy `$auto-qa` per-slice evidence, then re-check changed areas — and always re-run release-critical happy paths and release-only gates regardless.
- The Frontend Gate is non-negotiable on every user-facing surface: a skipped or blocked Frontend Gate means NO-GO, never pass.
- Produce a GO / NO-GO / GO WITH KNOWN ISSUES decision.
- Any Blocker means NO-GO. Any unresolved High means NO-GO unless the user explicitly accepts the risk.
- Never mark a skipped or blocked required gate as passed.
- Security sign-off: confirm Master Release Review ran for this release and its blockers are cleared — link its report, do not duplicate it.
- Write QA reports outside the repo under `~/.codex/artifacts/<project-slug>/qa/`.
- Do not publish releases, upload artifacts, spend provider credits, modify production state, or change release availability.
- Never print secrets, tokens, private keys, certs, passwords, auth headers, cookies, signed URLs, or private environment values.
- Never name generated files or doc content after AI models or providers.
- Preserve unrelated user work.

## Workflow

1. Identify the active repo, project slug, release target, and QA scope.
2. Load the Master-Docs manifest if available, otherwise build a local surface inventory.
3. Review changed areas since the last QA report or release; collect reusable `$auto-qa` evidence.
4. Build the QA matrix covering product surfaces, release artifacts, and critical journeys.
5. Run deterministic repo-native checks first: tests, typecheck, lint, production build.
6. Run user-journey checks appropriate to the app type — Frontend Gate on every user surface.
7. Run release-only gates: install, upgrade, rollback, metadata, checksums, signing, offline behavior, performance vs baseline, accessibility.
8. Capture evidence; record anything blocked or skipped honestly.
9. Write the GO / NO-GO report outside the repo, including a customer-safe known-issues list.
10. Summarize the decision and recommended next actions.

## References

Read these references as needed:

- `references/workflow.md` for the full QA lifecycle.
- `references/surface-inventory.md` for manifest use and fallback discovery.
- `references/test-matrix.md` before constructing the QA matrix.
- `references/release-gates.md` before checking release readiness.
- `references/evidence-and-reporting.md` before writing the final QA report.
- `references/desktop-and-web-checks.md` for desktop and web app verification patterns.
