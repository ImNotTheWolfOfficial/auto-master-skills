#!/usr/bin/env node
// End-to-end tests for every script in this repository. Builds throwaway
// fixtures in the OS temp directory; needs only node and git.
//
//   node scripts/test-scripts.mjs
//
// Fake secrets and addresses are assembled at run time so that this file never
// contains a credential-shaped string.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import fixtureIO from "./fixture-stdio.cjs";
import { gitEnvironment, resolveGit } from "../shared/git-run.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const scanner = path.join(repoRoot, "skills", "master-sanitize", "scripts", "scan-public-readiness.mjs");
const manifestTool = path.join(repoRoot, "skills", "master-docs", "scripts", "manifest-diff.mjs");
const publicCheck = path.join(repoRoot, "skills", "master-docs", "scripts", "check-public-docs.mjs");
const docValidator = path.join(repoRoot, "skills", "auto-doc", "scripts", "validate-auto-doc-artifacts.mjs");
if (process.argv.length !== 2) {
  console.error("Usage: test-scripts.mjs");
  process.exit(2);
}
process.on("uncaughtException", () => {
  console.error("Test fixture setup or execution failed.");
  process.exit(2);
});
let tmp;
try {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "auto-master-tests-"));
} catch {
  console.error("Cannot create test fixture directory.");
  process.exit(2);
}
const stdioModule = path.join(repoRoot, "scripts", "fixture-stdio.cjs");
const needsFixtureIO = process.platform === "win32" && spawnSync(process.execPath, ["--version"]).error?.code === "EPERM";
const noDenylist = path.join(tmp, "absent-denylist.json");

let passed = 0;
const failed = [];
function check(name, condition, detail = "") {
  if (condition) passed += 1;
  else failed.push(`${name}${detail ? `\n      ${String(detail).split("\n").join("\n      ")}` : ""}`);
}
function run(command, args, cwd = repoRoot, env = process.env) {
  // Synthetic manifest projects and their external artifacts share a fixture
  // parent. Git discovery must not ascend into the maintainer's checkout.
  if (args[0] === manifestTool) env = { ...env, GIT_CEILING_DIRECTORIES: path.dirname(tmp) };
  const options = { cwd, env, encoding: "utf8", windowsHide: true };
  let result;
  if (needsFixtureIO) {
    options.env = { ...env, FIXTURE_STDIO_ROOT: tmp };
    const nodeChild = command === "node" || command === process.execPath;
    result = fixtureIO.spawnFixture(command, nodeChild ? ["--require", stdioModule, ...args] : args, options);
  } else {
    result = spawnSync(command, args, options);
  }
  return { code: result.status, out: `${result.stdout || ""}${result.stderr || ""}` };
}
function write(root, rel, content) {
  const full = path.join(root, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content);
}
function gitRepo(name) {
  const dir = path.join(tmp, name);
  fs.mkdirSync(dir, { recursive: true });
  for (const args of [
    ["init", "-q", "-b", "main"],
    ["config", "user.email", "tester@example.com"],
    ["config", "user.name", "Tester"],
    ["config", "commit.gpgsign", "false"],
    ["config", "core.autocrlf", "false"],
  ]) {
    run("git", args, dir);
  }
  return dir;
}
function commit(dir, message) {
  run("git", ["add", "-A"], dir);
  const result = run("git", ["commit", "-q", "-m", message], dir);
  if (result.code !== 0) throw new Error("fixture commit failed");
}
const codename = `Project${"Nightjar"}`;
function denylistFile(name, content) {
  const file = path.join(tmp, name);
  fs.writeFileSync(file, JSON.stringify(content));
  return file;
}
const denylist = denylistFile("denylist.json", {
  schemaVersion: "1.0.0",
  terms: [{ label: "codename", pattern: codename, category: "codename", severity: "high" }],
});

// ------------------------------------------------------------------ scanner
{
  const repo = gitRepo("scan");
  const fakeToken = `ghp_${"Ab1".repeat(12)}`;
  const fakeAws = `AKIA${"Q7".repeat(8)}`;
  const fakePassword = `hunter${"2Zq".repeat(3)}`;
  const lanAddress = ["192", "168", "4", "20"].join(".");
  const secrets = {
    envQuoted: `kR7${"mW2x".repeat(3)}`,
    envBare: `wJ4${"pL9t".repeat(4)}`,
    yamlBare: `zq8${"Vn3c".repeat(3)}`,
    dollar: `Pa$$${"w0rdX".repeat(2)}`,
    sameLine: `hT5${"bK8r".repeat(3)}`,
    camel: `cS6${"dF1g".repeat(3)}`,
    utf16: `ghp_${"Zy9".repeat(12)}`,
    removed: `ghp_${"Rm4".repeat(12)}`,
    urlPass: `pw7${"Qe2".repeat(3)}`,
    entropy: ["aB3dE6gH9j", "K2mN5pQ8sT", "1vW4yZ7cF0", "hJ3lM6oR9u"].join(""),
  };
  write(repo, "README.md", "# Demo\nNothing sensitive here. Contact dev@example.com.\n");
  write(repo, "src/config.js", `export const token = "${fakeToken}";\nconst password = "${fakePassword}";\nconst apiKey = "<your-api-key>";\n`);
  write(repo, "docs/notes.md", `The ${codename} rollout starts soon.\nServer at ${lanAddress}.\n`);
  write(
    repo,
    "deploy/settings.env",
    [
      `DB_PASSWORD="${secrets.envQuoted}"`,
      `AWS_SECRET_ACCESS_KEY=${secrets.envBare}`,
      "API_TOKEN=${API_TOKEN}",
      "SESSION_SECRET=process.env.SESSION_SECRET",
      `ADMIN_PASSWORD="${secrets.dollar}"`,
      `OLD_PASSWORD="<placeholder>" NEW_PASSWORD="${secrets.sameLine}"`,
      `DATABASE_URL=postgres://app:${secrets.urlPass}@db.example.com:5432/app`,
      `BUILD_ID=${secrets.entropy}`,
      "",
    ].join("\n"),
  );
  write(repo, "deploy/values.yaml", `db:\n  password: ${secrets.yamlBare}\n  clientSecret: "${secrets.camel}"\n  tokenizer: default\n`);
  write(repo, "deploy/wide.txt", Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(`token ${secrets.utf16}\n`, "utf16le")]));
  write(repo, `plans/${codename.toLowerCase()}-launch.md`, "# Launch plan\n");
  write(repo, "history.txt", `temporary ${secrets.removed}\n`);
  write(repo, ".env", "MODE=dev\n");
  write(repo, ".env.example", "MODE=\n");
  write(repo, "certs/server.pem", "placeholder\n");
  write(repo, "assets/logo.bin", Buffer.from([1, 2, 0, 3, 0, 4]));
  commit(repo, "initial");
  write(repo, "history.txt", "clean now\n");
  commit(repo, "remove the temporary value");
  // A secret that exists only on a side branch.
  run("git", ["checkout", "-q", "-b", "side"], repo);
  write(repo, "side-only.txt", `aws ${fakeAws}\n`);
  commit(repo, "side");
  run("git", ["checkout", "-q", "main"], repo);
  // A key file that was committed and then deleted: still in history.
  write(repo, "old/deploy.key", "placeholder\n");
  commit(repo, "add key");
  fs.rmSync(path.join(repo, "old"), { recursive: true });
  commit(repo, "remove key");
  write(repo, "untracked-notes.txt", `token ${fakeToken}\n`);
  const allSecrets = [fakeToken, fakeAws, fakePassword, codename, lanAddress, ...Object.values(secrets)];
  const leaks = (out) => allSecrets.filter((secret) => out.toLowerCase().includes(secret.toLowerCase())).length;

  const tree = run("node", [scanner, "--repo", repo, "--denylist", denylist]);
  check("scanner: exits 0 on a completed scan", tree.code === 0, tree.out);
  check("scanner: finds the token with file and line", /HIGH github-token[\s\S]*src\/config\.js:1/.test(tree.out), tree.out);
  check("scanner: finds a quoted assigned secret", tree.out.includes("src/config.js:2"), tree.out);
  check("scanner: ignores a placeholder value", !tree.out.includes("src/config.js:3"), tree.out);
  check("scanner: finds PREFIX_PASSWORD names", tree.out.includes("deploy/settings.env:1"), tree.out);
  check("scanner: finds an unquoted env value", tree.out.includes("deploy/settings.env:2"), tree.out);
  check("scanner: ignores a ${VAR} reference", !tree.out.includes("deploy/settings.env:3"), tree.out);
  check("scanner: ignores a code reference", !tree.out.includes("deploy/settings.env:4"), tree.out);
  check("scanner: keeps a value that contains $", tree.out.includes("deploy/settings.env:5"), tree.out);
  check("scanner: checks every match on a line", tree.out.includes("deploy/settings.env:6"), tree.out);
  check("scanner: finds credentials in a URL", /url-with-credentials[\s\S]*deploy\/settings\.env:7/.test(tree.out), tree.out);
  check("scanner: flags a high-entropy string", /high-entropy-string[\s\S]*deploy\/settings\.env:8/.test(tree.out), tree.out);
  check("scanner: finds an unquoted YAML value", tree.out.includes("deploy/values.yaml:2"), tree.out);
  check("scanner: finds a camelCase secret name", tree.out.includes("deploy/values.yaml:3"), tree.out);
  check("scanner: does not flag a name that only contains a secret word", !tree.out.includes("deploy/values.yaml:4"), tree.out);
  check("scanner: reads UTF-16 files", /github-token[\s\S]*deploy\/wide\.txt:1/.test(tree.out), tree.out);
  check("scanner: flags .env but not .env.example", /env-file[\s\S]*\n {2}\.env\n/.test(tree.out) && !tree.out.includes(".env.example"), tree.out);
  check("scanner: flags key and cert files by name", /key-or-cert-file[\s\S]*certs\/server\.pem/.test(tree.out), tree.out);
  check("scanner: reports a denylist hit in content by category", /denylist-codename[\s\S]*docs\/notes\.md:1/.test(tree.out), tree.out);
  check("scanner: reports a denylist hit in a file name, with the term masked", tree.out.includes("plans/***-launch.md (file name)"), tree.out);
  check("scanner: flags a private address", /private-ipv4[\s\S]*docs\/notes\.md:2/.test(tree.out), tree.out);
  check("scanner: covers untracked files", tree.out.includes("untracked-notes.txt (untracked):1"), tree.out);
  check("scanner: names the files it could not scan", /NOT SCANNED binary \(1\)[\s\S]*assets\/logo\.bin/.test(tree.out) && /skipped_binary=1/.test(tree.out), tree.out);
  check("scanner: ignores example.com addresses", !tree.out.includes("email-address"), tree.out);
  check("scanner: never prints a matched value or a denylist term", leaks(tree.out) === 0, `${leaks(tree.out)} secret value(s) appeared in the output`);
  check("scanner: working tree does not see the side branch", !tree.out.includes("side-only.txt"), tree.out);
  check("scanner: working tree does not see removed content", !tree.out.includes("history.txt"), tree.out);
  check("scanner: reports the denylist term count", tree.out.includes("denylist=SET terms=1"), tree.out);
  const commonWord = run("node", [scanner, "--repo", repo, "--denylist", denylistFile("denylist-common.json", ["medium", "md"])]);
  check("scanner: a denylist term never damages headers or totals", /\nMEDIUM assigned-secret \(\d+\)\n/.test(commonWord.out) && /SCAN=FINDINGS high=\d+ medium=\d+ low=\d+/.test(commonWord.out) && commonWord.out.includes("README.*** (file name)"), commonWord.out);

  const refs = run("node", [scanner, "--repo", repo, "--all-refs", "--history", "--denylist", noDenylist]);
  check("scanner: --all-refs finds the side-branch secret", /aws-access-key[\s\S]*side:side-only\.txt:1/.test(refs.out), refs.out);
  check("scanner: --history finds content removed from a file that still exists", /github-token[\s\S]*history:history\.txt@[0-9a-f]{8}:1/.test(refs.out), refs.out);
  check("scanner: --history lists the removed key path", /history-key-or-cert-file[\s\S]*old\/deploy\.key/.test(refs.out), refs.out);
  check("scanner: reports denylist=MISSING", refs.out.includes("denylist=MISSING"), refs.out);
  check("scanner: ref and history scans never print a value", leaks(refs.out.replace(new RegExp(codename, "g"), "")) === 0, "output contained a secret value");

  const hook = run("node", [scanner, "--repo", repo, "--fail-on-high", "--denylist", denylist]);
  check("scanner: --fail-on-high exits 1 when high findings exist", hook.code === 1, `exit ${hook.code}`);

  for (const [label, content, expected] of [
    ["an object with a term key", { terms: [{ term: codename }] }, "denylist=SET terms=1"],
    ["a plain array", [codename], "denylist=SET terms=1"],
    ["an empty term list", { terms: [] }, "denylist=EMPTY"],
    ["an entry missing its pattern", { terms: [{ label: "x" }] }, "denylist=UNREADABLE"],
  ]) {
    const result = run("node", [scanner, "--repo", repo, "--denylist", denylistFile("denylist-shape.json", content)]);
    check(`scanner: denylist given as ${label} reports ${expected}`, result.out.includes(expected), result.out.split("\n").slice(-3).join("\n"));
  }
  fs.writeFileSync(path.join(tmp, "denylist-bad.json"), "{ not json");
  check("scanner: an unparseable denylist reports UNREADABLE", run("node", [scanner, "--repo", repo, "--denylist", path.join(tmp, "denylist-bad.json")]).out.includes("denylist=UNREADABLE"));

  const clean = gitRepo("scan-clean");
  write(clean, "README.md", "# Clean\n");
  commit(clean, "initial");
  const cleanRun = run("node", [scanner, "--repo", clean, "--denylist", noDenylist, "--fail-on-high"]);
  check("scanner: clean repo reports SCAN=CLEAN and exits 0", cleanRun.code === 0 && cleanRun.out.includes("SCAN=CLEAN"), cleanRun.out);

  // Precision and recall of the assigned-secret rule.
  const shapes = gitRepo("scan-shapes");
  const value = (seed) => `${seed}${"7Qx".repeat(4)}`;
  write(
    shapes,
    "app/settings.js",
    [
      'const STORAGE_KEY = "app-theme-setting";',
      'const sortKey = "createdAtDesc";',
      'const labels = { i18n_key: "home.title.main" };',
      'const table = { primaryKey: "customer_id" };',
      "const token = getToken2Provider();",
      "const secret = process.env.OAUTH2_SECRET;",
      'const tokenizer = "bert-base-uncased";',
      "",
    ].join("\n"),
  );
  write(
    shapes,
    "deploy/prod.env",
    [`DB_PASS=${value("a")}`, `SMTP_PASS="${value("b")}"`, `PRIVATE_KEY_PEM=${value("c")}`, `REDIS_AUTH=${value("d")}`, ""].join("\n"),
  );
  write(shapes, "deploy/example.env", "DB_PASS=\n");
  write(shapes, "config/app.yml", `secret_key_base: ${value("e")}\npassphrase: "${value("f")}"\nauth: ${value("g")}\n`);
  write(shapes, "config/vendor.env.example", "MODE=\n");
  write(shapes, "config/keys.properties", `SENDGRID_KEY=${value("SGk")}${value("Zw")}\nAPP_KEY="short-setting-name"\n`);
  write(shapes, "assets/big.txt", `${"lorem ipsum ".repeat(140000)}\n`);
  commit(shapes, "initial");
  const shapeRun = run("node", [scanner, "--repo", shapes, "--denylist", noDenylist]);
  check("scanner: ordinary code is not flagged as a secret", !shapeRun.out.includes("app/settings.js"), shapeRun.out);
  check("scanner: a generic key name needs a generated-looking value", !shapeRun.out.includes("config/keys.properties:2"), shapeRun.out);
  for (const location of ["deploy/prod.env:1", "deploy/prod.env:2", "deploy/prod.env:3", "deploy/prod.env:4", "config/app.yml:1", "config/app.yml:2", "config/app.yml:3", "config/keys.properties:1"]) {
    check(`scanner: finds the assigned secret at ${location}`, new RegExp(`assigned-secret[\\s\\S]*${location.replace(/[.]/g, "\\.")}\\n`).test(shapeRun.out), shapeRun.out);
  }
  check("scanner: flags name.env files but not example.env", /env-file \(1\)\n {2}deploy\/prod\.env\n/.test(shapeRun.out), shapeRun.out);
  check("scanner: working tree names a file that is too large", /NOT SCANNED large \(1\)[\s\S]*assets\/big\.txt/.test(shapeRun.out), shapeRun.out);
  const shapeRefs = run("node", [scanner, "--repo", shapes, "--all-refs", "--history", "--denylist", noDenylist]);
  check("scanner: ref mode skips a large blob without loading it", shapeRefs.code === 0 && /NOT SCANNED large \(1\)[\s\S]*main:assets\/big\.txt/.test(shapeRefs.out), shapeRefs.out);

  // A secret is committed, then removed in the working tree without a commit.
  const dirty = gitRepo("scan-dirty");
  const dirtyToken = `ghp_${"Dt6".repeat(12)}`;
  write(dirty, "config.js", `export const token = "${dirtyToken}";\n`);
  write(dirty, "other.js", "export const x = 1;\n");
  commit(dirty, "initial");
  write(dirty, "config.js", "export const token = process.env.TOKEN;\n");
  const dirtyTree = run("node", [scanner, "--repo", dirty, "--denylist", noDenylist]);
  check("scanner: the working-tree scan alone does not see committed content", dirtyTree.out.includes("SCAN=CLEAN"), dirtyTree.out);
  const dirtyHistory = run("node", [scanner, "--repo", dirty, "--history", "--denylist", noDenylist]);
  check("scanner: --history finds a committed secret that the working tree removed", /github-token[\s\S]*history:config\.js@[0-9a-f]{8}:1/.test(dirtyHistory.out) && !dirtyHistory.out.includes(dirtyToken), dirtyHistory.out);
  check("scanner: --history does not rescan unmodified files", !dirtyHistory.out.includes("history:other.js"), dirtyHistory.out);

  run("git", ["update-index", "--assume-unchanged", "config.js"], dirty);
  const assumed = run("node", [scanner, "--repo", dirty, "--history", "--denylist", noDenylist]);
  check("scanner: assume-unchanged cannot hide committed bytes", assumed.code === 0 && /history:config\.js@[0-9a-f]{8}:1/.test(assumed.out) && !assumed.out.includes(dirtyToken));

  // Pre-push scope: a secret that one outgoing commit adds and the next one removes.
  const push = gitRepo("scan-push");
  const oldToken = `ghp_${"Old".repeat(12)}`;
  const pushToken = `AKIA${"P4".repeat(8)}`;
  const messageToken = `ghp_${"Msg".repeat(12)}`;
  write(push, "legacy.txt", `legacy ${oldToken}\n`);
  commit(push, "old commit that is already public");
  write(push, "legacy.txt", "legacy removed\n");
  commit(push, "remove legacy value");
  const bare = path.join(tmp, "scan-push-remote.git");
  run("git", ["init", "-q", "--bare", bare]);
  run("git", ["remote", "add", "origin", bare], push);
  const cached = run("git", ["update-ref", "refs/remotes/origin/main", "HEAD"], push);
  run("git", ["checkout", "-q", "-b", "feature"], push);
  write(push, "config.txt", `key ${pushToken}\n`);
  commit(push, "add config");
  write(push, "config.txt", "key removed\n");
  commit(push, `remove config, old token was ${messageToken}`);
  const tipOnly = run("node", [scanner, "--repo", push, "--ref", "feature", "--denylist", noDenylist]);
  check("scanner: a tip scan alone does not see content removed by a later commit", cached.code === 0 && tipOnly.out.includes("SCAN=CLEAN"), `${cached.out}\n${tipOnly.out}`);
  // Simulate a private remote being repointed without refreshing its local tracking refs.
  const emptyDestination = path.join(tmp, "new-destination.git");
  run("git", ["init", "-q", "--bare", emptyDestination]);
  run("git", ["remote", "set-url", "origin", emptyDestination], push);
  const prePush = run("node", [scanner, "--repo", push, "--ref", "feature", "--outgoing", "origin", "--denylist", noDenylist]);
  check("scanner: --outgoing finds a secret that an outgoing commit added and a later one removed", /aws-access-key[\s\S]*outgoing:config\.txt@[0-9a-f]{8}:1/.test(prePush.out), prePush.out);
  check("scanner: --outgoing scans the outgoing commit messages", /github-token[\s\S]*commit:[0-9a-f]{8} \(message\):1/.test(prePush.out), prePush.out);
  check("scanner: stale tracking refs cannot hide reachable history", /outgoing:legacy\.txt@/.test(prePush.out), prePush.out);
  check("scanner: --outgoing never prints a value", ![oldToken, pushToken, messageToken].some((secret) => prePush.out.includes(secret)));
  const headPush = run("node", [scanner, "--repo", push, "--outgoing", "origin", "--denylist", noDenylist]);
  check("scanner: --outgoing without --ref uses HEAD", /outgoing:config\.txt@/.test(headPush.out), headPush.out);
  const firstPush = run("node", [scanner, "--repo", push, "--ref", "feature", "--outgoing", "no-such-remote", "--denylist", noDenylist]);
  check("scanner: with no remote branches, --outgoing covers the whole history of the ref", /outgoing:legacy\.txt@/.test(firstPush.out) && /outgoing:config\.txt@/.test(firstPush.out), firstPush.out);
  check("scanner: --outgoing rejects a value that is not a remote name", run("node", [scanner, "--repo", push, "--outgoing", "--not"]).code === 2);

  write(push, ".env", "legacy removed\n");
  write(push, `${codename}.md`, "legacy removed\n");
  commit(push, "add aliases of an existing blob");
  fs.unlinkSync(path.join(push, ".env"));
  fs.unlinkSync(path.join(push, `${codename}.md`));
  commit(push, "remove aliases");
  run("git", ["tag", "-a", "candidate", "-m", `release ${messageToken}`], push);
  const tagScan = run("node", [scanner, "--repo", push, "--ref", "candidate", "--outgoing", "origin", "--denylist", denylist]);
  check("scanner: checks removed names independently of shared blob contents", tagScan.out.includes("outgoing-env-file") && tagScan.out.includes("outgoing:***.md (historical name)") && tagScan.code === 0);
  check("scanner: scans annotated tag metadata without quoting it", /github-token[\s\S]*tag:[0-9a-f]{8} \(metadata\)/.test(tagScan.out) && !tagScan.out.includes(messageToken));
  const nonCommit = gitRepo("orphan-tag-targets");
  write(nonCommit, "README.md", "initial\n");
  commit(nonCommit, "initial");
  write(nonCommit, "release-notes.txt", fakeToken);
  const orphanBlob = run("git", ["hash-object", "-w", "--", "release-notes.txt"], nonCommit).out.trim();
  fs.unlinkSync(path.join(nonCommit, "release-notes.txt"));
  run("git", ["tag", "-a", "inner", "-m", "annotated blob", orphanBlob], nonCommit);
  run("git", ["tag", "-a", "outer", "-m", "annotated tag", "inner"], nonCommit);
  write(nonCommit, "removed.env", "innocuous bytes\n");
  run("git", ["add", "removed.env"], nonCommit);
  const orphanTree = run("git", ["write-tree"], nonCommit).out.trim();
  run("git", ["tag", "standalone-tree", orphanTree], nonCommit);
  run("git", ["rm", "-q", "-f", "removed.env"], nonCommit);
  for (const [scope, flags] of [
    ["named refs", ["--ref", "outer", "--ref", "standalone-tree"]],
    ["outgoing refs", ["--ref", "outer", "--ref", "standalone-tree", "--outgoing", "origin"]],
    ["all tips", ["--all-refs"]],
    ["full history", ["--history"]],
  ]) {
    const result = run("node", [scanner, "--repo", nonCommit, "--denylist", noDenylist, "--fail-on-high", ...flags]);
    check(`scanner: ${scope} covers orphan blob and tree behind tags`, result.code === 1 && result.out.includes("HIGH github-token") && result.out.includes("removed.env") && result.out.includes("HIGH env-file") && !result.out.includes(fakeToken));
  }
  run("git", ["branch", `topic/${fakeToken}`], push);
  const tokenRef = run("node", [scanner, "--repo", push, "--ref", `topic/${fakeToken}`, "--denylist", noDenylist]);
  const invalidRef = run("node", [scanner, "--repo", push, "--ref", `absent/${fakeToken}`, "--denylist", noDenylist]);
  check("scanner: masks credential-shaped refs in scope, findings and git errors", tokenRef.code === 0 && tokenRef.out.includes("HIGH github-token") && invalidRef.code === 2 && ![tokenRef, invalidRef].some((r) => r.out.includes(fakeToken)));

  // A denylist term in a branch name.
  run("git", ["checkout", "-q", "-b", `topic/${codename.toLowerCase()}-integration`], push);
  const refNames = run("node", [scanner, "--repo", push, "--all-refs", "--denylist", denylist]);
  check("scanner: masks a denylist term in the SCOPE line", refNames.out.split("\n")[0].includes("topic/***-integration") && !refNames.out.toLowerCase().includes(codename.toLowerCase()), "the term was printed, or the branch is missing from SCOPE");
  check("scanner: reports a denylist term in a ref name", /denylist-codename[\s\S]*topic\/\*\*\*-integration \(ref name\)/.test(refNames.out), refNames.out);

  // Plain or short values under a password-like name, and vendor token formats.
  const plain = gitRepo("scan-plain");
  write(
    plain,
    "docker-compose.yml",
    ["services:", "  db:", "    environment:", `      POSTGRES_PASSWORD: ${"supersecret"}password`, `      - MYSQL_ROOT_PASSWORD=${"correcthorse"}batterystaple`, `      - DB_PASS=${"hunter"}2`, `      password: "${"short"}7"`, "      PASSWORD_FILE: /run/secrets/db", '      secret: "${DB_SECRET}"', ""].join("\n"),
  );
  write(plain, "src/login.js", ["const password = userInput;", "const secret = readSecret();", "let passwd = form.passwd;", ""].join("\n"));
  const vendor = {
    gitlab: `glpat-${"aB3x".repeat(5)}`,
    npm: `npm_${"aB3".repeat(12)}`,
    sendgrid: `SG.${"aB3x".repeat(5)}.${"cD4y".repeat(6)}`,
    slack: ["hooks.slack.com", "services", "T0AB12CD3", "B0EF45GH6", "aB3xcD4yeF5zgH6w"].join("/"),
  };
  write(plain, "ci/tokens.txt", `${vendor.gitlab}\n${vendor.npm}\n${vendor.sendgrid}\nhttps://${vendor.slack}\n`);
  commit(plain, "initial");
  const plainRun = run("node", [scanner, "--repo", plain, "--denylist", noDenylist]);
  for (const line of [4, 5, 6, 7]) {
    check(`scanner: flags a plain or short password value at docker-compose.yml:${line}`, new RegExp(`LOW assigned-secret-plain[\\s\\S]*docker-compose\\.yml:${line}\\n`).test(plainRun.out), plainRun.out);
  }
  check("scanner: a name that only starts with a password word is not flagged", !plainRun.out.includes("docker-compose.yml:8"), plainRun.out);
  check("scanner: a template value is not flagged as plain", !plainRun.out.includes("docker-compose.yml:9"), plainRun.out);
  check("scanner: variable assignments in source code are not flagged as plain", !plainRun.out.includes("src/login.js"), plainRun.out);
  for (const [category, line] of [["gitlab-token", 1], ["npm-token", 2], ["sendgrid-key", 3], ["slack-webhook", 4]]) {
    check(`scanner: finds a ${category}`, new RegExp(`HIGH ${category} \\(1\\)\\n {2}ci/tokens\\.txt:${line}\\n`).test(plainRun.out), plainRun.out);
  }
  check("scanner: vendor token values are never printed", !Object.values(vendor).some((secret) => plainRun.out.includes(secret)));

  const folder = path.join(tmp, "export-folder");
  write(folder, "docs/setup.md", `Use token ${fakeToken} to log in.\n`);
  write(folder, ".git/config", `token ${fakeToken}\n`);
  const dirRun = run("node", [scanner, "--dir", folder, "--denylist", noDenylist]);
  check("scanner: --dir scans a folder that is not a git repo", dirRun.code === 0 && /github-token[\s\S]*docs\/setup\.md:1/.test(dirRun.out) && !dirRun.out.includes(".git/config"), dirRun.out);
  const encodedName = ["aB3dE6gH9j", "K2mN5pQ8sT", "1vW4yZ7cF0", "hJ3lM6oR9u"].join("+");
  write(folder, `${encodedName}.key`, "fixture\n");
  write(folder, `${fakeToken}.key`, "fixture\n");
  write(folder, "settings.conf", `LICENSE=${fakePassword}\n`);
  const excerpts = run("node", [scanner, "--dir", folder, "--denylist", noDenylist, "--review-context"]);
  const badOption = run("node", [scanner, `--${fakeToken}`]);
  check("scanner: masks credential filenames and emits value-free review excerpts", excerpts.code === 0 && excerpts.out.includes("***.key") && excerpts.out.includes("[credential-related field] = [value withheld]") && badOption.code === 2 && ![fakeToken, fakePassword, encodedName].some((v) => (excerpts.out + badOption.out).includes(v)));
  const policyRoot = path.join(tmp, "mixed-policy");
  write(policyRoot, "notes.md", "one-term another-term\n");
  const mixedPolicy = denylistFile("mixed-severity.json", { terms: [
    { pattern: "one-term", category: "project", severity: "low" },
    { pattern: "another-term", category: "project", severity: "high" },
  ] });
  const mixed = run("node", [scanner, "--dir", policyRoot, "--denylist", mixedPolicy, "--fail-on-high"]);
  check("scanner: mixed denylist severities preserve the high hook exit", mixed.code === 1 && mixed.out.includes("high=1 medium=0 low=1"), mixed.out);
  const broken = run("node", [scanner, "--dir", policyRoot, "--denylist", path.join(tmp, "denylist-bad.json")]);
  check("scanner: unreadable policy blocks a clean result", broken.code === 2 && broken.out.includes("SCAN=INCOMPLETE") && !broken.out.includes("SCAN=CLEAN"));

  const wrongShape = denylistFile("invalid-policy-shape.json", { terms: "invalid" });
  const badShape = run("node", [scanner, "--dir", policyRoot, "--denylist", wrongShape]);
  check("scanner: rejects malformed policy fields", badShape.code === 2 && badShape.out.includes("denylist=UNREADABLE"));

  const linked = gitRepo("scan-links");
  const outside = path.join(tmp, `outside-${codename}`);
  write(outside, "notes.txt", `fixture ${fakeToken}\n`);
  write(linked, "notes/notes.txt", "safe fixture\n");
  commit(linked, "track nested file");
  fs.unlinkSync(path.join(linked, "notes", "notes.txt"));
  fs.rmdirSync(path.join(linked, "notes"));
  fs.symlinkSync(outside, path.join(linked, "notes"), process.platform === "win32" ? "junction" : "dir");
  const linkExport = run("node", [scanner, "--dir", linked, "--denylist", denylist]);
  const linkGit = run("node", [scanner, "--repo", linked, "--denylist", denylist]);
  check("scanner: export scans link target text without traversal", linkExport.code === 0 && linkExport.out.includes("notes (link target)") && !linkExport.out.includes("github-token") && !linkExport.out.includes(codename));
  check("scanner: tracked child beneath replacement link is incomplete and never read", linkGit.code === 2 && linkGit.out.includes("NOT SCANNED unresolved") && !linkGit.out.includes("github-token"));

  const linkedRepo = path.join(tmp, "linked-checkout");
  fs.symlinkSync(linked, linkedRepo, process.platform === "win32" ? "junction" : "dir");
  const linkedRoot = run("node", [scanner, "--repo", linkedRepo, "--denylist", noDenylist]);
  check("scanner: rejects a linked checkout root before reading git", linkedRoot.code === 2 && linkedRoot.out.includes("linked repository input") && !linkedRoot.out.includes("SCOPE"));

  // core.symlinks=false checkouts store a Git link's published target as a plain text file.
  const gitLink = gitRepo("git-link-mode");
  write(gitLink, "alias.txt", "../private/.env");
  write(gitLink, "published-link", "../private/.env");
  commit(gitLink, "add text aliases");
  const blob = run("git", ["rev-parse", "HEAD:alias.txt"], gitLink).out.trim();
  run("git", ["config", "core.symlinks", "false"], gitLink);
  run("git", ["update-index", "--cacheinfo", "120000," + blob + ",published-link"], gitLink);
  run("git", ["commit", "-q", "-m", "publish target as a link"], gitLink);
  for (const [mode, flags] of [["worktree", []], ["ref", ["--ref", "main"]]]) {
    const result = run("node", [scanner, "--repo", gitLink, "--denylist", noDenylist, ...flags]);
    check(`scanner: detects Git link target as a path in ${mode} despite a shared blob`, result.code === 0 && /HIGH env-file[\s\S]*published-link \(link target\)/.test(result.out));
  }
  run("git", ["rm", "-q", "--cached", "published-link"], gitLink);
  fs.unlinkSync(path.join(gitLink, "published-link"));
  commit(gitLink, "retire published link");
  const oldLink = run("node", [scanner, "--repo", gitLink, "--history", "--ref", "main", "--denylist", noDenylist]);
  check("scanner: checks historical Git link target after link removal", oldLink.code === 0 && /HIGH env-file[\s\S]*history:published-link@[0-9a-f]{8} \(link target\)/.test(oldLink.out));

  const bundle = path.join(tmp, "encoded-bundle");
  for (const size of [4096, 8192, 65536]) write(bundle, `bundle-${size}.min.js`, "Ab19".repeat(size / 4));
  write(bundle, "config.ini", `API_TOKEN=${fakePassword}\n`);
  const clock = performance.now();
  const bundleRun = run("node", [scanner, "--dir", bundle, "--denylist", noDenylist]);
  check("scanner: 64 KiB unbroken bundle completes within five seconds and detects adjacent config", bundleRun.code === 0 && performance.now() - clock < 5000 && bundleRun.out.includes("config.ini:1") && !bundleRun.out.includes(fakePassword));

  check("scanner: --dir cannot be combined with --ref", run("node", [scanner, "--dir", folder, "--ref", "main"]).code === 2);
  check("scanner: exits 2 outside a git repository", run("node", [scanner, "--repo", tmp]).code === 2);
}

