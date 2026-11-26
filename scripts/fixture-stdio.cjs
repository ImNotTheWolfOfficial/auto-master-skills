// Test-only transport for Windows sandboxes that deny libuv's named pipes.
// Loaded only for synthetic fixture subprocesses and distribution measurements.
const fs = require("node:fs");
const path = require("node:path");
const cp = require("node:child_process");
const { syncBuiltinESMExports } = require("node:module");
const nativeSpawn = cp.spawnSync;

function spawnWithFiles(command, args, options) {
  const dir = fs.mkdtempSync(path.join(options.env.FIXTURE_STDIO_ROOT, "stdio-"));
  const input = path.join(dir, "in");
  const output = path.join(dir, "out");
  const errors = path.join(dir, "err");
  const handles = [];
  try {
    fs.writeFileSync(input, options.input ?? "", { mode: 0o600 });
    for (const [file, mode] of [[input, "r"], [output, "w"], [errors, "w"]]) {
      handles.push(fs.openSync(file, mode, 0o600));
    }
    const result = nativeSpawn(command, args, { ...options, input: undefined, stdio: handles });
    const encoding = options.encoding === "buffer" ? undefined : options.encoding;
    result.stdout = fs.readFileSync(output, encoding);
    result.stderr = fs.readFileSync(errors, encoding);
    result.output = [null, result.stdout, result.stderr];
    return result;
  } finally {
    for (const fd of handles) fs.closeSync(fd);
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function spawnFixture(command, args, options) {
  try {
    return spawnWithFiles(command, args, options);
  } catch {
    const error = Object.assign(new Error("Fixture transport unavailable."), { code: "EFIXTURE" });
    return { error, status: null, signal: null, stdout: null, stderr: null, output: [null, null, null] };
  }
}

module.exports = { spawnFixture };

// The test runner explicitly preloads this module only in its Node children.
// Keep the restricted transport out of production skill code and user shells.
if (process.env.FIXTURE_STDIO_ROOT && process.execArgv.includes(__filename)) {
  cp.spawnSync = (command, args, options = {}) =>
    spawnFixture(command, args, { ...options, env: options.env ?? process.env });
  syncBuiltinESMExports();
}
