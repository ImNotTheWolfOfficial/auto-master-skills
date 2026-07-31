# Public Documentation Sanitization Rules

Public docs are for customers and support teams. Assume anything written here can be read by any customer or copied outside the company. Read this file before writing or updating any public doc.

Public docs are generated **only from sanitized internal docs, never directly from source**.

## Public Docs Must NOT Include

- source code
- file names
- file paths
- stack traces
- private architecture details
- internal codenames
- competitor mentions
- private domains
- local machine paths
- developer names/emails
- secrets, tokens, keys, certs, auth headers, cookies, signed URLs
- implementation identifiers that would help someone map the private repo (function names, class names, module names, table names, internal endpoint routes, config keys)

## Public Docs SHOULD Include

- product behavior
- user-visible features
- plain-language troubleshooting
- support-safe explanations
- limitations users can understand
- setup or usage guidance that does not expose internals

## Mandatory Review Pass

Before finalizing any public doc, run a public-doc review pass over the full generated text:

1. Scan every line against the "must not include" list above. Treat code-shaped tokens (camelCase/PascalCase identifiers, file extensions, path separators, hash-like or key-like strings) as violations unless clearly product-facing terms.
2. Rewrite violating lines in plain product language where the underlying information is legitimately public.
3. Drop the line entirely when in doubt — public docs describe what the product does, not how it is built.

## When Unsafe Material Is Found

If a public doc still contains unsafe material after rewriting:

- Do **not** write the final public output as approved.
- Mark the doc `blocked` or `needs-review` in the manifest's `publicDocs` entry.
- Write a blocked/needs-review report outside the repo (under the artifact root) describing which doc failed and why.
- Summarize the **type** of issue (e.g., "contains an internal identifier", "references a file path") without printing the sensitive content itself — not in the report, not in chat output.
