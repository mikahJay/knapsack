/**
 * generate.ts — seed the Knapsack database with random test data.
 *
 * Usage:
 *   npx ts-node src/generate.ts [env] [options]
 *
 * Positional:
 *   env              "prod" or "non-prod" (default: "non-prod")
 *
 * Options:
 *   --needs    N     Number of needs to create    (0-1000, default 10)
 *   --resources N    Number of resources to create (0-1000, default 10)
 *   --owners   N     Distinct owners to assign      (1-10, default 5)
 *   --bob-pct  N     % of items owned by bob        (0-100, default 20)
 *                    (ignored when env=prod)
 *   --public-pct N   % of items marked public       (0-100, default 100)
 *   --no-ai          Skip Claude; use random word-pool titles/descriptions
 *
 * Environment variable DATABASE_URL is read from .env (or inherited).
 * Environment variable ANTHROPIC_API_KEY is required unless --no-ai is passed.
 */

import { query, queryOne, end } from './db';
import {
  testOwnerEmail,
  testOwnerName,
  randomNeedTitle,
  randomNeedStatus,
  randomResourceTitle,
  randomResourceStatus,
  randomDescription,
} from './data';
import { generateWithClaude, GeneratedItem } from './claude';

// ── Argument parsing ─────────────────────────────────────────────────────────

interface Args {
  env: 'prod' | 'non-prod';
  needs: number;
  resources: number;
  owners: number;
  bobPct: number;
  publicPct: number;
  noAi: boolean;
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    env: 'non-prod',
    needs: 10,
    resources: 10,
    owners: 5,
    bobPct: 20,
    publicPct: 100,
    noAi: false,
  };

  const positionals: string[] = [];

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg === '--needs') {
      args.needs = parseIntArg('--needs', argv[++i]);
    } else if (arg === '--resources') {
      args.resources = parseIntArg('--resources', argv[++i]);
    } else if (arg === '--owners') {
      args.owners = parseIntArg('--owners', argv[++i]);
    } else if (arg === '--bob-pct') {
      args.bobPct = parseIntArg('--bob-pct', argv[++i]);
    } else if (arg === '--public-pct') {
      args.publicPct = parseIntArg('--public-pct', argv[++i]);
    } else if (arg === '--no-ai') {
      args.noAi = true;
    } else if (!arg.startsWith('--')) {
      positionals.push(arg);
    }
  }

  if (positionals[0] === 'prod') {
    args.env = 'prod';
  } else if (positionals[0] !== undefined && positionals[0] !== 'non-prod') {
    die(`Unknown environment "${positionals[0]}". Use "prod" or "non-prod".`);
  }

  // Clamp & validate
  if (args.needs < 0 || args.needs > 1000) die('--needs must be between 0 and 1000');
  if (args.resources < 0 || args.resources > 1000) die('--resources must be between 0 and 1000');
  if (args.owners < 1 || args.owners > 10) die('--owners must be between 1 and 10');
  if (args.bobPct < 0 || args.bobPct > 100) die('--bob-pct must be between 0 and 100');
  if (args.publicPct < 0 || args.publicPct > 100) die('--public-pct must be between 0 and 100');

  return args;
}

function parseIntArg(flag: string, raw: string | undefined): number {
  const n = parseInt(raw ?? '', 10);
  if (isNaN(n)) die(`${flag} requires an integer value`);
  return n;
}

function die(msg: string): never {
  console.error(`Error: ${msg}`);
  process.exit(1);
}

// ── Database helpers ─────────────────────────────────────────────────────────

const TOTAL_TEST_OWNERS = 100;

interface User {
  id: string;
  email: string;
}

/** Ensure all 100 test-owner slots exist; return their ids keyed by slot (1-100). */
async function ensureTestOwners(): Promise<User[]> {
  const users: User[] = [];
  for (let slot = 1; slot <= TOTAL_TEST_OWNERS; slot++) {
    const email = testOwnerEmail(slot);
    const name = testOwnerName(slot);

    const existing = await queryOne<User>(
      'SELECT id, email FROM auth.users WHERE email = $1',
      [email]
    );

    if (existing) {
      users.push(existing);
    } else {
      const created = await queryOne<User>(
        `INSERT INTO auth.users (email, name, provider)
         VALUES ($1, $2, 'test')
         RETURNING id, email`,
        [email, name]
      );
      users.push(created!);
    }
  }
  return users;
}

/** Ensure bob exists (non-prod bypass user); return his id. */
async function ensureBob(): Promise<User> {
  const existing = await queryOne<User>(
    'SELECT id, email FROM auth.users WHERE email = $1',
    ['bob@local.dev']
  );
  if (existing) {
    await query(
      'UPDATE auth.users SET is_admin = true WHERE id = $1',
      [existing.id]
    );
    return existing;
  }

  const created = await queryOne<User>(
    `INSERT INTO auth.users (email, name, provider, is_admin)
     VALUES ($1, $2, 'local', true)
     RETURNING id, email`,
    ['bob@local.dev', 'Bob']
  );
  return created!;
}

/** Pick `n` distinct users at random from the given pool (Fisher-Yates shuffle). */
function pickDistinct(pool: User[], n: number): User[] {
  const arr = [...pool];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr.slice(0, n);
}

