import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '../../components/Layout';
import { getOneResource, listMatches, Resource } from '../../lib/api';

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
  const [matchCount, setMatchCount] = useState(0);
  const [isPhotoOpen, setIsPhotoOpen] = useState(false);

  useEffect(() => {
    if (!id || typeof id !== 'string') return;
    setLoading(true);
    getOneResource(id)
      .then(setResource)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!id || typeof id !== 'string') return;
    listMatches({ resourceId: id })
      .then((matches) => setMatchCount(matches.length))
      .catch(() => setMatchCount(0));
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
            <div>
              <h1 className="text-2xl font-bold text-gray-800">{resource.title}</h1>
              <div className="mt-2 flex items-center gap-3">
                <Link
                  href={`/resources/${encodeURIComponent(resource.id)}/edit`}
                  className="inline-flex text-sm font-semibold text-indigo-600 hover:text-indigo-800"
                >
                  Edit
                </Link>
              {matchCount > 0 && (
                <Link
                  href={`/matches?resourceId=${encodeURIComponent(resource.id)}`}
                  className="inline-flex text-sm font-semibold text-green-700 hover:text-green-800"
                >
                  Matched!
                </Link>
              )}
              </div>
            </div>
            <span className={`text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap ${STATUS_COLOURS[resource.status] ?? 'bg-gray-100 text-gray-600'}`}>
              {resource.status}
            </span>
          </div>
          {resource.description && <p className="text-gray-600 mb-4">{resource.description}</p>}

          {resource.photo?.imageBase64 && (
            <div className="mb-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Photo</p>
              <button
                type="button"
                onClick={() => setIsPhotoOpen(true)}
                className="group relative overflow-hidden rounded-lg border border-gray-200"
              >
                <img
                  src={`data:${resource.photo.mimeType};base64,${resource.photo.imageBase64}`}
                  alt="Resource thumbnail"
                  className="h-28 w-28 object-cover"
                />
                {resource.photo.focusBox && (
                  <span
                    className="pointer-events-none absolute border-2 border-emerald-500 bg-emerald-400/10"
                    style={{
                      left: `${resource.photo.focusBox.x * 100}%`,
                      top: `${resource.photo.focusBox.y * 100}%`,
                      width: `${resource.photo.focusBox.width * 100}%`,
                      height: `${resource.photo.focusBox.height * 100}%`,
                    }}
                  />
                )}
                <span className="absolute inset-x-0 bottom-0 bg-black/55 px-2 py-1 text-[11px] font-medium text-white">
                  Click to open highlighted photo
                </span>
              </button>
            </div>
          )}

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

      {resource?.photo?.imageBase64 && isPhotoOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6" onClick={() => setIsPhotoOpen(false)}>
          <div className="relative max-h-[90vh] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setIsPhotoOpen(false)}
              className="absolute -top-10 right-0 text-white text-sm font-semibold"
            >
              Close
            </button>
            <img
              src={`data:${resource.photo.mimeType};base64,${resource.photo.imageBase64}`}
              alt="Resource full"
              className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg"
            />
            {resource.photo.focusBox && (
              <span
                className="pointer-events-none absolute border-4 border-emerald-400 shadow-[0_0_0_9999px_rgba(0,0,0,0.25)]"
                style={{
                  left: `${resource.photo.focusBox.x * 100}%`,
                  top: `${resource.photo.focusBox.y * 100}%`,
                  width: `${resource.photo.focusBox.width * 100}%`,
                  height: `${resource.photo.focusBox.height * 100}%`,
                }}
              />
            )}
          </div>
        </div>
      )}
    </Layout>
  );
}
