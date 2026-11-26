# Master-Docs Manifest Schema

The manifest is the diff engine for incremental runs. `scripts/manifest-diff.mjs` creates and maintains it (maintenance procedures are in `references/manifest-commands.md`), so a normal run never opens this file. Read this reference only to inspect or repair a manifest by hand. It lives outside the repo at:

`~/.auto-master/artifacts/<project-slug>/manifests/master-docs-manifest.json`

## Schema

```json
{
  "schemaVersion": "1.0.0",
  "projectSlug": "example-project",
  "repoRoot": "repo-basename",
  "worktreeId": "hash of the canonical repository and worktree identities",
  "outputsPlanned": true,
  "scopeDirs": [],
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
      "kind": "inventory|graph|overview|module-card|deep-dive|index",
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
      "outputPath": "docs/public/example.md",
      "sourceInternalSections": ["section-id"],
      "builtFrom": {"section-id": 1},
      "sanitizationStatus": "passed|blocked|needs-review"
    }
  }
}
```

## Field Notes

- `excludedSources` records the reason and Git index version of each explicitly reviewed non-document input. A missing or changed version, a merge conflict, or an unstaged edit reopens that file in the tracked inventory. `stamp` lists unreconciled in-scope paths under `unregistered`.

- `sourceIndex` maps every documented source file to its content hash and the doc sections built from it. This is the reverse lookup for "this file changed — which docs are stale?"
- `docSections` maps every generated doc section to the source files and hashes it was built from, plus where it was written.
- `publicDocs` maps each public doc to the internal sections it was derived from and the result of its sanitization scan. Public docs are never mapped directly to source files.

## Rules

- Do not include secrets in the manifest.
- Prefer relative repo paths in internal manifest mappings.
- Public docs must not include repo paths — neither in their content nor in their manifest entries beyond internal section IDs.
- Never compute or type hashes yourself. `set-section` writes a section's `sourceHashes` when the section is recorded; `stamp` refreshes every file-level `sha256`, `lastGitCommit`, and `lastRunAt`.
- A section is stale when a source file differs from the hash in that section's `sourceHashes`, when a source or its output is missing, when the section carries `"needsUpdate": true` (set by `rename` and `remove-file`, cleared when the section is recorded again), or when a section in its `dependsOn` map is stale or has a newer `revision` than the map records.
- Every `set-section` gives the section a new `revision` number. A public doc's `builtFrom` map records the revision of each source section; the public doc is stale when a source section is stale or has a newer revision, when its expected file is missing, or when it was planned but never recorded.
- If you repair entries by hand, leave `sha256` and `sourceHashes` empty for the entries you touched and run `stamp`, only after reviewing the affected outputs against those inputs. A missing historical baseline cannot establish what was originally documented.
- Regenerate only the sections that `diff` reports as stale, and the public docs derived from them. Untouched sections keep their existing output and timestamps.
- Handle a rename with the `rename` command and a deletion with `remove-file`, then update or retire the sections they report.
- If the manifest is missing, corrupt, or stale (schema mismatch, unreadable, or the repo has diverged beyond what the diff can resolve), rebuild safely: run a full sweep and write a fresh manifest rather than trusting partial state.
