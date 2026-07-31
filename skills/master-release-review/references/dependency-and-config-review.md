# Dependency and Configuration Review

Hygiene review of what the product is built from and how it is configured for release.

## Dependency Review

- package manifests: intentional dependencies, no leftovers
- lockfiles: present, pinned, in sync with manifests
- workspace overrides and resolutions: intentional and documented
- install/build scripts: no surprising postinstall behavior
- native dependencies: build reproducibility and platform coverage
- vendored code: origin and license identified
- license indicators: compatible with the intended distribution model (especially closed-source products bundling open-source code)
- dependency freshness/vulnerability status when repo tools support it (native audit commands)
- known project-native checks: run them first

## Configuration Review

- production vs development config cleanly separated
- debug flags off in release config
- source maps: intentional per distribution model (usually absent for closed-source)
- logging settings: release-appropriate levels, no private content logged
- CORS or network origins scoped, not wildcard, when relevant
- update endpoints: HTTPS, correct host, valid metadata
- installer metadata correct
- app permissions/capabilities minimal and intentional
- environment variable expectations documented; report values only as SET/MISSING
- CI release workflow assumptions hold (paths, secrets referenced by name only, artifact destinations)
- security headers and cookie flags where the product serves web content

## Rules

- Prefer repo-native scripts (lint, typecheck, package checks, release checks, dependency audits) over improvised checks.
- Do not print private environment values.
- Do not fetch external data unless the user explicitly requested current external validation; if network access or credentials are required, mark the check blocked/pending.

## Finding Examples

- release config points to a staging URL
- production source maps are enabled unexpectedly
- package metadata is missing the release version
- dependency check could not run because network access was unavailable (blocked, not skipped)
- update endpoint is not HTTPS
- postinstall script downloads and executes remote content
