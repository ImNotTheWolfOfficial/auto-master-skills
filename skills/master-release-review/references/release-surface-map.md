# Release Surface Map

How the skill decides what to review and how deeply. Depth follows trust boundaries: surfaces that take input, hold data, cross the network, or ship to customers get the closest review.

## Preferred Input: Master-Docs Manifest

```text
~/.codex/artifacts/<project-slug>/manifests/master-docs-manifest.json
```

When the manifest exists:

- Use it to identify product surfaces, user-facing flows, feature boundaries, and changed sections.
- Use source hashes and section mappings to focus on changed areas.
- Still include release-critical surfaces even if unchanged — trust review re-verifies the boundary regardless.

## Fallback Discovery (no manifest)

- package manifests and workspace manifests
- app entry points
- routes/pages/screens
- desktop commands
- API/client modules if locally defined
- local storage and data folders
- network configuration
- build scripts
- release scripts
- installer configs
- updater configs
- CI workflows
- docs and runbooks
- recent git diffs

## Surface Map Format

```md
| Surface | Type | Source | Review Priority | Notes |
|---|---|---|---|---|
| Installer | desktop release | package config | high | release-critical |
| Update metadata | release flow | updater config | high | verify before public release |
| Chat endpoint | AI/agent surface | route | high | trust boundary — input + provider cost |
```

Priority guidance — mark **high** anything that is:

- an entry point (route, command, IPC channel, file handler)
- a trust or privilege boundary
- a data store or data exporter
- a network caller (especially update/telemetry endpoints)
- an AI/agent surface (prompt input, tool execution, model output shown to users)
- part of packaging, signing, update, or release flow
- changed since the last release or review

## Rules

- Do not print secrets or private runtime values discovered during mapping — key names as SET/MISSING only.
- If the surface map is incomplete, say so clearly in the report; an honest gap beats false coverage.
