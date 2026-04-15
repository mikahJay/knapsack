import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import { listMatches, markMatchesSeen, Match } from '../../lib/api';

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatScore(score: number): string {
  return `${Math.round(score * 100)}%`;
}

export default function MatchesPage() {
  const router = useRouter();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [newlySeenIds, setNewlySeenIds] = useState<string[]>([]);

  const needId = typeof router.query['needId'] === 'string' ? router.query['needId'] : undefined;
  const resourceId = typeof router.query['resourceId'] === 'string' ? router.query['resourceId'] : undefined;

  useEffect(() => {
    setLoading(true);
    listMatches({ needId, resourceId })
      .then((fetched) => {
        setMatches(fetched);

        const unseenIds = fetched.filter((match) => !match.seen_at).map((match) => match.id);
        setNewlySeenIds(unseenIds);

        if (unseenIds.length > 0) {
          void markMatchesSeen(unseenIds)
            .then(() => {
              window.dispatchEvent(new Event('matches:refresh-unseen'));
            })
            .catch(() => {});
        }
      })
      .finally(() => setLoading(false));
  }, [needId, resourceId]);

  const isFiltered = Boolean(needId || resourceId);
  const heading = useMemo(() => {
    if (needId && resourceId) return 'Focused Match';
    if (needId) return 'Matches For Need';
    if (resourceId) return 'Matches For Resource';
    return 'Matches';
  }, [needId, resourceId]);

  return (
    <Layout>
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{heading}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {isFiltered
              ? 'Showing the latest matched connections for the selected item.'
              : 'Your current need and resource matches, ordered from newest to oldest.'}
          </p>
        </div>
        {isFiltered && (
          <Link
            href="/matches"
            className="text-sm font-semibold text-indigo-600 hover:text-indigo-800"
          >
            View all matches
          </Link>
        )}
      </div>

      {loading ? (
        <p className="text-gray-400">Loading…</p>
      ) : matches.length === 0 ? (
        <p className="text-gray-400">No matches yet.</p>
      ) : (
        <ul className="space-y-4">
          {matches.map((match) => {
            const isFirstSeen = newlySeenIds.includes(match.id);
            const highlightClasses = isFirstSeen
              ? 'border-4 border-green-500 bg-green-50'
              : 'border border-gray-100 bg-white';
            const textClasses = isFirstSeen ? 'text-green-700' : 'text-gray-800';
            const mutedClasses = isFirstSeen ? 'text-green-700' : 'text-gray-500';

            return (
              <li
                key={match.id}
                className={`rounded-2xl shadow-sm p-5 ${highlightClasses}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      {isFirstSeen && (
                        <span className="text-xs font-extrabold uppercase tracking-[0.2em] text-green-700">
                          New
                        </span>
                      )}
                      <span className={`text-xs font-bold uppercase tracking-[0.2em] ${mutedClasses}`}>
                        Matched pair
                      </span>
                      <span className={`text-xs font-semibold ${mutedClasses}`}>
                        {formatDateTime(match.matched_at)}
                      </span>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <span className={`text-xs font-semibold uppercase tracking-wide ${mutedClasses}`}>
                          Need
                        </span>
                        <div>
                          <Link
                            href={`/needs/${match.need_id}`}
                            className={`text-lg font-bold hover:underline ${textClasses}`}
                          >
                            {match.need_title}
                          </Link>
                        </div>
                      </div>
                      <div>
                        <span className={`text-xs font-semibold uppercase tracking-wide ${mutedClasses}`}>
                          Resource
                        </span>
                        <div>
                          <Link
                            href={`/resources/${match.resource_id}`}
                            className={`text-lg font-bold hover:underline ${textClasses}`}
                          >
                            {match.resource_title}
                          </Link>
                        </div>
                      </div>
                    </div>
                    {match.rationale && (
                      <p className={`mt-4 text-sm font-semibold ${textClasses}`}>{match.rationale}</p>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className={`text-sm font-bold ${textClasses}`}>Score {formatScore(match.score)}</p>
                    <p className={`text-xs mt-1 ${mutedClasses}`}>via {match.strategy}</p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Layout>
  );
}