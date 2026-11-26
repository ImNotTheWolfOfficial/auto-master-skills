#!/usr/bin/env node
// Rewrite declared carriers, or verify them without writing using --check.
import { fileURLToPath } from "node:url";
import { checkCarriers, KernelInputError } from "./kernel-carriers.mjs";

const args = process.argv.slice(2);
if (args.length > 1 || (args.length && args[0] !== "--check")) {
  console.error("Usage: sync-kernel.mjs [--check]");
  process.exit(2);
}
const check = args.length === 1;
let result;
try {
  result = checkCarriers(fileURLToPath(new URL("../", import.meta.url)), !check);
} catch (error) {
  console.error(error instanceof KernelInputError ? error.message : "Kernel carrier unreadable or rewrite failed.");
  process.exit(2);
}
if (result.errors.length) {
  console.error(result.errors.join("\n"));
  process.exit(1);
}
console.log(check ? `Kernel copy is in sync in ${result.count} file(s).` : `Kernel synced: ${result.count} carrier(s), ${result.changed} rewritten.`);
