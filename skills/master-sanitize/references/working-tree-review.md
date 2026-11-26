# Working-Tree and Tracked-File Review

What to look for and how to report it. For pre-push scope, apply the same checks to every outgoing ref, not just the checked-out tree.

## Review For

- Credential-shaped values and sensitive configuration: API keys, tokens, connection strings, `.env` values, auth headers.
- Certificate or private-key file patterns (`.pem`, `.key`, `.pfx`, `.p12`, keystores).
- Local machine paths and personal directories (absolute paths like `C:\Users\...`).
- Personal identity details: private emails, usernames, machine/hostnames — including git author identity when it should not go public.
- Internal-only project names, codenames, labels, or private phrases.
- Private domains, internal URLs, staging endpoints, or local-only URLs not intended for public docs.
- Customer data, real user data, private fixtures, seeds, snapshots, or screenshots that should not be public.
- Comments or docs referencing private strategy, competitors, private vendors, or non-public plans.
- Build outputs or generated files that should not be tracked.
- Source maps, debug artifacts, logs, caches, local databases, or packaged files that should be ignored.
- Vendored/copied third-party code that may need license review before public release.
- Public-facing docs that reveal source layout, internal file names, or private implementation details.

## Suggested Checks

- Inspect `.gitignore`, `.gitattributes`, package manifests, release configs, CI workflows, docs folders, examples, fixtures, screenshots, test data, and public docs.
- The masked scanner (`scripts/scan-public-readiness.mjs`, see `SKILL.md`) does the pattern work: denylist terms, credential shapes, high-entropy strings, sensitive file types, local paths, and private addresses. Treat its `high-entropy-string` and `assigned-secret` hits as findings to check even when no known token format matches.
- Do not repeat that pattern work with a search that prints matching lines. For anything the scanner cannot express, use masked locations or counts and request a privately checked redacted excerpt when needed.
- For pre-push scope: run the scanner with `--ref` (or `--all-refs`) and `--outgoing <remote>`. The scanner stays offline and includes the full reachable history, historical filenames and annotated tag metadata. Review author identities and contextual wording through privately checked redacted excerpts. Mark unresolved coverage in the report.

## Reporting Rules

- Do not print secret values. Show masked examples only when necessary to identify the finding (`sk-live-****`, first/last 2 chars at most).
- Prefer file path + line + finding category over quoting content.
- If a file appears highly sensitive (a real key file, customer data), say so without quoting contents at all.
- A credential that appears live gets an explicit **rotate** action in the report — masking, deleting, or rewriting does not un-leak it.
