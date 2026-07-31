# Codebase Graph Adapter (Optional)

An external codebase-graph provider may enrich the graph pass. It is never a hard dependency—the skill must run fully without one.

## Discovery

1. Check for a configured graph adapter through environment or project configuration, starting with `CODEBASE_GRAPH_COMMAND`, then any wired tool or MCP interface that exposes an equivalent graph operation.
2. If found, treat the adapter as available; otherwise proceed with the native fallback. Do not block, retry-loop, or ask the user to install one.

## When an Adapter Is Available

- Invoke it to produce or enrich the repo/feature graph (nodes, dependency edges, module boundaries, hot-path hints).
- Normalize its output into the graph structure the workflow expects; supplement with repo-native signals where CBM output is incomplete.
- If the adapter errors, fall back to native discovery for this run and record the failure—do not fail the sweep.

## Native Fallback

Build the graph from repo-native discovery:

- file tree
- imports/exports
- package metadata
- app routes/pages
- commands
- tests
- configs
- dependency manifests
- git history (churn, co-change patterns, recent activity)

The native graph feeds the same downstream passes (module cards, hot-path deep dives) — quality of the sweep must not depend on CBM being present.

## Reporting

Every run reports the graph-adapter status as one of:

- **used** — an adapter was configured and produced or enriched the graph
- **skipped** — an adapter was configured but intentionally not used, such as for a very small feature scope
- **missing** — no adapter was found; native fallback used
- **failed** — an adapter was found but errored; native fallback used

Record the same status in the run report to the user and note the graph source in the manifest.
