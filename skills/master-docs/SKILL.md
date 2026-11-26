---
name: master-docs
description: Refresh repo or feature documentation from source. Use for Master-Docs, customer-support docs, or an incremental documentation refresh. For a whole-project assistant corpus use auto-doc.
---

# Master-Docs

Document the repo or requested feature of an authorized local project.

## Core Rules

- Force replacement of a valid manifest only for a user-requested full rebuild.
- Keep artifacts outside the source worktree under `~/.auto-master/artifacts/<project-slug>/`. `scripts/artifact-location.mjs` uses `scripts/git-run.mjs` and allows a home worktree only for an ignored directory with no tracked contents. If home is read-only, keep the suffix privately under `<os-temp>/.auto-master/artifacts/` outside every repo and tell the user the path.
- Produce internal technical docs, then derive customer docs from sanitized internal docs only.
- Public docs never contain source code, file paths, private architecture details, private codenames or identifiers, secrets, certs, tokens, or local identity details.
- Update only what changed: the manifest decides what to regenerate.
- Never name generated files or doc content after AI models or providers.
- Preserve unrelated user work.

## Paths

| Output | Path under `~/.auto-master/artifacts/<project-slug>/` |
|---|---|
| Internal docs | `docs/internal/` |
| Public docs | `docs/public/` |
| Manifest | `manifests/master-docs-manifest.json` |

Use the user's slug or the kebab-case repo name. Verify worktree identity before writing. For legacy binding read `references/manifest-commands.md` and verify provenance. Use a fresh root on collision or uncertain ownership.

## Run Procedure

1. **Scope.** Resolve the repo root (`git rev-parse --show-toplevel`). If no repo is identifiable, ask. Decide **repo-wide** or **feature-scoped** and record it in the manifest.
2. **Change set.** Run `node scripts/manifest-diff.mjs diff --repo <repo-root> --manifest <manifest-path>`; on a feature-scoped run add `--scope-dir <dir>` for each directory of the feature. For an unverified legacy root, check binding status. Otherwise use the changed-file and pending-output lists. The script is in this skill's folder; call it by its full path. It handles hashes and writes.
   - Reconcile every in-scope tracked file in `added`. Document source behavior. For a reviewed non-document input, add an `expect` row such as `{"kind":"exclude","files":["assets/icon.png"],"reason":"asset"}`. Allowed reasons are asset, dependency, generated and metadata. Changed exclusions return to the work list.
   - `renamed` and `deleted`: read `references/manifest-commands.md` for remapping or retiring the affected entries before regeneration.
   - `incremental`: regenerate only the sections in `staleSections` and the public docs in `publicDocsToRecheck`. Everything else keeps its output and timestamps.
   - `rebuild` (manifest missing, corrupt, or from another schema): initialize the requested scope and run the full sweep. For a corrupt manifest or forced rebuild, read `references/manifest-commands.md` first.
3. **Analyze at four resolutions.** Limit incremental passes to the change set. Read line by line only for tiny repos.
   - **Inventory** - catalog without deep reading: file tree, package manifests, entry points, tests, configs, build/release scripts, routes/pages/commands. Give each top-level area a one-line role. Register internal and public outputs before drafting. Add newly discovered deliverables.
   - **Graph** - imports/exports, dependency edges, module boundaries, feature ownership, data-flow hints, and which tests exercise which modules. Use a graph adapter when one is configured (`references/graph-adapter.md`); otherwise use repo-native discovery. Output: a graph document and a list of hot paths.
   - **Module cards** - one card per in-scope module. Read every in-scope source file once for its card. A graph alone cannot establish behavior. Record purpose, user-facing behavior, important APIs or commands, dependencies, data flow, invariants, known risks, test coverage, related docs. Cards are the unit of incremental refresh.
   - **Hot-path deep dives** - close reading only for entry points, security- or data-sensitive boundaries, release/build/update code, high-complexity modules, user-critical workflows, and areas changed since the last run. Everything else stays at card resolution.
4. **Internal docs.** Assemble under `docs/internal/`: overview, architecture/graph summary, inventory, module cards, deep dives, and an index. Internal docs may use repo-relative paths and code identifiers.
5. **Public docs.** Read `references/public-sanitization.md`, then derive public docs under `docs/public/` from the internal docs and run its mandatory review pass, which starts with `node scripts/check-public-docs.mjs --dir <public-docs-dir>`. The script is in this skill's folder; call it by its full path. The checker uses `scripts/scan-text.mjs`. Unreadable policy or text, linked inputs, or unresolved safety findings block approval. Review redacted excerpts or have the owner inspect sensitive lines privately. Write standalone Markdown.
6. **Manifest.** The coordinator alone records completed sections in batches and records public docs after review. Workers write separate cards. Run `stamp` at the end with the same scope directories used for `diff`.
7. **Report** what was generated, updated, and skipped as unchanged; the graph source used; any public doc marked blocked or needs-review; and anything that needs a user decision.

## Recording and resume

Run the bundled `scripts/manifest-diff.mjs` with Node, passing `--manifest <manifest-path> --repo <repo-root>` to every command. Use absolute or relative outputs inside the artifact folder containing `manifests/`. Outputs must use regular files and directories throughout that root. The tool rejects links and parent traversal.

- Initialize a new inventory with `init --slug <slug> --scope repo-wide|feature`. For features pass `--scope-dir <dir>` for each real feature directory at init and stamp. Register it with `expect --from <outputs.jsonl>`. Each internal row has `id, kind, output, files, dependsOn`, with repo-relative files and/or internal section IDs. Each public row has `id, kind:"public", output, sections`. Include aggregate and shared pages. Refresh changed expectations.
- Record each finished batch with `set-section --from <completed.jsonl>` using its internal rows. Give aggregates all source sections and any files read directly. Review a stale section even when its text needs no change, then record it. Dependency cycles are invalid.
- Record a reviewed page with `set-public --id <id> --section <id> --status passed|blocked|needs-review`, repeating the section option for each source. It keeps the planned output path and source revisions.
- On resume, confirm identity, rerun scoped `diff` and reconcile the inventory when `inventoryNeeded` is true. Process added sources, changed/deleted roots, stale sections, and public pages. Missing outputs remain pending. Use `--limit <n>` when lists are truncated.
- Finalize with `stamp --scope repo-wide|feature` using the checked directories, then inspect `summary`. Report pending outputs, missing inventory and unresolved public reviews.

Read `references/manifest-commands.md` for maintenance, rebuild or lock recovery. For manual inspection or repair read `references/manifest-schema.md`. Without Git or Node, report the missing tool. Use the full-build schema with empty hashes in a verified external location. Keep certification blocked.

## Cost Rules

- Assign disjoint cards. Batch-record workers’ paths and mappings from separate files. If selectable, use a fast low-cost tier for inventory and routine cards, the strongest for hot paths and public safety.
- Read each source once. Use the cards for later passes.
- Distill cards to the listed fields.
