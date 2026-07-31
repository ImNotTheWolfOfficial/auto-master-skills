# Private Denylist

The denylist is the shared private vocabulary of things that must never appear in public output. Master-Docs' public-doc sanitization uses the same file, so a term added here protects both skills.

## Path (outside every repo)

```text
~/.codex/artifacts/_private/sanitize-denylist.json
```

## Contents

The denylist may contain:

- private codenames
- internal product names
- competitor names
- private vendor names
- private domains
- sensitive phrases
- entity names not intended for public repos
- project aliases
- local-only paths or hostnames

## Suggested Schema

```json
{
  "schemaVersion": "1.0.0",
  "terms": [
    {
      "label": "internal codename example",
      "pattern": "example-private-term",
      "category": "codename",
      "severity": "high"
    }
  ],
  "paths": [],
  "domains": [],
  "notes": "Do not commit this file."
}
```

Treat the schema as flexible: if the file shape differs, read conservatively and do not fail unless parsing is impossible.

## Rules

- The denylist lives outside every repo, permanently.
- The skill may read it at runtime.
- Never copy the denylist (or any part of it) into a repo, a commit, or a public doc.
- Never print the full denylist — not in chat, not in reports.
- Findings identify the **category** or a masked term, not the confidential contents; avoid echoing the term itself where the file/line reference already locates it.
- If the denylist is missing, continue with built-in generic checks and report `private denylist: MISSING`.

## Maintenance Loop

When a review finds an internal codename, competitor mention, private domain, or sensitive phrase that the denylist does not cover, list it in the report's "Proposed Denylist Additions" section (masked/categorized). The user approves additions; the skill may then update the denylist file — outside the repo — never automatically during review.
