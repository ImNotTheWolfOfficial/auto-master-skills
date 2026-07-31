# Production Build and Artifact Review

Inspect what actually ships — the bundle, installer, or package — not the source tree. This is where closed-source implementation leaks are caught.

## Review Build Outputs For

- unexpected source maps
- local machine paths embedded in the artifact
- private docs accidentally bundled
- development-only assets
- debug flags, debug routes, or dev endpoints left enabled
- private comments or internal labels in public bundles
- test fixtures or mock data in release output
- unexpected logs/cache/database files packaged in
- version metadata correct
- checksums where expected
- signing or publisher status where applicable
- update metadata where applicable
- installer/package contents where applicable: everything present is intentional (allowlist mindset)

## Implementation-Leak Checks (closed-source focus)

- error output is generic: no stack traces, file paths, internal object/type names, or query shapes in user-facing error responses or dialogs
- no embedded secrets, tokens, or internal hostnames in the bundle (string-scan the artifact, report masked)
- no internal codenames or denylist terms in shipped strings (the Master-Sanitize denylist applies to artifacts too)
- minified/obfuscated as intended for the distribution model
- verbose logging disabled in release builds

## Rules

- Prefer repo-native release artifact checks first.
- Do not publish or upload artifacts. Do not spend provider credits.
- If no production build exists, mark artifact review blocked/pending. If a release bundle must be built, proceed only when normal local build behavior is expected and safe for the current project — otherwise ask.
- Never print embedded sensitive values; report masked summaries with artifact + offset/filename context.

## Output Table

```md
| Artifact | Check | Result | Notes |
|---|---|---|---|
| installer.exe | publisher/signing status | blocked | no signed artifact available |
| web bundle | source maps | pass | none found |
| web bundle | embedded internal hostnames | fail | 2 masked matches — see findings |
```
