# Release-Only Gates

Checks that go beyond normal testing — they exist because "all tests pass" says nothing about whether the *release* works. Run the ones relevant to the release type; mark the rest not-applicable explicitly.

## General Release Gates

- version is correct everywhere it appears (package metadata, about screens, artifact names)
- changelog/release notes exist if expected
- package metadata is correct
- production build succeeds from a clean state
- generated artifacts are present and complete
- checksums are generated where expected
- update metadata is valid where relevant
- no debug/development-only mode, endpoint, or verbose error output is active in the release build
- **rollback readiness** — a rollback plan exists or the previous version remains available; for data migrations, prove the migration can actually be reversed or the pre-migration state restored
- **performance vs baseline** — no regression beyond the agreed budget on measurable paths (use existing benchmarks or prior Master-QA report numbers)
- **offline / degraded-network / provider-failure behavior** on critical paths when the app has any network dependency
- **monitoring/alerting** wired for new surfaces when the project has observability
- **security sign-off** — Master Release Review ran for this release and its Blocker/High findings are cleared; link its report rather than duplicating it. No release review on a public release is itself a finding.

## Desktop Release Gates

- installer/package exists and is the artifact under test (not the dev tree)
- install works on a clean machine or clean local profile when available
- uninstall works and cleans up what it should
- upgrade from the previous version works when applicable, including user data surviving the upgrade
- app first-run works (permissions prompts, initial setup)
- app restart works (state persistence)
- file associations or OS permissions are correct when applicable
- code signing status checked when applicable
- updater artifacts checked when applicable
- public download metadata correct when applicable
- crash/error logs reviewed without printing secrets

## Web Release Gates

- production build succeeds
- route navigation works across main routes
- main forms and actions work
- responsive layouts checked for target viewports
- critical assets load (no 404s, no broken images/fonts)
- console free of new errors on exercised flows
- expected environment variables reported as SET/MISSING only — never printed
- deployment is **not** activated unless explicitly requested

## Rules

- Do not publish or activate a release.
- Do not upload release artifacts.
- Do not spend provider credits.
- If a release gate cannot be checked locally (needs a second machine, store account, signing cert), mark it blocked/pending with what is needed — never silently drop it.
