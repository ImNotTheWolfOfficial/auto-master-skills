# Surface Inventory

How Master-QA decides what to test. Coverage starts from a complete surface map — the release gate cannot be thorough about surfaces it never listed.

## Preferred Input: Master-Docs Manifest

```text
~/.auto-master/artifacts/<project-slug>/manifests/master-docs-manifest.json
```

Compare the manifest's repository/worktree identity, documented scope and revision with the release candidate. Read the internal index and inventory for documented surfaces. When Master-Docs is available, use its manifest summary and diff to locate changed areas without loading the hash index. Treat unknown, feature-only or stale coverage as partial.

## Candidate discovery

Inspect the actual candidate and packaging inputs even with a current manifest. Reconcile uncovered surfaces, especially installers and updates, against the release inventory. Keep release-critical journeys in scope even when unchanged. Check these sources as applicable:

- package manifests and workspace manifests
- app entry points
- routes/pages/screens
- CLI commands
- desktop commands/menus/tray behavior
- API endpoints if locally defined
- tests (what they cover reveals surfaces; what they don't reveals risk)
- release scripts
- installer configs
- updater configs
- CI workflows
- docs and runbooks
- recent git diffs

## Output: Compact Surface List

```md
| Surface | Type | Source | Risk | QA Needed |
|---|---|---|---|---|
| Main install flow | desktop release | installer config | high | install/uninstall/upgrade |
| Login screen | UI | route/screen | high | happy path and error path |
```

Every user-facing surface in this list triggers the Frontend Gate during execution.

## Rules

- Do not print secrets or private runtime values discovered during inventory (env files, config values) — record key names as SET/MISSING only.
- If the surface list may be incomplete, say so clearly in the QA report — an honest coverage gap beats false confidence.
