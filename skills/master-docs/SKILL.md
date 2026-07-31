---
name: master-docs
description: Generate and maintain repo or feature documentation for authorized local projects. Use when the user asks for Master-Docs, master-docs, full repo docs, feature docs, internal technical docs, public or customer-support docs, codebase graph documentation, documentation refresh, or diff-aware documentation updates. Produces private technical docs and sanitized public docs outside the repo using a manifest/diff workflow.
---

# Master-Docs

Use this skill to generate or refresh documentation for the current repo or feature area.

## Core Rules

- Write all generated docs outside the repo.
- Use `~/.auto-master/artifacts/<project-slug>/` as the artifact root.
- Create both internal technical docs and public-safe customer docs.
- Never put source code, file paths, private architecture details, private codenames, private identifiers, secrets, certs, tokens, or local identity details into public docs.
- Generate public docs from sanitized internal docs, not directly from source.
- Use a manifest/diff system so future runs update only changed sections where practical.
- Treat an external codebase-graph adapter as optional. Use it when configured; fall back to repo-native graph discovery when unavailable.
- Never name generated files or doc content after AI models or providers; name by product and topic.
- Preserve unrelated user work.

## Workflow

1. Identify the active repo and project slug.
2. Create or load the Master-Docs manifest.
3. Build or refresh the repo/feature graph.
4. Run a multi-resolution documentation sweep:
   - inventory pass
   - graph pass
   - module cards
   - hot-path deep dives
5. Write internal technical docs.
6. Generate sanitized public-facing docs from the internal docs.
7. Run the public-doc safety scan.
8. Update the manifest.
9. Report what changed, what was skipped, and what needs user attention.

## References

Read these references as needed:

- `references/workflow.md` for the full documentation workflow.
- `references/manifest-schema.md` for the manifest/diff design.
- `references/public-sanitization.md` before writing public-facing docs.
- `references/graph-adapter.md` when external graph integration is relevant.
