#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.argv[2] || 'docs/auto-doc');
const unsafePatterns = [
  { name: 'bearer-token', re: /Bearer\s+[A-Za-z0-9._\-+/=]{12,}/i },
  { name: 'openai-like-key', re: /\bsk-[A-Za-z0-9]{16,}\b/ },
  { name: 'private-key', re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  { name: 'private-ipv4', re: /\b(?:10\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])|192\.168)\.\d{1,3}\.\d{1,3}\b/ },
  { name: 'windows-home-path', re: /\b[A-Za-z]:[\\/](?:Users|Documents and Settings)[\\/][^\s)('"`]+/i },
  { name: 'unix-home-path', re: /(?:^|[\s('"`])\/(?:Users|home)\/[^\s)('"`]+/i },
];
const blockingPublicPatterns = [
  { name: 'todo', re: /\bTODO\b/i },
  { name: 'tbd', re: /\bTBD\b/i },
  { name: 'needs-verification', re: /Needs verification/i },
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

function fail(reason, file) {
  const safeFile = file ? path.relative(root, file).replace(/\\/g, '/') : '';
  console.log(`AUTO_DOC_ARTIFACTS=FAIL reason=${reason}${safeFile ? ` file=${safeFile}` : ''}`);
  process.exit(1);
}
function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    if (entry.isFile()) files.push(full);
  }
  return files;
}
function read(file) { return fs.readFileSync(file, 'utf8'); }
function escapeRegex(value) { return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function parseJsonl(file) {
  const lines = read(file).split(/\r?\n/).filter((line) => line.trim().length > 0);
  return lines.map((line, index) => {
    try { return JSON.parse(line); }
    catch { fail(`invalid-jsonl-line-${index + 1}`, file); }
  });
}
function requireKeys(obj, keys, file) {
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
    if (!fm.includes(key)) fail(`missing-frontmatter-${key.replace(':', '')}`, file);
  }
  if (!/public_safe:\s*true/i.test(fm)) fail('public-safe-not-true', file);

  const sections = extractPublicSections(text);
  const sectionIds = new Set(sections.map((section) => section.id));
  for (const id of requiredPublicSectionIds) {
    if (!sectionIds.has(id)) fail(`missing-public-section-${id}`, file);
  }
  if (!/Assistant should know:/i.test(text)) fail('missing-assistant-should-know', file);
  if (!/Assistant should not claim:/i.test(text)) fail('missing-assistant-should-not-claim', file);

  const evidenceStart = text.search(/^##\s+Source Evidence\s+\{#source-evidence\}/im);
  if (evidenceStart < 0) fail('missing-source-evidence-section', file);
  const evidenceBlock = text.slice(evidenceStart);
  for (const section of sections) {
    if (publicEvidenceExemptions.has(section.id)) continue;
    const sectionRe = new RegExp(`Section:\\s+${escapeRegex(section.id)}[\\s\\S]*?(?=\\nSection:\\s+|$)`, 'i');
    const sectionMatch = evidenceBlock.match(sectionRe);
    if (!sectionMatch) fail(`missing-section-evidence-${section.id}`, file);
    if (!/Unsupported claims:\s*none/i.test(sectionMatch[0])) fail(`section-has-unsupported-claims-${section.id}`, file);
    if (markdownLineRefs(sectionMatch[0], false).length === 0) fail(`section-missing-line-evidence-${section.id}`, file);
  }
}
function validateDeepDive(file) {
  const text = read(file);
  for (const heading of requiredDeepDiveSections) {
    if (!new RegExp(`^##\\s+${escapeRegex(heading)}\\s*$`, 'im').test(text)) fail(`missing-deep-dive-section-${heading.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`, file);
  }
  if (markdownLineRefs(text, true).length === 0) fail('deep-dive-missing-line-evidence', file);
  if (!/(Test:\s+[^\n]+:\d+-\d+|No direct test found)/i.test(text)) fail('deep-dive-missing-test-status', file);
}
function parseMarkdownTableRowsAfterHeading(text, headingPattern) {
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((line) => headingPattern.test(line));
  if (start < 0) return [];
  const rows = [];
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (/^##\s+/.test(line) && rows.length > 0) break;
    if (!line.trim().startsWith('|')) continue;
    const cells = line.split('|').slice(1, -1).map((cell) => cell.trim());
    if (cells.length === 0) continue;
    if (cells.every((cell) => /^:?-{3,}:?$/.test(cell))) continue;
    if (/^(Feature|Feature area)$/i.test(cells[0])) continue;
    rows.push(cells);
  }
  return rows;
}
function validateBatchArtifacts(batchId) {
  const requiredFiles = [
    path.join(root, 'source-map', `${batchId}.source-map.md`),
    path.join(root, 'gaps', `${batchId}.gaps.md`),
    path.join(root, 'audits', `${batchId}.coverage-audit.md`),
    path.join(root, 'audits', `${batchId}.public-safety-audit.md`),
    path.join(root, 'audits', `${batchId}.negative-search-audit.md`),
    path.join(root, 'audits', `${batchId}.reviewer-pass.md`),
    path.join(root, 'ingest', `${batchId}.chunks.jsonl`),
    path.join(root, 'ingest', `${batchId}.cache-prompts.jsonl`),
  ];
  for (const file of requiredFiles) if (!fs.existsSync(file)) fail(`missing-batch-artifact-${batchId}`, file);

  const sourceMap = read(path.join(root, 'source-map', `${batchId}.source-map.md`));
  if (!/^##\s+Command Log/im.test(sourceMap)) fail('batch-source-map-missing-command-log', path.join(root, 'source-map', `${batchId}.source-map.md`));
  if (!/^##\s+Feature Map/im.test(sourceMap)) fail('batch-source-map-missing-feature-map', path.join(root, 'source-map', `${batchId}.source-map.md`));

  const privateDir = path.join(root, 'private-technical', batchId);
  const deepDives = walk(privateDir).filter((file) => file.endsWith('.md'));
  if (deepDives.length === 0) fail(`missing-private-deep-dive-${batchId}`, privateDir);
  for (const file of deepDives) validateDeepDive(file);

  const publicSafety = read(path.join(root, 'audits', `${batchId}.public-safety-audit.md`));
  if (!/PUBLIC_SAFE=PASS/i.test(publicSafety)) fail('public-safety-not-pass', path.join(root, 'audits', `${batchId}.public-safety-audit.md`));

  const negative = read(path.join(root, 'audits', `${batchId}.negative-search-audit.md`));
  if (!/NEGATIVE_SEARCH=PASS/i.test(negative)) fail('negative-search-not-pass', path.join(root, 'audits', `${batchId}.negative-search-audit.md`));
  if (!/ANTI_SHALLOW=PASS/i.test(negative)) fail('anti-shallow-not-pass', path.join(root, 'audits', `${batchId}.negative-search-audit.md`));

  const reviewer = read(path.join(root, 'audits', `${batchId}.reviewer-pass.md`));
  if (!/OPEN_P0=0/i.test(reviewer)) fail('reviewer-open-p0-not-zero', path.join(root, 'audits', `${batchId}.reviewer-pass.md`));
  if (!/OPEN_P1=0/i.test(reviewer)) fail('reviewer-open-p1-not-zero', path.join(root, 'audits', `${batchId}.reviewer-pass.md`));

  const coverage = read(path.join(root, 'audits', `${batchId}.coverage-audit.md`));
  for (const header of ['Feature', 'Source files covered', 'Private deep dive', 'Public doc page', 'Assistant can answer?', 'Missing details', 'Risk if omitted', 'Tests/evidence checked', 'Follow-up owner']) {
    if (!coverage.includes(header)) fail(`coverage-missing-${header.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`, path.join(root, 'audits', `${batchId}.coverage-audit.md`));
  }
  const sourceFeatures = parseMarkdownTableRowsAfterHeading(sourceMap, /^##\s+Feature Map/i).map((row) => row[0]).filter(Boolean);
  const coverageRows = parseMarkdownTableRowsAfterHeading(coverage, /^#|^##/i).filter((row) => row.length >= 9);
  const coverageFeatures = new Set(coverageRows.map((row) => row[0]));
  for (const row of coverageRows) {
    if (row.slice(0, 9).some((cell) => cell.length === 0)) fail('coverage-row-has-empty-required-cell', path.join(root, 'audits', `${batchId}.coverage-audit.md`));
  }
  for (const feature of sourceFeatures) {
    if (!coverageFeatures.has(feature)) fail(`coverage-missing-feature-${feature.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`, path.join(root, 'audits', `${batchId}.coverage-audit.md`));
  }
}

if (!fs.existsSync(root)) fail('artifact-root-missing');
const files = walk(root);
let docs = 0;
let chunks = 0;
let prompts = 0;
const chunkKeys = new Set();

for (const file of files) {
  const rel = path.relative(root, file).replace(/\\/g, '/');
  const text = read(file);
  for (const pattern of unsafePatterns) if (pattern.re.test(text)) fail(`unsafe-${pattern.name}`, file);
  if (rel.startsWith('public/') || rel.startsWith('ingest/')) {
    for (const pattern of blockingPublicPatterns) if (pattern.re.test(text)) fail(`public-blocking-${pattern.name}`, file);
  }
}

if (!fs.existsSync(path.join(root, 'README.md'))) fail('missing-root-readme', path.join(root, 'README.md'));
const runReportPath = path.join(root, 'run-report.md');
if (!fs.existsSync(runReportPath)) fail('missing-run-report', runReportPath);
const runReport = read(runReportPath);
if (!/CORPUS_MODE=PASS/i.test(runReport)) fail('missing-corpus-mode-pass', runReportPath);
if (!/CORPUS_SCOPE=FULL_PROJECT/i.test(runReport)) fail('missing-corpus-scope-full-project', runReportPath);
const totalMatch = runReport.match(/BATCHES_TOTAL=(\d+)/i);
const completeMatch = runReport.match(/BATCHES_COMPLETE=(\d+)/i);
if (!totalMatch) fail('missing-batches-total', runReportPath);
if (!completeMatch) fail('missing-batches-complete', runReportPath);
const declaredTotal = Number(totalMatch[1]);
const declaredComplete = Number(completeMatch[1]);
if (!Number.isInteger(declaredTotal) || declaredTotal < 1) fail('invalid-batches-total', runReportPath);
if (declaredComplete !== declaredTotal) fail('batches-complete-does-not-match-total', runReportPath);
if (/PARTIAL_ONLY|INCOMPLETE_ONLY/i.test(runReport)) fail('partial-run-not-corpus-complete', runReportPath);
if (!fs.existsSync(path.join(root, 'source-map', 'README.md'))) fail('missing-whole-project-source-map', path.join(root, 'source-map', 'README.md'));

const batchMapFiles = walk(path.join(root, 'source-map')).filter((file) => file.endsWith('.source-map.md'));
if (batchMapFiles.length === 0) fail('missing-batch-source-map', path.join(root, 'source-map'));
const batchIds = batchMapFiles.map((file) => path.basename(file, '.source-map.md'));
if (batchIds.length !== declaredTotal) fail('batch-map-count-does-not-match-run-report', path.join(root, 'source-map'));
for (const batchId of batchIds) validateBatchArtifacts(batchId);

const publicDir = path.join(root, 'public');
if (!fs.existsSync(publicDir)) fail('missing-public-dir', publicDir);
for (const file of walk(publicDir).filter((candidate) => candidate.endsWith('.md'))) {
  validatePublicDoc(file);
  docs += 1;
}
if (docs === 0) fail('missing-public-docs', publicDir);

const ingestDir = path.join(root, 'ingest');
if (!fs.existsSync(ingestDir)) fail('missing-ingest-dir', ingestDir);
for (const file of walk(ingestDir)) {
  if (file.endsWith('.chunks.jsonl')) {
    for (const obj of parseJsonl(file)) {
      requireKeys(obj, requiredChunkKeys, file);
      if (obj.verified !== true) fail('chunk-not-verified', file);
      if (obj.answerable !== true) fail('chunk-not-answerable', file);
      if (!Array.isArray(obj.needs_verification)) fail('chunk-needs-verification-not-array', file);
      if (obj.needs_verification.length > 0) fail('chunk-needs-verification', file);
      if (!Array.isArray(obj.source_files) || obj.source_files.length === 0) fail('chunk-missing-source-files', file);
      if (!Array.isArray(obj.do_not_claim)) fail('chunk-do-not-claim-not-array', file);
      for (const ref of obj.source_files) if (!hasLineRef(ref, false)) fail('chunk-source-file-missing-line-range', file);
      chunkKeys.add(`${obj.doc_slug}#${obj.section_id}`);
      chunks += 1;
    }
  }
}
for (const file of walk(ingestDir)) {
  if (file.endsWith('.cache-prompts.jsonl')) {
    for (const obj of parseJsonl(file)) {
      requireKeys(obj, requiredPromptKeys, file);
      if (!Array.isArray(obj.source_files) || obj.source_files.length === 0) fail('prompt-missing-source-files', file);
      if (!Array.isArray(obj.must_mention)) fail('prompt-must-mention-not-array', file);
      if (!Array.isArray(obj.must_not_claim)) fail('prompt-must-not-claim-not-array', file);
      for (const ref of obj.source_files) if (!hasLineRef(ref, false)) fail('prompt-source-file-missing-line-range', file);
      if (!chunkKeys.has(`${obj.expected_doc_slug}#${obj.expected_section_id}`)) fail('prompt-references-missing-chunk', file);
      prompts += 1;
    }
  }
}

console.log(`AUTO_DOC_ARTIFACTS=PASS batches=${batchIds.length} docs=${docs} chunks=${chunks} cache_prompts=${prompts}`);
