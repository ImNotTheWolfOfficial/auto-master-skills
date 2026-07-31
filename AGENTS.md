# Repository Instructions

This repository contains public Codex skills.

- Keep each skill self-contained under `skills/<skill-name>/`.
- Keep `SKILL.md` concise and place detailed material in one-level `references/`, `scripts/`, or `assets/` directories.
- Preserve only `name` and `description` in `SKILL.md` frontmatter.
- Never add secrets, credentials, private data, machine-specific paths, internal project names, or private infrastructure details.
- Use `~/.codex/artifacts/` for generated material that should live outside an active project.
- Validate every changed skill with Codex's `quick_validate.py` before publishing.
- Test scripts directly when they change.
- Preserve the MIT license and document user-visible behavior changes in the root README.
