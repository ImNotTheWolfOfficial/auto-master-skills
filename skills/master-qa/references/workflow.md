# Master-QA Workflow

Full lifecycle for a release-candidate QA run. Load this before starting.

## Supported Scopes

1. Repo-wide release QA
2. Feature-specific release QA
3. Desktop app release QA
4. Web app release QA
5. Installer/package QA
6. Patch/regression QA

## 1. Startup Checks

1. Confirm the active repo and project root; derive `<project-slug>` (repo directory name, kebab-cased) unless the user specifies one or an existing artifact folder already uses one.
2. Read project instructions (`AGENTS.md`, contributor/QA docs) when present.
3. Check git branch and worktree status. Identify unrelated user changes and preserve them.
4. Identify the release target: version, package, installer, build artifact, or deployment surface when available. QA runs against the release artifact or a production-like build, not just the dev tree.
5. Locate prior Master-QA reports under `~/.codex/artifacts/<project-slug>/qa/` — the last report tells you what was previously verified and what its known issues were.

## 2. Context Discovery

- Prefer the Master-Docs manifest (see `surface-inventory.md`) for a guaranteed-complete surface map and a diff of what changed since it was last updated.
- Otherwise inspect repo-native signals: package manifests, app entry points, routes/pages/screens, tests, build scripts, release scripts, installer config, updater config, CI workflows, docs, and recent git changes.

## 3. QA Plan

- Build the test matrix (see `test-matrix.md`) **before** running long checks, so effort goes where risk is.
- Prioritize release-critical paths and recently changed areas.
- **Evidence reuse:** collect fresh, trustworthy `$auto-qa` per-slice evidence gathered since the last relevant change. Trust it for unchanged areas; re-verify anything that changed after the evidence was captured. Always re-run full end-to-end happy paths and the release-only gates regardless of evidence age — those are what this skill exists for.
- Mark stale or missing evidence as needing verification; never count it as coverage.

## 4. Execution

Order matters — cheapest and most deterministic first:

1. **Deterministic gates:** full test suite, typecheck, lint, production build. Failures here surface before any manual session is spent.
2. **Focused checks** for areas changed since the last QA/release.
3. **Core user journeys** with the Frontend Gate (from `$auto-qa`, non-negotiable at release scope): launch the real production-like build, drive every primary and changed flow as a user, verify visible results, side effects, clean console, and no failed network calls, and capture evidence per flow. Patterns per app type are in `desktop-and-web-checks.md`.
4. **Release-only gates** per `release-gates.md`: install/upgrade/rollback, artifact integrity, offline behavior, performance vs baseline, accessibility, security sign-off.
5. Capture command results, screenshots, artifacts, and summaries as evidence throughout (see `evidence-and-reporting.md`).

## 5. Reporting

- Write the GO / NO-GO / GO WITH KNOWN ISSUES report outside the repo per `evidence-and-reporting.md`.
- Blockers and high-priority issues first.
- Include what passed, what failed, what was blocked, and what was not tested — all four, honestly.
- Include the customer-safe known-issues list for release notes if the release proceeds.

## Rules

- Do not publish, deploy, upload, or modify production availability — Master-QA decides readiness; the user ships.
- If a check requires credentials, provider credits, or external approval, mark it blocked/pending and explain what is needed.
- Never use production customer data, real payments, live sends, or destructive/irreversible provider actions without explicit approval for that exact action.
- Keep reports practical and release-focused.
