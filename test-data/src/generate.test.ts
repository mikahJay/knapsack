import test from 'node:test';
import assert from 'node:assert/strict';
import { parseArgs, ensureGeneratedCount, CliError } from './generate';

test('parseArgs rejects unknown flags (e.g. --resource)', () => {
  assert.throws(
    () => parseArgs(['--resource', '5']),
    (err: unknown) => err instanceof CliError && /Unknown option "--resource"/.test(String((err as Error).message))
  );
});

test('parseArgs parses --resources and numeric options', () => {
  const args = parseArgs(['non-prod', '--needs', '12', '--resources', '7', '--bob-pct', '30']);
  assert.equal(args.env, 'non-prod');
  assert.equal(args.needs, 12);
  assert.equal(args.resources, 7);
  assert.equal(args.bobPct, 30);
});

test('ensureGeneratedCount pads missing generated needs', () => {
  const items = ensureGeneratedCount(
    'need',
    [{ title: '[TEST-DATA] Existing', description: 'ok' }],
    3
  );
  assert.equal(items.length, 3);
  assert.equal(items[0]?.title, '[TEST-DATA] Existing');
  assert.equal(typeof items[1]?.title, 'string');
  assert.ok(items[1]!.title.length > 0);
});

test('ensureGeneratedCount trims and truncates extras', () => {
  const items = ensureGeneratedCount(
    'resource',
    [
      { title: '  One  ', description: '  a  ' },
      { title: 'Two', description: 'b' },
      { title: 'Three', description: 'c' },
    ],
    2
  );
  assert.equal(items.length, 2);
  assert.equal(items[0]?.title, 'One');
  assert.equal(items[0]?.description, 'a');
});

