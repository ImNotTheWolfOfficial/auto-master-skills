#!/usr/bin/env node
// Validates an auto-doc corpus.
//
//   node validate-auto-doc-artifacts.mjs <artifact_root>
//       Whole-corpus validation: structure, evidence, status markers, unsafe
//       patterns, and private-denylist terms in public output. Reports one
//       failure per failing file or batch, for every failing unit, in one run.
//
//   node validate-auto-doc-artifacts.mjs <artifact_root> --batch <batch-id>
//       The same checks for one batch while the corpus is still in progress
//       (no run-report or batch-count checks).
//
//   node validate-auto-doc-artifacts.mjs <artifact_root> --batch <batch-id> --pre-review
//       The batch check before the reviewer pass exists: everything except the
//       reviewer-pass artifact and its OPEN_P0 / OPEN_P1 markers.
//
//   node validate-auto-doc-artifacts.mjs <artifact_root> --negative-search [--batch <batch-id>]
//       Lists negative-search and anti-shallow gate hits as "term file:line".
//       The matched text is never printed.
//
//   --denylist <file>  private denylist (default ~/.auto-master/artifacts/_private/sanitize-denylist.json)
//
// Exit codes: 0 PASS or listing complete, 1 FAIL, 2 usage error.
// Without --negative-search or --batch, artifact_root defaults to docs/auto-doc
// for backward compatibility.

import { credentialKinds, decodeScanText } from './scan-text.mjs';
import fs from 'node:fs';
import os from 'node:os';
import { createHash } from 'node:crypto';

// Filesystem errors can contain private arguments and paths.
process.on('uncaughtException', () => {
  console.error('AUTO_DOC_ARTIFACTS=INCOMPLETE reason=artifact-read-error');
  process.exit(1);
});
import path from 'node:path';

function usage(message) {
  console.error(`error: ${message}`);
  console.error('usage: validate-auto-doc-artifacts.mjs <artifact_root> [--batch <batch-id> [--pre-review]] [--negative-search] [--denylist <file>]');
  process.exit(2);
}
const args = process.argv.slice(2);
const flags = new Set();
const values = new Map();
let artifactRoot;
for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];
  if (arg === '--negative-search' || arg === '--pre-review') {
    if (flags.has(arg)) usage('duplicate option');
    flags.add(arg);
  } else if (arg === '--batch' || arg === '--denylist') {
    if (values.has(arg)) usage('duplicate option');
    const value = args[++index];
    if (!value || value.startsWith('-')) usage('option requires a value');
    values.set(arg, value);
  } else if (!arg || arg.startsWith('-')) usage('unknown or empty argument');
  else {
    if (artifactRoot) usage('pass one artifact_root, and name a batch with --batch <batch-id>');
    artifactRoot = arg;
  }
}
const negativeSearch = flags.has('--negative-search');
const preReview = flags.has('--pre-review');
const batchOnly = values.get('--batch');
if (preReview && (!batchOnly || negativeSearch)) usage('--pre-review is used with --batch <batch-id> only');
const denylistPath = path.resolve(values.get('--denylist') ?? path.join(os.homedir(), '.auto-master', 'artifacts', '_private', 'sanitize-denylist.json'));
if ((negativeSearch || batchOnly) && !artifactRoot) usage('artifact_root is required with --negative-search and --batch');
const root = path.resolve(artifactRoot || 'docs/auto-doc');
if (fs.existsSync(root) && path.relative(root, fs.realpathSync.native(root))) {
  console.error('AUTO_DOC_ARTIFACTS=INCOMPLETE reason=linked-artifact-root');
  process.exit(1);
}
if (batchOnly) {
  if (!validBatch(batchOnly)) usage('a batch id may contain only letters, digits, dot, underscore, and hyphen');
  if (!fs.existsSync(path.join(root, 'source-map', `${batchOnly}.source-map.md`))) usage('unknown batch: no batch source map under the artifact root');
}
function validBatch(value) { return /^[a-zA-Z0-9_-][a-zA-Z0-9._-]*$/.test(value); }
const MAX_REPORTED = 50;

// Private denylist: literal, case-insensitive terms that must not reach public output. Terms are never printed.
let denylistStatus = 'MISSING';
let policyDigest = 'missing';
const denyTerms = [];
try {
  const bytes = fs.readFileSync(denylistPath);
  const parsed = JSON.parse(bytes.toString('utf8'));
  policyDigest = createHash('sha256').update(bytes).digest('hex');
  const groups = Array.isArray(parsed) ? [[parsed, 'term']] :
    ['terms', 'paths', 'domains'].filter((key) => Object.hasOwn(parsed, key))
      .map((key) => [parsed[key], { terms: 'term', paths: 'path', domains: 'domain' }[key]]);
  if (!groups.length) throw Error();
  for (const [items, fallback] of groups) {
    if (!Array.isArray(items)) throw Error();
    for (const item of items) {
      const value = typeof item === 'string' ? item : item.pattern ?? item.term ?? item.text ?? item.value ?? item.name;
      if (typeof value !== 'string' || value.trim().length < 2) throw Error();
      const category = ['codename', 'domain', 'path', 'term', 'vendor', 'project'].includes(item.category) ? item.category : fallback;
      denyTerms.push({ needle: value.trim().toLowerCase(), category });
    }
  }
  denylistStatus = denyTerms.length ? `SET terms=${denyTerms.length}` : 'EMPTY';
} catch (error) {
  if (error.code !== 'ENOENT' || fs.lstatSync(denylistPath, { throwIfNoEntry: false })) {
    console.error('AUTO_DOC_ARTIFACTS=INCOMPLETE reason=denylist-unreadable denylist=UNREADABLE');
    process.exit(1);
  }
}
const denyMask = denyTerms.length ? new RegExp(denyTerms.map(({ needle }) => escapeRegex(needle))
  .sort((a, b) => b.length - a.length).join('|'), 'gi') : null;
