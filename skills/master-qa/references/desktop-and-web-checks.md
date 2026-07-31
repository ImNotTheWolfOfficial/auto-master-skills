# Desktop and Web App Check Patterns

Practical verification patterns per app type. These implement the Frontend Gate at release scope: launch the real production-like build, drive it as a user, verify what the user experiences, capture evidence per flow.

## Desktop App Checks

- build or package command (produce the actual release artifact)
- installer/package presence and integrity
- install/uninstall if available (clean profile preferred)
- first run: setup flow, permissions prompts, default state
- main user journeys through the running app — click/type through primary and changed flows, not code reading
- app restart: state and settings persist correctly
- update/upgrade path if available
- local file behavior if relevant (open/save/import/export)
- permissions prompts if relevant
- signing/checksum metadata if relevant
- crash/log review without printing secrets
- follow repo-specific app QA instructions when present (project skills, `AGENTS.md`, QA runbooks)

## Web App Checks

- production build
- local preview or dev server if appropriate — prefer the production build served locally over dev mode for release QA
- main routes navigate correctly
- main forms/actions work end to end (submit, validate, persist)
- responsive viewport checks for target sizes
- loading/empty/error states render sensibly
- accessibility basics: keyboard navigation through primary flows, visible focus, readable labels, honest disabled states
- console/runtime errors: none new on exercised flows
- network: no failed requests on exercised flows
- asset loading: no 404s, fonts/images load

## Visual QA

- Capture screenshots when UI changed or release readiness needs visual evidence — one per exercised flow minimum.
- Compare against prior baselines when they exist (Master-Refactor baselines, previous Master-QA evidence).
- Check desktop and mobile viewports when the release targets both.
- Confirm text does not overlap or overflow at target viewports.
- Confirm main flows are *usable*, not just rendered — a screenshot of a page proves rendering; clicking through the flow proves function. Both are required for user-critical journeys.

## Rules

- Prefer repo-native tools and existing QA scripts over improvised harnesses.
- Start local servers only when needed and safe; stop or hand off anything long-running — do not leave processes unmanaged.
- Record what was checked and what remains unverified.
- A "not runnable" claim requires the exact command and error as evidence — attempt the launch before claiming it.
