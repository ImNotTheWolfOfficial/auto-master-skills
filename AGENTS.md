# Repository Instructions

This repository contains public Agent Skills for both Codex and Claude Code.

- Keep each skill self-contained under `skills/<skill-name>/`.
- Keep `SKILL.md` concise and place detailed material in one-level `references/`, `scripts/`, or `assets/` directories.
- Use only the shared `name` and `description` fields in `SKILL.md` frontmatter. Runtime-specific metadata belongs outside `SKILL.md`.
- Keep instructions tool-neutral. When invocation syntax matters, document both Codex `$skill-name` and Claude Code `/skill-name` forms.
- Use forward slashes in skill-relative paths.
- Never add secrets, credentials, private data, machine-specific paths, internal project names, or private infrastructure details.
- Use `~/.auto-master/artifacts/` for generated material outside an active project.
- Run `node scripts/validate-skills.mjs` and Codex's `quick_validate.py` for every changed skill before publishing.
- Test changed scripts directly.
- Preserve the MIT license and document user-visible behavior changes in the root README.