// ----------------------------------------------------------- Git resolution
{
  const windows = process.platform === "win32";
  const file = windows ? "git.exe" : "git";
  const folder = path.join(tmp, "git-resolution");
  const repo = path.join(folder, "source");
  const inside = path.join(repo, "bin");
  const first = path.join(folder, "first");
  const second = path.join(folder, "second");
  write(repo, ".git/HEAD", "");
  for (const dir of [folder, repo, inside, first, second]) {
    write(dir, file, "");
    fs.chmodSync(path.join(dir, file), 0o755);
  }
  const alias = path.join(folder, "alias");
  fs.symlinkSync(inside, alias, windows ? "junction" : "dir");
  const cwd = process.cwd();
  try {
    process.chdir(folder);
    const lookup = (...entries) => resolveGit([repo], entries.join(path.delimiter));
    for (const [kind, entry] of [["empty", ""], ["dot", "."], ["relative", "first"],
      ["repository", repo], ["nested", inside], ["linked", alias]]) {
      check("Git resolver: rejects " + kind + " PATH entry", lookup(entry) === null);
    }
    check("Git resolver: first eligible absolute entry wins",
      lookup("", ".", "second", repo, inside, alias, first, second) === fs.realpathSync.native(path.join(first, file)));
    check("Git resolver: unavailable executable fails closed", lookup(path.join(folder, "absent")) === null);
    if (windows) {
      check("Git resolver: repository exclusion ignores case", lookup(repo.toUpperCase()) === null);
    } else {
      fs.unlinkSync(path.join(first, file));
      fs.symlinkSync(path.join(inside, file), path.join(first, file));
      check("Git resolver: skips an executable link into the repository", lookup(first) === null);
      fs.unlinkSync(path.join(first, file));
      write(first, file, "");
      fs.chmodSync(path.join(first, file), 0o644);
      check("Git resolver: skips a non-executable file", lookup(first, second) === fs.realpathSync.native(path.join(second, file)));
    }
  } finally {
    process.chdir(cwd);
  }
  const names = ["GIT_DIR", "GIT_WORK_TREE", "GIT_COMMON_DIR", "GIT_INDEX_FILE",
    "GIT_OBJECT_DIRECTORY", "GIT_ALTERNATE_OBJECT_DIRECTORIES"];
  const inherited = Object.fromEntries(names.map(name => [windows ? name.toLowerCase() : name, "other"]));
  const env = gitEnvironment({ LC_ALL: "C" }, { ...inherited, KEEP: "yes", LC_ALL: "other" });
  check("Git environment: removes all repository selectors and preserves caller overrides",
    env.KEEP === "yes" && env.LC_ALL === "C" && Object.keys(env).length === 2);
}

