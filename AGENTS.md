# Repository Instructions

This repository contains public Agent Skills for both Codex and Claude Code.

## Structure

- Keep each skill self-contained under `skills/<skill-name>/`. A skill must work when it is the only one installed: name a sibling skill as the preferred tool, never as the only place a rule is defined.
- Use only the shared `name` and `description` fields in `SKILL.md` frontmatter. Runtime-specific metadata belongs outside `SKILL.md`.
- Keep instructions tool-neutral. When invocation syntax matters, document both Codex `$skill-name` and Claude Code `/skill-name` forms.
- Use forward slashes in skill-relative paths.
- Use `~/.auto-master/artifacts/` for generated material outside an active project.

## Cost budgets

- **Description: at most 400 characters.** Every session loads every description. State what the skill does, then its trigger phrases ("Use for ..."), then the sibling skill to use instead where two skills overlap. Keep internal procedure out of it. When you add or remove a trigger phrase, update `shared/trigger-cases.json`.
- **`SKILL.md` body: at most 10,000 characters.** A runtime keeps the body in context and may keep only its first part after a context reset, so the rules a long run depends on go in the body, most important first.
- **A reference file holds material for one stage** (a template, a checklist, a conditional procedure) and `SKILL.md` says at which stage to read it. Do not create a reference that every run must read at the start; that content belongs in the body. The one exception is the shared verification kernel in a skill that does not run long (see below). Do not state the same rule in two files of one skill, except a safety rule that must be seen at the point of action.
- **Give deterministic work to a script.** Hashing, pattern scanning, format validation, and diffing belong in `scripts/`, with output that is short and never prints a secret.
- **Write for run-time cost.** Prefer instructions that reduce sub-agent starts, re-reading, pasted logs, and reruns. Any search that can match many lines asks for file names or counts.

## Shared verification kernel

`shared/verification-kernel.md` is the single source of the tier table, receipts, and circuit breaker. Edit it there, then run `node scripts/sync-kernel.mjs`. It rewrites every carrier. Never edit a copy by hand.

- **Inline copy** (between `<!-- kernel:start -->` and `<!-- kernel:end -->` in `SKILL.md`): for a skill that runs long, because the body survives a context reset. Used by `auto-manage` and `auto-pilot`.
- **Reference copy** (`references/verification-kernel.md`): for a skill that usually runs beside an inline carrier or for a short time. Its `SKILL.md` must tell the agent to read the file again whenever the kernel is not in context. Used by `auto-plan`, `auto-qa`, and `master-refactor`.

The trade-off is measured in the README: every inline copy adds about 3,100 characters to that skill's body, and a pipeline run loads each inline copy once. To add a carrier, declare it in `scripts/kernel-carriers.mjs`, add the markers or an empty reference file, mention it in `SKILL.md`, and run the synchronizer.

## Privacy

Never add secrets, credentials, private data, machine-specific paths, internal project names, or private infrastructure details. Test fixtures that need a credential-shaped string must assemble it at run time.

## Before publishing

- Run `node scripts/validate-skills.mjs --stats`, and Codex's `quick_validate.py` for every changed skill when PyYAML is installed.
- Run `node scripts/test-scripts.mjs`. When you change a script, add or update its test in that file.
- Preserve the MIT license and document user-visible behavior changes in the root README.
