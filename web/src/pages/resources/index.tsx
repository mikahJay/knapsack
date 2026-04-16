import { useEffect, useState } from 'react';
import Link from 'next/link';
import Layout from '../../components/Layout';
import { listResources, deleteResource, Resource, searchResources, getMe, listMatches } from '../../lib/api';

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

export default function ResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Resource[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [matchedResourceIds, setMatchedResourceIds] = useState<string[]>([]);

  useEffect(() => {
    listResources().then(setResources).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    getMe().then((u) => setCurrentUserId(u.id)).catch(() => {});
  }, []);

  useEffect(() => {
    listMatches()
      .then((matches) => {
        setMatchedResourceIds([...new Set(matches.map((match) => match.resource_id))]);
      })
      .catch(() => setMatchedResourceIds([]));
  }, []);

  useEffect(() => {
    const alphaCount = (query.match(/[a-zA-Z]/g) ?? []).length;
    if (alphaCount < 5) { setSearchResults(null); return; }
    const timer: ReturnType<typeof setTimeout> = setTimeout(async () => {
      setSearching(true);
      try {
        setSearchResults(await searchResources(query));
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  async function handleDelete(id: string) {
    if (!confirm('Delete this resource?')) return;
    await deleteResource(id);
    setResources((prev) => prev.filter((r) => r.id !== id));
  }

  const alphaCount = (query.match(/[a-zA-Z]/g) ?? []).length;
  const remaining = Math.max(0, 5 - alphaCount);
  const matchedResourceIdSet = new Set(matchedResourceIds);

  return (
    <Layout>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-800">Resources</h1>
        <div className="flex items-center gap-2">
          <Link
            href="/resources/import"
            className="border border-indigo-200 text-indigo-700 text-sm font-semibold px-4 py-2 rounded-lg hover:bg-indigo-50 transition"
          >
            Bulk Import
          </Link>
          <Link
            href="/resources/new"
            className="bg-indigo-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
          >
            + New Resource
          </Link>
        </div>
      </div>

      <div className="mb-6">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search public resources… (type 5+ letters)"
          className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
        {query.length > 0 && remaining > 0 && (
          <p className="text-xs text-gray-400 mt-1">
            {remaining} more letter{remaining !== 1 ? 's' : ''} needed to search
          </p>
        )}
      </div>

      {searchResults !== null ? (
        <>
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            {searching ? 'Searching…' : `Search results (${searchResults.length})`}
          </p>
          {!searching && searchResults.length === 0 ? (
            <p className="text-gray-400 text-sm">No matches found.</p>
          ) : (
            <ul className="space-y-2">
              {searchResults.map((resource) => (
                <li key={resource.id}>
                  <Link
                    href={`/resources/${resource.id}`}
                    className="flex items-center justify-between bg-white rounded-xl shadow-sm p-4 border border-gray-100 hover:border-indigo-300 hover:shadow transition"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-800">
                        {resource.title}
                        {currentUserId && resource.owner_id === currentUserId && (
                          <span className="ml-1.5 text-xs font-normal text-indigo-500">(mine)</span>
                        )}
                      </p>
                      {resource.description && (
                        <p className="text-xs text-gray-500 mt-0.5 truncate">{resource.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      {resource.quantity > 1 && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600">
                          ×{resource.quantity}
                        </span>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLOURS[resource.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {resource.status}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : loading ? (
        <p className="text-gray-400">Loading…</p>
      ) : resources.length === 0 ? (
        <p className="text-gray-400">No resources yet. Create one!</p>
      ) : (
        <ul className="space-y-3">
          {resources.map((resource) => (
            <li
              key={resource.id}
              className="bg-white rounded-xl shadow-sm p-5 flex items-start justify-between border border-gray-100"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-gray-800">{resource.title}</p>
                  {matchedResourceIdSet.has(resource.id) && (
                    <Link
                      href={`/matches?resourceId=${encodeURIComponent(resource.id)}`}
                      className="text-sm font-semibold text-green-700 hover:text-green-800"
                    >
                      Matched!
                    </Link>
                  )}
                  {resource.quantity > 1 && (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600">
                      ×{resource.quantity}
                    </span>
                  )}
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    resource.is_public ? 'bg-sky-50 text-sky-600' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {resource.is_public ? 'Public' : 'Private'}
                  </span>
                </div>
                {resource.description && (
                  <p className="text-sm text-gray-500 mt-1">{resource.description}</p>
                )}
                {resource.available_until && (
                  <p className={`text-xs mt-1 ${
                    isPast(resource.available_until) ? 'text-red-500' : 'text-gray-400'
                  }`}>
                    Available until {formatDate(resource.available_until)}{isPast(resource.available_until) ? ' — expired' : ''}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3 shrink-0 ml-4">
                <span
                  className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_COLOURS[resource.status] ?? 'bg-gray-100 text-gray-600'}`}
                >
                  {resource.status}
                </span>
                <button
                  onClick={() => handleDelete(resource.id)}
                  className="text-xs text-red-400 hover:text-red-600"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Layout>
  );
}