// Exercise source and artifact discovery with real worktrees and independent indexes.
{
  const source = gitRepo("runner-source");
  const home = gitRepo("runner-home");
  write(source, ".gitignore", "/git.exe\n");
  write(source, "source-only.key", "fixture\n");
  write(home, ".gitignore", "/artifacts/\n/git.exe\n");
  write(home, "other-only.key", "fixture\n");
  commit(source, "source fixture");
  commit(home, "artifact fixture");
  const trustedGit = resolveGit([source, home]);
  // The monitor lives outside both worktrees. Its only operation is tracing Git's version.
  const sentinel = path.join(tmp, "monitor-version.jsonl");
  const version = run(trustedGit, ["version"], source, { ...process.env, GIT_TRACE2_EVENT: sentinel });
  check("Git fixtures: version tracing creates a sentinel", version.code === 0 && fs.existsSync(sentinel));
  fs.rmSync(sentinel, { force: true });
  const monitor = path.join(tmp, "fixture-fsmonitor");
  write(tmp, "fixture-fsmonitor", '#!/bin/sh\nexport GIT_TRACE2_EVENT="$FIXTURE_MONITOR_TRACE"\nexec "$FIXTURE_EXPECTED_GIT" version\n');
  fs.chmodSync(monitor, 0o755);
  for (const dir of [source, home]) {
    check("Git fixtures: configured monitor", run(trustedGit, ["config", "core.fsmonitor", monitor], dir).code === 0);
  }
  const env = { ...process.env, HOME: home, USERPROFILE: home, GIT_CEILING_DIRECTORIES: path.dirname(tmp),
    FIXTURE_EXPECTED_GIT: trustedGit, FIXTURE_MONITOR_TRACE: sentinel };
  for (const key of Object.keys(env)) {
    if (key.toUpperCase() === "NODEFAULTCURRENTDIRECTORYINEXEPATH") delete env[key];
  }
  // Reject an unexpected executable or an enabled monitor before OS dispatch.
  const guard = path.join(tmp, "verify-git-child.cjs");
  write(tmp, path.basename(guard), [
    'const cp = require("node:child_process");',
    'const spawn = cp.spawnSync;',
    'cp.spawnSync = (file, args, options) => {',
    '  if (file !== process.env.FIXTURE_EXPECTED_GIT) throw new Error("unexpected Git executable");',
    '  if (args[0] !== "-c" || args[1] !== "core.fsmonitor=false") throw new Error("missing fsmonitor override");',
    '  return spawn(file, args, options);',
    '};',
    'require("node:module").syncBuiltinESMExports();',
  ].join("\n"));
  if (process.platform === "win32") {
    fs.copyFileSync(process.execPath, path.join(source, "git.exe"));
    fs.copyFileSync(process.execPath, path.join(home, "git.exe"));
  } else {
    console.log("SKIP Windows repository-local git.exe fixtures");
  }
  const inspect = path.join(path.dirname(docValidator), "inspect-source.mjs");
  const manifest = path.join(tmp, "runner-artifacts", "docs.json");
  const corpus = path.join(home, "artifacts", "corpus");
  const cases = [
    ["scanner", [scanner, "--repo", source, "--history", "--denylist", noDenylist], /source-only\.key/,
      { GIT_DIR: path.join(home, ".git"), GIT_INDEX_FILE: path.join(home, ".git", "index") }, "ls-files"],
    ["manifest-init", [manifestTool, "init", "--repo", source, "--slug", "docs", "--manifest", manifest],
      /"status": "created"/, {}, "rev-parse"],
    ["manifest-diff", [manifestTool, "diff", "--repo", source, "--manifest", manifest], /source-only\.key/, {}, "ls-files"],
    ["inspect-source", [inspect, source, path.join(tmp, "runner-corpus")], /SOURCE_STATE=clean/, {}, "status"],
    ["artifact-location", [inspect, source, corpus], /REFRESH=full/, {}, "check-ignore"],
  ];
  for (const [label, args, expected, extra, command] of cases) {
    const trace = path.join(tmp, label + "-git.jsonl");
    const result = run(process.execPath, ["--require", guard, ...args], source,
      { ...env, ...extra, GIT_TRACE2_EVENT: trace });
    check(label + ": expected repository and normal output", result.code === 0 && expected.test(result.out) &&
      !result.out.includes("other-only.key"), result.out);
    const events = fs.existsSync(trace) ? fs.readFileSync(trace, "utf8").trim().split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line)) : [];
    const starts = events.filter(event => event.event === "start" && !event.sid.includes("/"));
    check(label + ": every Git invocation disables fsmonitor", starts.some(event => event.argv.includes(command)) &&
      starts.every(event => event.argv[1] === "-c" && event.argv[2] === "core.fsmonitor=false"));
    if (label === "scanner") {
      const logs = starts.filter(event => event.argv.includes("log"));
      check("scanner: history reads disable configured display helpers", logs.length === 2 &&
        logs.every(event => ["--no-ext-diff", "--no-textconv", "--no-show-signature"].every(flag => event.argv.includes(flag))));
    }
    check(label + ": configured monitor leaves no sentinel", !fs.existsSync(sentinel) &&
      !events.some(event => event.event === "child_start" && event.argv?.includes(monitor)));
  }
}

// ------------------------------------------------------------ manifest tool
{
  let repo = gitRepo("manifest");
  write(repo, "src/a.js", "export const a = 1;\n");
  write(repo, "src/b.js", "export const b = 2;\n");
  write(repo, "src/c.js", "export const c = 3;\n");
  write(repo, "src/shared.js", "export const shared = 0;\n");
  write(repo, "README.md", "# Demo\n");
  commit(repo, "initial");
  const manifest = path.join(tmp, "manifests", "master-docs-manifest.json");
  const tool = (...args) => {
    if (["set-public", "remove-public", "remove-file", "remove-section", "rename"].includes(args[0]) && !args.includes("--repo")) args.push("--repo", repo);
    const result = run("node", [manifestTool, ...args, "--manifest", manifest]);
    let json = null;
    try {
      json = JSON.parse(result.out);
    } catch {
      /* usage errors are not JSON */
    }
    return { ...result, json };
  };
  const diff = (...extra) => tool("diff", "--repo", repo, ...extra).json;
  const record = (id, ...files) => tool("set-section", "--repo", repo, "--id", id, "--kind", "module-card", "--output", `docs/internal/cards/${id}.md`, ...files.flatMap((file) => ["--file", file]));

  check("manifest: a missing manifest means rebuild", diff().status === "rebuild");
  fs.mkdirSync(path.dirname(manifest), { recursive: true });
  fs.writeFileSync(manifest, "{ not json");
  check("manifest: a corrupt manifest means rebuild", diff().status === "rebuild");
  check("manifest: set-section refuses to run without a valid manifest", record("x", "src/a.js").code === 2);

  const init = tool("init", "--repo", repo, "--slug", "demo");
  check("manifest: init replaces a corrupt manifest", init.json && init.json.status === "created", init.out);
  check("manifest: init does not record a machine path", !fs.readFileSync(manifest, "utf8").includes(tmp.replace(/\\/g, "\\\\")) && !fs.readFileSync(manifest, "utf8").includes(tmp));
  check("manifest: init leaves an existing manifest alone", tool("init", "--repo", repo, "--slug", "other").json.status === "exists");

  // Record commands index real, completed artifacts under the project root.
  for (const file of ["internal/cards/card-x", "internal/cards/card-a", "internal/cards/b", "internal/cards/c", "internal/cards/card-b",
    "internal/cards/card-c", "internal/index", "public/public-a", "public/public-c", "public/public-bc", "public/pub-a"]) {
    write(tmp, "docs/" + file + ".md", "# Output\n");
  }
  const single = record("card-a", "src/a.js", "src\\shared.js");
  check("manifest: set-section records one section", single.json && single.json.status === "recorded" && single.json.filesLinked === 2, single.out);
  check("manifest: set-section rejects a source file that does not exist", record("card-x", "src/nope.js").code === 2);
  check("manifest: set-section needs --repo", tool("set-section", "--id", "y", "--kind", "module-card", "--output", "y.md", "--file", "src/a.js").code === 2);
  const jsonl = path.join(tmp, "sections.jsonl");
  fs.writeFileSync(
    jsonl,
    [
      { id: "card-b", kind: "module-card", output: "docs/internal/cards/b.md", files: ["src/b.js", "src/shared.js"] },
      { id: "card-c", kind: "module-card", output: "docs/internal/cards/c.md", files: ["src/c.js"] },
    ]
      .map((item) => JSON.stringify(item))
      .join("\n"),
  );
  const batch = tool("set-section", "--repo", repo, "--from", jsonl);
  check("manifest: set-section --from records many sections", batch.json && batch.json.sections === 2, batch.out);
  const pub = tool("set-public", "--id", "public-a", "--section", "card-a", "--status", "passed");
  check("manifest: set-public records a public doc", pub.json && pub.json.unknownSections.length === 0, pub.out);
  tool("set-public", "--id", "public-c", "--section", "card-c", "--status", "needs-review");
  check("manifest: recording a pending review keeps the public page visible", diff().publicDocsToRecheck.includes("public-c"));
  tool("set-public", "--id", "public-c", "--section", "card-c", "--status", "passed");
  check("manifest: set-public reports unknown sections", tool("set-public", "--id", "public-x", "--section", "nope", "--status", "blocked").json.unknownSections.join() === "nope");
  check("manifest: set-public rejects an unknown status", tool("set-public", "--id", "p", "--section", "card-a", "--status", "fine").code === 2);
  check("manifest: remove-public deletes an entry", tool("remove-public", "--id", "public-x").json.publicDocs === 1);
  check("manifest: a recorded section is up to date before any stamp", diff().counts.staleSections === 0, JSON.stringify(diff()));
  check("manifest: set-section needs a source file or a dependency", tool("set-section", "--repo", repo, "--id", "index", "--kind", "index", "--output", "docs/internal/index.md").code === 2);
  check("manifest: --depends-on must name a known section", tool("set-section", "--repo", repo, "--id", "index", "--kind", "index", "--output", "docs/internal/index.md", "--depends-on", "nope").code === 2);
  const index = tool("set-section", "--repo", repo, "--id", "index", "--kind", "index", "--output", "docs/internal/index.md", "--depends-on", "card-a", "--depends-on", "card-b", "--depends-on", "card-c");
  check("manifest: an aggregate section is recorded with --depends-on", index.json && index.json.status === "recorded" && diff().counts.staleSections === 0, index.out);

  const stamp = tool("stamp", "--repo", repo);
  const stamped = JSON.parse(fs.readFileSync(manifest, "utf8"));
  check("manifest: stamp fills every sha256", stamp.code === 0 && Object.values(stamped.sourceIndex).every((entry) => /^[0-9a-f]{64}$/.test(entry.sha256)), stamp.out);
  check("manifest: sections carry the hashes they were built from", Object.keys(stamped.docSections["card-a"].sourceHashes).length === 2);
  check("manifest: stamp records commit and time", /^[0-9a-f]{40}$/.test(stamped.lastGitCommit) && Boolean(stamped.lastRunAt));
  check("manifest: no command prints a hash", ![single, batch, pub, stamp].some((result) => /[0-9a-f]{64}/.test(result.out)));

  const steady = diff("--scope-dir", "src");
  check("manifest: nothing is stale after stamp", steady.status === "incremental" && steady.counts.changed === 0 && steady.counts.added === 0 && steady.counts.staleSections === 0 && steady.counts.unchanged === 4, JSON.stringify(steady));
  check("manifest: without --scope-dir, undocumented files are listed as added", diff().added.includes("README.md"));

  // A file shared by two sections changes; one section is regenerated, then the context is "reset".
  write(repo, "src/shared.js", "export const shared = 1;\n");
  commit(repo, "change shared");
  const shared = diff("--scope-dir", "src");
  check("manifest: a shared file makes both sections and their dependent stale", shared.staleSections.join() === "card-a,card-b,index" && shared.publicDocsToRecheck.join() === "public-a", JSON.stringify(shared));
  record("card-a", "src/a.js", "src/shared.js");
  const resumed = diff("--scope-dir", "src");
  check("manifest: after one section is recorded, diff lists only the remaining sections", resumed.staleSections.join() === "card-b,index", JSON.stringify(resumed));
  check("manifest: the public doc of a re-recorded section still needs work", resumed.publicDocsToRecheck.join() === "public-a", JSON.stringify(resumed));
  check("manifest: file-level changed is empty once a section using the file is recorded", resumed.changed.length === 0, JSON.stringify(resumed));
  const listed = tool("summary", "--repo", repo, "--list", "sections").json;
  check("manifest: summary --repo marks each section ok or STALE", listed.sections.some((line) => line.startsWith("card-a [module-card] ok")) && listed.sections.some((line) => line.startsWith("card-b [module-card] STALE")), JSON.stringify(listed));
  const partial = tool("stamp", "--repo", repo).json;
  check("manifest: stamp reports the sections and public docs that were not regenerated", partial.sectionsStillStale.join() === "card-b,index" && partial.publicDocsStillStale.join() === "public-a", JSON.stringify(partial));
  check("manifest: they stay stale after the stamp", diff("--scope-dir", "src").staleSections.join() === "card-b,index" && diff("--scope-dir", "src").publicDocsToRecheck.join() === "public-a");
  record("card-b", "src/b.js", "src/shared.js");
  check("manifest: the aggregate stays stale until it is recorded again", diff("--scope-dir", "src").staleSections.join() === "index");
  tool("set-section", "--repo", repo, "--id", "index", "--kind", "index", "--output", "docs/internal/index.md", "--depends-on", "card-a", "--depends-on", "card-b", "--depends-on", "card-c");
  check("manifest: the public doc stays stale until set-public records it again", diff("--scope-dir", "src").counts.staleSections === 0 && diff("--scope-dir", "src").publicDocsToRecheck.join() === "public-a");
  tool("set-public", "--id", "public-a", "--section", "card-a", "--status", "passed");
  const allDone = diff("--scope-dir", "src");
  check("manifest: clean again after sections, aggregate, and public doc are recorded", allDone.counts.staleSections === 0 && allDone.counts.publicDocsToRecheck === 0, JSON.stringify(allDone));
  tool("stamp", "--repo", repo);

  // Change, delete, rename, add.
  write(repo, "src/a.js", "export const a = 100;\n");
  fs.renameSync(path.join(repo, "src", "c.js"), path.join(repo, "src", "c-renamed.js"));
  fs.rmSync(path.join(repo, "src", "b.js"));
  write(repo, "src/d.js", "export const d = 4;\n");
  commit(repo, "changes");
  const after = diff("--scope-dir", "src");
  check("manifest: detects a changed file", after.changed.join() === "src/a.js", JSON.stringify(after));
  check("manifest: detects a deleted file", after.deleted.join() === "src/b.js", JSON.stringify(after));
  check("manifest: detects a rename by content", after.renamed.length === 1 && after.renamed[0].from === "src/c.js" && after.renamed[0].to === "src/c-renamed.js", JSON.stringify(after));
  check("manifest: detects an added file", after.added.join() === "src/d.js", JSON.stringify(after));
  check("manifest: lists every stale section", after.staleSections.join() === "card-a,card-b,card-c,index", JSON.stringify(after));
  check("manifest: lists public docs to recheck", after.publicDocsToRecheck.join() === "public-a,public-c", JSON.stringify(after));

  const renamed = tool("rename", "--from", "src/c.js", "--to", "src/c-renamed.js");
  check("manifest: rename remaps the path and names the sections", renamed.json && renamed.json.sectionsToUpdate.join() === "card-c", renamed.out);
  const removed = tool("remove-file", "--file", "src/b.js");
  check("manifest: remove-file names the sections to update", removed.json && removed.json.sectionsToUpdate.join() === "card-b" && removed.json.sectionsWithNoSource.length === 0, removed.out);
  check("manifest: sections touched by rename and remove-file stay stale until recorded", diff("--scope-dir", "src").staleSections.join() === "card-a,card-b,card-c,index");
  record("card-b", "src/shared.js");
  record("card-c", "src/c-renamed.js");
  check("manifest: recording them again clears the mark", diff("--scope-dir", "src").staleSections.join() === "card-a,index");
  // A public doc built from two sections; one of the sections is then removed.
  tool("set-public", "--id", "public-bc", "--section", "card-b", "--section", "card-c", "--status", "passed");
  check("manifest: a freshly recorded public doc is not listed", !diff("--scope-dir", "src").publicDocsToRecheck.includes("public-bc"));
  const dropped = tool("remove-section", "--id", "card-c");
  check("manifest: remove-section names the public docs and sections that used it", dropped.json && dropped.json.publicDocsToRecheck.join() === "public-bc,public-c" && dropped.json.publicDocsWithNoSource.join() === "public-c" && dropped.json.sectionsToUpdate.join() === "index", dropped.out);
  check("manifest: a public doc stays listed after one of its sections is removed", diff("--scope-dir", "src").publicDocsToRecheck.includes("public-bc") && tool("summary", "--repo", repo, "--list", "public").json.publicDocs.some((line) => line.startsWith("public-bc [passed] STALE")));
  tool("set-public", "--id", "public-bc", "--section", "card-b", "--status", "passed");
  check("manifest: recording the public doc again clears it", !diff("--scope-dir", "src").publicDocsToRecheck.includes("public-bc"));
  check("manifest: set-section rejects a dependency cycle and records nothing", tool("set-section", "--repo", repo, "--id", "card-b", "--kind", "module-card", "--output", "docs/internal/cards/card-b.md", "--file", "src/shared.js", "--depends-on", "index").code === 2 && !diff("--scope-dir", "src").staleSections.includes("card-b"));
  const summary = tool("summary", "--list", "sections");
  check("manifest: summary lists sections without hashes", summary.json && summary.json.sectionsByKind["module-card"] === 2 && summary.json.sections.length === 3 && !/[0-9a-f]{64}/.test(summary.out), summary.out);
  check("manifest: a section whose dependency was removed is stale", diff("--scope-dir", "src").staleSections.includes("index"));
  tool("set-public", "--id", "public-c", "--section", "card-c", "--status", "needs-review");
  const outstanding = tool("summary");
  check("manifest: summary shows public docs that did not pass", outstanding.json.publicDocsNotPassed.some((entry) => entry.startsWith("public-c")), outstanding.out);
  const forced = tool("init", "--repo", repo, "--slug", "demo", "--force");
  check("manifest: init --force starts a full rebuild", forced.json && forced.json.status === "created" && tool("summary").json.files === 0, forced.out);

  // A hand-written manifest without section hashes still works.
  const legacy = path.join(tmp, "manifests", "legacy.json");
  fs.writeFileSync(
    legacy,
    JSON.stringify({
      schemaVersion: "1.0.0",
      sourceIndex: { "src/a.js": { sha256: "", sections: ["card-a"] }, "src/gone.js": { sha256: "", sections: ["card-gone"] } },
      docSections: { "card-a": { kind: "module-card", outputPath: "docs/internal/cards/card-a.md", sourceFiles: ["src/a.js"] } },
      publicDocs: {},
    }),
  );
  const unverified = run("node", [manifestTool, "diff", "--repo", repo, "--manifest", legacy]);
  check("manifest: unverified roots return no legacy source names", unverified.out.includes("unverified-legacy") && !unverified.out.includes("src/a.js"));
  check("manifest: unbound legacy roots refuse writes", run("node", [manifestTool, "stamp", "--repo", repo, "--manifest", legacy]).code === 2);
  run("node", [manifestTool, "bind", "--repo", repo, "--manifest", legacy]);
  const legacyStamp = JSON.parse(run("node", [manifestTool, "stamp", "--repo", repo, "--manifest", legacy]).out);
  check("manifest: stamp adopts hashes for a hand-written section and reports missing files", legacyStamp.sectionsAdopted === 1 && legacyStamp.missing.join() === "src/gone.js", JSON.stringify(legacyStamp));
  const legacyDiff = JSON.parse(run("node", [manifestTool, "diff", "--repo", repo, "--manifest", legacy, "--scope-dir", "src"]).out);
  check("manifest: a hand-written manifest reports stale sections from the file index", legacyDiff.staleSections.join() === "card-gone", JSON.stringify(legacyDiff));

  // A hand-written section whose file index already records an older hash: stamp must not hide the change.
  const legacyStale = path.join(tmp, "manifests", "legacy-stale.json");
  fs.writeFileSync(
    legacyStale,
    JSON.stringify({
      schemaVersion: "1.0.0",
      sourceIndex: { "src/a.js": { sha256: "0".repeat(64), sections: ["card-a"] } },
      docSections: { "card-a": { kind: "module-card", sourceFiles: ["src/a.js"] } },
      publicDocs: { "pub-a": { sourceInternalSections: ["card-a"], sanitizationStatus: "passed" } },
    }),
  );
  const staleTool = (...args) => JSON.parse(run("node", [manifestTool, ...args, "--repo", repo, "--manifest", legacyStale]).out);
  staleTool("bind");
  check("manifest: a hand-written section with an outdated file hash is stale", staleTool("diff").staleSections.join() === "card-a");
  const staleStamp = staleTool("stamp");
  check("manifest: stamp does not adopt or hide that stale section", staleStamp.sectionsAdopted === 0 && staleStamp.sectionsStillStale.join() === "card-a" && staleStamp.publicDocsStillStale.join() === "pub-a", JSON.stringify(staleStamp));
  check("manifest: it is still stale after the stamp", staleTool("diff").staleSections.join() === "card-a" && staleTool("diff").publicDocsToRecheck.join() === "pub-a");

  // Two legacy consumers share an old index baseline, and the public
  // page derives solely from the first. Recording either cannot clear the other.
  const old = {
    schemaVersion: "1.0.0",
    sourceIndex: { "src/a.js": { sha256: "0".repeat(64), sections: ["one", "two"] } },
    docSections: Object.fromEntries(["one", "two"].map((id) =>
      [id, { kind: "module-card", sourceFiles: ["src/a.js"], outputPath: "docs/internal/cards/card-a.md" }])),
    publicDocs: { "public-a": { sourceInternalSections: ["one"], sanitizationStatus: "passed" } },
  };
  fs.writeFileSync(manifest, JSON.stringify(old));
  tool("bind", "--repo", repo);
  check("manifest: migrating shared legacy baselines preserves both consumers", diff().staleSections.join() === "one,two");
  write(tmp, "docs/internal/cards/one.md", "# One");
  record("one", "src/a.js");
  check("manifest: legacy sibling and public page remain pending after one recording",
    diff().staleSections.join() === "two" && diff().publicDocsToRecheck.join() === "public-a");

  // A complete expected-output fixture includes every tracked source.
  repo = gitRepo("manifest-reconciled/manifest");
  write(repo, "src/a.js", "export const a = 1;\n");
  commit(repo, "one source in scope");
  fs.unlinkSync(manifest);
  tool("init", "--repo", repo, "--slug", "demo");
  const planFile = path.join(tmp, "outputs.jsonl");
  const rows = [
    { kind: "module-card", id: "one", output: "docs/internal/cards/one.md", files: ["src/a.js"] },
    { kind: "public", id: "guide", output: "docs/public/custom.md", sections: ["one"] },
  ];
  fs.writeFileSync(planFile, JSON.stringify(rows[0]));
  check("manifest: an internal-only inventory cannot certify public completion",
    tool("expect", "--repo", repo, "--from", planFile).code === 2 && tool("stamp", "--repo", repo).json.status === "incomplete");
  fs.writeFileSync(planFile, rows.map((row) => JSON.stringify(row)).join("\n"));
  tool("expect", "--repo", repo, "--from", planFile);
  check("manifest: planned card and page survive interruption before recording",
    diff().staleSections.join() === "one" && diff().publicDocsToRecheck.join() === "guide");
  record("one", "src/a.js");
  check("manifest: unfinished public page remains after all cards are recorded",
    diff().staleSections.length === 0 && diff().publicDocsToRecheck.join() === "guide" && tool("stamp", "--repo", repo).json.status === "incomplete");
  check("manifest: missing expected output cannot be marked passed", tool("set-public", "--id", "guide", "--section", "one", "--status", "passed").code === 2);
  write(tmp, "docs/public/custom.md", "# Guide");
  tool("set-public", "--id", "guide", "--section", "one", "--status", "passed");
  tool("set-public", "--id", "guide", "--section", "one", "--status", "blocked");
  check("manifest: a blocked public review prevents a complete stamp", tool("stamp", "--repo", repo).json.status === "incomplete");
  tool("set-public", "--id", "guide", "--section", "one", "--status", "passed");
  check("manifest: complete expected outputs can be stamped", tool("stamp", "--repo", repo).json.status === "stamped");
  fs.unlinkSync(path.join(tmp, "docs", "public", "custom.md"));
  check("manifest: diff catches a missing recorded public output", diff().publicDocsToRecheck.join() === "guide");
  fs.unlinkSync(path.join(tmp, "docs", "internal", "cards", "one.md"));
  check("manifest: diff catches a missing recorded card", diff().staleSections.join() === "one");
  check("manifest: missing section file cannot be marked recorded", record("one", "src/a.js").code === 2);
  write(tmp, "docs/public/custom.md", "# Guide");
  write(tmp, "docs/internal/cards/one.md", "# One");
  write(repo, "feature-b/b.js", "export const b = 1;");
  write(tmp, "docs/internal/cards/other.md", "# Other");
  record("other", "feature-b/b.js");
  tool("set-section", "--repo", repo, "--id", "summary", "--kind", "index", "--output", "docs/internal/index.md", "--depends-on", "one", "--depends-on", "other");
  write(repo, "src/a.js", "changed");
  const scopedDiff = diff("--scope-dir", "feature-b");
  check("manifest: a change outside feature scope contributes no stale rows",
    !scopedDiff.changed.length && !scopedDiff.staleSections.length && !scopedDiff.publicDocsToRecheck.length);
  check("manifest: feature stamp cannot claim repo-wide coverage", tool("stamp", "--repo", repo, "--scope-dir", "feature-b", "--scope", "repo-wide").code === 2);
  const impacted = diff("--scope-dir", "src");
  check("manifest: scoped change includes transitive dependents and public page",
    impacted.staleSections.join() === "one,summary" && impacted.publicDocsToRecheck.join() === "guide");
  fs.unlinkSync(path.join(repo, "src", "a.js"));
  const scopedDelete = diff("--scope-dir", "feature-b");
  check("manifest: out-of-scope deletion is excluded", !scopedDelete.deleted.length && !scopedDelete.staleSections.length);
  const twin = gitRepo("other/manifest");
  check("manifest: same basename from another repository cannot resume", tool("diff", "--repo", twin).code === 2);
  check("manifest: public recording requires a matching worktree",
    run("node", [manifestTool, "set-public", "--id", "guide", "--section", "one", "--status", "passed", "--manifest", manifest]).code === 2 &&
    tool("set-public", "--repo", twin, "--id", "guide", "--section", "one", "--status", "passed").code === 2);
  const beforeLock = fs.readFileSync(manifest, "utf8");
  fs.writeFileSync(manifest + ".lock", "fixture owner");
  const locked = tool("remove-section", "--id", "other");
  check("manifest: active writer prevents a lost update", locked.code === 2 && locked.out.includes("writer lock held") && fs.readFileSync(manifest, "utf8") === beforeLock);
  fs.unlinkSync(manifest + ".lock");
  const prior = path.join(tmp, "old-manifest.json");
  fs.linkSync(manifest, prior);
  tool("remove-section", "--id", "other");
  check("manifest: save atomically replaces the prior file", fs.readFileSync(prior, "utf8") === beforeLock && fs.readFileSync(manifest, "utf8") !== beforeLock);
  const boundedRoot = path.join(tmp, "bounded-artifacts");
  const boundedManifest = path.join(boundedRoot, "manifests", "bound.json");
  const boundedRepo = gitRepo("bounded-sources");
  write(boundedRepo, "src/shared.js", "export const shared = 1;\n");
  commit(boundedRepo, "one source in scope");
  const bounded = (...args) => run("node", [manifestTool, ...args, "--repo", boundedRepo, "--manifest", boundedManifest]);
  bounded("init", "--slug", "demo");
  const outsider = path.join(tmp, "other-outputs");
  write(outsider, "guide.md", "# Unrelated output");
  write(boundedRoot, "docs/card.md", "# Card");
  write(boundedRoot, "docs/guide.md", "# Guide");
  fs.symlinkSync(outsider, path.join(boundedRoot, "linked"), process.platform === "win32" ? "junction" : "dir");
  const card = { id: "card", kind: "module-card", files: ["src/shared.js"], output: path.join(boundedRoot, "docs/card.md") };
  const page = { id: "guide", kind: "public", sections: ["card"], output: "docs/guide.md" };
  const savePlan = (pageRow) => fs.writeFileSync(planFile, [card, pageRow].map((row) => JSON.stringify(row)).join("\n"));
  savePlan(page);
  bounded("expect", "--from", planFile);
  bounded("set-section", "--id", "card", "--kind", card.kind, "--file", "src/shared.js", "--output", card.output);
  bounded("set-public", "--id", "guide", "--section", "card", "--status", "passed");
  check("manifest: absolute output within the artifact root can be stamped", JSON.parse(bounded("stamp").out).status === "stamped");
  const originalBounded = fs.readFileSync(boundedManifest, "utf8");
  for (const [label, output] of [
    ["external absolute path", path.join(outsider, "guide.md")],
    ["parent traversal", "../other-outputs/guide.md"],
    ["linked output parent", "linked/guide.md"],
  ]) {
    savePlan({ ...page, output });
    check(`manifest: inventory rejects ${label}`, bounded("expect", "--from", planFile).code === 2);
    const submitted = JSON.parse(originalBounded);
    submitted.docSections.card.outputPath = output;
    submitted.publicDocs.guide.outputPath = output;
    fs.writeFileSync(boundedManifest, JSON.stringify(submitted));
    const checked = JSON.parse(bounded("stamp").out);
    check(`manifest: ${label} cannot certify a card or page`, checked.status === "incomplete" &&
      checked.sectionsStillStale.includes("card") && checked.publicDocsStillStale.includes("guide"));
    fs.writeFileSync(boundedManifest, originalBounded);
  }
  const skillBody = fs.readFileSync(path.join(repoRoot, "skills/master-docs/SKILL.md"), "utf8");
  const rareCommands = fs.readFileSync(path.join(repoRoot, "skills/master-docs/references/manifest-commands.md"), "utf8");
  check("master-docs: repair syntax loads on demand", skillBody.includes("references/manifest-commands.md") && !skillBody.includes("rename --from") && rareCommands.includes("rename --from"));

  check("manifest: exits 2 without --manifest", run("node", [manifestTool, "diff", "--repo", repo]).code === 2);
  check("manifest: exits 2 on an unknown command", run("node", [manifestTool, "frobnicate", "--manifest", manifest]).code === 2);
  check("manifest: exits 2 on an unknown option", tool("summary", "--nope", "x").code === 2);
}

