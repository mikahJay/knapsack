import { useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import {
  triggerFullRematch,
  triggerPartialRematch,
  RematchStats,
} from '../../lib/api';

type RunState = 'idle' | 'running' | 'done' | 'error';

interface RunResult {
  state: RunState;
  stats?: RematchStats;
  error?: string;
}

const EMPTY: RunResult = { state: 'idle' };

export default function AdminPage() {
  const router = useRouter();
  const [full, setFull] = useState<RunResult>(EMPTY);
  const [partial, setPartial] = useState<RunResult>(EMPTY);
  const [sinceInput, setSinceInput] = useState('');

  async function handleFullRematch() {
    setFull({ state: 'running' });
    try {
      const stats = await triggerFullRematch();
      setFull({ state: stats.ok ? 'done' : 'error', stats, error: stats.error });
    } catch (err) {
      setFull({ state: 'error', error: String(err) });
    }
  }

  async function handlePartialRematch() {
    setPartial({ state: 'running' });
    try {
      // Use the input value if provided, otherwise let the API default to now−24 h
      const since = sinceInput.trim() || undefined;
      const stats = await triggerPartialRematch(since);
      setPartial({ state: stats.ok ? 'done' : 'error', stats, error: stats.error });
    } catch (err) {
      setPartial({ state: 'error', error: String(err) });
    }
  }

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage the matching engine. These actions call the matcher service directly.
          </p>
        </div>

        {/* ── Full rematch ───────────────────────────────────── */}
        <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Full re-match</h2>
            <p className="text-sm text-gray-500 mt-1">
              Scores every open need against every available resource. Use after bulk imports
              or to fully reconcile the match table.
            </p>
          </div>

          <button
            onClick={handleFullRematch}
            disabled={full.state === 'running'}
            className="px-4 py-2 rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {full.state === 'running' ? 'Running…' : 'Run full re-match'}
          </button>

          <RunResultPanel result={full} />
        </section>

        {/* ── Partial rematch ────────────────────────────────── */}
        <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Partial re-match</h2>
            <p className="text-sm text-gray-500 mt-1">
              Only re-evaluates needs and resources created or updated since a given time.
              Leave the field empty to use the default window of the last 24 hours.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <label htmlFor="since" className="text-sm text-gray-600 whitespace-nowrap">
              Since (ISO 8601):
            </label>
            <input
              id="since"
              type="text"
              placeholder="e.g. 2026-04-07T00:00:00Z  (blank = last 24 h)"
              value={sinceInput}
              onChange={(e) => setSinceInput(e.target.value)}
              className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          <button
            onClick={handlePartialRematch}
            disabled={partial.state === 'running'}
            className="px-4 py-2 rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {partial.state === 'running' ? 'Running…' : 'Run partial re-match'}
          </button>

          <RunResultPanel result={partial} />
        </section>
      </div>
    </Layout>
  );
}

// ── Result display ─────────────────────────────────────────────

function RunResultPanel({ result }: { result: RunResult }) {
  if (result.state === 'idle') return null;

  if (result.state === 'running') {
    return (
      <p className="text-sm text-gray-500 animate-pulse">Contacting matcher service…</p>
    );
  }

  if (result.state === 'error') {
    return (
      <div className="rounded-md bg-red-50 border border-red-200 p-4 text-sm text-red-700">
        {result.error ?? 'Unknown error'}
      </div>
    );
  }

  const s = result.stats!;
  return (
    <div className="rounded-md bg-green-50 border border-green-200 p-4 text-sm text-green-800 space-y-1">
      <p className="font-medium">Completed</p>
      <ul className="list-disc list-inside space-y-0.5 text-green-700">
        <li>Strategy: <span className="font-mono">{s.strategy}</span></li>
        <li>Needs scanned: {s.needsScanned}</li>
        <li>Resources scanned: {s.resourcesScanned}</li>
        <li>Matches upserted: {s.matchesUpserted}</li>
        <li>Duration: {s.durationMs} ms</li>
      </ul>
    </div>
  );
}
