# Auto Copy QA Gates

Use these after `$auto-qa` selects the normal target repo checks. Per-slice QA proves each behavior as it lands; the final review runs the full set below over the complete adaptation.

## Required Extra Gates

License and attribution:
- Confirm source license classification.
- Confirm no unapproved source code was copied.
- Confirm notices or attribution were added when required.

Behavior parity:
- Review the behavior matrix: every `done` behavior has an **executed** QA gate — not planned, executed.
- For cross-stack ports, run the rewritten parity tests: same input, same observable behavior as the source contract.
- Record intentional differences from the source.

Dependency delta:
- List new dependencies.
- Confirm each dependency is necessary and maps to the matrix's dependency decisions.
- Check install/build scripts for risky behavior.
- Prefer existing target dependencies when reasonable.

Network and telemetry:
- Confirm no new outbound calls were added unexpectedly.
- Confirm telemetry, analytics, or cloud calls from the source are absent, disabled, or user-approved.
- Confirm private target code/docs are not sent to external services without approval.

Secrets and privacy:
- Search changed files for secrets and credential-like material.
- Confirm `.env`, key files, local credential paths, and private docs were not committed or embedded.
- Report only `SET`, `MISSING`, or masked values.

Target repo quality:
- Run relevant lint, typecheck, unit tests, build, and focused integration tests.
- For UI behaviors, the Frontend Gate applies: launch the real app and drive each copied flow as a user, with evidence per flow.
- For CLI or service changes, run the changed command or endpoint with safe test data.

## Final Review

The adaptation is complete only when:
- every matrix row is `done`, `deferred`, or `rejected` (nothing left `planned`/`in-progress`/`blocked` without a recorded reason),
- all gates above pass or are explicitly accepted-risk by the user,
- and the final report records classification, behaviors shipped/deferred/rejected, verification evidence, attribution needs, and intentional differences.

## QA Result Terms

Use one final result:
- `pass`: all required gates passed.
- `findings-only`: review found issues but no implementation was requested.
- `blocked`: a required gate could not run and no safe substitute exists.
- `accepted-risk`: the user accepted a documented risk or skipped gate.
- `fail`: a required gate failed.

Do not mark skipped or blocked required gates as passed.
