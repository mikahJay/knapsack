import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import { getEngagement, EngagementDetailPayload } from '../../lib/api';

export default function EngagementDetailPage() {
  const router = useRouter();
  const id = typeof router.query['id'] === 'string' ? router.query['id'] : null;
  const [data, setData] = useState<EngagementDetailPayload | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!router.isReady || !id) {
      return;
    }
    setLoading(true);
    getEngagement(id)
      .then(setData)
      .catch((e) => {
        setErr(e instanceof Error ? e.message : 'Failed to load');
        setData(null);
      })
      .finally(() => setLoading(false));
  }, [id, router.isReady]);

  if (!id) {
    return null;
  }

  return (
    <Layout>
      <div className="mb-6">
        <Link href="/matches" className="text-sm font-semibold text-indigo-600 hover:text-indigo-800">
          ← Back to matches
        </Link>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading…</p>
      ) : err ? (
        <p className="text-red-600">{err}</p>
      ) : data ? (
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Engagement</h1>
            <p className="text-sm text-gray-500 mt-1">Status: {data.engagement.status}</p>
            <p className="text-xs text-gray-400 font-mono mt-2">id: {data.engagement.id}</p>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Pair</h2>
            <div className="space-y-2">
              <p>
                <span className="text-gray-500">Need: </span>
                <Link
                  href={`/needs/${data.engagement.need_id}`}
                  className="font-semibold text-indigo-600 hover:underline"
                >
                  {data.engagement.need_title}
                </Link>
              </p>
              <p>
                <span className="text-gray-500">Resource: </span>
                <Link
                  href={`/resources/${data.engagement.resource_id}`}
                  className="font-semibold text-indigo-600 hover:underline"
                >
                  {data.engagement.resource_title}
                </Link>
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">
              Messages
            </h2>
            <p className="text-sm text-gray-600">
              {data.messages.length} row{data.messages.length === 1 ? '' : 's'} in{' '}
              <span className="font-mono text-xs">engagement.messages</span>
            </p>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">
              Fulfillment
            </h2>
            <p className="text-sm text-gray-600">
              {data.tasks.length} task{data.tasks.length === 1 ? '' : 's'} in{' '}
              <span className="font-mono text-xs">engagement.fulfillment_tasks</span>
            </p>
          </div>
        </div>
      ) : null}
    </Layout>
  );
}
