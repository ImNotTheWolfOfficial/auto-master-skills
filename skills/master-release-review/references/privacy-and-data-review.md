# Privacy and Data Review

What the product does with user data, reviewed locally and defensively.

## Review Areas

- what user data the product stores locally, and where
- what data the product sends over the network, to which hosts, and when
- where logs are written and whether they may include private user content
- import/export behavior: what leaves in an export, what is accepted on import
- crash/error reporting behavior if present: what gets attached, where it goes
- authentication/session storage if present: what persists, how it is protected
- telemetry: present or absent, on/off by default, disclosed
- test fixtures and demo data: synthetic only, no real users or customers
- screenshots or assets intended for public release: no private data in the pixels
- customer-support docs for privacy-sensitive wording (align with public-documentation discipline)
- retention and deletion: can users remove their data; does anything outlive that

## Output Must Answer

- What data is handled?
- Where is it stored?
- What leaves the device/app boundary?
- What user-facing disclosure or support docs may be needed?
- What needs review or a decision before release?

## Rules

- Keep review local and defensive.
- Do not access real accounts or external services unless explicitly authorized; if a check needs a real account, mark it blocked/pending.
- Do not print tokens, cookies, session values, or private user data.
- Summarize sensitive checks as masked or SET/MISSING.
