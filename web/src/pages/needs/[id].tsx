import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '../../components/Layout';
import { getOnNeed, Need, listMatches } from '../../lib/api';

const STATUS_COLOURS: Record<string, string> = {
  open: 'bg-green-100 text-green-700',
  fulfilled: 'bg-blue-100 text-blue-700',
  closed: 'bg-gray-100 text-gray-600',
};

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function isPast(iso: string | null): boolean {
  return !!iso && new Date(iso) < new Date();
}

export default function NeedDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const [need, setNeed] = useState<Need | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [matchCount, setMatchCount] = useState(0);

  useEffect(() => {
    if (!id || typeof id !== 'string') return;
    setLoading(true);
    getOnNeed(id)
      .then(setNeed)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!id || typeof id !== 'string') return;
    listMatches({ needId: id })
      .then((matches) => setMatchCount(matches.length))
      .catch(() => setMatchCount(0));
  }, [id]);

  return (
    <Layout>
      <div className="mb-4">
        <Link href="/needs" className="text-sm text-indigo-600 hover:text-indigo-800">
          ← Back to Needs
        </Link>
      </div>

      {loading ? (
        <p className="text-gray-400">Loading…</p>
      ) : notFound || !need ? (
        <p className="text-gray-500">Need not found.</p>
      ) : (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 max-w-lg">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">{need.title}</h1>
              <div className="mt-2 flex items-center gap-3">
                <Link
                  href={`/needs/${encodeURIComponent(need.id)}/edit`}
                  className="inline-flex text-sm font-semibold text-indigo-600 hover:text-indigo-800"
                >
                  Edit
                </Link>
              {matchCount > 0 && (
                <Link
                  href={`/matches?needId=${encodeURIComponent(need.id)}`}
                  className="inline-flex text-sm font-semibold text-green-700 hover:text-green-800"
                >
                  Matched!
                </Link>
              )}
              </div>
            </div>
            <span className={`text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap ${STATUS_COLOURS[need.status] ?? 'bg-gray-100 text-gray-600'}`}>
              {need.status}
            </span>
          </div>
          {need.description && <p className="text-gray-600 mb-4">{need.description}</p>}
          <dl className="space-y-1.5 text-sm">
            <div className="flex gap-2">
              <dt className="text-gray-500 w-28 shrink-0">Quantity</dt>
              <dd className="text-gray-800">{need.quantity}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-gray-500 w-28 shrink-0">Visibility</dt>
              <dd className={need.is_public ? 'text-sky-600' : 'text-gray-500'}>
                {need.is_public ? 'Public' : 'Private'}
              </dd>
            </div>
            {need.needed_by && (
              <div className="flex gap-2">
                <dt className="text-gray-500 w-28 shrink-0">Needed by</dt>
                <dd className={isPast(need.needed_by) ? 'text-red-500' : 'text-gray-800'}>
                  {formatDate(need.needed_by)}{isPast(need.needed_by) ? ' — overdue' : ''}
                </dd>
              </div>
            )}
          </dl>
        </div>
      )}
    </Layout>
  );
}
