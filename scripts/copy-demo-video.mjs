#!/usr/bin/env node
/**
 * Copies the newest Playwright-recorded *.webm under test-results/ into web/public/demo.
 */
import { readdir, stat, copyFile, mkdir } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'web', 'public', 'demo');
const OUT_FILE = path.join(OUT_DIR, 'knapsack-product-demo.webm');

async function walkForWebm(dir) {
  /** @type {{ path: string, mtime: number }[]} */
  const found = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return found;
  }
  for (const ent of entries) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      found.push(...(await walkForWebm(p)));
    } else if (ent.isFile() && ent.name.endsWith('.webm')) {
      const s = await stat(p);
      found.push({ path: p, mtime: s.mtimeMs });
    }
  }
  return found;
}

const resultsDir = path.join(ROOT, 'test-results');
const webms = await walkForWebm(resultsDir);
if (webms.length === 0) {
  console.error('No .webm files found under test-results/. Did the Playwright test run and record video?');
  process.exit(1);
}
webms.sort((a, b) => b.mtime - a.mtime);
const newest = webms[0].path;
await mkdir(OUT_DIR, { recursive: true });
await copyFile(newest, OUT_FILE);
console.log(`Copied demo video:\n  ${newest}\n→ ${OUT_FILE}`);
