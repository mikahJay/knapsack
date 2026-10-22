#!/usr/bin/env node
/**
 * `record:demo` embeds `next dev` (Next.js 16+), which requires Node >= 20.9 at runtime.
 */
const major = parseInt(process.versions.node.split('.')[0] ?? '0', 10);
const minor = parseInt(process.versions.node.split('.')[1] ?? '0', 10);

if (major < 20 || (major === 20 && minor < 9)) {
  console.error(`
[knapsack record:demo] Node.js ${process.version} is too old for the bundled Next.js dev server (need >= 20.9).

Fix (examples):
  nvm install 20 && nvm use 20
  fnm install 20 && fnm use 20

Then retry: npm run record:demo
`);
  process.exit(1);
}
