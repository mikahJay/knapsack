import Anthropic from '@anthropic-ai/sdk';
import type { MatchingStrategy, MatchResult, Need, Resource } from './types';

/** Pairs below this score are not returned. */
const SCORE_THRESHOLD = 0.5;
/** Number of needs to send in one Claude request. */
const NEED_BATCH_SIZE = 40;
/** Max candidate resources included per batch prompt. */
const RESOURCE_CANDIDATE_LIMIT = 120;
/** Max returned pairs per need to keep responses bounded. */
const MAX_MATCHES_PER_NEED = 1;
/** Safety cap for one batch response size. */
const MAX_BATCH_MATCHES = NEED_BATCH_SIZE * MAX_MATCHES_PER_NEED;

/**
 * Uses a Claude model to semantically score need↔resource pairs.
 *
 * Configuration (environment variables):
 *   ANTHROPIC_API_KEY   — required; Anthropic API key
 *   CLAUDE_MODEL        — model to use (default: claude-3-5-haiku-20241022)
 */
export class ClaudeMatchingStrategy implements MatchingStrategy {
  readonly name = 'claude';

  private readonly client: Anthropic;
  private readonly model: string;

  constructor() {
    // Anthropic client reads ANTHROPIC_API_KEY from env automatically
    this.client = new Anthropic();
    this.model = process.env['CLAUDE_MODEL'] ?? 'claude-3-5-haiku-20241022';
  }

  async match(needs: Need[], resources: Resource[]): Promise<MatchResult[]> {
    if (needs.length === 0 || resources.length === 0) return [];

    const merged = new Map<string, MatchResult>();

    for (let i = 0; i < needs.length; i += NEED_BATCH_SIZE) {
      const needBatch = needs.slice(i, i + NEED_BATCH_SIZE);
      const candidateResources = selectCandidateResources(needBatch, resources, RESOURCE_CANDIDATE_LIMIT);
      const prompt = buildPrompt(needBatch, candidateResources);

      const message = await this.client.messages.create({
        model: this.model,
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }],
      });

      const text = (message.content as Array<{ type: string; text?: string }>)
        .filter((b) => b.type === 'text')
        .map((b) => b.text ?? '')
        .join('');

      const batchResults = parseResponse(text, needBatch, candidateResources);
      for (const result of batchResults) {
        const key = `${result.needId}:${result.resourceId}`;
        const existing = merged.get(key);
        if (!existing || result.score > existing.score) {
          merged.set(key, result);
        }
      }
    }

    return [...merged.values()]
      .sort((a, b) => b.score - a.score)
      .slice(0, needs.length * MAX_MATCHES_PER_NEED);
  }
}

// ── Prompt construction ───────────────────────────────────────

function buildPrompt(needs: Need[], resources: Resource[]): string {
  const needsList = needs
    .map((n) =>
      [
        `  - id: ${n.id}`,
        `    title: ${n.title}`,
        `    description: ${n.description ?? '(none)'}`,
      ].join('\n')
    )
    .join('\n');

  const resourcesList = resources
    .map((r) =>
      [
        `  - id: ${r.id}`,
        `    title: ${r.title}`,
        `    description: ${r.description ?? '(none)'}`,
      ].join('\n')
    )
    .join('\n');

  return `\
You are the matching engine for Knapsack, a community resource-sharing platform.
Your job: identify which resources could satisfy which needs.

NEEDS:
${needsList}

RESOURCES:
${resourcesList}

Instructions:
- Only include pairs where score >= ${SCORE_THRESHOLD}.
- Score 1.0 = perfect match; 0.5 = weak but plausible connection.
- Keep each rationale to one concise sentence.
- Return at most ${MAX_MATCHES_PER_NEED} matches per need.
- Return at most ${MAX_BATCH_MATCHES} total pairs in this response.
- Prefer the strongest direct matches first.
- Output ONLY a valid JSON array — no markdown fences, no prose outside the array.

Output format:
[
  {
    "needId": "<need uuid>",
    "resourceId": "<resource uuid>",
    "score": 0.85,
    "rationale": "The resource directly addresses the stated need."
  }
]

If no pairs meet the threshold, output an empty array: []`;
}

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]+/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length >= 3)
  );
}

function overlapScore(a: Set<string>, b: Set<string>): number {
  let score = 0;
  for (const token of a) {
    if (b.has(token)) score += 1;
  }
  return score;
}

function selectCandidateResources(
  needs: Need[],
  resources: Resource[],
  limit: number
): Resource[] {
  if (resources.length <= limit) return resources;

  const needTokens = needs.map((n) => tokenize(`${n.title} ${n.description ?? ''}`));

  const scored = resources.map((resource) => {
    const resourceTokens = tokenize(`${resource.title} ${resource.description ?? ''}`);
    let best = 0;
    for (const nTokens of needTokens) {
      const score = overlapScore(nTokens, resourceTokens);
      if (score > best) best = score;
    }
    return { resource, score: best };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.resource);
}

// ── Response parsing ──────────────────────────────────────────

function parseResponse(
  text: string,
  needs: Need[],
  resources: Resource[]
): MatchResult[] {
  const needIds = new Set(needs.map((n) => n.id));
  const resourceIds = new Set(resources.map((r) => r.id));

  // Be permissive — extract the first JSON array even if the model adds prose
  const arrayMatch = text.match(/\[[\s\S]*\]/);
  if (!arrayMatch) return [];

  let raw: unknown;
  try {
    raw = JSON.parse(arrayMatch[0]);
  } catch {
    return [];
  }

  if (!Array.isArray(raw)) return [];

  const results: MatchResult[] = [];

  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const r = item as Record<string, unknown>;

    const needId = r['needId'];
    const resourceId = r['resourceId'];
    const score = r['score'];
    const rationale = r['rationale'];

    // Validate types and that ids refer to items we actually sent
    if (
      typeof needId !== 'string' ||
      !needIds.has(needId) ||
      typeof resourceId !== 'string' ||
      !resourceIds.has(resourceId) ||
      typeof score !== 'number' ||
      score < SCORE_THRESHOLD ||
      score > 1 ||
      typeof rationale !== 'string'
    ) {
      continue;
    }

    results.push({ needId, resourceId, score, rationale });
  }

  return results;
}
