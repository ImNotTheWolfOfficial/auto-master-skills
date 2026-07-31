# Public-Release Readiness

Checks and recommendation language for public sharing or open-source release.

## Readiness Checks

- License is present and intentional (chosen, not defaulted).
- Public README/docs do not reveal private implementation details, internal file layout, or private infrastructure.
- Example data is synthetic — no real customers, users, or production values.
- Screenshots and assets are approved for public use and free of private data in the pixels (paths, names, tokens in terminal captures).
- Build scripts do not require private infrastructure unless documented safely.
- CI workflows do not expose private paths, account IDs, or internal service names.
- Package metadata is public-safe (author fields, repository URLs, internal registry references).
- Git ignored files cover local secrets, generated files, logs, and private artifacts — and nothing already tracked violates those rules.
- No private docs are accidentally included.
- No closed-source product material is included in an open-source repo.
- No denylist hits anywhere in the public set.

## Private-to-Public: Clean Export Is the Default

For closed-source to open-source transitions, **recommend a clean fresh-history export by default**:

- Create the public version as a new repo from a clean initial commit of the sanitized tree, dropping all prior history.
- Include only intentionally public files — an allowlist mindset, not "everything minus the bad parts".
- Review the first public commit as if it were a release artifact: it is one.
- This is safer and cheaper than surgical history rewriting and leaves no leaked blobs behind.

Historical cleanup (rewriting the existing history) is a secondary, opt-in path only when preserving history is explicitly required — see `history-cleanup-boundaries.md`.

## Recommendation Language

- **READY** — no blocking public-readiness findings.
- **READY AFTER FIXES** — specific issues should be fixed before release.
- **CLEAN EXPORT RECOMMENDED** — the public version should be created as a fresh clean repo/export.
- **NOT READY** — serious private material or unclear ownership/licensing risk remains.
- **BLOCKED** — required context or approval is missing.
