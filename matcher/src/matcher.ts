import { query } from './db';
import { activeStrategy } from './strategies/registry';
import type { Need, Resource, MatchResult } from './strategies/types';

const DEFAULT_PARTIAL_HOURS = 24;

export interface RematchStats {
  strategy: string;
  needsScanned: number;
  resourcesScanned: number;
  matchesUpserted: number;
  durationMs: number;
}

// ── Public API ────────────────────────────────────────────────

/**
 * Re-match ALL open needs against ALL available resources.
 * Use this for a periodic full reconciliation or after bulk imports.
 */
export async function fullRematch(): Promise<RematchStats> {
  const needs = await query<Need>(
    `SELECT id, title, description, status
     FROM need.needs
     WHERE status = 'open'
       AND replaced_by_id IS NULL`
  );
  const resources = await query<Resource>(
    `SELECT id, title, description, status
     FROM resource.resources
     WHERE status = 'available'
       AND replaced_by_id IS NULL`
  );
  return runMatch(needs, resources);
}

/**
 * Re-match needs and resources that have been created or updated
 * since `since` (defaults to now − 24 h).
 *
 * "Partial" means: only newly-relevant items drive the run, but
 * we still compare against the full pool of available resources
 * so nothing is missed.
 */
export async function partialRematch(since?: Date): Promise<RematchStats> {
  const sinceDate =
    since ?? new Date(Date.now() - DEFAULT_PARTIAL_HOURS * 60 * 60 * 1000);

  const needs = await query<Need>(
    `SELECT id, title, description, status
     FROM need.needs
     WHERE status = 'open'
       AND replaced_by_id IS NULL
       AND (created_at >= $1 OR updated_at >= $1)`,
    [sinceDate]
  );

  // Always compare against the full pool of available resources so a
  // brand-new need can be matched against an older resource and vice versa.
  const resources = await query<Resource>(
    `SELECT id, title, description, status
     FROM resource.resources
     WHERE status = 'available'
       AND replaced_by_id IS NULL`
  );

  return runMatch(needs, resources);
}

// ── Internals ─────────────────────────────────────────────────

async function runMatch(
  needs: Need[],
  resources: Resource[]
): Promise<RematchStats> {
  const start = Date.now();
  const strategy = activeStrategy();

  if (needs.length === 0 || resources.length === 0) {
    return {
      strategy: strategy.name,
      needsScanned: needs.length,
      resourcesScanned: resources.length,
      matchesUpserted: 0,
      durationMs: Date.now() - start,
    };
  }

  const results = await strategy.match(needs, resources);
  await upsertMatches(results, strategy.name);

  return {
    strategy: strategy.name,
    needsScanned: needs.length,
    resourcesScanned: resources.length,
    matchesUpserted: results.length,
    durationMs: Date.now() - start,
  };
}

async function upsertMatches(
  results: MatchResult[],
  strategyName: string
): Promise<void> {
  for (const r of results) {
    await query(
      `INSERT INTO matching.matches (need_id, resource_id, score, rationale, strategy)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (need_id, resource_id)
       DO UPDATE SET
         score      = EXCLUDED.score,
         rationale  = EXCLUDED.rationale,
         strategy   = EXCLUDED.strategy,
         matched_at = NOW()`,
      [r.needId, r.resourceId, r.score, r.rationale, strategyName]
    );
  }
}