// ------------------------------------------------------ manifest gate regressions
{
  const repo = gitRepo("manifest-gate-repo");
  write(repo, "src/one.js", "export const one = 1;\n");
  commit(repo, "one documented source");
  const root = path.join(tmp, "gate-artifacts");
  const file = path.join(root, "manifests", "project.json");
  const plan = path.join(tmp, "gate-plan.jsonl");
  const call = (at, command, ...args) => run("node", [manifestTool, command, "--manifest", at, "--repo", repo, ...args]);
  const gate = (command, ...args) => call(file, command, ...args);
  const json = (...args) => JSON.parse(gate(...args).out);
  const card = { kind: "module-card", id: "card", output: "docs/internal/card.md", files: ["src/one.js"] };
  const page = { kind: "public", id: "help", output: "docs/public/help.md", sections: ["card"] };
  write(root, card.output, "# Card");
  write(root, page.output, "# Help");
  const expect = (...rows) => {
    fs.writeFileSync(plan, rows.map(row => JSON.stringify(row)).join("\n"));
    return gate("expect", "--from", plan);
  };
  gate("init", "--slug", "demo");
  expect(card, page);
  gate("set-section", "--id", "card", "--kind", card.kind, "--output", card.output, "--file", card.files[0]);
  const review = status => gate("set-public", "--status", status, "--id", page.id, "--section", card.id);
  review("passed");
  check("manifest gate: reconciled project stamps", json("stamp").status === "stamped");
  for (const status of ["blocked", "needs-review"]) {
    review(status);
    check(`manifest gate: ${status} page stays on the diff work list`, json("diff").publicDocsToRecheck.includes(page.id));
  }
  review("passed");
  check("manifest gate: nonexistent feature directory refuses stamp", gate("stamp", "--scope", "feature", "--scope-dir", "absent").code === 2);
  fs.mkdirSync(path.join(repo, "empty-feature"));
  check("manifest gate: empty feature cannot borrow coverage from another area",
    json("stamp", "--scope", "feature", "--scope-dir", "empty-feature").status === "incomplete");
  write(repo, "src/two.js", "export const two = 2;\n");
  run("git", ["add", "--", "src/two.js"], repo);
  check("manifest gate: new staged source prevents certification", json("diff").added.includes("src/two.js") && json("stamp", "--scope", "repo-wide").status === "incomplete");
  write(repo, "assets/example.txt", "sample asset\n");
  run("git", ["add", "--", "assets/example.txt"], repo);
  const exclusion = { kind: "exclude", files: ["assets/example.txt"], reason: "asset" };
  const extended = { ...card, files: [...card.files, "src/two.js"] };
  expect(extended, page, exclusion);
  fs.writeFileSync(plan, JSON.stringify(extended));
  gate("set-section", "--from", plan);
  review("passed");
  check("manifest gate: explicit unchanged non-document source exclusion reconciles inventory",
    !json("diff").added.includes("assets/example.txt") && json("stamp").status === "stamped");
  write(repo, "assets/example.txt", "changed\n");
  check("manifest gate: changed excluded input needs reconciliation", json("diff").added.includes("assets/example.txt") && json("stamp").status === "incomplete");

  const rejected = "ghp_" + "M7x".repeat(12);
  const corrupt = path.join(root, "manifests", "bad.json");
  write(root, "manifests/bad.json", JSON.stringify({ schemaVersion: rejected, sourceIndex: {} }));
  const badVersion = call(corrupt, "summary");
  check("manifest gate: rejected schema version is absent from diagnostics", badVersion.code === 2 && !badVersion.out.includes(rejected) && badVersion.out.includes("schemaVersion"));
  fs.writeFileSync(corrupt, JSON.stringify({ schemaVersion: "1.0.0", sourceIndex: { sample: { sections: rejected } } }));
  const badMapping = call(corrupt, "summary");
  check("manifest gate: malformed saved mapping returns a bounded field diagnostic",
    badMapping.code === 2 && badMapping.out.includes("field sections") && !badMapping.out.includes(rejected));
  const badOption = gate("summary", "--" + rejected);
  const badSource = gate("set-section", "--id", rejected, "--kind", card.kind, "--output", card.output, "--file", rejected);
  check("manifest gate: rejected arguments and source fields are never echoed", [badOption, badSource].every(r => r.code === 2 && !r.out.includes(rejected)));
  check("manifest gate: rejects flag tokens used as option values", gate("init", "--slug", "-x").code === 2 && gate("summary", "--limit", "--list").code === 2);
  const bad = { ...card, files: rejected };
  for (const cmd of ["expect", "set-section"]) {
    fs.writeFileSync(plan, JSON.stringify(bad));
    const result = gate(cmd, "--from", plan);
    check(`manifest gate: ${cmd} rejects wrong field types with bounded row diagnostics`,
      result.code === 2 && /row 1\b/.test(result.out) && result.out.includes("files") && !result.out.includes(rejected) && !result.out.includes("TypeError"));
  }
  const physical = path.join(tmp, "manifest-physical");
  const alias = path.join(tmp, "manifest-alias");
  fs.mkdirSync(physical);
  fs.symlinkSync(physical, alias, process.platform === "win32" ? "junction" : "dir");
  const through = path.join(alias, "nested", "project", "manifests", "main.json");
  const linked = call(through, "init", "--slug", "demo");
  check("manifest gate: linked ancestor above artifact root refuses before filesystem writes",
    linked.code === 2 && fs.readdirSync(physical).length === 0);
  const placed = call(path.join(repo, "manifests", "main.json"), "init", "--slug", "demo");
  check("manifest gate: in-repo manifest refuses before filesystem writes", placed.code === 2 && !fs.existsSync(path.join(repo, "manifests")));
  const unrelated = gitRepo("unrelated-checkout");
  const misplaced = call(path.join(unrelated, "artifacts", "manifests", "main.json"), "init", "--slug", "demo");
  check("manifest gate: manifest inside a different checkout is refused before writes",
    misplaced.code === 2 && !fs.existsSync(path.join(unrelated, "artifacts")));
  const fallback = path.join(tmp, "os-temp", ".auto-master", "artifacts", "demo", "manifests", "project.json");
  check("manifest gate: external temporary artifact fallback is accepted",
    call(fallback, "init", "--slug", "demo").code === 0 && fs.lstatSync(fallback).isFile());
}

// ------------------------------------------------------- public-docs check
{
  const dir = path.join(tmp, "public-docs");
  const host = ["10", "20", "30", "40"].join(".");
  write(dir, "clean.md", "---\nslug: sync_feature\ntitle: Sync\n---\n# Sync\n\nPress the Sync button to copy your files. See [the guide](https://example.com/docs/sync_guide.html).\n");
  const cleanRun = run("node", [publicCheck, "--dir", dir, "--denylist", noDenylist]);
  check("public-check: product prose with frontmatter and a link is clean", cleanRun.code === 0 && cleanRun.out.includes("PUBLIC_DOC_CHECK=CLEAN") && cleanRun.out.includes("denylist=MISSING"), cleanRun.out);
  write(
    dir,
    "leaky.md",
    [
      "# Sync internals",
      "",
      "The logic lives in src/app/sync/engine.ts and is easy to follow.",
      "Open settings.json to change it.",
      "It calls handleSyncRequest() on the server.",
      "    at SyncEngine.run (engine.js:10:5)",
      `The staging server is ${host}.`,
      `This was built for ${codename}.`,
      `Write to ${["owner", "corp-mail.io"].join("@")} for access.`,
      "",
    ].join("\n"),
  );
  const leaky = run("node", [publicCheck, "--dir", dir, "--denylist", denylist]);
  for (const [category, line] of [["file-path", 3], ["file-name", 4], ["code-identifier", 5], ["stack-trace", 6], ["internal-host", 7], ["denylist-codename", 8], ["email-address", 9]]) {
    check(`public-check: flags ${category}`, new RegExp(`${category} \\(\\d+\\)\\n(?: {2}.*\\n)*? {2}leaky\\.md:${line}\\n`).test(leaky.out), leaky.out.replace(codename, "***"));
  }
  check("public-check: never prints the matched text", !leaky.out.includes(codename) && !leaky.out.includes(host) && !leaky.out.includes("handleSyncRequest"), "output contained matched text");
  check("public-check: reports hit totals", /PUBLIC_DOC_CHECK=HITS hits=\d+ files=2 flagged_files=1 denylist=SET terms=1/.test(leaky.out), leaky.out.replace(codename, "***"));
  const wikiHost = ["wiki", "corp"].join(".");
  write(
    dir,
    "links.md",
    ["---", `title: ${codename} sync`, "---", "# Sync", "", `See [the notes](http://${wikiHost}/sync) first.`, "The code is [here](../../src/auth/login.ts).", "Read [the public guide](https://example.com/guide/setup.html) too.", ""].join("\n"),
  );
  const links = run("node", [publicCheck, "--dir", dir, "--denylist", denylist]);
  check("public-check: finds a denylist term in frontmatter", /denylist-codename \(\d+\)\n(?: {2}.*\n)*? {2}links\.md:2\n/.test(links.out), links.out.replace(codename, "***"));
  check("public-check: flags a link to an internal host", /internal-host \(\d+\)\n(?: {2}.*\n)*? {2}links\.md:6\n/.test(links.out), links.out.replace(codename, "***"));
  check("public-check: flags a link to a source path", /file-path \(\d+\)\n(?: {2}.*\n)*? {2}links\.md:7\n/.test(links.out), links.out.replace(codename, "***"));
  check("public-check: does not flag a public link", !links.out.includes("links.md:8"), links.out.replace(codename, "***"));
  write(dir, `${codename.toLowerCase()}-guide.md`, "# Guide\n\nPress the button.\n");
  const named = run("node", [publicCheck, "--dir", dir, "--denylist", denylist]);
  check("public-check: flags a denylist term in a file name and masks it", named.out.includes("***-guide.md (file name)") && !named.out.toLowerCase().includes(codename.toLowerCase()), "the term was printed or the file name was not flagged");
  const publicLinks = path.join(tmp, "public-links");
  const sig = "ab12".repeat(16);
  const short = ["a3", "9Z", "km"].join("");
  write(publicLinks, "download.md", [
    `[download](https://example.com/download?sig=${sig})`,
    `[account](https://reader:${short}@example.com/guide)`,
    `[download](https://example.com/#access_token=${short})`,
    "[guide](https://example.com/help/setup.html)",
  ].join("\n"));
  const signed = run("node", [publicCheck, "--dir", publicLinks, "--denylist", noDenylist]);
  check("public-check: catches signed query, userinfo and fragment on public hosts", signed.code === 0 && signed.out.includes("sensitive-url (3)") && !signed.out.includes("download.md:4") && ![sig, short].some((v) => signed.out.includes(v)));
  const malformed = path.join(tmp, "bad-public-policy.json");
  fs.writeFileSync(malformed, "{");
  const badPolicy = run("node", [publicCheck, "--dir", publicLinks, "--denylist", malformed]);
  check("public-check: unreadable policy blocks a clean result", badPolicy.code === 2 && badPolicy.out.includes("PUBLIC_DOC_CHECK=INCOMPLETE") && !badPolicy.out.includes("PUBLIC_DOC_CHECK=CLEAN"));
  const invalidPolicy = denylistFile("invalid-public-policy.json", { domains: [{}] });
  const invalidShape = run("node", [publicCheck, "--dir", publicLinks, "--denylist", invalidPolicy]);
  check("public-check: rejects malformed policy entries", invalidShape.code === 2 && invalidShape.out.includes("denylist=UNREADABLE"));
  write(publicLinks, `${sig}.md`, `[download](https://example.com/?sig=${sig})\n`);
  const masked = run("node", [publicCheck, "--dir", publicLinks, "--denylist", noDenylist]);
  const error = run("node", [publicCheck, "--dir", path.join(tmp, sig)]);
  check("public-check: masks sensitive names in hits and errors", masked.code === 0 && masked.out.includes("***.md:1") && error.code === 2 && !(masked.out + error.out).includes(sig));
  const side = path.join(tmp, "linked-public-data");
  write(side, "side.md", "local review only\n");
  const junction = path.join(publicLinks, "linked-pages");
  fs.symlinkSync(side, junction, process.platform === "win32" ? "junction" : "dir");
  for (const [scope, where] of [["root", junction], ["child", publicLinks]]) {
    const coverage = run("node", [publicCheck, "--dir", where, "--denylist", noDenylist]);
    check(`public-check: a linked ${scope} makes coverage incomplete`, coverage.code === 2 && coverage.out.includes("PUBLIC_DOC_CHECK=INCOMPLETE reason=linked-input") && !coverage.out.includes("side.md"));
  }
  check("public-check: exits 2 without --dir", run("node", [publicCheck]).code === 2);
}

