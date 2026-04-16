import { useEffect, useState } from 'react';
import Link from 'next/link';
import Layout from '../../components/Layout';
import { listNeeds, deleteNeed, Need, searchNeeds, getMe, listMatches } from '../../lib/api';

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

export default function NeedsPage() {
  const [needs, setNeeds] = useState<Need[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Need[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [matchedNeedIds, setMatchedNeedIds] = useState<string[]>([]);

  useEffect(() => {
    listNeeds().then(setNeeds).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    getMe().then((u) => setCurrentUserId(u.id)).catch(() => {});
  }, []);

  useEffect(() => {
    listMatches()
      .then((matches) => {
        setMatchedNeedIds([...new Set(matches.map((match) => match.need_id))]);
      })
      .catch(() => setMatchedNeedIds([]));
  }, []);

  useEffect(() => {
    const alphaCount = (query.match(/[a-zA-Z]/g) ?? []).length;
    if (alphaCount < 5) { setSearchResults(null); return; }
    const timer: ReturnType<typeof setTimeout> = setTimeout(async () => {
      setSearching(true);
      try {
        setSearchResults(await searchNeeds(query));
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  async function handleDelete(id: string) {
    if (!confirm('Delete this need?')) return;
    await deleteNeed(id);
    setNeeds((prev) => prev.filter((n) => n.id !== id));
  }

  const alphaCount = (query.match(/[a-zA-Z]/g) ?? []).length;
  const remaining = Math.max(0, 5 - alphaCount);
  const matchedNeedIdSet = new Set(matchedNeedIds);

  return (
    <Layout>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-800">Needs</h1>
        <div className="flex items-center gap-2">
          <Link
            href="/needs/import"
            className="border border-indigo-200 text-indigo-700 text-sm font-semibold px-4 py-2 rounded-lg hover:bg-indigo-50 transition"
          >
            Bulk Import
          </Link>
          <Link
            href="/needs/new"
            className="bg-indigo-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
          >
            + New Need
          </Link>
        </div>
      </div>

      <div className="mb-6">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search public needs… (type 5+ letters)"
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
              {searchResults.map((need) => (
                <li key={need.id}>
                  <Link
                    href={`/needs/${need.id}`}
                    className="flex items-center justify-between bg-white rounded-xl shadow-sm p-4 border border-gray-100 hover:border-indigo-300 hover:shadow transition"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-800">
                        {need.title}
                        {currentUserId && need.owner_id === currentUserId && (
                          <span className="ml-1.5 text-xs font-normal text-indigo-500">(mine)</span>
                        )}
                      </p>
                      {need.description && (
                        <p className="text-xs text-gray-500 mt-0.5 truncate">{need.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      {need.quantity > 1 && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600">
                          ×{need.quantity}
                        </span>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLOURS[need.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {need.status}
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
      ) : needs.length === 0 ? (
        <p className="text-gray-400">No needs yet. Create one!</p>
      ) : (
        <ul className="space-y-3">
          {needs.map((need) => (
            <li
              key={need.id}
              className="bg-white rounded-xl shadow-sm p-5 flex items-start justify-between border border-gray-100"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Link
                    href={`/needs/${need.id}`}
                    className="font-semibold text-gray-800 hover:text-indigo-600"
                  >
                    {need.title}
                  </Link>
                  {matchedNeedIdSet.has(need.id) && (
                    <Link
                      href={`/matches?needId=${encodeURIComponent(need.id)}`}
                      className="text-sm font-semibold text-green-700 hover:text-green-800"
                    >
                      Matched!
                    </Link>
                  )}
                  {need.quantity > 1 && (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600">
                      ×{need.quantity}
                    </span>
                  )}
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    need.is_public ? 'bg-sky-50 text-sky-600' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {need.is_public ? 'Public' : 'Private'}
                  </span>
                </div>
                {need.description && (
                  <p className="text-sm text-gray-500 mt-1">{need.description}</p>
                )}
                {need.needed_by && (
                  <p className={`text-xs mt-1 ${
                    isPast(need.needed_by) ? 'text-red-500' : 'text-gray-400'
                  }`}>
                    Needed by {formatDate(need.needed_by)}{isPast(need.needed_by) ? ' — overdue' : ''}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3 shrink-0 ml-4">
                <span
                  className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_COLOURS[need.status] ?? 'bg-gray-100 text-gray-600'}`}
                >
                  {need.status}
                </span>
                <button
                  onClick={() => handleDelete(need.id)}
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
