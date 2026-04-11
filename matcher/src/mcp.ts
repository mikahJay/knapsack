// @ts-nocheck
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { fullRematch, partialRematch } from './matcher';

export async function startMcpServer(): Promise<void> {
  const server = new McpServer({
    name: 'knapsack-matcher',
    version: '1.0.0',
  });

  // ── Tool: trigger_full_rematch ────────────────────────────
  server.tool(
    'trigger_full_rematch',
    'Re-match ALL open needs against ALL available resources. ' +
      'Returns stats including how many matches were upserted.',
    {},
    async () => {
      const stats = await fullRematch();
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(stats, null, 2) }],
      };
    }
  );

  // ── Tool: trigger_partial_rematch ─────────────────────────
  server.tool(
    'trigger_partial_rematch',
    'Match needs and resources created or updated since a given ' +
      'timestamp. Defaults to the last 24 hours when `since` is omitted.',
    {
      since: z
        .string()
        .optional()
        .describe('ISO 8601 timestamp — defaults to now - 24 h'),
    },
    async (args: { since?: string }) => {
      const sinceDate = args.since ? new Date(args.since) : undefined;
      if (sinceDate && Number.isNaN(sinceDate.getTime())) {
        return {
          content: [{ type: 'text' as const, text: 'Invalid `since` timestamp. Use ISO 8601.' }],
        };
      }
      const stats = await partialRematch(sinceDate);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(stats, null, 2) }],
      };
    }
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Keep the process alive; MCP stdio transport drives the event loop
  console.error('[mcp] Knapsack matcher MCP server started');
}
