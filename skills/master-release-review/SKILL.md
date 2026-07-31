---
name: master-release-review
description: Run a pre-release product trust and readiness review for authorized local projects. Use when the user asks for Master Release Review, master-release-review, release readiness review, product trust review, privacy review, dependency review, configuration review, production build review, source leak review, or final review before public distribution. Produces a findings-backed GO / NO-GO / GO WITH KNOWN RISKS report outside the repo.
---

# Master Release Review

Use this skill to review whether a project, app, package, installer, or patch is ready for public distribution. Master-QA answers "does it work"; Master Release Review answers "is it safe and clean to distribute" — trust, privacy, dependencies, configuration, packaging, and production-build output. Together they form the release wall.

## Core Rules

- Use only on local projects the user owns or is authorized to review.
- Default to review/report only. Do not change code unless the user explicitly asks for fixes after the report.
- Write reports outside the repo under `~/.auto-master/artifacts/<project-slug>/release-review/`.
- Prefer repo-native checks and existing project scripts before creating new checks.
- Prefer static review, configuration review, dependency review, and production-build inspection.
- Let the trust-boundary map drive depth: entry points, data flows, privilege levels, and external dependencies get the closest review.
- A fixed Blocker or High finding is not cleared until re-reviewed — retest before the decision changes.
- Do not target third-party systems. Do not perform intrusive external testing.
- Do not publish releases, upload artifacts, change production state, or spend provider credits.
- Preserve unrelated user work.
- Never print secrets, tokens, private keys, certs, passwords, auth headers, cookies, signed URLs, or private environment values.
- Report sensitive checks as SET/MISSING, masked, or summarized.
- Never name generated files or doc content after AI models or providers.

## Workflow

1. Identify the active repo, project slug, release target, and review scope.
2. Read project instructions such as `AGENTS.md` if present.
3. Load the Master-Docs manifest if available; otherwise build a local release surface map.
4. Map trust boundaries: product entry points, data flows, local storage, network calls, privilege levels, packaging, update paths, and release artifacts.
5. Run the static trust review over high-priority surfaces.
6. Review dependency and configuration hygiene.
7. Review privacy and data-handling expectations.
8. Review production build output for accidental private material, implementation leaks, or debug artifacts.
9. Run repo-native readiness checks where available.
10. Produce a GO / NO-GO / GO WITH KNOWN RISKS report outside the repo.
11. Stop before implementing any fixes unless the user explicitly approves follow-up work; retest fixed Blockers/Highs when asked to re-review.

## References

Read these references as needed:

- `references/workflow.md` for the full review lifecycle.
- `references/release-surface-map.md` before mapping product surfaces.
- `references/dependency-and-config-review.md` before reviewing packages and configs.
- `references/privacy-and-data-review.md` before reviewing data handling.
- `references/production-build-review.md` before checking release bundles or installers.
- `references/findings-and-decision.md` before writing the final report.
