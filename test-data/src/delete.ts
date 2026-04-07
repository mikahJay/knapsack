/**
 * delete.ts — remove all test-generated data from the Knapsack database.
 *
 * Deletes, in order:
 *   1. needs   with titles starting with "[TEST-DATA]"
 *   2. resources with titles starting with "[TEST-DATA]"
 *   3. auth.users with provider = 'test'
 *
 * Bob (provider = 'local', email bob@local.dev) is NOT deleted, but any
 * needs/resources he owns that were seeded with the [TEST-DATA] prefix are.
 *
 * Usage:
 *   npx ts-node src/delete.ts
 */

import { query, end } from './db';
import { TEST_PREFIX } from './data';

async function main(): Promise<void> {
  console.log('\nDeleting all test-generated data …\n');

  // 1. Needs
  const deletedNeeds = await query<{ id: string }>(
    `DELETE FROM need.needs
     WHERE title LIKE $1
     RETURNING id`,
    [`${TEST_PREFIX}%`]
  );
  console.log(`  Needs deleted    : ${deletedNeeds.length}`);

  // 2. Resources
  const deletedResources = await query<{ id: string }>(
    `DELETE FROM resource.resources
     WHERE title LIKE $1
     RETURNING id`,
    [`${TEST_PREFIX}%`]
  );
  console.log(`  Resources deleted: ${deletedResources.length}`);

  // 3. Test users (provider = 'test')
  const deletedUsers = await query<{ id: string }>(
    `DELETE FROM auth.users
     WHERE provider = 'test'
     RETURNING id`,
  );
  console.log(`  Test users deleted: ${deletedUsers.length}`);

  console.log('\nDone.\n');
}

main()
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  })
  .finally(() => end());