// ------------------------------------------------ shared scanner regressions
{
  const source = path.join(repoRoot, "shared", "scan-text.mjs");
  const copies = [scanner, publicCheck, docValidator].map((script) => path.join(path.dirname(script), "scan-text.mjs"));
  check("scanner policy: all three standalone copies match the distribution source", fs.existsSync(source) &&
    copies.every((copy) => fs.existsSync(copy) && fs.readFileSync(copy).equals(fs.readFileSync(source))));

  const token = "ghp_" + "Ba7".repeat(12);
  const root = path.join(tmp, "scanner-policy-corpus");
  const publicDir = path.join(root, "public");
  write(root, "public/guide.md", "# Guide\n" + token + "\n");
  const negative = () => run("node", [docValidator, root, "--negative-search", "--denylist", noDenylist]);
  const whole = () => run("node", [docValidator, root, "--denylist", noDenylist]);
  const pages = () => run("node", [publicCheck, "--dir", publicDir, "--denylist", noDenylist]);
  const utf8 = negative();
  const gate = whole();
  check("auto-doc: GitHub-shaped public text blocks certification and appears in negative search", gate.code !== 0 &&
    gate.out.includes("reason=unsafe-github-token") && utf8.out.includes("unsafe:github-token") && !(gate.out + utf8.out).includes(token));

  for (const endian of ["LE", "BE"]) {
    for (const useBom of [true, false]) {
      const wide = Buffer.from("# Guide\n" + token + "\n", "utf16le");
      if (endian === "BE") wide.swap16();
      const bom = endian === "LE" ? [0xff, 0xfe] : [0xfe, 0xff];
      write(root, "public/guide.md", useBom ? Buffer.concat([Buffer.from(bom), wide]) : wide);
      const checkDocs = pages();
      const checkCorpus = negative();
      check(`public scans: find the token in UTF-16 ${endian} ${useBom ? "with" : "without"} BOM`, checkDocs.code === 0 &&
        checkDocs.out.includes("key-like-string") && checkDocs.out.includes("guide.md:2") && checkCorpus.out.includes("unsafe:github-token") &&
        checkCorpus.out.includes("guide.md:2") && !(checkDocs.out + checkCorpus.out).includes(token));
    }
  }
  for (const [kind, bytes] of [["binary", [0, 0, 0, 0]], ["malformed UTF-8", [0xc3, 0x28]], ["ambiguous NUL", Buffer.from(token + "\0x")], ["truncated UTF-16", [0xff, 0xfe, 65]]]) {
    write(root, "public/guide.md", Buffer.from(bytes));
    const checks = [pages(), negative(), whole()];
    check(`public scans: ${kind} input makes coverage incomplete`, checks.every((result) =>
      result.code !== 0 && result.out.includes("=INCOMPLETE reason=unsupported-text-encoding") &&
      !/PUBLIC_DOC_CHECK=CLEAN|NEGATIVE_SEARCH_HITS unsafe=0|AUTO_DOC_ARTIFACTS=PASS/.test(result.out)));
  }
  const encoded = [...token].map((char) => "%" + char.charCodeAt(0).toString(16)).join("");
  write(root, "public/guide.md", `[download](https://example.com/download/${encoded})\n`);
  const link = pages();
  check("public-check: inspects percent-decoded URL path segments", link.code === 0 && link.out.includes("sensitive-url (1)") &&
    link.out.includes("guide.md:1") && !link.out.includes(token) && !link.out.includes(encoded));

  write(root, "public/guide.md", token);
  for (const [label, script, flag] of [["sanitize", scanner, "--fail-on-high"], ["public-check", publicCheck, "--max"]]) {
    const result = run("node", [script, "--dir", publicDir, "--denylist", flag]);
    check(`${label}: a following flag cannot be the denylist value`, result.code === 2 && result.out.includes("--denylist needs a value") && !result.out.includes(token));
  }

  const repo = gitRepo("all-ref-namespaces");
  write(repo, "index.md", "public\n");
  commit(repo, "initial");
  for (const [i, ref] of ["refs/notes/demo", "refs/stash", "refs/remotes/sample/main", "refs/archive/demo"].entries()) {
    write(repo, "detached.txt", token + "\n" + i);
    const hash = run("git", ["hash-object", "-w", "detached.txt"], repo);
    const update = run("git", ["update-ref", ref, hash.out.trim()], repo);
    if (hash.code !== 0 || update.code !== 0) throw Error("namespace fixture setup failed");
  }
  const all = run("node", [scanner, "--repo", repo, "--all-refs", "--denylist", noDenylist, "--fail-on-high"]);
  check("sanitize: all refs scans orphan endpoints in notes, stash, remotes and custom namespaces", all.code === 1 &&
    all.out.includes("HIGH github-token (4)") && ["refs/notes/demo", "refs/stash", "refs/remotes/sample/main", "refs/archive/demo"]
      .every((ref) => all.out.includes(ref + " (blob):1")) && !all.out.includes(token));
  check("sanitize: orphan blob guidance covers refs outside commit history", all.out.includes("no containing commit") && all.out.includes("ref endpoint"));
}

