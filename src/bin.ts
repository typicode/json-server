#!/usr/bin/env node

// Before any import: an older Node lacks what the CLI imports, or binds values differently,
// and would fail with an error that does not say why.
const [major = 0, minor = 0] = process.versions.node.split(".").map(Number);
if (major < 26 || (major === 26 && minor < 10)) {
  // Not process.exit(): stderr can be asynchronous, and the message would be cut.
  process.stderr.write(`json-server: needs Node.js 26.10 or later, this is ${process.version}\n`);
  process.exitCode = 1;
} else {
  const { enableCompileCache } = await import("node:module");

  // Before loading the CLI, so its modules are cached too
  enableCompileCache();

  const { run } = await import("./cli.ts");

  process.exitCode = await run();
}
