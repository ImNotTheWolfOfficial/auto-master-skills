#!/usr/bin/env node
// Score manually traced isolated Codex runs. Never echo transcripts or host paths.
import fs from "node:fs";
try {
  if (process.argv.length !== 3 || process.argv[2].startsWith("-")) throw new Error();
  const cases = JSON.parse(fs.readFileSync(new URL("../shared/routing-eval.json", import.meta.url)));
  const rows = fs.readFileSync(process.argv[2], "utf8").trim().split(/\r?\n/).map(line => JSON.parse(line));
  let passed = 0;
  for (const item of cases) {
    const matches = rows.filter(row => row.id === item.id);
    const row = matches[0];
    const skillFile = name => `.agents/skills/${name}/SKILL.md`;
    const expected = item.skills.map(skillFile);
    const allowed = new Set([...expected, ...(item.allowed || []).map(skillFile)]);
    const reads = new Set((Array.isArray(row?.reads) ? row.reads : []).map(file =>
      typeof file === "string" ? file.replaceAll("\\", "/") : null));
    const ok = matches.length === 1 && row.isolated === true && row.observed === true &&
      row.boundaryMet === true && typeof row.evidence === "string" && row.evidence.trim().length > 0 &&
      Array.isArray(row.reads) && expected.every(file => reads.has(file)) && [...reads].every(file => allowed.has(file));
    if (!/^[a-z]+(?:-[a-z]+)*$/.test(item.id)) throw new Error();
    console.log(`${item.id} ${ok ? "PASS" : "FAIL"}`);
    if (ok) passed++;
  }
  console.log(`ROUTING_EVAL passed=${passed} cases=${cases.length}`);
  process.exitCode = passed === cases.length && rows.length === cases.length ? 0 : 1;
} catch {
  console.error("Routing evidence missing or invalid. Pass the local JSONL receipt file.");
  process.exitCode = 2;
}
