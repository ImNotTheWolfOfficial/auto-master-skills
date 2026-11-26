// Source: shared/scan-text.mjs. The distribution tests require identical standalone copies.
// ---- value filters ----
// A value is a placeholder only when the WHOLE value is a placeholder form, or
// it contains an unmistakable placeholder word.
const PLACEHOLDER_WHOLE = /^(?:\$\{[^}]*\}|\$\(?[A-Za-z_][A-Za-z0-9_]*\)?|<[^>]*>|\{\{[^}]*\}\}|%[A-Za-z_][A-Za-z0-9_]*%|\*+|x+|\.+|-+|null|none|nil|true|false|undefined|string|password|secret|token)$/i;
const PLACEHOLDER_WORD = /(?:^|[^A-Za-z])(?:example|changeme|change-me|change_me|placeholder|redacted|dummy)(?:[^A-Za-z]|$)|^your[-_ A-Z]/i;
// A value that starts with a template marker is interpolation, not a literal.
const TEMPLATE_START = /^(?:\$\{|\$\(|\{\{|<%|#\{)/;
function isPlaceholder(value) {
  return PLACEHOLDER_WHOLE.test(value) || PLACEHOLDER_WORD.test(value) || TEMPLATE_START.test(value);
}
// A dotted identifier (process.env.NAME, home.title.main) is a code reference or a lookup key, not a secret.
const DOTTED_IDENTIFIER = /^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)+$/;
function assignedValueIsSecret(match) {
  const quoted = match[2] ?? match[3];
  if (quoted !== undefined) return !/\s/.test(quoted) && !isPlaceholder(quoted) && !DOTTED_IDENTIFIER.test(quoted);
  const bare = match[4] ?? "";
  // An unquoted value counts only when it mixes letters and digits and is not a
  // member access or a call: getToken2() and process.env.OAUTH2_SECRET are code.
  const next = match.input[match.index + match[0].length];
  if (next === "(" || next === "." || DOTTED_IDENTIFIER.test(bare)) return false;
  return /[A-Za-z]/.test(bare) && /\d/.test(bare) && !isPlaceholder(bare);
}
// A plain value under a password-like name. A quoted value counts from 4 characters. An
// unquoted bare word counts only in a config-style file: in source code it is a variable name.
export const CONFIG_FILE = /(?:^|\/)(?:\.env[^/]*|[^/]*\.(?:env|ya?ml|properties|ini|conf|cfg|toml|tfvars)|docker-compose[^/]*|Dockerfile[^/]*|[^/.]+)$/i;
function plainValueIsSecret(match, relativePath) {
  const quoted = match[2] ?? match[3];
  if (quoted !== undefined) return !/\s/.test(quoted) && !isPlaceholder(quoted) && !DOTTED_IDENTIFIER.test(quoted);
  const bare = match[4] ?? "";
  const next = match.input[match.index + match[0].length];
  if (next === "(" || next === "." || next === "[" || DOTTED_IDENTIFIER.test(bare) || isPlaceholder(bare)) return false;
  return /\d/.test(bare) || CONFIG_FILE.test(relativePath);
}
// A generated value: 20 or more characters, no spaces, with lower case, upper case, and a digit.
function generatedValue(match) {
  const value = match[2] ?? match[3] ?? match[4] ?? "";
  if (match[4] !== undefined && match.input[match.index + match[0].length] === "(") return false;
  return value.length >= 20 && !/\s/.test(value) && /[a-z]/.test(value) && /[A-Z]/.test(value) && /\d/.test(value) && !isPlaceholder(value);
}
const VALUE = String.raw`(?:"([^"\n]{8,})"|'([^'\n]{8,})'|([^\s"'` + "`" + String.raw`,;#(){}\[\]]{8,}))`;
const VALUE_SHORT = VALUE.replace(/\{8,\}/g, "{4,}");
// ---- content patterns: [category, severity, global regex, optional match filter] ----
export const credentialPatterns = [
  ["private-key-block", "high", /-----BEGIN [A-Z ]*PRIVATE KEY-----/g],
  ["aws-access-key", "high", /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g],
  ["github-token", "high", /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{36,}\b|\bgithub_pat_[A-Za-z0-9_]{50,}\b/g],
  ["slack-token", "high", /\bxox[baprs]-[A-Za-z0-9_-]{10,}/g],
  ["stripe-live-key", "high", /\b[sr]k_live_[A-Za-z0-9_-]{10,}/g],
  ["sk-style-key", "high", /\bsk-[A-Za-z0-9_-]{16,}/g],
  ["google-api-key", "high", /\bAIza[0-9A-Za-z_-]{35}\b/g],
  ["gitlab-token", "high", /\bglpat-[A-Za-z0-9_-]{10,}/g],
  ["npm-token", "high", /\bnpm_[A-Za-z0-9]{36}\b/g],
  ["sendgrid-key", "high", /\bSG\.[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,}/g],
  ["slack-webhook", "high", /hooks\.slack\.com\/services\/T[A-Z0-9]+\/B[A-Z0-9]+\/[A-Za-z0-9]+/g],
  [
    "url-with-credentials",
    "high",
    /\b[a-z][a-z0-9+.-]*:\/\/[^\s/:@'"`]+:([^\s/@'"`]{3,})@[^\s'"`]+/gi,
    (match) => !isPlaceholder(match[1]),
  ],
  ["jwt", "medium", /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g],
  ["bearer-token", "medium", /\bBearer\s+\S{12,}/gi],
  // A name that ENDS in a secret word, then : or =, then a value. A bare "key" is not enough
  // (sortKey, STORAGE_KEY, i18n_key): the key must be qualified (api, access, secret, private,
  // auth, signing, encryption). Matches DB_PASSWORD, SMTP_PASS, apiKey, clientSecret, secret_key_base.
  [
    "assigned-secret",
    "medium",
    new RegExp(
      String.raw`(?<![A-Za-z0-9_.-])([A-Za-z0-9_.-]*(?:password|passwd|passphrase|pwd|[_.-]pass|secret(?:[_-]?key)?(?:[_-]?base)?|token|credentials?|(?:api|access|private|auth|signing|encryption)[_-]?key(?:[_-]?pem)?|[_.-]auth)|(?<![A-Za-z0-9_.-])(?:auth|pass))["']?\s*[:=]\s*` + VALUE,
      "gi",
    ),
    assignedValueIsSecret,
  ],
  // An unqualified key name (SENDGRID_KEY, APP_KEY, signKey) counts only with a value that looks generated.
  ["assigned-secret", "medium", new RegExp(String.raw`(?<![A-Za-z0-9_.-])([A-Za-z0-9_.-]*[_.-]key)["']?\s*[:=]\s*` + VALUE, "gi"), generatedValue],
  ["assigned-secret", "medium", new RegExp(String.raw`(?<![A-Za-z0-9_.-])([A-Za-z0-9_.]*[a-z]Key)["']?\s*[:=]\s*` + VALUE, "g"), generatedValue],
  // A password-like name with a short or plain-word value, as in a compose file that sets a
  // database password to an ordinary word. Low severity: many of these are defaults.
  [
    "assigned-secret-plain",
    "low",
    new RegExp(String.raw`(?<![A-Za-z0-9_.-])([A-Za-z0-9_.-]*(?:password|passwd|passphrase|pwd|[_.-]pass|secret)|(?<![A-Za-z0-9_.-])pass)["']?\s*[:=]\s*` + VALUE_SHORT, "gi"),
    plainValueIsSecret,
  ],
];

export function credentialKinds(text, relativePath = "") {
  const kinds = new Set();
  for (const [kind, , regex, filter] of credentialPatterns) {
    if (kinds.has(kind)) continue;
    for (const match of text.matchAll(regex)) {
      if (!filter || filter(match, relativePath)) {
        kinds.add(kind);
        break;
      }
    }
  }
  return kinds;
}

// BOM-less UTF-16 text has NULs predominantly in its high bytes. Ambiguous,
// malformed and decoded NUL-bearing input cannot be certified as text.
export function decodeScanText(bytes) {
  let encoding = "utf-8";
  if (bytes[0] === 0xff && bytes[1] === 0xfe) encoding = "utf-16le";
  else if (bytes[0] === 0xfe && bytes[1] === 0xff) encoding = "utf-16be";
  else {
    const sample = bytes.subarray(0, 8000);
    let even = 0;
    let odd = 0;
    for (let i = 0; i < sample.length; i++) {
      if (sample[i] === 0) {
        if (i % 2) odd++;
        else even++;
      }
    }
    if (odd || even) {
      // One stray NUL in a page of ASCII must not reinterpret (and hide) its text.
      if (Math.max(even, odd) * 8 < sample.length) return null;
      if (odd > 2 * even) encoding = "utf-16le";
      else if (even > 2 * odd) encoding = "utf-16be";
      else return null;
    }
  }
  try {
    const text = new TextDecoder(encoding, { fatal: true }).decode(bytes);
    return /[\x00-\x08\x0e-\x1f]/.test(text) ? null : text;
  } catch {
    return null;
  }
}
