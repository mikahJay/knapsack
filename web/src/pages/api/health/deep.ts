import type { NextApiRequest, NextApiResponse } from 'next';

// Server-side URL — in Docker this resolves container-to-container (http://api:4000)
const API_URL = process.env['API_URL'] ?? 'http://localhost:4000';

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  const start = Date.now();
  let apiOk = false;
  let apiLatencyMs: number | undefined;
  let apiError: string | undefined;

  try {
    const response = await fetch(`${API_URL}/health/deep`);
    apiLatencyMs = Date.now() - start;
    apiOk = response.ok;
    if (!response.ok) {
      apiError = `HTTP ${response.status}`;
    }
  } catch (err) {
    apiError = err instanceof Error ? err.message : String(err);
  }

  const ok = apiOk;
  res.status(ok ? 200 : 503).json({
    ok,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    checks: {
      api: {
        ok: apiOk,
        ...(apiLatencyMs !== undefined && { latencyMs: apiLatencyMs }),
        ...(apiError !== undefined && { error: apiError }),
      },
    },
  });
}
