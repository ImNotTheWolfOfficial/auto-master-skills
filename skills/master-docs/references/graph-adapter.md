# Codebase Graph Adapter (Optional)

An external codebase-graph provider may enrich the graph pass. It is never a hard dependency: the skill must run fully without one.

## Discovery

1. Look for a configured adapter in the environment or project configuration, starting with `CODEBASE_GRAPH_COMMAND`, then any wired tool or MCP interface that exposes an equivalent graph operation.
2. If none is found, use the native fallback. Do not block, retry in a loop, or ask the user to install one.

## When An Adapter Is Available

- Invoke it to produce or enrich the repo/feature graph: nodes, dependency edges, module boundaries, hot-path hints.
- Normalize its output into the graph structure the run procedure expects. Supplement with repo-native signals where the adapter output is incomplete.
- If the adapter errors, fall back to native discovery for this run and record the failure. Do not fail the sweep.

## Native Fallback

Build the graph from repo-native discovery: file tree, imports/exports, package metadata, app routes/pages, commands, tests, configs, dependency manifests, and git history (churn, co-change patterns, recent activity).

The native graph feeds the same downstream passes. The quality of the sweep must not depend on an adapter being present.

## Reporting

Every run reports the adapter status as one of:

- **used** - an adapter was configured and produced or enriched the graph
- **skipped** - an adapter was configured but intentionally not used, for example for a very small feature scope
- **missing** - no adapter was found; native fallback used
- **failed** - an adapter was found but errored; native fallback used

Record the status in the run report and the graph source in the manifest.
