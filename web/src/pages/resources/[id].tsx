import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '../../components/Layout';
import { getOneResource, Resource } from '../../lib/api';

const STATUS_COLOURS: Record<string, string> = {
  available: 'bg-green-100 text-green-700',
  allocated: 'bg-blue-100 text-blue-700',
  retired: 'bg-gray-100 text-gray-600',
};

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function isPast(iso: string | null): boolean {
  return !!iso && new Date(iso) < new Date();
}

export default function ResourceDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const [resource, setResource] = useState<Resource | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id || typeof id !== 'string') return;
    setLoading(true);
    getOneResource(id)
      .then(setResource)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <Layout>
      <div className="mb-4">
        <Link href="/resources" className="text-sm text-indigo-600 hover:text-indigo-800">
          ← Back to Resources
        </Link>
      </div>

      {loading ? (
        <p className="text-gray-400">Loading…</p>
      ) : notFound || !resource ? (
        <p className="text-gray-500">Resource not found.</p>
      ) : (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 max-w-lg">
          <div className="flex items-start justify-between gap-3 mb-3">
            <h1 className="text-2xl font-bold text-gray-800">{resource.title}</h1>
            <span className={`text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap ${STATUS_COLOURS[resource.status] ?? 'bg-gray-100 text-gray-600'}`}>
              {resource.status}
            </span>
          </div>
          {resource.description && <p className="text-gray-600 mb-4">{resource.description}</p>}
          <dl className="space-y-1.5 text-sm">
            <div className="flex gap-2">
              <dt className="text-gray-500 w-28 shrink-0">Quantity</dt>
              <dd className="text-gray-800">{resource.quantity}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-gray-500 w-28 shrink-0">Visibility</dt>
              <dd className={resource.is_public ? 'text-sky-600' : 'text-gray-500'}>
                {resource.is_public ? 'Public' : 'Private'}
              </dd>
            </div>
            {resource.available_until && (
              <div className="flex gap-2">
                <dt className="text-gray-500 w-28 shrink-0">Available until</dt>
                <dd className={isPast(resource.available_until) ? 'text-red-500' : 'text-gray-800'}>
                  {formatDate(resource.available_until)}{isPast(resource.available_until) ? ' — expired' : ''}
                </dd>
              </div>
            )}
          </dl>
        </div>
      )}
    </Layout>
  );
}