/**
 * Build the owner list for `total` items.
 * - In non-prod: bobPct% of items go to bob; the rest are spread across `ownerUsers`.
 * - In prod: all items are spread across `ownerUsers`.
 */
function buildOwnerIds(
  total: number,
  ownerUsers: User[],
  bob: User | null,
  bobPct: number
): string[] {
  const ids: string[] = [];

  for (let i = 0; i < total; i++) {
    if (bob !== null && Math.random() * 100 < bobPct) {
      ids.push(bob.id);
    } else {
      const owner = ownerUsers[Math.floor(Math.random() * ownerUsers.length)]!;
      ids.push(owner.id);
    }
  }

  return ids;
}

/** Build is_public values for `total` items based on publicPct. */
function buildPublicFlags(total: number, publicPct: number): boolean[] {
  const flags: boolean[] = [];
  for (let i = 0; i < total; i++) {
    flags.push(Math.random() * 100 < publicPct);
  }
  return flags;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  console.log(
    `\nGenerating test data [env=${args.env}] ` +
      `needs=${args.needs} resources=${args.resources} ` +
      `owners=${args.owners} bob-pct=${args.env === 'prod' ? 'n/a' : args.bobPct + '%'} ` +
      `public-pct=${args.publicPct}% ai=${!args.noAi}\n`
  );

  // 1. Ensure the 100-owner pool exists
  process.stdout.write('Upserting 100 test owners … ');
  const allTestOwners = await ensureTestOwners();
  console.log('done');

  // 2. Optionally ensure bob
  let bob: User | null = null;
  if (args.env !== 'prod') {
    process.stdout.write('Upserting bob … ');
    bob = await ensureBob();
    console.log('done');
  }

  // 3. Pick the active owner set for this run
  const activeOwners = pickDistinct(allTestOwners, args.owners);
  console.log(
    `Active owners: ${activeOwners.map((u) => u.email).join(', ')}`
  );

  // 4. Build owner-id lists
  const needOwnerIds = buildOwnerIds(args.needs, activeOwners, bob, args.env === 'prod' ? 0 : args.bobPct);
  const resourceOwnerIds = buildOwnerIds(args.resources, activeOwners, bob, args.env === 'prod' ? 0 : args.bobPct);
  const needPublicFlags = buildPublicFlags(args.needs, args.publicPct);
  const resourcePublicFlags = buildPublicFlags(args.resources, args.publicPct);

  // 5. Generate titles + descriptions
  let needItems: Array<{ title: string; description: string }> = [];
  let resourceItems: Array<{ title: string; description: string }> = [];

  if (args.noAi || !process.env['ANTHROPIC_API_KEY']) {
    if (!args.noAi && !process.env['ANTHROPIC_API_KEY']) {
      console.log('Warning: ANTHROPIC_API_KEY not set — falling back to random word-pool data.');
    }
    needItems = Array.from({ length: args.needs }, () => ({
      title: randomNeedTitle(),
      description: randomDescription('need'),
    }));
    resourceItems = Array.from({ length: args.resources }, () => ({
      title: randomResourceTitle(),
      description: randomDescription('resource'),
    }));
  } else {
    if (args.needs > 0) {
      console.log(`Generating ${args.needs} need(s) with Claude …`);
      needItems = await generateWithClaude('need', args.needs);
    }
    if (args.resources > 0) {
      console.log(`Generating ${args.resources} resource(s) with Claude …`);
      resourceItems = await generateWithClaude('resource', args.resources);
    }
  }

  // 6. Insert needs
  if (args.needs > 0) {
    process.stdout.write(`Inserting ${args.needs} need(s) … `);
    for (let i = 0; i < args.needs; i++) {
      await query(
        `INSERT INTO need.needs (title, description, status, owner_id, is_public)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          needItems[i]!.title,
          needItems[i]!.description,
          randomNeedStatus(),
          needOwnerIds[i]!,
          needPublicFlags[i]!,
        ]
      );
    }
    console.log('done');
  }

  // 7. Insert resources
  if (args.resources > 0) {
    process.stdout.write(`Inserting ${args.resources} resource(s) … `);
    for (let i = 0; i < args.resources; i++) {
      await query(
        `INSERT INTO resource.resources (title, description, status, owner_id, is_public)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          resourceItems[i]!.title,
          resourceItems[i]!.description,
          randomResourceStatus(),
          resourceOwnerIds[i]!,
          resourcePublicFlags[i]!,
        ]
      );
    }
    console.log('done');
  }

  // 8. Summary
  const needBobCount = needOwnerIds.filter((id) => id === bob?.id).length;
  const resourceBobCount = resourceOwnerIds.filter((id) => id === bob?.id).length;
  const needPublicCount = needPublicFlags.filter(Boolean).length;
  const resourcePublicCount = resourcePublicFlags.filter(Boolean).length;

  console.log('\n── Summary ──────────────────────────────');
  console.log(`  Needs created   : ${args.needs}${bob ? ` (${needBobCount} owned by bob)` : ''}, ${needPublicCount} public`);
  console.log(`  Resources created: ${args.resources}${bob ? ` (${resourceBobCount} owned by bob)` : ''}, ${resourcePublicCount} public`);
  console.log(`  Distinct owners : ${args.owners}`);
  console.log('─────────────────────────────────────────\n');
}

main()
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  })
  .finally(() => end());
