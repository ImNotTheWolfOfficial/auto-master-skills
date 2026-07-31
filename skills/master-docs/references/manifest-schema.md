# Master-Docs Manifest Schema

The manifest is the diff engine for incremental runs. It lives outside the repo at:

`~/.auto-master/artifacts/<project-slug>/manifests/master-docs-manifest.json`

## Schema

```json
{
  "schemaVersion": "1.0.0",
  "projectSlug": "example-project",
  "repoRoot": "masked-or-local-path",
  "lastRunAt": "ISO timestamp",
  "lastGitCommit": "commit sha or unknown",
  "scope": "repo-wide or feature",
  "sourceIndex": {
    "relative/path/to/file.ts": {
      "sha256": "hash",
      "lastDocumentedAt": "ISO timestamp",
      "sections": ["module-card-id", "deep-dive-id"]
    }
  },
  "docSections": {
    "section-id": {
      "kind": "inventory|module-card|deep-dive|public-doc",
      "outputPath": "path outside repo",
      "sourceFiles": ["relative/path"],
      "sourceHashes": {
        "relative/path": "hash"
      },
      "lastUpdatedAt": "ISO timestamp"
    }
  },
  "publicDocs": {
    "section-id": {
      "sourceInternalSections": ["section-id"],
      "sanitizationStatus": "passed|blocked|needs-review"
    }
  }
}
```

## Field Notes

- `sourceIndex` maps every documented source file to its content hash and the doc sections built from it. This is the reverse lookup for "this file changed — which docs are stale?"
- `docSections` maps every generated doc section to the source files and hashes it was built from, plus where it was written.
- `publicDocs` maps each public doc to the internal sections it was derived from and the result of its sanitization scan. Public docs are never mapped directly to source files.

## Rules

- Do not include secrets in the manifest.
- Prefer relative repo paths in internal manifest mappings.
- Public docs must not include repo paths — neither in their content nor in their manifest entries beyond internal section IDs.
- On re-run, compare current file hashes and `git diff --name-only <lastGitCommit>..HEAD` against the manifest to compute the changed set.
- Regenerate only affected module cards, deep dives, indexes, and public docs where practical. Untouched sections keep their existing output and timestamps.
- Handle renames by remapping the old path to the new one; handle deletions by removing the source entry and retiring or updating sections that referenced it.
- If the manifest is missing, corrupt, or stale (schema mismatch, unreadable, or the repo has diverged beyond what the diff can resolve), rebuild safely: run a full sweep and write a fresh manifest rather than trusting partial state.
