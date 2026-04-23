/**
 * claude.ts — use Claude to generate realistic need/resource titles and descriptions
 * for test data seeding.
 *
 * Generates items in batches to avoid oversized prompts.
 * Falls back gracefully if the API key is missing.
 */

import Anthropic from '@anthropic-ai/sdk';
import { TEST_PREFIX } from './data';

const BATCH_SIZE = 50;

export interface GeneratedItem {
  title: string;
  description: string;
}

const NEED_CONTEXT = `
You are helping seed a nonprofit resource-matching platform with realistic test data.
Generate needs that real community organizations might post — things like requests for
volunteers, food, clothing, shelter, equipment, training, healthcare access, etc.
Be specific and varied. Each need should feel like it came from a different real organization.
`.trim();

const RESOURCE_CONTEXT = `
You are helping seed a nonprofit resource-matching platform with realistic test data.
Generate resources that organizations or donors might offer — things like vehicles,
equipment, office space, software licenses, medical kits, volunteers, storage, etc.
Be specific and varied. Each resource should feel like it came from a different real donor or org.
`.trim();

function buildPrompt(kind: 'need' | 'resource', count: number): string {
  const context = kind === 'need' ? NEED_CONTEXT : RESOURCE_CONTEXT;
  return `${context}

Generate exactly ${count} ${kind}s. Return ONLY a JSON array with no extra text, markdown, or explanation.
Each element must have:
  - "title": a short, specific title (5-10 words, do NOT include any prefix like [TEST-DATA])
  - "description": 1-3 sentences of realistic detail about this ${kind}

Example format:
[
  { "title": "...", "description": "..." },
  ...
]`;
}

async function generateBatch(
  client: Anthropic,
  model: string,
  kind: 'need' | 'resource',
  count: number
): Promise<GeneratedItem[]> {
  const message = await client.messages.create({
    model,
    max_tokens: 4096,
    messages: [{ role: 'user', content: buildPrompt(kind, count) }],
  });

  const text = message.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as { type: 'text'; text: string }).text)
    .join('');

  // Extract JSON array from response (strip any accidental markdown fences)
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error(`Claude returned no JSON array for ${kind} batch`);

  const parsed = JSON.parse(jsonMatch[0]) as Array<{ title?: unknown; description?: unknown }>;

  return parsed.map((item) => ({
    title: `${TEST_PREFIX} ${String(item.title ?? '').trim()}`,
    description: String(item.description ?? '').trim(),
  }));
}

/**
 * Generate `count` items of the given kind using Claude.
 * Splits into batches of BATCH_SIZE to keep prompts manageable.
 */
export async function generateWithClaude(
  kind: 'need' | 'resource',
  count: number
): Promise<GeneratedItem[]> {
  const apiKey = process.env['ANTHROPIC_API_KEY'];
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set');

  const model = process.env['CLAUDE_MODEL'] ?? 'claude-haiku-4-5-20251001';
  const client = new Anthropic({ apiKey });

  const results: GeneratedItem[] = [];
  let remaining = count;

  while (remaining > 0) {
    const batchCount = Math.min(remaining, BATCH_SIZE);
    const soFar = count - remaining;
    process.stdout.write(
      `  [Claude] Generating ${kind}s ${soFar + 1}–${soFar + batchCount} of ${count} … `
    );
    const batch = await generateBatch(client, model, kind, batchCount);
    console.log('done');
    results.push(...batch);
    remaining -= batchCount;
  }

  return results;
}
