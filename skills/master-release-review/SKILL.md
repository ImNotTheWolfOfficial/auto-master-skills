---
name: master-release-review
description: Assess distribution trust for a release artifact. Use for Master Release Review, release readiness, privacy, dependency or source-leak review. For functional release testing use master-qa.
---

# Master Release Review

Assess distribution trust for a project, app, package, installer or patch. Master-QA handles functional release checks.

## Core Rules

- Use only on local projects the user owns or is authorized to review.
- Review and report only. Do not change code unless the user explicitly asks for fixes after the report.
- Write reports outside the repo under `~/.auto-master/artifacts/<project-slug>/release-review/`. If home is read-only, keep the suffix privately under `<os-temp>/.auto-master/artifacts/` outside every repo and tell the user the path.
- Prefer existing repo-native checks.
- Obtain explicit authorization for external advisory lookups and real-account access, including any contact with external services.
- Static, defensive review only: no probing, no third-party targets, no intrusive external testing.
- Do not publish releases, upload artifacts, change production state, or spend provider credits.
- A fixed Blocker or High finding is not cleared until it is re-reviewed.
- Never print secrets, tokens, private keys, certs, passwords, auth headers, cookies, signed URLs, or private environment values. Report sensitive checks as SET/MISSING, masked, or summarized. When you search for credential-shaped text, ask the search tool for file names or match counts only, so that matched values never enter the conversation.
- Never name generated files or doc content after AI models or providers.
- Preserve unrelated user work.

## Decision

Return exactly one of **GO**, **NO-GO**, **GO WITH KNOWN RISKS**, or **BLOCKED**. The rules and severity labels are in `references/findings-and-decision.md`. A required check that was blocked or skipped never counts as passed. A High in a required security gate means NO-GO even if accepted. Other accepted Highs require GO WITH KNOWN RISKS, the accepting user, date and disclosure text, provided all required checks pass.

## Workflow

1. **Startup** - confirm the repo, project root, and slug. Read project instructions. Check the branch and worktree state and preserve unrelated changes. Identify the release target and scope: full product, desktop app, web app, installer/package, patch, or one feature. Read the latest prior report in the report folder for accepted risks and fixed findings.
2. **Surface map** - read `references/release-surface-map.md`. Check the manifest scope and revision, then map uncovered surfaces from the actual candidate and packaging inputs. The output is a trust-boundary-aware map: what takes input, what stores data, what talks to the network, what ships to customers.
3. **Review plan** - build a compact review matrix before long checks. Depth follows the map: high-priority surfaces and areas changed since the last release get close reading; unchanged low-priority surfaces get a skim. Mark a check blocked when it needs credentials, external systems, provider credits, or an unavailable artifact; never skip it silently.
4. **Static trust review** of the high-priority surfaces, read-only:
   - authorization on every route, handler, and command, not only authentication; admin and dev gates enforced server-side
   - input handling at boundaries: injection-prone patterns (SQL, command, path, template), unsafe deserialization, file-upload validation, server-side fetches, open redirects
   - secrets and unsafe defaults in code or config
   - transport and headers where relevant: HTTPS everywhere (especially update endpoints), security headers, cookie flags, scoped CORS
   - rate and cost controls on expensive or provider-backed endpoints
   - AI/agent surfaces: prompt-injection exposure by design, and whether outputs can leak internal names, file paths, system prompts, or private docs
5. **Dependency and configuration review** - per `references/dependency-and-config-review.md`.
6. **Privacy and data review** - per `references/privacy-and-data-review.md`.
7. **Production build review** - per `references/production-build-review.md`: inspect what ships, not the source tree.
8. **Repo-native readiness checks** - run them where they exist and are safe.
9. **Report** - read `references/findings-and-decision.md`. Lead with Blockers and Highs. List passed, failed, blocked and unreviewed items.
10. Retest every fixed Blocker and High on re-review.

Supply the sign-off to Master-QA without repeating functional checks.

## Cost Rules

- Read each reference at its step. Skip a step, and its reference, when the scope excludes it (for example no production build exists: mark artifact review blocked).
- Run repo-native audit and lint scripts once, send long output to a file, and read only the summary and the failing lines.
- Carry forward every unresolved required row, including blocked or skipped checks. Bind each receipt to the artifact digest, configuration and environment. On re-review, retest fixes, affected areas and newly available or replaced artifacts, even at the same commit. Reuse matching evidence for unaffected rows.