// ------------------------------------------------------- auto-doc validator
{
  const deepDive = [
    "# Sync",
    ...[
      "Source Evidence",
      "Existing Tests",
      "What The User Sees",
      "How It Works Internally",
      "Step-By-Step Runtime Flow",
      "Configuration And Settings",
      "Data Model",
      "Edge Cases And Failure Modes",
      "Error Messages And User Recovery",
      "Security And Privacy Boundary",
      "Troubleshooting",
      "User Questions This Section Should Answer",
      "Retrieval Notes For Assistant",
      "Gaps",
    ].map((heading) => `## ${heading}\nSource: src/sync.js:1-20\nNo direct test found\n`),
  ].join("\n");
  const sections = ["summary", "common-workflows", "limitations", "troubleshooting", "related-pages"];
  const publicDoc = [
    "---",
    "slug: sync",
    "title: Sync",
    "feature_area: sync",
    "public_safe: true",
    "source_batches:\n  - b1",
    "related_pages:\n  - sync",
    "canonical_terms:\n  - sync",
    "aliases:\n  - syncing",
    "last_source_review: 2026-01-01",
    "---",
    "# Sync",
    ...sections.map((id) => `## ${id} {#${id}}\nSync copies files when the user presses the Sync button.\n`),
    "## Source Evidence {#source-evidence}",
    ...sections.map((id) => `Section: ${id}\nEvidence:\n- Source: src/sync.js:1-20\nUnsupported claims: none\n`),
    "## Assistant Notes {#assistant-notes}",
    "Assistant should know:\n- Sync starts from the Sync button.\n\nAssistant should not claim:\n- Sync works offline.\n",
  ].join("\n");
  const coverageHeader = "| Feature | Source files covered | Private deep dive | Public doc page | Assistant can answer? | Missing details | Risk if omitted | Tests/evidence checked | Follow-up owner |";
  const chunk = { chunk_id: "sync#summary", doc_slug: "sync", section_id: "summary", title: "Summary", feature_area: "sync", verified: true, answerable: true, text: "Sync copies files.", source_files: ["src/sync.js:1-20"], do_not_claim: [], needs_verification: [] };
  const prompt = { prompt_id: "p1", question: "How do I sync?", expected_doc_slug: "sync", expected_section_id: "summary", intent: "howto", must_mention: ["Sync button"], must_not_claim: ["offline"], source_files: ["src/sync.js:1-20"] };
  const validate = (...args) => run("node", [docValidator, ...args, "--denylist", noDenylist]);

  const { createHash } = await import('node:crypto');
  const hashArea = (name) => createHash('sha256').update(name).digest('hex');
  const wholeMap = [
    '# Source Map', '## Project Profile', 'ingest_enabled: true', '## Top-Level Areas',
    '| Area | Purpose | Representative files | Candidate features | Tests/docs present | Batch | Notes |',
    '|---|---|---|---|---|---|---|', '| src | application | src/sync.js | sync | yes | b1 | covered |',
    '## Batch Assignments', 'b1 covers sync.', '## Existing Docs', 'None.',
    '## Discovery Commands', 'Enumerated source files.', '## Gaps', 'See batch gaps.', '',
  ].join('\n');
  const baseline = 'ingest_enabled: true\nSOURCE_ID=' + hashArea('fixture') + '\nSOURCE_COMMIT=abc1234\nSOURCE_STATE=clean\nSOURCE_AREAS=' + hashArea('src') + '\n';
  const batchMap = '# B1 Source Map\nPUBLIC_PAGES=sync\n## Command Log\n| cwd | command | result | surfaced |\n|---|---|---|---|\n| . | rg --files | PASS | src/sync.js |\n\n## Feature Map\n| Feature area | User-visible feature |\n|---|---|\n| sync | Sync |\n';
  const report = [
    '# Auto Doc Run Report', 'CORPUS_MODE=PASS', 'CORPUS_SCOPE=FULL_PROJECT', 'BATCHES_TOTAL=1',
    'BATCHES_COMPLETE=1', 'SOURCE_COMMIT=abc1234', '## Scope', 'The sync feature covers the project.',
    '## Artifact Root', 'External corpus.', '## Batches Completed', '| Batch | Coverage audit | Cross-batch findings |',
    '| --- | --- | --- |', '| b1 | audits/b1.coverage-audit.md | Sync covers the source area. No other consumers. |',
    '## Private Technical Docs', 'One sync deep dive.', '## Public Behavior Docs', 'One sync page.',
    '## Ingest Outputs', 'See the ingest profile and batch outputs.', '## Validation', 'Saved the post-review batch result.',
    '## Reviewer Findings', 'No open blocking findings.', '## Assistant Readiness', 'Answers how sync starts.',
    '## Remaining Gaps', 'Retry order remains unknown.', '',
  ].join('\n');
  function saveReceipt(root, id = 'b1', policy = noDenylist) {
    const result = run('node', [docValidator, root, '--batch', id, '--denylist', policy]);
    if (result.code !== 0) throw Error('valid fixture could not obtain post-review receipt');
    write(root, 'validation/' + id + '.validator-result.txt', result.out);
  }
  function corpus(name) {
    const root = path.join(tmp, name);
    write(root, "README.md", "# Corpus\n");
    write(root, "run-report.md", report);
    write(root, "source-map/README.md", wholeMap);
    write(root, "run-state.md", baseline);
    write(root, "source-map/b1.source-map.md", batchMap);
    write(root, "private-technical/b1/sync.deep-dive.md", deepDive);
    write(root, "public/sync.md", publicDoc);
    write(root, "gaps/b1.gaps.md", "# Gaps\nNeeds verification: retry order\n");
    write(root, "audits/b1.coverage-audit.md", `# Coverage\n${coverageHeader}\n|---|---|---|---|---|---|---|---|---|\n| sync | src/sync.js | yes | sync | yes | none | low | src/sync.js | none |\n`);
    write(root, "audits/b1.public-safety-audit.md", "PUBLIC_SAFE=PASS\n");
    write(root, "audits/b1.negative-search-audit.md", "NEGATIVE_SEARCH=PASS\nANTI_SHALLOW=PASS\n");
    write(root, "audits/b1.reviewer-pass.md", "OPEN_P0=0\nOPEN_P1=0\n");
    write(root, "ingest/b1.chunks.jsonl", `${JSON.stringify(chunk)}\n`);
    write(root, "ingest/b1.cache-prompts.jsonl", `${JSON.stringify(prompt)}\n`);
    saveReceipt(root);
    return root;
  }

  const good = corpus("corpus-good");
  const pass = validate(good);
  check("auto-doc validator: a complete corpus passes", pass.code === 0 && pass.out.includes("AUTO_DOC_ARTIFACTS=PASS batches=1 docs=1 chunks=1 cache_prompts=1"), pass.out);

  function rejectCorpus(name, mutate, reason) {
    const root = corpus('negative-' + name.replace(/\W/g, '-'));
    mutate(root);
    const result = validate(root);
    check('auto-doc validator: ' + name, result.code !== 0 && result.out.includes('reason=' + reason), result.out);
  }
  // Each mutation starts from a real saved post-review receipt and syntactically valid inputs.
  for (const [kind, row, key] of [['chunks', chunk, 'chunk_id'], ['cache-prompts', prompt, 'prompt_id']]) {
    for (const mutation of ['empty', 'duplicate']) {
      const changed = corpus('corpus-' + kind + '-' + mutation);
      const body = mutation === 'empty' ? JSON.stringify({ ...row, [key]: ' ' }) : [row, row].map((item) => JSON.stringify(item)).join('\n');
      write(changed, 'ingest/b1.' + kind + '.jsonl', body);
      const result = validate(changed, '--batch', 'b1');
      check('auto-doc validator: ' + mutation + ' ' + key + ' blocks batch validation',
        result.code === 1 && result.out.includes('reason=invalid-ingest-row-id'), result.out);
    }
  }
  rejectCorpus('rejects an unclosed YAML collection in a public title', (root) => write(root, 'public/sync.md', publicDoc.replace('title: Sync', 'title: [Sync')), 'invalid-page-title');
  rejectCorpus('rejects mismatched saved receipt counts and policy', (root) => write(root, 'validation/b1.validator-result.txt',
    'AUTO_DOC_ARTIFACTS=PASS scope=batch:b1 docs=0 chunks=0 cache_prompts=0 denylist=SET terms=99\n'), 'invalid-saved-batch-result');
  rejectCorpus('rejects changed batch content even with unchanged counts', (root) => write(root, 'public/sync.md', publicDoc.replace('Sync copies files', 'Sync copies new files')), 'invalid-saved-batch-result');
  const sharedCorpus = corpus('corpus-shared-receipts');
  write(sharedCorpus, 'public/sync.md', publicDoc.replace('  - b1', '  - b1\n  - b2'));
  write(sharedCorpus, 'source-map/README.md', wholeMap.replace('## Batch Assignments', '| src | application | src/sync.js | support | yes | b2 | shared |\n## Batch Assignments'));
  write(sharedCorpus, 'run-report.md', report.replace('BATCHES_TOTAL=1', 'BATCHES_TOTAL=2').replace('BATCHES_COMPLETE=1', 'BATCHES_COMPLETE=2')
    .replace('## Private Technical Docs', '| b2 | audits/b2.coverage-audit.md | Covered shared support topics. |\n## Private Technical Docs'));
  for (const name of ['source-map/b1.source-map.md', 'gaps/b1.gaps.md', 'audits/b1.coverage-audit.md', 'audits/b1.public-safety-audit.md',
    'audits/b1.negative-search-audit.md', 'audits/b1.reviewer-pass.md', 'private-technical/b1/sync.deep-dive.md']) {
    write(sharedCorpus, name.replace('b1', 'b2'), fs.readFileSync(path.join(sharedCorpus, name)));
  }
  write(sharedCorpus, 'ingest/b2.chunks.jsonl', JSON.stringify({ ...chunk, chunk_id: 'sync#limitations', section_id: 'limitations' }));
  write(sharedCorpus, 'ingest/b2.cache-prompts.jsonl', JSON.stringify({ ...prompt, prompt_id: 'p2', expected_section_id: 'limitations' }));
  saveReceipt(sharedCorpus, 'b1');
  saveReceipt(sharedCorpus, 'b2');
  const sharedPass = validate(sharedCorpus);
  check('auto-doc validator: exact receipts cover shared pages for both batches', sharedPass.code === 0, sharedPass.out);
  fs.appendFileSync(path.join(sharedCorpus, 'public/sync.md'), '\nA verified change.\n');
  const staleShared = validate(sharedCorpus);
  check('auto-doc validator: shared page changes invalidate all owning receipts',
    ['b1', 'b2'].every((id) => staleShared.out.includes('reason=invalid-saved-batch-result file=validation/' + id + '.validator-result.txt')), staleShared.out);
  const policyChange = corpus('corpus-changed-policy');
  const otherPolicy = denylistFile('corpus-another-policy.json', { terms: ['unpublished-fixture-name'] });
  saveReceipt(policyChange, 'b1', denylist);
  const stalePolicy = run('node', [docValidator, policyChange, '--denylist', otherPolicy]);
  check('auto-doc validator: equal-sized policy changes invalidate the receipt', stalePolicy.code === 1 && stalePolicy.out.includes('reason=invalid-saved-batch-result'), stalePolicy.out);
  const wrongStage = corpus('corpus-wrong-stage');
  const preview = validate(wrongStage, '--pre-review', '--batch', 'b1');
  write(wrongStage, 'validation/b1.validator-result.txt', preview.out);
  check('auto-doc validator: final check rejects a genuine pre-review receipt', validate(wrongStage).out.includes('reason=invalid-saved-batch-result'));
  const badOptions = [
    [good, '--denylist', '--negative-search', noDenylist],
    [good, '--batch', '--negative-search', 'b1', '--denylist', noDenylist],
    [good, '--denylist', '-x'], ['-x', '--denylist', noDenylist],
  ];
  check('auto-doc validator: option tokens cannot fill value or positional slots', badOptions.every((args) => run('node', [docValidator, ...args]).code === 2));
  rejectCorpus('rejects conflicting reviewer markers', (root) => write(root, 'audits/b1.reviewer-pass.md', 'OPEN_P0=0\nOPEN_P1=0\nOPEN_P0=1\n'), 'reviewer-open-p0-not-zero');
  rejectCorpus('rejects an empty enabled ingest pair', (root) => {
    for (const suffix of ['chunks', 'cache-prompts']) write(root, 'ingest/b1.' + suffix + '.jsonl', '');
  }, 'empty-enabled-ingest');
  for (const [slug, section] of [['absent', 'summary'], ['sync', 'nonexistent']]) {
    rejectCorpus('rejects mutually matching ingest for ' + slug + '#' + section, (root) => {
      write(root, 'ingest/b1.chunks.jsonl', JSON.stringify({ ...chunk, chunk_id: slug + '#' + section, doc_slug: slug, section_id: section }));
      write(root, 'ingest/b1.cache-prompts.jsonl', JSON.stringify({ ...prompt, expected_doc_slug: slug, expected_section_id: section }));
    }, 'chunk-references-missing-page-section');
  }
  rejectCorpus('rejects marker-only final report', (root) => write(root, 'run-report.md', report.split('## Scope')[0]), 'missing-or-empty-run-report-section');
  rejectCorpus('rejects empty final readiness section', (root) => write(root, 'run-report.md', report.replace('Answers how sync starts.', '')), 'missing-or-empty-run-report-section');
  rejectCorpus('requires a cross-batch audit entry for every batch', (root) => write(root, 'run-report.md', report.replace(/^\| b1 .*$/m, '')), 'missing-cross-batch-audit-entry');
  rejectCorpus('requires the saved batch validation result', (root) => fs.unlinkSync(path.join(root, 'validation/b1.validator-result.txt')), 'missing-batch-artifact');
  rejectCorpus('rejects a saved pre-review result', (root) => write(root, 'validation/b1.validator-result.txt', 'AUTO_DOC_ARTIFACTS=PASS scope=batch:b1 stage=pre-review docs=1'), 'invalid-saved-batch-result');
  rejectCorpus('rejects a heading-only whole-project map', (root) => write(root, 'source-map/README.md', '# Source Map\n'), 'incomplete-whole-project-source-map');
  rejectCorpus('rejects omission of a discovered project area', (root) => write(root, 'run-state.md', baseline.trim() + ' ' + hashArea('installer') + '\n'), 'unmapped-discovered-area');
  rejectCorpus('rejects conflicting public eligibility', (root) => write(root, 'public/sync.md', publicDoc.replace('public_safe: true', 'public_safe: true\npublic_safe: false')), 'duplicate-frontmatter-key');
  rejectCorpus('requires exact evidence section IDs', (root) => write(root, 'public/sync.md', publicDoc.replace('Section: summary', 'Section: summary-extra')), 'missing-section-evidence');
  rejectCorpus('rejects empty chunk text', (root) => write(root, 'ingest/b1.chunks.jsonl', JSON.stringify({ ...chunk, text: '   ' })), 'chunk-empty-text');
  rejectCorpus('rejects empty prompt questions', (root) => write(root, 'ingest/b1.cache-prompts.jsonl', JSON.stringify({ ...prompt, question: '' })), 'prompt-empty-question');
  const linkedCorpus = path.join(tmp, 'linked-corpus');
  fs.symlinkSync(good, linkedCorpus, process.platform === 'win32' ? 'junction' : 'dir');
  check('auto-doc validator: rejects symlinked corpus root', validate(linkedCorpus).out.includes('reason=linked-artifact-root'));
  const linkedRoot = corpus('corpus-linked-evidence');
  const outsideEvidence = path.join(tmp, 'outside-evidence');
  write(outsideEvidence, 'sync.evidence.md', 'outside the corpus');
  fs.symlinkSync(outsideEvidence, path.join(linkedRoot, 'public-evidence'), process.platform === 'win32' ? 'junction' : 'dir');
  for (const mode of [[], ['--batch', 'b1']]) {
    const linked = validate(linkedRoot, ...mode);
    check('auto-doc validator: linked evidence blocks ' + (mode[0] || 'corpus'), linked.code !== 0 && linked.out.includes('INCOMPLETE') && !linked.out.includes(outsideEvidence));
  }
  const privateArea = corpus('corpus-redacted-area');
  write(privateArea, 'source-map/README.md', wholeMap.replace('| src | application', '| sha256:' + hashArea('src') + ' | application'));
  check('auto-doc validator: accepts an inventoried area under its safe digest', validate(privateArea).code === 0);
  const disabled = corpus('corpus-disabled');
  write(disabled, 'source-map/README.md', wholeMap.replace('ingest_enabled: true', 'ingest_enabled: false'));
  check('auto-doc validator: rejects conflicting ingest profiles', validate(disabled).out.includes('reason=inconsistent-ingest-profile'));
  write(disabled, 'run-state.md', baseline.replace('ingest_enabled: true', 'ingest_enabled: false'));
  check('auto-doc validator: disabled ingest rejects stale rows', validate(disabled).out.includes('reason=ingest-disabled-with-rows'));
  fs.rmSync(path.join(disabled, 'ingest'), { recursive: true });
  saveReceipt(disabled);
  check('auto-doc validator: disabled ingest accepts absent files', validate(disabled).code === 0);
  write(disabled, 'ingest/unregistered.jsonl', JSON.stringify(prompt));
  check('auto-doc validator: disabled ingest rejects unregistered files', validate(disabled).out.includes('reason=unregistered-ingest-file'));
  const extra = corpus('corpus-extra-ingest');
  write(extra, 'ingest/nested/b1.chunks.jsonl', JSON.stringify(chunk));
  check('auto-doc validator: enabled ingest rejects shadow files', validate(extra).out.includes('reason=unregistered-ingest-file'));
  const scopedRoot = corpus('batch-isolation');
  write(scopedRoot, 'ingest/b2.chunks.jsonl', 'invalid-json\n');
  write(scopedRoot, 'public/unrelated.md', 'TODO\n');
  check('auto-doc validator: batch skips unrelated pages and ingest', validate(scopedRoot, '--batch', 'b1').code === 0 && !validate(scopedRoot, '--batch', 'b1', '--negative-search').out.includes('unrelated'));
  check('auto-doc validator: final sweep catches unrelated broken files', validate(scopedRoot).code !== 0);
  write(scopedRoot, 'source-map/b1.source-map.md', batchMap.replace('PUBLIC_PAGES=sync', 'PUBLIC_PAGES=sync shared'));
  write(scopedRoot, 'public/shared.md', publicDoc.replace('slug: sync', 'slug: shared').replace('  - b1', '  - b1\n  - b2').replace('public_safe: true', 'public_safe: false'));
  check('auto-doc validator: batch checks a shared owned page', validate(scopedRoot, '--batch', 'b1', '--pre-review').out.includes('reason=public-safe-not-true file=public/shared.md'));
  const privateFeature = corpus('private-feature');
  write(privateFeature, 'source-map/b1.source-map.md', batchMap + '| ' + codename + ' | Feature |\n');
  const failure = run('node', [docValidator, privateFeature, '--denylist', denylist]);
  check('auto-doc validator: omitted feature stays out of diagnostics', failure.code !== 0 && failure.out.includes('reason=coverage-missing-feature ') && !failure.out.toLowerCase().includes(codename.toLowerCase()));
  const malformed = denylistFile('corpus-malformed-policy.json', { terms: ['ok', {}] });
  for (const mode of [[], ['--negative-search']]) {
    const broken = run('node', [docValidator, good, '--denylist', malformed, ...mode]);
    check('auto-doc validator: malformed policy blocks ' + (mode[0] || 'corpus'), broken.code !== 0 && broken.out.includes('INCOMPLETE') && !broken.out.includes('ARTIFACTS=PASS'));
  }
  const unsafeArg = 'sk-' + 'a1B2'.repeat(6);
  check('auto-doc validator: usage error suppresses external argument', !validate(good, '--' + unsafeArg).out.includes(unsafeArg));
  write(privateFeature, 'public/' + unsafeArg + '.md', 'invalid');
  const privateName = validate(privateFeature);
  check('auto-doc validator: credential-shaped paths are masked in both streams', privateName.code !== 0 && !privateName.out.includes(unsafeArg) && privateName.out.includes('file=public/***'));
  const inspect = path.join(path.dirname(docValidator), 'inspect-source.mjs');
  const repo = gitRepo('corpus-inputs');
  write(repo, 'app/file', 'clean');
  commit(repo, 'baseline');
  const external = path.join(tmp, 'external-corpus');
  function inspectRun(project, dir) {
    // Treat this disposable fixture tree as the host in tests inside a checkout.
    return run("node", [inspect, project, dir], repoRoot, {
      ...process.env, GIT_CEILING_DIRECTORIES: path.dirname(tmp),
    });
  }
  const tempFallback = path.join(tmp, '.auto-master', 'artifacts', 'sample', 'auto-doc');
  check('auto-doc preflight: accepts isolated temporary fallback outside the project', inspectRun(repo, tempFallback).code === 0);
  const exported = path.join(tmp, 'external-output');
  const alias = path.join(tmp, 'external-alias');
  fs.mkdirSync(exported);
  fs.symlinkSync(exported, alias, process.platform === 'win32' ? 'junction' : 'dir');
  check('auto-doc preflight: rejects corpus reached through a junction', [alias, path.join(alias, 'new-corpus')].every((dir) => inspectRun(repo, dir).out.includes('reason=linked-artifact-root')));
  check('auto-doc preflight: option-shaped positionals are usage errors', inspectRun(repo, '--pretend-option').code === 2 && inspectRun('--pretend-option', external).code === 2);
  const clean = inspectRun(repo, external);
  check('auto-doc preflight: independent inventory uses source area hashes', clean.code === 0 && clean.out.includes('SOURCE_AREAS=' + hashArea('app')), clean.out);
  write(external, 'run-state.md', clean.out);
  check('auto-doc preflight: clean matching baseline is eligible', inspectRun(repo, external).out.includes('REFRESH=eligible'));
  write(repo, 'app/file', 'dirty');
  write(repo, 'draft/file', 'untracked');
  const dirty = inspectRun(repo, external);
  check('auto-doc preflight: untracked area requires full refresh', dirty.out.includes(hashArea('draft')) && dirty.out.includes('REFRESH=full'));
  const multiArea = corpus('corpus-multi-area');
  write(multiArea, 'run-state.md', 'ingest_enabled: true\n' + dirty.out);
  write(multiArea, 'source-map/README.md', wholeMap.replace('| src | application', '| app | application'));
  const originalReport = fs.readFileSync(path.join(multiArea, 'run-report.md'), 'utf8');
  write(multiArea, 'run-report.md', originalReport.replace('abc1234', dirty.out.match(/^SOURCE_COMMIT=(.*)$/m)[1]));
  check('auto-doc validator: actual second source area cannot disappear from map', validate(multiArea).out.includes('reason=unmapped-discovered-area'));
  write(external, 'run-state.md', dirty.out);
  write(repo, 'app/file', 'clean');
  fs.unlinkSync(path.join(repo, 'draft/file'));
  check('auto-doc preflight: reverting dirty baseline still requires full refresh', inspectRun(repo, external).out.includes('REFRESH=full'));
  write(external, 'run-state.md', clean.out);
  for (const flag of ['assume-unchanged', 'skip-worktree']) {
    run('git', ['update-index', '--' + flag, 'app/file'], repo);
    write(repo, 'app/file', 'hidden edit');
    const masked = inspectRun(repo, external);
    check('auto-doc preflight: ' + flag + ' cannot certify a clean baseline', masked.code === 0 && masked.out.includes('SOURCE_STATE=unknown') && masked.out.includes('REFRESH=full'));
    write(repo, 'app/file', 'clean');
    run('git', ['update-index', '--no-' + flag, 'app/file'], repo);
  }
  check('auto-doc preflight: rejects private corpus inside the repo', inspectRun(repo, path.join(repo, 'docs/corpus')).out.includes('reason=corpus-inside-project'));
  const otherRepo = gitRepo('other-corpus-inputs');
  check('auto-doc preflight: rejects corpus inside another repo', inspectRun(repo, path.join(otherRepo, 'public-docs')).out.includes('reason=corpus-inside-repository'));
  check('auto-doc preflight: rejects another worktree identity', inspectRun(otherRepo, external).out.includes('reason=corpus-identity-mismatch'));

  const crlf = corpus("corpus-crlf");
  fs.writeFileSync(path.join(crlf, "public", "sync.md"), publicDoc.replace(/\n/g, "\r\n"));
  saveReceipt(crlf);
  check("auto-doc validator: CRLF files pass", validate(crlf).code === 0);

  const sidecar = corpus("corpus-sidecar");
  const footer = publicDoc.indexOf("Section: summary");
  const notes = publicDoc.indexOf("## Assistant Notes");
  write(sidecar, "public/sync.md", `${publicDoc.slice(0, footer)}See the evidence file.\n${publicDoc.slice(notes)}`);
  write(sidecar, "public-evidence/sync.evidence.md", publicDoc.slice(footer, notes));
  saveReceipt(sidecar);
  const sidecarRun = validate(sidecar);
  check("auto-doc validator: accepts section evidence in public-evidence/", sidecarRun.code === 0, sidecarRun.out);
  write(sidecar, "public-evidence/sync.evidence.md", `${publicDoc.slice(footer, notes)}\nTODO confirm\n`);
  check("auto-doc validator: checks public-evidence/ for blocking terms", validate(sidecar).out.includes("reason=public-blocking-todo file=public-evidence/sync.evidence.md"));

  const inProgress = corpus("corpus-in-progress");
  fs.rmSync(path.join(inProgress, "run-report.md"));
  check("auto-doc validator: the whole-corpus check needs the run report", validate(inProgress).out.includes("reason=missing-run-report"));
  const batchRun = validate(inProgress, "--batch", "b1");
  check("auto-doc validator: --batch passes before the run report exists", batchRun.code === 0 && batchRun.out.includes("AUTO_DOC_ARTIFACTS=PASS scope=batch:b1"), batchRun.out);
  fs.rmSync(path.join(inProgress, "audits", "b1.reviewer-pass.md"));
  const preReview = validate(inProgress, "--batch", "b1", "--pre-review");
  check("auto-doc validator: --pre-review passes before the reviewer pass exists", preReview.code === 0 && preReview.out.includes("scope=batch:b1 stage=pre-review"), preReview.out);
  const postReview = validate(inProgress, "--batch", "b1");
  check("auto-doc validator: without --pre-review the reviewer pass is required", postReview.code === 1 && postReview.out.includes("file=audits/b1.reviewer-pass.md"), postReview.out);
  check("auto-doc validator: --pre-review needs --batch", validate(inProgress, "--pre-review").code === 2);
  check("auto-doc validator: --batch rejects an unknown batch", validate(inProgress, "--batch", "nope").code === 2);
  check("auto-doc validator: --batch rejects a path as batch id", validate(inProgress, "--batch", "../x").code === 2);

  const noCommit = corpus("corpus-no-commit");
  write(noCommit, "run-report.md", "CORPUS_MODE=PASS\nCORPUS_SCOPE=FULL_PROJECT\nBATCHES_TOTAL=1\nBATCHES_COMPLETE=1\n");
  check("auto-doc validator: the run report needs SOURCE_COMMIT", validate(noCommit).out.includes("reason=missing-source-commit"));

  const bad = corpus("corpus-bad");
  const fakeKey = `sk-${"a1B2".repeat(6)}`;
  write(bad, "audits/b1.reviewer-pass.md", "OPEN_P0=03\nOPEN_P1=0\n");
  write(bad, "public/sync.md", publicDoc.replace("public_safe: true", "public_safe: false"));
  write(bad, "private-technical/b1/sync.deep-dive.md", deepDive.replace("## Gaps", "## Open Items"));
  write(bad, "gaps/b1.gaps.md", `key ${fakeKey}\n`);
  fs.rmSync(path.join(bad, "ingest", "b1.cache-prompts.jsonl"));
  const failRun = validate(bad);
  check("auto-doc validator: a broken corpus exits 1", failRun.code === 1, failRun.out);
  for (const reason of ["reviewer-open-p0-not-zero", "public-safe-not-true", "missing-deep-dive-section-gaps", "unsafe-openai-like-key", "missing-batch-artifact"]) {
    check(`auto-doc validator: one run reports ${reason}`, failRun.out.includes(`reason=${reason}`), failRun.out);
  }
  check("auto-doc validator: prints the failure count", /AUTO_DOC_ARTIFACTS=FAIL failures=7\b/.test(failRun.out), failRun.out);
  check("auto-doc validator: never prints the matched key", !failRun.out.includes(fakeKey));

  const absent = validate(path.join(tmp, "no-such-corpus"));
  check("auto-doc validator: missing root fails cleanly", absent.code === 1 && absent.out.includes("reason=artifact-root-missing"), absent.out);

  const leaked = corpus("corpus-denylist");
  write(leaked, "public/sync.md", publicDoc.replace("Sync copies files when", `${codename} sync copies files when`));
  const leakedRun = run("node", [docValidator, leaked, "--denylist", denylist]);
  check("auto-doc validator: fails a denylist term in public output, by category", leakedRun.code === 1 && leakedRun.out.includes("reason=public-denylist-codename file=public/sync.md") && !leakedRun.out.includes(codename), leakedRun.out.replace(codename, "***"));

  const namedCorpus = corpus("corpus-denylist-name");
  write(namedCorpus, `public/${codename.toLowerCase()}-notes.md`, publicDoc);
  const namedRun = run("node", [docValidator, namedCorpus, "--denylist", denylist]);
  check("auto-doc validator: fails a denylist term in a public file name, masked", namedRun.code === 1 && namedRun.out.includes("reason=public-denylist-codename-in-file-name file=public/***-notes.md") && !namedRun.out.toLowerCase().includes(codename.toLowerCase()), "the term was printed or the file name was not failed");

  const wordy = corpus("corpus-wordy");
  const internalAddress = ["10", "1", "2", "3"].join(".");
  write(wordy, "public/sync.md", publicDoc.replace("Sync copies files when", "Sync is seamless and always copies files when"));
  write(wordy, "private-technical/b1/sync.deep-dive.md", `${deepDive}\nServer ${internalAddress} is robust.\n`);
  const negative = validate(wordy, "--negative-search");
  check("auto-doc validator: --negative-search exits 0", negative.code === 0, negative.out);
  check("auto-doc validator: --negative-search lists wording hits by line", /wording:seamless \(\d+\)\n {2}public\/sync\.md:\d+/.test(negative.out) && negative.out.includes("wording:always"), negative.out);
  check("auto-doc validator: --negative-search lists unsafe hits without the value", negative.out.includes("unsafe:private-ipv4") && !negative.out.includes(internalAddress), negative.out);
  check("auto-doc validator: Needs verification is allowed in gaps", !negative.out.includes("gaps/b1.gaps.md"), negative.out);
  check("auto-doc validator: audits are exempt from wording checks", !/wording:[a-z-]+ \(\d+\)\n(?: {2}.*\n)* {2}audits\//.test(negative.out), negative.out);
  const flagFirst = run("node", [docValidator, "--negative-search", wordy, "--denylist", noDenylist]);
  check("auto-doc validator: the flag may come before the artifact root", flagFirst.code === 0 && flagFirst.out === negative.out, flagFirst.out);
  const scoped = validate(wordy, "--negative-search", "--batch", "b1");
  check("auto-doc validator: --negative-search accepts --batch", scoped.code === 0 && scoped.out.includes("batch=b1") && scoped.out.includes("private-technical/b1/sync.deep-dive.md"), scoped.out);
  const positional = validate(wordy, "--negative-search", "b1");
  check("auto-doc validator: a second positional argument is an error, not a silent default", positional.code === 2 && positional.out.includes("--batch"), positional.out);
  check("auto-doc validator: --negative-search needs the artifact root", run("node", [docValidator, "--negative-search"]).code === 2);
  const denyNegative = run("node", [docValidator, leaked, "--negative-search", "--denylist", denylist]);
  check("auto-doc validator: --negative-search lists denylist hits by category", denyNegative.out.includes("blocking:denylist-codename") && !denyNegative.out.includes(codename), denyNegative.out.replace(codename, "***"));
}

// ------------------------------------------------ fixture and measurement errors
{
  const secretName = "ghp_" + "cA1".repeat(12);
  const brokenRoot = path.join(tmp, secretName);
  let transport;
  try {
    transport = fixtureIO.spawnFixture(process.execPath, ["--version"], { env: { ...process.env, FIXTURE_STDIO_ROOT: brokenRoot } });
  } catch {
    // Old transports threw an error containing the private temporary path.
  }
  check("fixture stdio: invalid fixture root returns a fixed spawn error", transport?.error?.code === "EFIXTURE" &&
    transport.status === null && !transport.error.message.includes(secretName));

  const measureRepo = gitRepo("measurement-input-error");
  write(measureRepo, "skills/alpha/SKILL.md", "# Alpha\n");
  write(measureRepo, "scripts/measure-load.mjs", fs.readFileSync(path.join(repoRoot, "scripts", "measure-load.mjs")));
  write(measureRepo, "shared/git-run.mjs", fs.readFileSync(path.join(repoRoot, "shared", "git-run.mjs")));
  commit(measureRepo, "measurement baseline");
  fs.renameSync(path.join(measureRepo, "skills"), path.join(measureRepo, secretName));
  const missing = run("node", ["scripts/measure-load.mjs", "HEAD"], measureRepo);
  check("measure-load: missing working skills produce one bounded diagnostic", missing.code === 2 &&
    missing.out.trim() === "error: cannot read measurement input");

  // Force setup failure after mkdtemp, using an existing private fixture directory.
  const fixtureEnv = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/^(path|tmp|temp|tmpdir)$/i.test(key)));
  fs.mkdirSync(brokenRoot);
  const noGit = run(process.execPath, [path.join(repoRoot, "scripts", "test-scripts.mjs")], repoRoot,
    { ...fixtureEnv, PATH: brokenRoot, TMP: brokenRoot, TEMP: brokenRoot, TMPDIR: brokenRoot });
  check("test runner: failed fixture setup with a private path has a bounded diagnostic", noGit.code === 2 &&
    noGit.out.trim() === "Test fixture setup or execution failed.");
}

