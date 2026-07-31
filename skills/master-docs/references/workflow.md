# Master-Docs Workflow

Full run procedure for a Master-Docs documentation sweep. Load this before starting a run.

## 1. Confirm Scope and Paths

1. **Confirm the active repo.** Resolve the repo root from the current working directory (`git rev-parse --show-toplevel` or the workspace root). If no repo is identifiable, stop and ask the user which project to document.
2. **Detect scope.** Decide whether the request is **repo-wide** (document everything) or **feature-scoped** (document one feature area, module group, or subsystem the user named). Record the scope in the manifest.
3. **Derive `<project-slug>`.** Use the repo directory name, lowercased and kebab-cased, unless the user specifies a different slug. Reuse the slug from an existing manifest when one exists.
4. **Resolve artifact paths.** All output lives outside the repo:

   - Artifact root:
     `~/.codex/artifacts/<project-slug>/`
   - Internal docs:
     `~/.codex/artifacts/<project-slug>/docs/internal/`
   - Public docs:
     `~/.codex/artifacts/<project-slug>/docs/public/`
   - Manifest:
     `~/.codex/artifacts/<project-slug>/manifests/master-docs-manifest.json`

   Create these directories if missing. Never write generated docs or manifests inside the repo.

5. **Load the manifest** if one exists (see `manifest-schema.md`). If present and valid, this run is incremental: compute the changed set (git diff + hash comparison) and limit regeneration to affected sections. If missing or stale, do a full build.

## 2. Multi-Resolution Analysis

Do not analyze the repo line by line unless the repo or feature is tiny. Work at four resolutions, each feeding the next; use the graph and the change set to decide where to spend depth.

### Pass 1 — Inventory

Catalog what exists, without deep reading:

- file tree
- package manifests (package.json, pyproject.toml, Cargo.toml, etc.)
- app entry points (main, bin, server, CLI entry)
- tests (locations, frameworks, naming conventions)
- configs (build, lint, env, deployment)
- build/release scripts
- routes/pages/commands where applicable (web routes, CLI subcommands, IPC channels)

Output: an inventory section listing every top-level area with a one-line role.

### Pass 2 — Graph

Build the structural graph (via an external graph adapter when available — see `graph-adapter.md` — otherwise repo-native discovery):

- imports/exports
- dependency edges (internal module-to-module and external packages)
- module boundaries
- feature ownership (which modules make up which user-facing feature)
- data flow hints (what produces, transforms, stores, and emits data)
- test coverage relationships (which tests exercise which modules)

Output: a graph document plus a list of hot paths flagged for deep dives.

### Pass 3 — Module Cards

Write one card per module (or per feature-relevant module when feature-scoped). **Coverage guarantee:** read every in-scope source file at least once while writing its module card — nothing is documented from the graph alone. This pass reads at file resolution (understand and distill, don't transcribe); line-level scrutiny is reserved for Pass 4. Card generation is parallelizable: where the harness supports it, batch files to worker sub-agents that write cards straight to disk instead of re-reading everything in one context.

Each card includes:

- purpose
- user-facing behavior
- important APIs or commands
- dependencies
- data flow
- invariants
- known risks/gotchas
- test coverage
- related docs

Cards are the unit of incremental refresh: the manifest maps each card to its source files and hashes so a later run regenerates only cards whose sources changed.

### Pass 4 — Hot-Path Deep Dives

Deep dive (careful, close reading) only into:

- app entry points
- security-sensitive or data-sensitive boundaries
- release/build/update code
- high-complexity modules
- user-critical workflows
- areas changed since the last manifest run

Everything else stays at module-card resolution. Deep dives are graph-driven and change-driven, not exhaustive.

## 3. Write Internal Docs

Assemble the internal doc set under `docs\internal\`: overview, architecture/graph summary, inventory, module cards, deep dives, and an index. Internal docs may reference repo-relative file paths and code identifiers — they are for the AI/dev team only.

## 4. Derive Public Docs

Generate public docs under `docs\public\` **from the sanitized internal docs, never directly from source**. Follow `public-sanitization.md` strictly, including the mandatory review pass before finalizing. Public docs describe product behavior, user-visible features, and support-safe troubleshooting — never implementation.

Write public docs as clean, standalone Markdown that can be consumed by common documentation and knowledge-ingestion systems without reformatting.

## 5. Update the Manifest and Report

1. Update the manifest per `manifest-schema.md`: source hashes, git commit, section mappings, public-doc sanitization statuses, timestamps.
2. Report to the user:
   - what was generated or updated (and what was skipped as unchanged)
   - which graph source was used (external adapter or native)
   - any public docs blocked or flagged needs-review by the safety scan
   - anything that needs user attention or a human decision
