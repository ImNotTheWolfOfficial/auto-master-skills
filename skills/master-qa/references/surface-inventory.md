# Surface Inventory

How Master-QA decides what to test. Coverage starts from a complete surface map — the release gate cannot be thorough about surfaces it never listed.

## Preferred Input: Master-Docs Manifest

```text
~/.auto-master/artifacts/<project-slug>/manifests/master-docs-manifest.json
```

When the manifest exists:

- Use it to identify documented modules, user-facing surfaces, public docs, feature boundaries, and changed sections — it is a guaranteed-complete map built by Master-Docs' full sweep.
- Use its source hashes and section map to focus QA on areas changed since the docs run.
- Still include release-critical happy paths even when unchanged — release gates re-verify the core regardless.

## Fallback Discovery (no manifest)

Build the inventory from repo-native signals:

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