// Exercise both independently installed documentation skills against real local Git indexes.
{
  const src = gitRepo("location-source");
  fs.mkdirSync(path.join(src, "feature"));
  const dotfiles = gitRepo("home-worktree");
  const userHome = path.join(dotfiles, "home");
  fs.mkdirSync(userHome);
  const env = { ...process.env, HOME: userHome, USERPROFILE: userHome, GIT_CEILING_DIRECTORIES: path.dirname(tmp) };
  const subset = path.join(userHome, ".auto-master", "artifacts");
  const manifest = (root, source, options, extraEnv = env) =>
    run(process.execPath, [manifestTool, "init", "--repo", source, "--manifest", path.join(root, "manifests", "docs.json"),
      "--slug", "docs", ...options], repoRoot, extraEnv);
  const inspect = (root, source, extraEnv = env) =>
    run(process.execPath, [path.join(path.dirname(docValidator), "inspect-source.mjs"), source, root], repoRoot, extraEnv);
  const ref = path.join(subset, "doc-project");
  const corpus = path.join(subset, "corpus-project");
  function pair(source, m = ref, c = corpus, extraEnv = env) {
    return [manifest(m, source, [], extraEnv), inspect(c, source, extraEnv)];
  }
  const ignored = pair(src);
  check("placement: unignored home gives ignore and external temp remedies", ignored.every(r =>
    r.code !== 0 && r.out.includes("ignore rule") && r.out.includes("<os-temp>/.auto-master/artifacts/") && !r.out.includes(dotfiles)) &&
    !fs.existsSync(subset));
  write(dotfiles, ".gitignore", "/home/.auto-master/\n");
  check("placement: both helpers allow ignored artifacts beneath home in an ancestor worktree", pair(src).every(r => r.code === 0));
  const homeEnv = { ...env, HOME: dotfiles, USERPROFILE: dotfiles };
  check("placement: ignored outputs accepted when home is the worktree root", pair(src, ref, corpus, homeEnv).every(r => r.code === 0));
  for (const root of [ref, corpus]) write(root, "tracked.txt", "already tracked");
  run("git", ["add", "-f", "--", path.relative(dotfiles, path.join(ref, "tracked.txt")),
    path.relative(dotfiles, path.join(corpus, "tracked.txt"))], dotfiles);
  check("placement: forced tracked descendants override the home ignore", pair(src).every(r => r.code !== 0 && /track/.test(r.out)));
  const inSource = pair(dotfiles);
  check("placement: source never qualifies for the home exception", inSource.every(r => r.code !== 0) &&
    inSource[0].out.includes("outside the source worktree") && inSource[1].out.includes("corpus-inside-project"));
  const other = gitRepo("unrelated-doc-location");
  write(other, ".gitignore", "/artifacts/\n");
  const outsider = pair(src, path.join(other, "artifacts", "m"), path.join(other, "artifacts", "c"));
  check("placement: ignored unrelated worktree names the external fallback", outsider.every(r =>
    r.code !== 0 && r.out.includes("<os-temp>/.auto-master/artifacts/")));
  const noPaths = Object.fromEntries(Object.entries(env).filter(([k]) => k.toUpperCase() !== "PATH"));
  const noGit = pair(src, path.join(tmp, "no-git-m"), path.join(tmp, "no-git-c"), { ...noPaths, PATH: tmp });
  check("placement: missing Git blocks both helpers with a specific reason", noGit.every(r => r.code !== 0 && r.out.includes("git-unavailable")));
  const broken = path.join(tmp, "broken-worktree");
  write(broken, ".git", "gitdir: missing-directory\\n");
  check("placement: corrupt repository metadata cannot masquerade as external",
    pair(src, path.join(broken, "m"), path.join(broken, "c")).every(r => r.code !== 0 && r.out.includes("git-discovery-failed")));
  const tempRoot = path.join(tmp, "scope-init");
  const absent = manifest(tempRoot, src, ["--scope", "feature"]);
  const mixed = manifest(tempRoot, src, ["--scope", "repo-wide", "--scope-dir", "feature"]);
  const nonexistent = manifest(tempRoot, src, ["--scope", "feature", "--scope-dir", "missing"]);
  check("manifest scope: invalid init fails before creating artifacts", absent.code === 2 && mixed.code === 2 && nonexistent.code === 2 &&
    absent.out.includes("feature scope requires real scope directories") && mixed.out.includes("feature scope requires real scope directories") &&
    !fs.existsSync(tempRoot));
  const valid = manifest(tempRoot, src, ["--scope", "feature", "--scope-dir", "feature"]);
  const location = path.join(tempRoot, "manifests", "docs.json");
  const data = JSON.parse(fs.readFileSync(location, "utf8"));
  check("manifest scope: valid feature init records its real directories", valid.code === 0 && data.scope === "feature" &&
    JSON.stringify(data.scopeDirs) === JSON.stringify(["feature"]));
  const stamp = run(process.execPath, [manifestTool, "stamp", "--repo", src, "--manifest", location, "--scope", "feature"]);
  check("manifest scope: init and stamp use the same diagnostic", stamp.code === 2 && stamp.out === absent.out);
  const scopedStamp = run(process.execPath, [manifestTool, "stamp", "--repo", src, "--manifest", location, "--scope", "feature", "--scope-dir", "feature"]);
  check("manifest scope: feature stamp accepts initialized directories", scopedStamp.code === 0 && /"status": "incomplete"/.test(scopedStamp.out));
  const copies = [path.dirname(manifestTool), path.dirname(docValidator)].map(dir => path.join(dir, "artifact-location.mjs"));
  check("placement: both standalone skills ship identical location rules", copies.every(file => fs.existsSync(file)) &&
    fs.readFileSync(copies[0]).equals(fs.readFileSync(copies[1])));
}

