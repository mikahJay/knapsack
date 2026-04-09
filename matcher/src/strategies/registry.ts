import type { MatchingStrategy } from './types';

const strategies = new Map<string, MatchingStrategy>();

/**
 * Register a strategy so it can be selected by name.
 * Call this once at startup for each strategy you want available.
 */
export function registerStrategy(strategy: MatchingStrategy): void {
  strategies.set(strategy.name, strategy);
}

/**
 * Retrieve a strategy by its stable name identifier.
 * Throws if the name has not been registered.
 */
export function getStrategy(name: string): MatchingStrategy {
  const s = strategies.get(name);
  if (!s) {
    const known = [...strategies.keys()].join(', ') || '(none registered)';
    throw new Error(`Unknown matching strategy: "${name}". Registered: [${known}]`);
  }
  return s;
}

/**
 * Returns the strategy selected by the MATCHING_STRATEGY environment
 * variable (defaults to "claude").
 */
export function activeStrategy(): MatchingStrategy {
  const name = process.env['MATCHING_STRATEGY'] ?? 'claude';
  return getStrategy(name);
}
