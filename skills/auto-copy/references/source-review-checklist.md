# Source Review Checklist

Use this checklist before trusting, adapting, installing, or running an external repository.

## Identity

Record:
- Repository URL and owner.
- Default branch and reviewed commit if available.
- Project purpose.
- Primary language/framework/runtime.
- Target project, target stack, and requested adoption goal (from the discussion).

## Scope Relevance

Tie the review to what the discussion actually needs:
- Which behaviors/features are in scope, and the evidence they exist in the source.
- Which parts of the source are explicitly out of scope (do not review them at depth).
- Whether the request is feature-extract, full-port, or cross-stack-port — for cross-stack, note source-stack idioms that will not carry over.

## License

Check:
- License file and package metadata.
- Whether commercial use, modification, distribution, sublicensing, and private use are allowed.
- Required notices and attribution.
- Copyleft triggers: GPL, AGPL, LGPL, SSPL, EPL, MPL, custom terms.
- Patent or trademark language.

Classify license risk:
- `low`: permissive and clear, such as MIT, BSD, Apache-2.0.
- `medium`: weak copyleft or attribution complexity.
- `high`: strong copyleft, network copyleft, custom, missing, conflicting, or unclear.

Stop before implementation on medium/high risk unless the user accepts the decision explicitly. For closed-source targets, treat copyleft as high risk regardless of intent to modify.

## Dependencies

Review manifests and scripts:
- package.json, pnpm/yarn/npm lockfiles.
- pyproject.toml, setup.py, requirements files.
- Cargo.toml, go.mod, Dockerfile, Makefile, shell scripts.
- Postinstall scripts, preinstall scripts, binary downloads, native extensions, build hooks.
- Pinned vs floating versions.

Flag:
- Opaque binaries.
- Remote script execution.
- Privileged commands.
- Dependency confusion risk.
- Abandoned or suspicious packages.

## Runtime And Network Surfaces

Search for:
- Telemetry, analytics, tracking, crash reporting.
- HTTP clients, web sockets, remote procedure calls.
- LLM/API provider calls.
- Cloud SDKs and auth flows.
- File system reads/writes outside the project.
- Shell/process execution.
- Browser automation or extension APIs.
- Background services, daemons, scheduled jobs.

Record which network calls are required, optional, disabled by config, or unsafe. Phone-home and telemetry behavior never gets copied into the target without explicit approval.

## Secrets And Privacy

Check how the source handles:
- Environment variables.
- API keys and OAuth tokens.
- Local credentials.
- Logs and debug output.
- Example configs.
- Test fixtures.
- Generated artifacts.

Never paste discovered secrets. Report only `SET`, `MISSING`, or masked values.

## Architecture

Map:
- User-facing behaviors.
- Public APIs and CLIs.
- Data model and state flow.
- Main modules and boundaries.
- Error handling and retries.
- Configuration and extension points.
- Tests that define expected behavior — these are the best behavior-contract evidence for the matrix.

## Adoption Classification

Choose one:
- `do-not-use`: risk outweighs value.
- `study-only`: useful ideas, no code/dependency adoption.
- `adapt-behavior`: rebuild selected behaviors in target style.
- `vendor-or-fork`: direct copy/fork allowed and approved.

Record concise evidence for the decision.