// ------------------------------------------------------- repository checks
{
  const bytes = Buffer.from([0, 42, 255]);
  const transport = fixtureIO.spawnFixture(process.execPath, ["-e",
    "process.stdout.write(require('node:fs').readFileSync(0)); process.stderr.write('diagnostic'); process.exitCode=3"],
    { input: bytes, env: { ...process.env, FIXTURE_STDIO_ROOT: tmp }, windowsHide: true });
  check("fixture stdio: preserves binary input, separate diagnostics and exit status",
    transport.status === 3 && transport.stdout.equals(bytes) && transport.stderr.toString() === "diagnostic");
  const validate = run("node", ["scripts/validate-skills.mjs", "--stats"]);
  check("validate-skills: the repository passes", validate.code === 0, validate.out);
  const kernel = run("node", ["scripts/sync-kernel.mjs", "--check"]);
  check("sync-kernel: every kernel copy is in sync", kernel.code === 0, kernel.out);
  const measure = run("node", ["scripts/measure-load.mjs", "HEAD"]);
  check("measure-load: runs against a git ref", measure.code === 0 && measure.out.includes("3. default run"), measure.out);
  check("measure-load: rejects an unknown ref", run("node", ["scripts/measure-load.mjs", "no-such-ref"]).code === 2);

  const content = rel => fs.readFileSync(path.join(repoRoot, rel), "utf8");
  const qaContract = content("skills/master-qa/SKILL.md");
  const reviewContract = content("skills/master-release-review/SKILL.md");
  check("release discovery: feature docs cannot stand in for the candidate", [
    "skills/master-qa/references/surface-inventory.md", "skills/master-release-review/references/release-surface-map.md",
  ].every(rel => /scope and revision/.test(content(rel)) && /actual candidate/.test(content(rel)) && !/guaranteed-complete/.test(content(rel))));
  check("release rerun: new artifacts retain unresolved required rows", [qaContract, reviewContract].every(s =>
    /every unresolved required row/i.test(s) && /artifact digest/.test(s) && /same commit/.test(s)));
  check("release build: executed packaging failure is failed", /executed packaging or build error as `failed`/.test(qaContract) && /missing build prerequisite as `blocked`/.test(qaContract));
  check("release sign-off: standalone equivalent must match artifact and retests", /equivalent evidence/.test(qaContract) &&
    ["independent report", "digest/build", "unresolved findings", "retest evidence", "blocks this required gate"].every(term =>
      content("skills/master-qa/references/release-gates.md").includes(term)));

  const emptyPath = Object.fromEntries(Object.entries(process.env).filter(([key]) => key.toUpperCase() !== "PATH"));
  const unavailable = run(process.execPath, ["scripts/measure-load.mjs", "HEAD"], repoRoot, { ...emptyPath, PATH: tmp });
  check("measure-load: Git execution errors differ from unknown refs", unavailable.code === 2 && /cannot execute Git/.test(unavailable.out));
  const descriptionCounts = fs.readdirSync(path.join(repoRoot, "skills"), { withFileTypes: true }).filter(entry => entry.isDirectory())
    .map(entry => content(`skills/${entry.name}/SKILL.md`).match(/^description: (.+)$/m)[1].trim().length);
  const reportedTotal = Number(measure.out.match(/^TOTAL\s+\d+\s+(\d+)/m)?.[1]);
  check("measure-load: description total includes every distributed skill", reportedTotal === descriptionCounts.reduce((sum, n) => sum + n, 0));
  const pipelineBodies = ["auto-manage", "auto-plan", "auto-pilot", "auto-qa"].map(name =>
    content(`skills/${name}/SKILL.md`).replace(/\r\n/g, "\n").replace(/^---\n[\s\S]*?\n---\n/, "").length);
  const measuredPipeline = Number(measure.out.match(/^pipeline:.*?\s+\d+\s+(\d+)/m)?.[1]);
  check("measure-load: pipeline excludes all four frontmatters", measuredPipeline === pipelineBodies.reduce((sum, n) => sum + n, 0));
  check("measure-load: default pipeline stays within the revised text budget", measuredPipeline <= 16_429, measuredPipeline);
  check("measure-load: each pipeline body stays within 9000 characters", pipelineBodies.every(n => n <= 9_000));

  // The validator must reject the defects it exists to catch.
  const copy = path.join(tmp, "repo-copy");
  fs.mkdirSync(copy);
  for (const name of ["skills", "scripts", "shared", "README.md"]) {
    fs.cpSync(path.join(repoRoot, name), path.join(copy, name), { recursive: true });
  }
  const expectFail = (name, relFile, mutate, pattern) => {
    const file = path.join(copy, ...relFile.split("/"));
    const original = fs.readFileSync(file, "utf8");
    const mutated = mutate(original);
    if (mutated === original) {
      check(`validate-skills: rejects ${name}`, false, "the test mutation changed nothing");
      return;
    }
    fs.writeFileSync(file, mutated);
    const result = run("node", ["scripts/validate-skills.mjs"], copy);
    check(`validate-skills: rejects ${name}`, result.code === 1 && pattern.test(result.out), result.out);
    fs.writeFileSync(file, original);
  };
  expectFail("standalone Git runner drift", "skills/master-sanitize/scripts/git-run.mjs",
    original => original + "\n// drift\n", /standalone Git runner differs from distribution source/);
  for (const carrier of ["skills/auto-manage/SKILL.md", "skills/auto-pilot/SKILL.md", "skills/auto-plan/references/verification-kernel.md"]) {
    const file = path.join(copy, ...carrier.split("/"));
    const text = fs.readFileSync(file, "utf8");
    fs.writeFileSync(file, text.replace("at most five implementation", "at most nine implementation"));
    const result = run("node", ["scripts/validate-skills.mjs"], copy);
    check(`validate-skills: rejects a stale kernel copy in ${carrier}`, result.code === 1 && /kernel is out of sync/.test(result.out), result.out);
    const sync = run("node", ["scripts/sync-kernel.mjs"], copy);
    check(`sync-kernel: repairs the stale copy in ${carrier}`, sync.code === 0 && fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n") === text.replace(/\r\n/g, "\n"), sync.out);
  }
  expectFail("missing catalog entry despite a measurement row", "README.md", s => s.replace(/^\| `wow-loop` \| Improve.*$/m, ""), /skill table does not list/);
  expectFail("an unrelated routing phrase", "shared/trigger-cases.json", s => s.replace("rebuild that Python tool in Rust", "correct the filename"), /phrase must contain its routing keyword/);
  expectFail("missing documented discovery location", "README.md", s => s.replaceAll("$HOME/.agents/skills", "$HOME/obsolete"), /missing dual-runtime contract text/);
  check("resume: attempts survive interruption and worktree changes", ["auto-pilot", "auto-manage"].every(name => {
    const contract = content(`skills/${name}/SKILL.md`);
    const recovery = content(`skills/${name}/references/resume.md`);
    return ["worktree", "roadmap identity", "in-flight slice", "baseline receipt", "attempt count", "failure signature", "references/resume.md"].every(term => contract.includes(term)) &&
      ["HEAD", "dirty diff", "completed receipts", "interrupted attempt"].every(term => recovery.includes(term));
  }));
  check("gate receipts: reuse requires matching evidence for all four dimensions", /same diff or build, configuration, environment and acceptance criterion/.test(content("shared/verification-kernel.md")));
  check("plan: multiple checks and slice count survive a small UI plan", ["smallest sufficient set", "risk and slice count", "keyboard or persistence"].every(term =>
    content("skills/auto-plan/SKILL.md").includes(term)));
  const routingCases = JSON.parse(content("shared/routing-eval.json"));
  const responses = routingCases.map(item => ({ id: item.id, reads: item.skills.map(name => `.agents/skills/${name}/SKILL.md`),
    observed: true, isolated: true, boundaryMet: true, evidence: "fixture receipt" }));
  const routingFile = path.join(tmp, "routing.jsonl");
  function score() {
    fs.writeFileSync(routingFile, responses.map(row => JSON.stringify(row)).join("\n"));
    return run("node", ["scripts/score-routing.mjs", routingFile]);
  }
  check("routing eval: complete observed reads and gates score", score().code === 0);
  responses.find(row => row.id === "fork").reads.push(".agents/skills/auto-copy/SKILL.md");
  responses.find(row => row.id === "port").boundaryMet = false;
  const wrongRoute = score();
  check("routing eval: rejects false positive and crossed approval gate", wrongRoute.code === 1 && wrongRoute.out.includes("fork FAIL") && wrongRoute.out.includes("port FAIL"));
  const loop = content("skills/wow-loop/SKILL.md");
  check("wow-loop: final verdict requires cold read within shared round limit", ["cold read", "after six rounds total", "cannot resume the same reviewer", "at most two reviewer agents", "Send only the difference", "stop without a final WOW"].every(term => loop.includes(term)));
  check("wow-loop: reuse cached context promptly and report each resumed wait",
    ["Batch fixes into one follow-up", "Resume the same reviewer regardless of elapsed time",
      "cheapest while that context is still warm", "Start a long build or test run before preparing the follow-up",
      "as soon as the fixes are verified", "no unrelated work between rounds", "For each resumed round",
      "approximate wait from the previous verdict to the follow-up", "unknown unless the host reports it"].every(term => loop.includes(term)));
  check("wow-loop: only an upfront user waiver on a small task permits a one-reviewer verdict",
    loop.includes("A plain final `WOW` requires a second reviewer's independent cold read") &&
    loop.includes("Only the user may waive the cold read at the start of the loop for a small task") &&
    loop.includes("If the first reviewer says WOW and the user waived the cold read at the start, use this exact verdict line before the structured report: `WOW (one reviewer; cold read waived by the user)`"));
  const openingIntents = {
    "auto-copy": /external behavior.*target project/, "auto-doc": /whole-project.*assistant ingest/,
    "master-docs": /repo or feature documentation/, "auto-pilot": /existing approved roadmap/,
    "auto-manage": /planning and delivery/, "auto-plan": /implementation slices/,
    "auto-research": /research questions.*findings/, "auto-reflect": /recurrence guard.*confirmed agent failure/,
    "auto-qa": /change behavior/, "master-qa": /release artifact functionality/,
    "master-sanitize": /public repo contents and history/, "master-release-review": /distribution trust/,
    "master-refactor": /structural cleanup.*approval/, "master-optimize": /resource waste/,
    "wow-loop": /independent review until a reviewer says wow/,
  };
  check("routing: opening clauses distinguish neighboring intents", Object.entries(openingIntents).every(([name, intent]) => {
    const opening = content(`skills/${name}/SKILL.md`).match(/^description: ([^.]+)/m)?.[1].toLowerCase();
    return intent.test(opening);
  }));
  const descPolicy = content("skills/auto-doc/agents/openai.yaml");
  check("starter policy: explicit corpus and qualified evidence decisions", /allow_implicit_invocation: false/.test(descPolicy) &&
    ["master-qa", "master-release-review"].every(name => /decision allowed by the evidence/.test(content(`skills/${name}/agents/openai.yaml`))));
  check("review context: inherited history and unavailable controls are accounted for", /inherited|inherit conversation history/.test(content("skills/auto-manage/SKILL.md")) &&
    ["auto-plan", "auto-qa", "master-refactor"].every(name => content(`skills/${name}/SKILL.md`).includes("complete kernel rules are actually in context")));
  check("updates: reconcile policy before replacing installation", /Carry local files, Codex YAML policy and Claude frontmatter overrides/.test(content("README.md")) && !/delete the old skill folder first/.test(content("README.md")));
  expectFail("a second undeclared carrier", "skills/auto-plan/SKILL.md", text => text + "\n<!-- kernel:start -->\n<!-- kernel:end -->\n", /undeclared kernel carrier/);
  const pilot = "skills/auto-pilot/SKILL.md";
  expectFail("duplicate marker pair", pilot, text => text + "\n<!-- kernel:start -->\n<!-- kernel:end -->\n", /exactly one ordered kernel marker pair/);
  const dropMarkers = text => text.replace(/<!-- kernel:(?:start|end) -->/g, "").replace("five implementation", "nine implementation");
  expectFail("missing kernel markers", pilot, dropMarkers, /exactly one ordered kernel marker pair/);
  const pilotFile = path.join(copy, pilot);
  const originalPilot = fs.readFileSync(pilotFile, "utf8");
  fs.writeFileSync(pilotFile, dropMarkers(originalPilot));
  const missingMarkers = run("node", ["scripts/sync-kernel.mjs", "--check"], copy);
  check("sync-kernel: missing markers cannot hide a carrier", missingMarkers.code === 1 && /marker pair/.test(missingMarkers.out));
  fs.writeFileSync(pilotFile, originalPilot);
  const plan = "skills/auto-plan/SKILL.md";
  expectFail("a missing reference file", plan, (text) => `${text}\nRead \`references/nope.md\`.\n`, /referenced file does not exist/);
  expectFail("a command that runs a missing script", plan, (text) => `${text}\nRun \`node scripts/nope.mjs\`.\n`, /missing script/);
  expectFail("an oversized description", plan, (text) => text.replace(/^description: /m, `description: ${"padding ".repeat(60)}`), /description is \d+ characters/);
  expectFail("an oversized body", plan, (text) => `${text}\n${"More rules. ".repeat(900)}\n`, /body is \d+ characters/);
  expectFail("an extra frontmatter field", plan, (text) => text.replace("---\nname:", "---\nmodel: big\nname:"), /frontmatter must contain only name and description/);
  expectFail("a description without a trigger", plan, (text) => text.replace(/^description: .*$/m, "description: Writes plans."), /must say when to use/);
  expectFail("a description with a YAML comment marker", plan, (text) => text.replace(/^description: /m, "description: Plans #1 - "), /valid single-line YAML strings/);
  expectFail("a description with an unquoted colon", plan, (text) => text.replace(/^description: /m, "description: Note: "), /valid single-line YAML strings/);
  expectFail("a removed trigger phrase", "skills/auto-copy/SKILL.md", (text) => text.replace(" autocopy,", ""), /no longer contains routing keyword/);
  expectFail("an ambiguous trigger phrase", "skills/auto-qa/SKILL.md", (text) => text.replace("smoke or regression testing", "smoke testing or a regression sweep"), /also contains routing keyword/);
  expectFail("a Frontend Gate that is used but not defined", "skills/auto-research/SKILL.md", (text) => `${text}\nRun the Frontend Gate.\n`, /uses "Frontend Gate"/);
  expectFail("a backslash path", plan, (text) => `${text}\nSee references\\x.md.\n`, /backslash/);
  const researchFile = path.join(copy, 'skills', 'auto-research', 'SKILL.md');
  const researchBytes = fs.readFileSync(researchFile);
  function probeSkill(bytes) {
    try {
      fs.writeFileSync(researchFile, bytes);
      return run('node', ['scripts/validate-skills.mjs'], copy);
    } finally { fs.writeFileSync(researchFile, researchBytes); }
  }
  const researchText = researchBytes.toString('utf8');
  const badEncoding = probeSkill(Buffer.concat([researchBytes, Buffer.from([0x80])]));
  check('catalog: invalid UTF-8 cannot pass with a replacement character', badEncoding.code === 2 && !badEncoding.out.includes(copy), badEncoding.out);
  for (const control of [1, 0x81]) {
    const result = probeSkill(researchText.replace(/^description: (.*)$/m, (_, value) =>
      "description: '" + value.replaceAll("'", "''") + String.fromCharCode(control) + "'"));
    check('catalog: rejects non-printable character ' + control + ' inside quoted YAML', result.code === 1, result.out);
  }
  check('catalog: a digit-leading description can be a plain string', probeSkill(researchText.replace('description: ', 'description: 3D studies. ')).code === 0);
  const withTitles = '\nRead [the skill](SKILL.md "Section guide") or [the same file](<SKILL.md> \'Section guide\').\n';
  check('catalog: resolves local Markdown destinations with optional titles', probeSkill(researchText + withTitles).code === 0);
  check('catalog: rejects missing titled Markdown destination', probeSkill(researchText + withTitles.replace('SKILL.md', 'absent.md')).code === 1);
  const alias = path.join(copy, 'skills', 'extra-skill-link');
  fs.symlinkSync(path.dirname(researchFile), alias, process.platform === 'win32' ? 'junction' : 'dir');
  try {
    const result = run('node', ['scripts/validate-skills.mjs'], copy);
    check('catalog: rejects unlisted top-level skill junction', result.code === 2 && !result.out.includes(copy), result.out);
  } finally { fs.unlinkSync(alias); }
  const kernelSource = path.join(copy, 'shared', 'verification-kernel.md');
  const kernelBytes = fs.readFileSync(kernelSource);
  try {
    fs.appendFileSync(kernelSource, Buffer.from([0x80]));
    const result = run('node', ['scripts/sync-kernel.mjs'], copy);
    check('kernel: invalid UTF-8 prevents carrier rewrites', result.code === 2 && fs.readFileSync(pilotFile, 'utf8') === originalPilot, result.out);
  } finally { fs.writeFileSync(kernelSource, kernelBytes); }
  const orphan = path.join(copy, "skills", "auto-plan", "references", "orphan.md");
  fs.writeFileSync(orphan, "# Orphan\n");
  const orphanRun = run("node", ["scripts/validate-skills.mjs"], copy);
  check("validate-skills: rejects an unreferenced resource file", orphanRun.code === 1 && /resource is never mentioned/.test(orphanRun.out), orphanRun.out);
}

// Regression probes for distribution maintenance. Use a separate disposable distribution.
{
  const copy = path.join(tmp, "maintenance-probes");
  for (const name of ["skills", "scripts", "shared", "README.md"]) {
    fs.cpSync(path.join(repoRoot, name), path.join(copy, name), { recursive: true });
  }
  const cli = (name, ...args) => run(process.execPath, ["scripts/" + name + ".mjs", ...args], copy);
  const skill = name => fs.readFileSync(path.join(copy, "skills", name, "SKILL.md"), "utf8");
  const probe = (file, replacement, fn) => {
    const full = path.join(copy, file);
    const original = fs.readFileSync(full);
    try {
      if (replacement === null) fs.unlinkSync(full);
      else fs.writeFileSync(full, replacement);
      fn();
    } finally {
      fs.writeFileSync(full, original);
    }
  };
  const kernel = "shared/verification-kernel.md";
  const carrier = "skills/auto-pilot/SKILL.md";
  const pristine = fs.readFileSync(path.join(copy, carrier));
  for (const input of ["", "## Something else\n\ncontent"]) {
    probe(kernel, input, () => {
      const rewrite = cli("sync-kernel");
      const verify = cli("sync-kernel", "--check");
      check("kernel: rejects " + (input ? "wrong heading" : "empty source") + " before any rewrite",
        rewrite.code === 2 && verify.code === 2 && fs.readFileSync(path.join(copy, carrier)).equals(pristine));
      const diagnostic = input ? "Kernel source has the wrong heading." : "Kernel source empty.";
      check("kernel diagnostic: " + diagnostic, [rewrite, verify, cli("validate-skills")].every(r => r.code === 2 && r.out.trim() === diagnostic));
    });
  }
  probe(kernel, null, () => {
    const r = cli("sync-kernel", "--check");
    check("kernel diagnostic: missing source", [r, cli("validate-skills")].every(result => result.code === 2 && result.out.trim() === "Kernel source missing."));
    check("kernel: bounded missing-source diagnostic", r.code === 2 && r.out.length < 180 && !r.out.includes(copy));
  });
  const refs = path.join(copy, "skills/auto-plan/references");
  const outside = path.join(tmp, "external-carrier");
  fs.renameSync(refs, outside);
  const externalFile = path.join(outside, "verification-kernel.md");
  fs.writeFileSync(externalFile, "sentinel");
  fs.symlinkSync(outside, refs, process.platform === "win32" ? "junction" : "dir");
  try {
    const sync = cli("sync-kernel");
    check("kernel diagnostic: linked carrier ancestor", [sync, cli("validate-skills")].every(r => r.code === 2 && r.out.trim() === "Linked kernel path."));
    check("kernel: refuses linked carrier parent without writing", sync.code !== 0 && fs.readFileSync(externalFile, "utf8") === "sentinel");
  } finally {
    fs.unlinkSync(refs);
    fs.renameSync(outside, refs);
    fs.copyFileSync(path.join(copy, kernel), path.join(refs, "verification-kernel.md"));
  }
  const policyCopy = "skills/master-sanitize/scripts/scan-text.mjs";
  // The incoming tree had no bundled policy module and accepted this drift.
  const originalPolicy = fs.existsSync(path.join(copy, policyCopy)) ? fs.readFileSync(path.join(copy, policyCopy)) : Buffer.alloc(0);
  write(copy, policyCopy, Buffer.concat([originalPolicy, Buffer.from("\n// stale copy\n")]));
  const drift = cli("validate-skills");
  check("validator: drift in standalone scanner policy blocks publication", drift.code === 1 && drift.out.includes("standalone scanner policy differs"));
  if (originalPolicy.length) write(copy, policyCopy, originalPolicy);
  else fs.unlinkSync(path.join(copy, policyCopy));
  const planFile = "skills/auto-plan/SKILL.md";
  const plan = skill("auto-plan");
  for (const [name, text] of [
    ["unclosed YAML sequence", plan.replace("description: ", "description: [")],
    ["spaced resource", plan + "\nRead `references/no such file.md`."],
    ["Unicode resource", plan + "\nRead `references/\u03c0.md`."],
    ["escaping resource", plan + "\nRead `references/../../../README.md`."],
  ]) {
    probe(planFile, text, () => check("validator: rejects " + name, cli("validate-skills").code === 1));
  }
  const policyFile = "shared/trigger-cases.json";
  probe(policyFile, "[null]", () => {
    const r = cli("validate-skills");
    check("validator: bounded null trigger diagnostic", r.code === 2 && r.out.length < 180 && !r.out.includes(copy));
  });
  const rejected = "ghp_" + "A1z".repeat(12);
  probe(policyFile, JSON.stringify([{phrase: rejected, skill: "missing", keyword: "abc"}]), () => {
    const r = cli("validate-skills");
    check("validator: rejected trigger values stay private", r.code === 1 && !r.out.includes(rejected) && r.out.includes("row 1"));
  });
  for (const [name, args] of [["sync-kernel", ["--unused"]], ["validate-skills", ["--unused"]],
    ["measure-load", ["HEAD", "--unused"]], ["score-routing", ["--input"]]]) {
    const r = cli(name, ...args);
    check(name + ": rejects unexpected option syntax", r.code === 2 && /[Uu]sage|[Ii]nvalid/.test(r.out));
  }
  const invalidTemp = path.join(copy, "README.md");
  function runRunner(args) {
    return run(process.execPath, ["--input-type=module", "-e",
      "import os from 'node:os'; os.tmpdir = () => 'README.md'; process.argv.splice(1,1,'runner'); await import('./scripts/test-scripts.mjs');",
      invalidTemp, ...args], copy);
  }
  const tempResult = runRunner([]);
  check("runner: bounded invalid-temp diagnostic", tempResult.code === 2 && /fixture directory/.test(tempResult.out) && tempResult.out.length < 180);
  const argResult = runRunner(["--invalid"]);
  check("runner: checks arguments before creating fixtures", argResult.code === 2 && /Usage/.test(argResult.out));

  const removed = gitRepo("removed-skill");
  write(removed, "scripts/measure-load.mjs", fs.readFileSync(path.join(copy, "scripts/measure-load.mjs")));
  write(removed, "shared/git-run.mjs", fs.readFileSync(path.join(copy, "shared/git-run.mjs")));
  write(removed, "skills/base-only/SKILL.md", "---\nname: base-only\ndescription: Four\n---\n\n123\n");
  write(removed, "skills/README.md", "# Skill directory\n");
  commit(removed, "fixture baseline");
  fs.unlinkSync(path.join(removed, "skills/base-only/SKILL.md"));
  fs.rmdirSync(path.join(removed, "skills/base-only"));
  const measured = run(process.execPath, ["scripts/measure-load.mjs", "HEAD"], removed);
  check("measure: retains removed skill in baseline totals", measured.code === 0 && /^TOTAL\s+4\s+0/m.test(measured.out) &&
    /^base-only\s+5\s+0/m.test(measured.out));

  const evalCases = JSON.parse(fs.readFileSync(path.join(copy, "shared/routing-eval.json")));
  const receipts = evalCases.map(c => ({ id: c.id, reads: c.skills.map(n => ".agents/skills/" + n + "/SKILL.md"),
    boundaryMet: true, isolated: true, observed: true, evidence: "fixture" }));
  const receipt = path.join(tmp, "receipt.jsonl");
  const score = () => {
    fs.writeFileSync(receipt, receipts.map(r => JSON.stringify(r)).join("\n"));
    return cli("score-routing", receipt);
  };
  const port = receipts.find(r => r.id === "port");
  const required = port.reads[0];
  score();
  check("routing: rejects extra CLI option after valid receipt", cli("score-routing", receipt, "--unknown").code === 2);
  port.reads = [required.replaceAll("/", "\\")];
  check("routing: normalizes Windows relative reads", score().code === 0);
  for (const wrong of ["C:\\" + required, "/" + required, "../" + required]) {
    port.reads = [wrong];
    check("routing: rejects nonlocal read " + (wrong.startsWith(".") ? "traversal" : "absolute"), score().code === 1);
  }
  const allowed = ".agents/skills/auto-plan/SKILL.md";
  port.reads = [required, allowed];
  check("routing: permits declared port chain", score().code === 0);
  port.reads = [allowed];
  check("routing: allowed read cannot replace required skill", score().code === 1);
  port.reads = [required, ".agents/skills/auto-qa/SKILL.md"];
  check("routing: rejects unrelated chained read", score().code === 1);

  const all = (...values) => (text) => values.every(v => text.includes(v));
  const wow = skill("wow-loop");
  check("wow: each reviewer accounts for decision-critical claims", all("Each reviewer checks every decision-critical claim against its source", "at least five", "checked and unchecked", "unchecked decision-critical claim blocks WOW", "Omit verdicts, reports and revision history")(wow));
  check("wow: waiver labels the verdict line before the report", all("exact verdict line before the structured report", "WOW (one reviewer; cold read waived by the user)")(wow));
  check("wow: detect edits when read-only access is unavailable", all("Enforce read-only access when supported", "forbid edits", "before and after each review", "change voids the round")(wow));
  check("wow: unreported cache state stays unknown", all("approximate wait", "unknown unless the host reports it")(wow) && !wow.includes("probably a cold resume"));
  check("reflect: log confirmed failures without installing unjustified rules", all("Log every confirmed failure", "no permanent rule")(skill("auto-reflect")));
  check("reflect: investigate alone is a no-skill control", skill("auto-reflect").includes("Plain investigation falls outside") &&
    evalCases.some(c => c.id === "investigate" && !c.skills.length) &&
    JSON.parse(fs.readFileSync(path.join(copy, policyFile))).some(c => c.skill === "auto-reflect" && /recurrence guard.*circuit-breaker/.test(c.phrase)));
  check("aliases: informal spellings identified as user input", ["auto-copy","auto-plan","auto-qa","auto-doc","auto-manage"].every(n =>
    /description: .*when the user types [^\n]*\/auto|description: .*when the user types \/manage/.test(skill(n))));
  const skills = fs.readdirSync(path.join(copy, "skills")).map(skill);
  check("aliases: distribution stays within three percent", skills.reduce((sum, s) => sum + s.match(/^description: (.+)$/m)[1].length, 0) <= 2860);
  check("artifacts: one declared external temp fallback per writing skill", skills.filter(s => s.includes("~/.auto-master/artifacts/")).every(s =>
    s.split("<os-temp>/.auto-master/artifacts/").length === 2 && s.includes("outside every repo and tell the user the path")));
  check("approval: exact push, telemetry, real accounts, rebuild in resident rules", [
    ["master-sanitize", "exact push and remote after the final re-scan"], ["auto-copy", "telemetry behavior only with explicit user approval"],
    ["master-release-review", "authorization for external advisory lookups and real-account access"], ["master-docs", "only for a user-requested full rebuild"]
  ].every(([n,t]) => skill(n).includes(t)));
  check("release: acceptance cannot waive required security High", [
    [skill("master-qa"), "GO WITH KNOWN ISSUES"], [skill("master-release-review"), "GO WITH KNOWN RISKS"],
    [fs.readFileSync(path.join(copy,"skills/master-release-review/references/findings-and-decision.md"),"utf8"), "GO WITH KNOWN RISKS"],
  ].every(([s, verdict]) => all("required security gate", "NO-GO", verdict, "disclosure text")(s)));
  check("chains: read child skills at their own stage", all("only at step 3", "only at step 4")(skill("auto-manage")) &&
    skill("auto-copy").includes("only at step 4") && skill("master-qa").includes("only at step 7"));
  const readme = fs.readFileSync(path.join(copy, "README.md"), "utf8");
  const control = evalCases.find(c => c.id === "investigate");
  check("routing: refund investigation has a documented fixture and no skill",
    control.skills.length === 0 && control.request === "Investigate why order A101 shows a pending refund." &&
    ["src/support/refund-status.js", "A101", "ROADMAP.md", "docs/giude.md", "source-tool/wordcount.py",
      "target-app/", "reports/q3-report.md", "proxy for invocation", "reference reads"].every(part => readme.includes(part)));
  for (const [parent, child, stage] of [["auto-copy", "auto-plan", 4], ["auto-manage", "auto-pilot", 3],
    ["auto-manage", "auto-qa", 4], ["master-qa", "master-release-review", 7]]) {
    const first = skill(parent).split(/\r?\n/).find(line => line.includes(child)) || "";
    check("chains: first mention defers " + parent + " to " + child, first.startsWith(stage + ". ") &&
      first.slice(0, first.indexOf(child)).includes("only at step " + stage));
  }
  check("cost: measured explicit corpus example includes cache and fixture size", ["12-file", "493 seconds", "8 sub-agent calls", "2.06 M", "97% cached", "27 k"].every(term => readme.includes(term)));
}
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`${passed} passed, ${failed.length} failed`);
for (const failure of failed) console.log(`FAIL ${failure}`);
process.exit(failed.length ? 1 : 0);
