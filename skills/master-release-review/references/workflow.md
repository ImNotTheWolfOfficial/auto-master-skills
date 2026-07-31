# Master Release Review Workflow

Full review lifecycle. Load this before starting.

## Supported Scopes

1. Full product release review
2. Desktop app release review
3. Web app release review
4. Installer/package review
5. Patch readiness review
6. Feature-specific readiness review

## 1. Startup Checks

1. Confirm the active repo and project root; derive `<project-slug>` unless the user specifies one or an existing artifact folder already uses one.
2. Read project instructions (`AGENTS.md`) if present.
3. Check git branch and worktree status; identify unrelated user changes and preserve them.
4. Identify the release target: version, installer, package, bundle, or deployment surface when available.
5. Locate prior release-review reports under `~/.auto-master/artifacts/<project-slug>/release-review/` — previously accepted risks and fixed findings inform this run.

## 2. Surface Discovery

- Prefer the Master-Docs manifest when present (see `release-surface-map.md`).
- Otherwise inspect repo-native signals: package manifests, app entry points, routes/pages, desktop commands, local storage, network configuration, release scripts, installer config, updater config, CI workflows, docs, and recent git changes.
- The output is a trust-boundary-aware surface map: what handles input, what stores data, what talks to the network, what ships to customers.

## 3. Review Plan

- Build a compact review matrix before running long checks.
- Focus on release-critical surfaces, trust boundaries, and recently changed areas.
- Prefer existing project checks (lint, typecheck, security scripts, release checks).
- Mark checks blocked when they require credentials, external systems, provider credits, or unavailable artifacts — never silently skip.

## 4. Execution

Read-only checks first, then repo-native scripts where safe, then artifact inspection.

**Static trust review** — over the surfaces the map flagged high priority, review defensively (no probing, no external targets):

- authorization checked on every route/handler/command, not just authentication; admin/dev gates enforced server-side
- input handling at boundaries: injection-prone patterns (SQL/command/path/template), unsafe deserialization, file-upload validation, server-side fetches (SSRF-shaped), open redirects
- secrets and unsafe defaults in code or config
- transport and headers where relevant: HTTPS everywhere (especially update endpoints), security headers, cookie flags, CORS scoped rather than wildcard
- rate/cost controls on expensive or provider-backed endpoints
- AI/agent surfaces: prompt-injection exposure by design, whether outputs can leak internal names, file paths, system prompts, or private docs

Then the focused reviews, each per its reference: dependency and configuration hygiene, privacy and data handling, production build/artifact inspection.

## 5. Reporting

- Produce the GO / NO-GO / GO WITH KNOWN RISKS / BLOCKED report outside the repo per `findings-and-decision.md`.
- Blockers and high-priority findings first.
- Include what passed, failed, was blocked, or was not reviewed — all four, honestly.
- Stop before implementing fixes unless the user explicitly approves follow-up work. When fixes land and a re-review is requested, retest every fixed Blocker/High rather than trusting the diff.

## Rules

- Do not publish, deploy, upload, or alter release availability.
- Do not target third-party systems; do not run intrusive external checks.
- Keep review language practical and release-focused.
- Share results with Master-QA's release gate (its security sign-off points here) rather than duplicating its functional checks.