const isPublicOutput = (rel) => rel.startsWith('public/') || rel.startsWith('public-evidence/') || rel.startsWith('ingest/');

const unsafePatterns = [
  { name: 'private-ipv4', re: /\b(?:10\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])|192\.168)\.\d{1,3}\.\d{1,3}\b/ },
  { name: 'windows-home-path', re: /\b[A-Za-z]:[\\/](?:Users|Documents and Settings)[\\/][^\s)('"`]+/i },
  { name: 'unix-home-path', re: /(?:^|[\s('"`])\/(?:Users|home)\/[^\s)('"`]+/i },
];
// Keep the public diagnostic names used in earlier validation receipts.
function credentialLabel(name) {
  return { 'sk-style-key': 'openai-like-key', 'private-key-block': 'private-key' }[name] ?? name;
}
const blockingPublicPatterns = [
  { name: 'todo', re: /\bTODO\b/i },
  { name: 'tbd', re: /\bTBD\b/i },
  { name: 'needs-verification', re: /Needs verification/i },
];
const weakWordingPatterns = [
  { name: 'smart', re: /\bsmart\b/i },
  { name: 'seamless', re: /\bseamless(?:ly)?\b/i },
  { name: 'automatic', re: /\bautomatic(?:ally)?\b/i },
  { name: 'intelligent', re: /\bintelligent(?:ly)?\b/i },
  { name: 'optimized', re: /\boptimi[sz]ed\b/i },
  { name: 'robust', re: /\brobust\b/i },
  { name: 'powerful', re: /\bpowerful\b/i },
  { name: 'guaranteed', re: /\bguaranteed?\b/i },
  { name: 'always', re: /\balways\b/i },
  { name: 'never', re: /\bnever\b/i },
  { name: 'production-ready', re: /\bproduction[- ]ready\b/i },
];
const requiredChunkKeys = ['chunk_id','doc_slug','section_id','title','feature_area','verified','answerable','text','source_files','do_not_claim','needs_verification'];
const requiredPromptKeys = ['prompt_id','question','expected_doc_slug','expected_section_id','intent','must_mention','must_not_claim','source_files'];
const requiredFrontmatterKeys = ['slug:', 'title:', 'feature_area:', 'public_safe:', 'source_batches:', 'related_pages:', 'canonical_terms:', 'aliases:', 'last_source_review:'];
const requiredPublicSectionIds = ['summary', 'common-workflows', 'limitations', 'troubleshooting', 'related-pages', 'source-evidence', 'assistant-notes'];
const publicEvidenceExemptions = new Set(['source-evidence', 'assistant-notes']);
const requiredDeepDiveSections = [
  'Source Evidence',
  'Existing Tests',
  'What The User Sees',
  'How It Works Internally',
  'Step-By-Step Runtime Flow',
  'Configuration And Settings',
  'Data Model',
  'Edge Cases And Failure Modes',
  'Error Messages And User Recovery',
  'Security And Privacy Boundary',
  'Troubleshooting',
  'User Questions This Section Should Answer',
  'Retrieval Notes For Assistant',
  'Gaps',
];

class ValidationFailure extends Error {
  constructor(reason, file) {
    super(reason);
    this.reason = reason;
    this.file = file ? maskRel(path.relative(root, file).replace(/\\/g, '/')) : '';
  }
}
const failures = [];
function fail(reason, file) {
  throw new ValidationFailure(reason, file);
}
// Runs one validation unit. A failure is recorded and the run continues with the next unit.
function unit(fn) {
  try {
    return fn();
  } catch (error) {
    if (!(error instanceof ValidationFailure)) throw error;
    failures.push(error);
    return undefined;
  }
}
function slug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}
function assertArtifactPath(file) {
  // Batch paths can come from an inventory. Never follow a link into another tree.
  const normalized = path.resolve(file);
  const expected = path.join(fs.realpathSync.native(root), path.relative(root, normalized));
  if (path.relative(expected, fs.realpathSync.native(normalized))) throw Error();
}
function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  assertArtifactPath(dir);
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isSymbolicLink()) throw Error();
    if (entry.isDirectory()) files.push(...walk(full));
    else if (entry.isFile()) files.push(full);
    else throw Error();
  }
  return files;
}
const inputDigests = new Map();
function read(file) {
  assertArtifactPath(file);
  const bytes = fs.readFileSync(file);
  const digest = createHash('sha256').update(bytes).digest('hex');
  if (inputDigests.has(file) && inputDigests.get(file) !== digest) {
    console.error('AUTO_DOC_ARTIFACTS=INCOMPLETE reason=input-changed');
    process.exit(1);
  }
  inputDigests.set(file, digest);
  const text = decodeScanText(bytes);
  if (text === null) {
    console.error('AUTO_DOC_ARTIFACTS=INCOMPLETE reason=unsupported-text-encoding');
    process.exit(1);
  }
  return text.replace(/\r\n?/g, '\n');
}
function relative(file) { return path.relative(root, file).replace(/\\/g, '/'); }
// A denylist term can be part of a file name: printed paths are masked.
function maskRel(rel) {
  const safe = denyMask ? rel.replace(denyMask, '***') : rel;
  return safe.split('/').map((part) =>
    /[^\w.*-]|[A-Za-z0-9_-]{32,}|(?:sk-|gh[pousr]_|AKIA)[A-Za-z0-9_-]{12,}/i.test(part) ||
    credentialKinds(part).size || unsafePatterns.some(({ re }) => re.test(part)) ? '***' : part).join('/');
}
function batchLabel(id) {
  const safe = maskRel(id);
  return safe === id ? id : 'redacted-' + createHash('sha256').update(id).digest('hex').slice(0, 12);
}
function escapeRegex(value) { return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function parseJsonl(file) {
  const lines = read(file).split('\n').filter((line) => line.trim().length > 0);
  return lines.map((line) => {
    try { return JSON.parse(line); }
    catch { return fail('invalid-jsonl-row', file); }
  });
}
function requireKeys(obj, keys, file) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) fail('invalid-jsonl-row', file);
  for (const key of keys) {
    if (!Object.prototype.hasOwnProperty.call(obj, key)) fail(`missing-key-${key}`, file);
  }
}
function hasLineRef(value, allowNeedsLineVerification = false) {
  if (typeof value !== 'string') return false;
  if (allowNeedsLineVerification && /Needs line verification/i.test(value)) return true;
  if (/^[A-Za-z]:[\\/]/.test(value) || value.startsWith('/')) return false;
  return /^[^:\n]+:\d+-\d+$/.test(value.trim());
}
function markdownLineRefs(text, allowNeedsLineVerification = false) {
  const matches = [...text.matchAll(/\b(?:Source|Test|Config|Doc):\s+([^\n]+)/g)].map((match) => match[1].trim());
  return matches.filter((value) => hasLineRef(value, allowNeedsLineVerification));
}
function extractFrontmatter(text, file) {
  if (!text.startsWith('---\n')) fail('missing-frontmatter', file);
  const end = text.indexOf('\n---', 4);
  if (end < 0) fail('unclosed-frontmatter', file);
  return text.slice(0, end);
}
function extractPublicSections(text) {
  const sections = [];
  const headingRe = /^##\s+(.+?)\s+\{#([a-z0-9-]+)\}\s*$/gim;
  let match;
  while ((match = headingRe.exec(text)) !== null) {
    sections.push({ title: match[1].trim(), id: match[2].trim() });
  }
  return sections;
}
function validatePublicDoc(file) {
  const text = read(file);
  const fm = extractFrontmatter(text, file);
  for (const key of requiredFrontmatterKeys) {
    const matches = fm.match(new RegExp('^' + escapeRegex(key), 'gm'));
    if (!matches) fail(`missing-frontmatter-${key.replace(':', '')}`, file);
    if (matches.length !== 1) fail('duplicate-frontmatter-key', file);
  }
  // A public title is a scalar. Reject collection syntax and unclosed quotes.
  const title = fm.match(/^title:[ \t]*(.*)$/m)?.[1].trim();
  if (!title || /^[{[\]}#]/.test(title) ||
      (title.startsWith('"') && !/^"(?:\\.|[^"\\])*"(?:\s+#.*)?$/.test(title)) ||
      (title.startsWith("'") && !/^'(?:''|[^'])*'(?:\s+#.*)?$/.test(title))) fail('invalid-page-title', file);
  if (!/^public_safe:[ \t]*true[ \t]*$/m.test(fm)) fail('public-safe-not-true', file);

  const slugMatch = fm.match(/^slug:[ \t]*([a-z0-9-]+)[ \t]*$/m);
  if (!slugMatch || relative(file) !== 'public/' + slugMatch[1] + '.md') fail('invalid-public-slug', file);
  const owners = fm.match(/^source_batches:[ \t]*\n((?:[ \t]+- [\w.-]+[ \t]*(?:\n|$))+)/m);
  const ownerIds = owners ? owners[1].trim().split(/\n/).map((line) => line.trim().slice(2).trim()) : [];
  if (!ownerIds.length || ownerIds.some((id) => !validBatch(id))) fail('invalid-page-owners', file);
  const expected = pageOwners.get(slugMatch[1]);
  if (!expected || [...expected].some((id) => !ownerIds.includes(id)) ||
      (!batchOnly && ownerIds.some((id) => !expected.has(id)))) fail('page-owner-mismatch', file);
  const sections = extractPublicSections(text);
  const sectionIds = new Set(sections.map((section) => section.id));
  if (sections.length !== sectionIds.size) fail('duplicate-page-section', file);
  for (const id of requiredPublicSectionIds) {
    if (!sectionIds.has(id)) fail(`missing-public-section-${id}`, file);
  }
  pageSections.set(slugMatch[1], sectionIds);
  if (!/Assistant should know:/i.test(text)) fail('missing-assistant-should-know', file);
  if (!/Assistant should not claim:/i.test(text)) fail('missing-assistant-should-not-claim', file);

  // Section evidence lives in the page footer or in public-evidence/<page-slug>.evidence.md.
  const evidenceStart = text.search(/^##\s+Source Evidence\s+\{#source-evidence\}/im);
  if (evidenceStart < 0) fail('missing-source-evidence-section', file);
  let evidenceBlock = text.slice(evidenceStart);
  const sidecar = path.join(root, 'public-evidence', `${path.basename(file, '.md')}.evidence.md`);
  if (fs.existsSync(sidecar)) evidenceBlock += `\n${read(sidecar)}`;
  const evidence = new Map();
  for (const block of evidenceBlock.split(/(?=^Section:[ \t]+)/m)) {
    const id = block.match(/^Section:[ \t]+([a-z0-9-]+)[ \t]*(?:\n|$)/i)?.[1];
    if (!id) continue;
    if (evidence.has(id)) fail('duplicate-section-evidence', file);
    evidence.set(id, block);
  }
  for (const section of sections) {
    if (publicEvidenceExemptions.has(section.id)) continue;
    const block = evidence.get(section.id);
    if (!block) fail('missing-section-evidence', file);
    const unsupported = block.split('\n').filter((line) => /^Unsupported claims:/i.test(line));
    if (unsupported.length !== 1 || !/^Unsupported claims:[ \t]*none[ \t]*$/i.test(unsupported[0])) fail('section-has-unsupported-claims', file);
    if (markdownLineRefs(block, false).length === 0) fail('section-missing-line-evidence', file);
  }
}
function validateDeepDive(file) {
  const text = read(file);
  for (const heading of requiredDeepDiveSections) {
    if (!new RegExp(`^##\\s+${escapeRegex(heading)}\\s*$`, 'im').test(text)) fail(`missing-deep-dive-section-${slug(heading)}`, file);
  }
  if (markdownLineRefs(text, true).length === 0) fail('deep-dive-missing-line-evidence', file);
  if (!/(Test:\s+[^\n]+:\d+-\d+|No direct test found)/i.test(text)) fail('deep-dive-missing-test-status', file);
}
function parseMarkdownTableRowsAfterHeading(text, headingPattern) {
  const lines = text.split('\n');
  const start = lines.findIndex((line) => headingPattern.test(line));
  if (start < 0) return [];
  const rows = [];
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (/^##\s+/.test(line)) break;
    if (!line.trim().startsWith('|')) continue;
    const cells = line.split('|').slice(1, -1).map((cell) => cell.trim());
    if (cells.length === 0) continue;
    if (cells.every((cell) => /^:?-{3,}:?$/.test(cell))) continue;
    if (/^(Feature|Feature area)$/i.test(cells[0])) continue;
    rows.push(cells);
  }
  return rows;
}
function marker(text, key) {
  const regex = new RegExp('^\\s*' + key + '\\s*=', 'i');
  const lines = text.split('\n').filter((line) => regex.test(line));
  return lines.length === 1 && lines[0].startsWith(key + '=') ? lines[0].slice(key.length + 1) : null;
}
function requireMarker(file, key, expected, reason) {
  if (marker(read(file), key) !== expected) fail(reason, file);
}
function validateBatchArtifacts(batchId) {
  const sourceMapPath = path.join(root, 'source-map', `${batchId}.source-map.md`);
  const audit = (name) => path.join(root, 'audits', `${batchId}.${name}.md`);
  const requiredFiles = [
    sourceMapPath,
    path.join(root, 'gaps', `${batchId}.gaps.md`),
    audit('coverage-audit'),
    audit('public-safety-audit'),
    audit('negative-search-audit'),
    ...(preReview ? [] : [audit('reviewer-pass')]),
    ...(ingestEnabled ? ['chunks', 'cache-prompts'].map((kind) => path.join(root, 'ingest', `${batchId}.${kind}.jsonl`)) : []),
    ...(!batchOnly ? [path.join(root, 'validation', `${batchId}.validator-result.txt`)] : []),
  ];
  // Every missing artifact of the batch is its own failure; files that exist are still checked.
  const present = (file) => fs.existsSync(file);
  for (const file of requiredFiles) {
    if (!present(file)) unit(() => fail('missing-batch-artifact', file));
  }

  const privateDir = path.join(root, 'private-technical', batchId);
  const deepDives = walk(privateDir).filter((file) => file.endsWith('.md'));
  if (deepDives.length === 0) unit(() => fail('missing-private-deep-dive', privateDir));
  for (const file of deepDives) unit(() => validateDeepDive(file));

  const sourceMap = present(sourceMapPath) ? read(sourceMapPath) : '';
  if (present(sourceMapPath)) unit(() => {
    if (!parseMarkdownTableRowsAfterHeading(sourceMap, /^## Feature Map$/).length) fail('batch-empty-feature-map', sourceMapPath);
    if (!/^##\s+Command Log/im.test(sourceMap)) fail('batch-source-map-missing-command-log', sourceMapPath);
    if (!/^##\s+Feature Map/im.test(sourceMap)) fail('batch-source-map-missing-feature-map', sourceMapPath);
  });
  if (present(audit('public-safety-audit'))) unit(() => requireMarker(audit('public-safety-audit'), 'PUBLIC_SAFE', 'PASS', 'public-safety-not-pass'));
  if (present(audit('negative-search-audit'))) unit(() => {
    requireMarker(audit('negative-search-audit'), 'NEGATIVE_SEARCH', 'PASS', 'negative-search-not-pass');
    requireMarker(audit('negative-search-audit'), 'ANTI_SHALLOW', 'PASS', 'anti-shallow-not-pass');
  });
  if (!preReview && present(audit('reviewer-pass'))) unit(() => {
    requireMarker(audit('reviewer-pass'), 'OPEN_P0', '0', 'reviewer-open-p0-not-zero');
    requireMarker(audit('reviewer-pass'), 'OPEN_P1', '0', 'reviewer-open-p1-not-zero');
  });
  if (present(audit('coverage-audit')) && present(sourceMapPath)) unit(() => {
    const coveragePath = audit('coverage-audit');
    const coverage = read(coveragePath);
    for (const header of ['Feature', 'Source files covered', 'Private deep dive', 'Public doc page', 'Assistant can answer?', 'Missing details', 'Risk if omitted', 'Tests/evidence checked', 'Follow-up owner']) {
      if (!coverage.includes(header)) fail(`coverage-missing-${slug(header)}`, coveragePath);
    }
    const sourceFeatures = parseMarkdownTableRowsAfterHeading(sourceMap, /^##\s+Feature Map/i).map((row) => row[0]).filter(Boolean);
    const coverageRows = parseMarkdownTableRowsAfterHeading(coverage, /^#|^##/i).filter((row) => row.length >= 9);
    const coverageFeatures = new Set(coverageRows.map((row) => row[0]));
    for (const row of coverageRows) {
      if (row.slice(0, 9).some((cell) => cell.length === 0)) fail('coverage-row-has-empty-required-cell', coveragePath);
    }
    for (const feature of sourceFeatures) {
      if (!coverageFeatures.has(feature)) fail('coverage-missing-feature', coveragePath);
    }
  });
}

function runNegativeSearch() {
  if (!fs.existsSync(root)) {
    console.log('NEGATIVE_SEARCH_HITS error=artifact-root-missing');
    process.exit(1);
  }
  const isPublicOrIngest = isPublicOutput;
  // Audit and validation artifacts quote the gate terms themselves, so wording checks skip them.
  const skipWording = (rel) => rel.startsWith('audits/') || rel.startsWith('validation/') || rel === 'run-state.md';
  const hits = new Map();
  const add = (name, location) => {
    if (!hits.has(name)) hits.set(name, []);
    hits.get(name).push(location);
  };
  let filesScanned = 0;
  for (const file of scopedFiles) {
    const rel = relative(file);
    const safeRel = maskRel(rel);
    filesScanned += 1;
    if (isPublicOrIngest(rel)) {
      for (const term of denyTerms) if (rel.toLowerCase().includes(term.needle)) add(`blocking:denylist-${term.category}`, `${safeRel} (file name)`);
    }
    const lines = read(file).split('\n');
    lines.forEach((line, index) => {
      const location = `${safeRel}:${index + 1}`;
      for (const name of credentialKinds(line, rel)) add(`unsafe:${credentialLabel(name)}`, location);
      for (const pattern of unsafePatterns) if (pattern.re.test(line)) add(`unsafe:${pattern.name}`, location);
      if (isPublicOrIngest(rel)) {
        for (const pattern of blockingPublicPatterns) if (pattern.re.test(line)) add(`blocking:${pattern.name}`, location);
        if (denyTerms.length) {
          const lower = line.toLowerCase();
          for (const term of denyTerms) if (lower.includes(term.needle)) add(`blocking:denylist-${term.category}`, location);
        }
      }
      if (!skipWording(rel)) {
        for (const pattern of weakWordingPatterns) if (pattern.re.test(line)) add(`wording:${pattern.name}`, location);
      }
    });
  }
  const counts = { unsafe: 0, blocking: 0, wording: 0 };
  for (const [name, locations] of [...hits.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    counts[name.split(':')[0]] += locations.length;
    console.log(`${name} (${locations.length})`);
    for (const location of locations.slice(0, 60)) console.log(`  ${location}`);
    if (locations.length > 60) console.log(`  ... +${locations.length - 60} more`);
  }
  console.log(`NEGATIVE_SEARCH_HITS unsafe=${counts.unsafe} blocking=${counts.blocking} wording=${counts.wording} files=${filesScanned}${batchOnly ? ` batch=${batchLabel(batchOnly)}` : ''} denylist=${denylistStatus}`);
  process.exit(0);
}



function finish(passLine) {
  if (failures.length === 0) {
    console.log(passLine);
    process.exit(0);
  }
  for (const failure of failures.slice(0, MAX_REPORTED)) {
    console.log(`AUTO_DOC_ARTIFACTS=FAIL reason=${failure.reason}${failure.file ? ` file=${failure.file}` : ''}`);
  }
  if (failures.length > MAX_REPORTED) console.log(`... +${failures.length - MAX_REPORTED} more failures not shown`);
  console.log(`AUTO_DOC_ARTIFACTS=FAIL failures=${failures.length}`);
  process.exit(1);
}

if (!fs.existsSync(root)) {
  unit(() => fail('artifact-root-missing'));
  finish('');
}

let docs = 0;
let chunks = 0;
let prompts = 0;
const chunkKeys = new Set();
const pageSections = new Map();
const pageOwners = new Map();
const mapDir = path.join(root, 'source-map');
const batchIds = batchOnly ? [batchOnly] : walk(mapDir)
  .filter((file) => file.endsWith('.source-map.md')).map((file) => path.basename(file, '.source-map.md'));
const filesByBatch = new Map();
const countsByBatch = new Map();
for (const id of batchIds) {
  if (!validBatch(id)) { unit(() => fail('invalid-batch-id')); continue; }
  const mapFile = path.join(mapDir, id + '.source-map.md');
  const files = new Set([mapFile, path.join(root, 'gaps', id + '.gaps.md')]);
  filesByBatch.set(id, files);
  countsByBatch.set(id, { docs: 0, chunks: 0, prompts: 0 });
  for (const name of ['coverage-audit', 'public-safety-audit', 'negative-search-audit', 'reviewer-pass']) {
    files.add(path.join(root, 'audits', id + '.' + name + '.md'));
  }
  for (const name of ['chunks', 'cache-prompts']) files.add(path.join(root, 'ingest', id + '.' + name + '.jsonl'));
  for (const file of walk(path.join(root, 'private-technical', id))) files.add(file);
  unit(() => {
    const list = marker(read(mapFile), 'PUBLIC_PAGES');
    if (list === null || !/^(?:[a-z0-9-]+(?: [a-z0-9-]+)*)?$/.test(list)) fail('missing-or-invalid-page-inventory', mapFile);
    for (const slug of list.split(' ').filter(Boolean)) {
      if (!pageOwners.has(slug)) pageOwners.set(slug, new Set());
      pageOwners.get(slug).add(id);
      const page = path.join(root, 'public', slug + '.md');
      if (!fs.existsSync(page)) fail('missing-inventoried-page', mapFile);
      files.add(page);
      files.add(path.join(root, 'public-evidence', slug + '.evidence.md'));
    }
  });
}
const scopedFiles = batchOnly ? [...filesByBatch.get(batchOnly)].filter((file) => fs.lstatSync(file, { throwIfNoEntry: false })) : walk(root);
if (negativeSearch) {
  if (failures.length) finish('');
  runNegativeSearch();
}
const wholeMapPath = path.join(mapDir, 'README.md');
const wholeMap = fs.existsSync(wholeMapPath) ? read(wholeMapPath) : '';
const profile = wholeMap.match(/^## Project Profile\s*\n([\s\S]*?)(?=^## |(?![\s\S]))/m)?.[1] || '';
const ingestEnabled = unit(() => {
  const fields = [...profile.matchAll(/^ingest_enabled:[ \t]*(.*)$/gm)];
  if (fields.length !== 1 || !['true', 'false'].includes(fields[0][1])) fail('invalid-ingest-profile', wholeMapPath);
  return fields[0][1] === 'true';
});

for (const file of scopedFiles) {
  unit(() => {
    const rel = relative(file);
    const text = read(file);
    for (const line of text.split('\n')) {
      for (const name of credentialKinds(line, rel)) fail(`unsafe-${credentialLabel(name)}`, file);
    }
    for (const pattern of unsafePatterns) if (pattern.re.test(text)) fail(`unsafe-${pattern.name}`, file);
    if (isPublicOutput(rel)) {
      for (const pattern of blockingPublicPatterns) if (pattern.re.test(text)) fail(`public-blocking-${pattern.name}`, file);
      const lower = text.toLowerCase();
      for (const term of denyTerms) if (lower.includes(term.needle)) fail(`public-denylist-${term.category}`, file);
      for (const term of denyTerms) if (rel.toLowerCase().includes(term.needle)) fail(`public-denylist-${term.category}-in-file-name`, file);
    }
  });
}

unit(() => {
  if (!fs.existsSync(path.join(root, 'README.md'))) fail('missing-root-readme', path.join(root, 'README.md'));
});

function validateRunReportSections(report, file) {
  if (!/^# Auto Doc Run Report[ \t]*$/m.test(report)) fail('missing-run-report-title', file);
  const parts = report.split(/^##[ \t]+(.+?)[ \t]*$/m);
  const sections = new Map();
  for (let i = 1; i < parts.length; i += 2) {
    if (sections.has(parts[i])) fail('duplicate-run-report-section', file);
    sections.set(parts[i], parts[i + 1].trim());
  }
  const required = ['Scope', 'Artifact Root', 'Batches Completed', 'Private Technical Docs', 'Public Behavior Docs',
    'Ingest Outputs', 'Validation', 'Reviewer Findings', 'Assistant Readiness', 'Remaining Gaps'];
  if (required.some((name) => !sections.get(name))) fail('missing-or-empty-run-report-section', file);
  if (sections.has('Comparison To Existing Docs') && !/\b(?:scope-match|scope-mismatch|not-compared)\b/.test(sections.get('Comparison To Existing Docs'))) {
    fail('missing-comparison-scope', file);
  }

  const rows = parseMarkdownTableRowsAfterHeading(report, /^## Batches Completed[ \t]*$/);
  const audited = new Set();
  for (const [id, audit, findings] of rows) {
    if (id === 'Batch') continue;
    if (!batchIds.includes(id) || audited.has(id) || audit !== 'audits/' + id + '.coverage-audit.md' || !findings) {
      fail('invalid-cross-batch-audit-entry', file);
    }
    audited.add(id);
  }
  if (batchIds.some((id) => !audited.has(id))) fail('missing-cross-batch-audit-entry', file);
}

const runReportPath = path.join(root, 'run-report.md');
const declaredTotal = batchOnly ? undefined : unit(() => {
  if (!fs.existsSync(runReportPath)) fail('missing-run-report', runReportPath);
  const runReport = read(runReportPath);
  if (marker(runReport, 'CORPUS_MODE') !== 'PASS') fail('missing-corpus-mode-pass', runReportPath);
  if (marker(runReport, 'CORPUS_SCOPE') !== 'FULL_PROJECT') fail('missing-corpus-scope-full-project', runReportPath);
  const totalMatch = marker(runReport, 'BATCHES_TOTAL')?.match(/^(\d+)$/);
  const completeMatch = marker(runReport, 'BATCHES_COMPLETE')?.match(/^(\d+)$/);
  if (!totalMatch) fail('missing-batches-total', runReportPath);
  if (!completeMatch) fail('missing-batches-complete', runReportPath);
  const total = Number(totalMatch[1]);
  if (!Number.isInteger(total) || total < 1) fail('invalid-batches-total', runReportPath);
  if (Number(completeMatch[1]) !== total) fail('batches-complete-does-not-match-total', runReportPath);
  if (/PARTIAL_ONLY|INCOMPLETE_ONLY/i.test(runReport)) fail('partial-run-not-corpus-complete', runReportPath);
  if (!/^(?:[0-9a-f]{7,64}|unknown)$/.test(marker(runReport, 'SOURCE_COMMIT') ?? '')) fail('missing-source-commit', runReportPath);
  validateRunReportSections(runReport, runReportPath);
  return total;
});

unit(() => {
  if (!fs.existsSync(path.join(root, 'source-map', 'README.md'))) fail('missing-whole-project-source-map', path.join(root, 'source-map', 'README.md'));
});

if (!batchOnly) unit(() => {
  if (!batchIds.length) fail('missing-batch-source-map', mapDir);
  if (new Set(batchIds).size !== batchIds.length) fail('duplicate-batch-map', mapDir);
  if (declaredTotal !== undefined && batchIds.length !== declaredTotal) fail('batch-map-count-does-not-match-run-report', mapDir);
  for (const heading of ['Project Profile', 'Top-Level Areas', 'Batch Assignments', 'Existing Docs', 'Discovery Commands', 'Gaps']) {
    if (!wholeMap.split('\n').includes('## ' + heading)) fail('incomplete-whole-project-source-map', wholeMapPath);
  }
  const rows = parseMarkdownTableRowsAfterHeading(wholeMap, /^## Top-Level Areas$/).filter((row) => row[0] !== 'Area');
  if (!rows.length) fail('empty-whole-project-area-map', wholeMapPath);
  const assigned = new Set();
  const mappedAreas = new Set();
  for (const [area, , , , , batch, notes] of rows) {
    if (!area || (!batchIds.includes(batch) && !(batch === 'out-of-scope' && notes?.trim()))) fail('unassigned-source-area', wholeMapPath);
    assigned.add(batch);
    const digest = area.match(/^sha256:([0-9a-f]{64})$/)?.[1] ?? createHash('sha256').update(area).digest('hex');
    mappedAreas.add(digest);
  }
  if (batchIds.some((id) => !assigned.has(id))) fail('batch-missing-area-assignment', wholeMapPath);
  const stateFile = path.join(root, 'run-state.md');
  if (!fs.existsSync(stateFile)) fail('missing-run-state', stateFile);
  const state = read(stateFile);
  const settings = [...state.matchAll(/^ingest_enabled:[ \t]*(.*)$/gm)];
  if (settings.length !== 1 || settings[0][1] !== String(ingestEnabled)) fail('inconsistent-ingest-profile', stateFile);
  const areas = marker(state, 'SOURCE_AREAS')?.split(' ');
  if (!areas?.length || areas.some((area) => !mappedAreas.has(area))) fail('unmapped-discovered-area', wholeMapPath);
  if (!/^[0-9a-f]{64}$/.test(marker(state, 'SOURCE_ID') ?? '') ||
      !['clean', 'dirty', 'unknown'].includes(marker(state, 'SOURCE_STATE')) ||
      marker(state, 'SOURCE_COMMIT') !== marker(fs.existsSync(runReportPath) ? read(runReportPath) : '', 'SOURCE_COMMIT')) {
    fail('source-baseline-mismatch', stateFile);
  }
});
for (const batchId of batchIds.filter(validBatch)) validateBatchArtifacts(batchId);

const publicDir = path.join(root, 'public');
if (!fs.existsSync(publicDir) && (!batchOnly || pageOwners.size)) {
  unit(() => fail('missing-public-dir', publicDir));
} else {
  for (const file of scopedFiles.filter((candidate) => relative(candidate).startsWith('public/') && candidate.endsWith('.md'))) {
    unit(() => {
      validatePublicDoc(file);
      for (const id of pageOwners.get(path.basename(file, '.md'))) countsByBatch.get(id).docs++;
    });
    docs += 1;
  }
  if (docs === 0 && (!batchOnly || pageOwners.size)) unit(() => fail('missing-public-docs', publicDir));
}

const ingestDir = path.join(root, 'ingest');
if (ingestEnabled && !fs.existsSync(ingestDir)) {
  unit(() => fail('missing-ingest-dir', ingestDir));
} else {
  const ingestFiles = [];
  const rowIds = { chunks: new Set(), prompts: new Set() };
  function claimRowId(ids, value, file) {
    if (typeof value !== 'string' || !value.trim() || value !== value.trim() || ids.has(value)) fail('invalid-ingest-row-id', file);
    ids.add(value);
  }
  for (const file of scopedFiles.filter((candidate) => relative(candidate).startsWith('ingest/'))) {
    const match = /^ingest\/([^/]+)\.(chunks|cache-prompts)\.jsonl$/.exec(relative(file));
    if (!match || !countsByBatch.has(match[1])) unit(() => fail('unregistered-ingest-file', file));
    else ingestFiles.push(file);
  }
  function rows(file, suffix) {
    const id = path.basename(file, suffix);
    const data = parseJsonl(file);
    if (!ingestEnabled && data.length) fail('ingest-disabled-with-rows', file);
    if (ingestEnabled && !data.length && [...pageOwners.values()].some((owners) => owners.has(id))) fail('empty-enabled-ingest', file);
    return data;
  }
  for (const file of ingestFiles.filter((candidate) => candidate.endsWith('.chunks.jsonl'))) {
    unit(() => {
      for (const obj of rows(file, '.chunks.jsonl')) {
        requireKeys(obj, requiredChunkKeys, file);
        claimRowId(rowIds.chunks, obj.chunk_id, file);
        if (typeof obj.text !== 'string' || !obj.text.trim()) fail('chunk-empty-text', file);
        if (obj.verified !== true) fail('chunk-not-verified', file);
        if (obj.answerable !== true) fail('chunk-not-answerable', file);
        if (!Array.isArray(obj.needs_verification)) fail('chunk-needs-verification-not-array', file);
        if (obj.needs_verification.length > 0) fail('chunk-needs-verification', file);
        if (!Array.isArray(obj.source_files) || obj.source_files.length === 0) fail('chunk-missing-source-files', file);
        if (!Array.isArray(obj.do_not_claim)) fail('chunk-do-not-claim-not-array', file);
        for (const ref of obj.source_files) if (!hasLineRef(ref, false)) fail('chunk-source-file-missing-line-range', file);
        const id = path.basename(file, '.chunks.jsonl');
        if (!pageSections.get(obj.doc_slug)?.has(obj.section_id) || !pageOwners.get(obj.doc_slug)?.has(id)) fail('chunk-references-missing-page-section', file);
        if (obj.chunk_id !== obj.doc_slug + '#' + obj.section_id) fail('chunk-id-mismatch', file);
        chunkKeys.add(id + '/' + obj.chunk_id);
        countsByBatch.get(id).chunks++;
        chunks += 1;
      }
    });
  }
  for (const file of ingestFiles.filter((candidate) => candidate.endsWith('.cache-prompts.jsonl'))) {
    unit(() => {
      for (const obj of rows(file, '.cache-prompts.jsonl')) {
        requireKeys(obj, requiredPromptKeys, file);
        claimRowId(rowIds.prompts, obj.prompt_id, file);
        if (typeof obj.intent !== 'string' || !obj.intent.trim()) fail('prompt-missing-intent', file);
        if (typeof obj.question !== 'string' || !obj.question.trim()) fail('prompt-empty-question', file);
        if (!Array.isArray(obj.source_files) || obj.source_files.length === 0) fail('prompt-missing-source-files', file);
        if (!Array.isArray(obj.must_mention)) fail('prompt-must-mention-not-array', file);
        if (!Array.isArray(obj.must_not_claim)) fail('prompt-must-not-claim-not-array', file);
        for (const ref of obj.source_files) if (!hasLineRef(ref, false)) fail('prompt-source-file-missing-line-range', file);
        if (!chunkKeys.has(path.basename(file, '.cache-prompts.jsonl') + '/' + `${obj.expected_doc_slug}#${obj.expected_section_id}`)) fail('prompt-references-missing-chunk', file);
        countsByBatch.get(path.basename(file, '.cache-prompts.jsonl')).prompts++;
        prompts += 1;
      }
    });
  }
}

function batchReceipt(id, stage) {
  const inputs = [...filesByBatch.get(id)].map((file) => [relative(file), inputDigests.get(file) ?? null]);
  inputs.sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0);
  const digest = createHash('sha256').update(JSON.stringify(['v1', id, stage, policyDigest, profile, inputs])).digest('hex');
  const count = countsByBatch.get(id);
  return `AUTO_DOC_ARTIFACTS=PASS scope=batch:${batchLabel(id)} stage=${stage} docs=${count.docs} chunks=${count.chunks} cache_prompts=${count.prompts} denylist=${denylistStatus} digest=${digest}`;
}
if (batchOnly) finish(batchReceipt(batchOnly, preReview ? 'pre-review' : 'post-review'));
for (const id of filesByBatch.keys()) {
  const file = path.join(root, 'validation', id + '.validator-result.txt');
  if (fs.existsSync(file)) unit(() => {
    if (read(file).trimEnd() !== batchReceipt(id, 'post-review')) fail('invalid-saved-batch-result', file);
  });
}
finish(`AUTO_DOC_ARTIFACTS=PASS batches=${batchIds.length} docs=${docs} chunks=${chunks} cache_prompts=${prompts} denylist=${denylistStatus}`);
