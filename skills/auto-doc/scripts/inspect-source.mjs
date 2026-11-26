#!/usr/bin/env node
// Read-only preflight. Record its SOURCE_* lines in the external run state.
import { artifactLocation } from './artifact-location.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createGitRunner } from './git-run.mjs';

function stop(reason) {
  console.error(`SOURCE_CHECK=BLOCKED reason=${reason}`);
  process.exit(1);
}
function existingParent(target) {
  for (let current = target; ; current = path.dirname(current)) {
    if (fs.lstatSync(current, { throwIfNoEntry: false })) return current;
    if (path.dirname(current) === current) stop('unresolvable-path');
  }
}
function canonical(target) {
  const parent = existingParent(target);
  return path.join(fs.realpathSync.native(parent), path.relative(parent, target));
}
const hash = (value) => createHash('sha256').update(value).digest('hex');
function inspect() {
  const args = process.argv.slice(2);
  if (args.length !== 2 || args.some((arg) => !arg || arg.startsWith('-'))) {
    console.error('SOURCE_CHECK=USAGE reason=expected-repository-and-corpus');
    process.exit(2);
  }
  const repo = fs.realpathSync.native(args[0]);
  const requested = path.resolve(args[1]);
  const corpus = canonical(requested);
  if (path.relative(requested, corpus)) stop('linked-artifact-root');
  if (!fs.statSync(repo).isDirectory()) stop('source-not-directory');
  if (fs.existsSync(corpus) && !fs.statSync(corpus).isDirectory()) stop('artifact-root-not-directory');
  for (const destination of [requested, corpus]) {
    const rel = path.relative(repo, destination);
    if (!rel || !(rel.startsWith('..' + path.sep) || rel === '..' || path.isAbsolute(rel))) stop('corpus-inside-project');
  }

  const runGit = createGitRunner(repo, corpus);
  function git(args) {
    const result = runGit(['--no-optional-locks', '-C', repo, ...args], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    if (result.error) stop('git-unavailable');
    return result.status === 0 ? result.stdout : null;
  }
  const reason = artifactLocation(corpus, repo, runGit)(corpus);
  if (reason === 'enclosing-repository') stop('corpus-inside-repository; use <os-temp>/.auto-master/artifacts/');
  if (reason === 'home-artifacts-must-be-ignored') stop(reason + '; add an ignore rule or use <os-temp>/.auto-master/artifacts/');
  if (reason === 'home-artifacts-already-tracked') stop(reason + '; use <os-temp>/.auto-master/artifacts/');
  if (reason) stop(reason);
  const top = git(['rev-parse', '--show-toplevel']);
  if (top && path.relative(repo, canonical(top.trim()))) stop('expected-project-root');
  if (!top && fs.existsSync(path.join(repo, '.git'))) stop('git-discovery-failed');
  const common = top && git(['rev-parse', '--path-format=absolute', '--git-common-dir']);
  if (top && !common) stop('git-discovery-failed');
  const identity = hash(JSON.stringify([repo, common && canonical(common.trim())]));
  const commit = top && git(['rev-parse', '--verify', 'HEAD']);
  const status = top && git(['status', '--porcelain=v1', '--untracked-files=all', '--ignore-submodules=none']);
  const listing = top && git(['ls-files', '--cached', '--others', '--exclude-standard', '-v', '-z']);
  if (top && listing === null) stop('source-inventory-incomplete');
  const entries = (listing ?? '').split('\0').filter(Boolean);
  // Lower-case tracked tags are assume-unchanged; S denotes skip-worktree.
  // git status can be empty even after one of these working files was edited.
  const opaque = entries.some((entry) => /^[a-zS] /.test(entry));
  const state = !commit || status === null || opaque ? 'unknown' : status ? 'dirty' : 'clean';
  const names = top ? entries.map((entry) => entry.slice(2).split('/')[0]) : fs.readdirSync(repo);
  const areas = [...new Set(names.map(hash))].sort();

  let refresh = 'full';
  if (fs.existsSync(corpus) && fs.readdirSync(corpus).length) {
    const stateFile = path.join(corpus, 'run-state.md');
    if (!fs.existsSync(stateFile)) stop('unidentified-existing-corpus');
    if (path.relative(stateFile, fs.realpathSync.native(stateFile))) stop('linked-run-state');
    const saved = fs.readFileSync(stateFile, 'utf8').split(/\r?\n/);
    const field = (key) => {
      const matches = saved.filter((line) => line.startsWith(key + '='));
      return matches.length === 1 ? matches[0].slice(key.length + 1) : '';
    };
    if (field('SOURCE_ID') !== identity) stop('corpus-identity-mismatch');
    const base = field('SOURCE_COMMIT');
    if (state === 'clean' && field('SOURCE_STATE') === 'clean' && /^[0-9a-f]{40,64}$/.test(base) &&
        git(['cat-file', '-e', base + '^{commit}']) !== null) refresh = 'eligible';
  }
  console.log(`SOURCE_ID=${identity}\nSOURCE_COMMIT=${commit?.trim() || 'unknown'}\nSOURCE_STATE=${state}\nSOURCE_AREAS=${areas.join(' ')}\nREFRESH=${refresh}`);
}
try { inspect(); } catch { stop('source-inspection-failed'); }
