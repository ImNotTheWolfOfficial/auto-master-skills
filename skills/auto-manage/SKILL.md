---
name: auto-manage
description: Use when the user wants the agent to manage a large, multi-phase build end to end — research, planning, development, review, security review, and QA — coordinating worker and reviewer sub-agents and acting on the user's behalf until the scope is complete.
---

# Auto Manage

For scopes too large for `$thething`. The main agent becomes the manager: it stands in for the user through the full pipeline — **Research -> Plan -> Develop -> QA** — delegating bounded slices to sub-agents, reviewing their output, and continuing until the feature is built, security-reviewed, tested end to end, and ready to present. Do not hand back partial work unless genuinely blocked.

## Pipeline

1. **Research** — discuss the idea until it is researchable, then use `$auto-research`: write the research-scope artifact, iterate until sufficient (the manager may approve the scope on the user's behalf when the user has delegated the build), then execute the research and record findings.
2. **Plan** — turn findings into a development plan with `$auto-plan`, or a leaner inline plan when the scope is small enough that full skill overhead is waste. Security is a required plan section.
3. **Develop** — break the plan into bounded slices and delegate each as a `$thething`-style task: plan the slice briefly, implement with `$auto-pilot` discipline, validate with `$auto-qa`. The manager owns sequencing, integration judgment, and merge quality.
4. **QA / Review** — risk-matched `$auto-qa` per slice plus a final end-to-end pass including the Frontend Gate; an independent reviewer at risky or shared-behavior milestones; a security review before calling the scope done.

Stop only for real blockers: credentials, external access, hardware, spending, destructive operations, legal/product decisions, unsafe ambiguity, or production authority. Everything else is the manager's call.

## Token Economy

- Reuse sub-agents: keep one worker and one reviewer per repo/objective and feed them deltas, not re-onboarded context.
- Right-size the tool: invoking a full skill has overhead. For small slices, write a direct worker prompt carrying the same discipline (scope, boundaries, QA, stop gates) instead of chaining skills.
- Batch instructions: one complete prompt to a worker beats several small ones.
- Note the rough cost of each slice (turns, context size) in the learning log; when a skill chain repeatedly costs more than it returns for a slice type, switch that type to inline prompts and record the switch.
- Keep delegated context sanitized and minimal: artifact paths and short summaries, never pasted file dumps or secrets.

## Worker Prompt Shape

One objective; exact owned files/areas; explicit do-not-touch list; required QA and evidence; stop gates; how to report (changed files, verification, blockers, residual risk); which skill to use, if any. Never delegate product, legal, or security decisions.

## Review Discipline

- Never accept worker output blindly: spot-check the diff and confirm QA evidence exists before accepting.
- Reviewers return accept/reject, a 1-10 score, must-fix items, later items,
  and whether the slice needs code/tests or can remain docs-only; the manager
  decides what to fix, defer, or reject.
- Send grounded must-fixes back to the same worker; patch directly only when that is cheaper and safe.

## Artifacts

Store management artifacts outside repos: `~/.codex/artifacts/<project>/manager-run-<date>/` containing `sprint-queue.md`, per-slice review/approval notes, `learning-log.md`, and `final-build-report.md`. Implementation evidence follows repo conventions (`docs/qa/` and similar). Each accepted slice records objective, prompt summary, changed files, QA result, review disposition, blockers, and a cost note. Never name artifacts or content after AI models or providers.

## Self-Learning (keep it lean)

During the run, log in `learning-log.md`: prompts that produced strong output, prompts that caused confusion, scope creep, or weak QA, recurring blockers, better slice sizing, and cost observations. When the scope ends, promote only lessons that are general, reusable, and safe into Learned Rules below — merge or replace bullets instead of appending, keep the section at ten bullets or fewer, and never add project specifics, secrets, or run history. Report any skill edits in the final build report.

### Learned Rules

- Name scaffold/design phases explicitly so future agents do not mistake a
  safety contract for a shipped runtime feature; when a slice enables any live
  capability, say so in the report headline.
- For sensitive integrations, require a no-enablement sweep in every slice QA:
  commands, UI controls, background workers, network paths, secret paths, and
  execution surfaces.
- Define ambiguous safety terms precisely in the artifact itself; avoid relying
  on shorthand like "metadata-only" without listing forbidden data classes.
- When a staged roadmap reaches its first live-capability slice, pause for user
  acknowledgement before batching later phases, even if the technical gates
  pass.
- QA that changes persistent user/app state must restore that state before the
  slice is called done, then record both the mutation and restoration in the QA
  evidence.
- For staged capabilities, keep permission/grant copy separate from live
  connection state, and add negative guards for controls or commands that must
  not exist yet.
- For migration/import work, previews must be derived from validated dry-run
  artifacts and pass no-leak checks before adding any real scanner, source
  picker, or importer path.

## Security Rules

- Never pass secrets, tokens, cookies, keys, auth material, or signed URLs to sub-agents; redact before delegating.
- No spending, imports, migrations, OAuth/reconnects, deployments, destructive cleanup, or external account actions without explicit user authority.
- Third-party or imported code, tools, and connectors stay disabled until reviewed; source trust is not transferable.
- Migration work uses dry-runs, synthetic fixtures, and rollback gates before touching real data.

## Final Build Report

Produce one report when the scope completes: objective, final status, shipped slices, files changed, QA and verification evidence, reviewer scores and feedback disposition, security review result, unresolved or deferred items, commit/PR status, lessons learned, and any skill updates made. The scope is not complete until research, plan, implementation, review, security review, QA, and this report all exist — or a genuine blocker is recorded.
