// ── Lean domain types used by all matching strategies ────────
// These are intentionally independent of the API service's router
// types so the matcher has no compile-time dependency on api/.

export interface Need {
  id: string;
  title: string;
  description: string | null;
  status: string;
}

export interface Resource {
  id: string;
  title: string;
  description: string | null;
  status: string;
}

export interface MatchResult {
  needId: string;
  resourceId: string;
  /** Relevance score in [0, 1]. Only pairs ≥ threshold are returned. */
  score: number;
  /** One-sentence human-readable explanation produced by the strategy. */
  rationale: string;
}

// ── Strategy contract ────────────────────────────────────────

/**
 * A MatchingStrategy takes a set of open needs and available resources
 * and returns scored candidate matches.
 *
 * Implementations are free to:
 *  - Call an LLM (ClaudeMatchingStrategy)
 *  - Run a local embedding similarity computation
 *  - Apply rule-based keyword heuristics
 *  - etc.
 *
 * The active strategy is selected at runtime via the MATCHING_STRATEGY
 * environment variable and the strategy registry.
 */
export interface MatchingStrategy {
  /** Stable identifier stored in the DB alongside each match record. */
  readonly name: string;

  /**
   * Evaluate need↔resource pairs and return those that meet the
   * implementation's relevance threshold.
   *
   * @param needs     Open needs to match against.
   * @param resources Available resources to match from.
   * @returns         Array of match results (may be empty).
   */
  match(needs: Need[], resources: Resource[]): Promise<MatchResult[]>;
}
