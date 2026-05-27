import { useRouter } from 'next/router';
import { useCallback, useEffect, useState } from 'react';
import Layout from '../../../components/Layout';
import { createEngagement, getEngagementForMatch } from '../../../lib/api';

/**
 * Entry from the matches list: resolve an existing engagement or start one.
 */
export default function EngagementByMatchPage() {
  const router = useRouter();
  const matchId = typeof router.query['matchId'] === 'string' ? router.query['matchId'] : null;

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [needLabel, setNeedLabel] = useState<string>('');
  const [resourceLabel, setResourceLabel] = useState<string>('');
  const [canStart, setCanStart] = useState(false);

  const goToEngagement = useCallback(
    (id: string) => {
      void router.replace(`/engagements/${id}`);
    },
    [router]
  );

  useEffect(() => {
    if (!router.isReady || !matchId) {
      return;
    }

    setLoading(true);
    setErr(null);
    getEngagementForMatch(matchId)
      .then((res) => {
        setNeedLabel(res.match.need_title);
        setResourceLabel(res.match.resource_title);
        if (res.engagement) {
          goToEngagement(res.engagement.id);
          return; // keep loading until /engagements/:id replaces this page
        }
        setCanStart(true);
        setLoading(false);
      })
      .catch((e) => {
        setErr(e instanceof Error ? e.message : 'Failed to load match');
        setCanStart(false);
        setLoading(false);
      });
  }, [matchId, router.isReady, goToEngagement]);

  async function onStart() {
    if (!matchId) {
      return;
    }
    setErr(null);
    setLoading(true);
    try {
      const created = await createEngagement(matchId);
      goToEngagement(created.id);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Could not start engagement';
      setErr(message);
    } finally {
      setLoading(false);
    }
  }

  if (!matchId) {
    return null;
  }

  return (
    <Layout>
      <div className="max-w-lg">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Engagement</h1>
        {loading ? (
          <p className="text-gray-500">Loading…</p>
        ) : err ? (
          <p className="text-red-600">{err}</p>
        ) : (
          <>
            <p className="text-sm text-gray-600 mb-4">
              <span className="font-semibold text-gray-800">Need</span> {needLabel}
            </p>
            <p className="text-sm text-gray-600 mb-6">
              <span className="font-semibold text-gray-800">Resource</span> {resourceLabel}
            </p>
            {canStart && (
              <button
                type="button"
                onClick={() => void onStart()}
                disabled={loading}
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50"
              >
                {loading ? 'Starting…' : 'Start engagement'}
              </button>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
