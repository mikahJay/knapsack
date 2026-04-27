import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import { listMatches, markMatchesSeen, Match, MatchActionType, applyMatchAction } from '../../lib/api';

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

interface MatchActionDraft {
  type: MatchActionType;
  details: string;
}

interface MatchActionState extends MatchActionDraft {
  updatedAt: string;
  pairStatus?: Match['pair_status'];
}

const ACTION_LABELS: Record<MatchActionType, string> = {
  rejected: 'Rejected',
  clarify: 'Clarification requested',
  soft_yes: 'Soft yes with conditions',
  snoozed: 'Snoozed',
  flagged: 'Flagged',
};

export default function MatchesPage() {
  const router = useRouter();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [newlySeenIds, setNewlySeenIds] = useState<string[]>([]);
  const [draftByMatchId, setDraftByMatchId] = useState<Record<string, MatchActionDraft | undefined>>({});
  const [workflowByMatchId, setWorkflowByMatchId] = useState<Record<string, MatchActionState | undefined>>({});
  const [savingByMatchId, setSavingByMatchId] = useState<Record<string, boolean | undefined>>({});
  const [errorByMatchId, setErrorByMatchId] = useState<Record<string, string | undefined>>({});
  const [messageByMatchId, setMessageByMatchId] = useState<Record<string, string | undefined>>({});

  const needId = typeof router.query['needId'] === 'string' ? router.query['needId'] : undefined;
  const resourceId = typeof router.query['resourceId'] === 'string' ? router.query['resourceId'] : undefined;

  useEffect(() => {
    setLoading(true);
    listMatches({ needId, resourceId })
      .then((fetched) => {
        setMatches(fetched);
        const persistedActions = fetched.reduce<Record<string, MatchActionState | undefined>>((acc, match) => {
          if (!match.my_action) return acc;
          acc[match.id] = {
            type: match.my_action,
            details: match.my_action_details ?? '',
            updatedAt: match.my_action_updated_at ?? match.matched_at,
            pairStatus: match.pair_status,
          };
          return acc;
        }, {});
        setWorkflowByMatchId(persistedActions);

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

  function startDraft(matchId: string, type: MatchActionType): void {
    setDraftByMatchId((prev) => ({
      ...prev,
      [matchId]: { type, details: '' },
    }));
  }

  function updateDraft(matchId: string, details: string): void {
    setDraftByMatchId((prev) => {
      const current = prev[matchId];
      if (!current) return prev;
      return {
        ...prev,
        [matchId]: { ...current, details },
      };
    });
  }

  function cancelDraft(matchId: string): void {
    setDraftByMatchId((prev) => ({
      ...prev,
      [matchId]: undefined,
    }));
  }

  async function applyDraft(matchId: string): Promise<void> {
    const draft = draftByMatchId[matchId];
    if (!draft) return;

    setSavingByMatchId((prev) => ({ ...prev, [matchId]: true }));
    setErrorByMatchId((prev) => ({ ...prev, [matchId]: undefined }));
    setMessageByMatchId((prev) => ({ ...prev, [matchId]: undefined }));

    try {
      const result = await applyMatchAction(matchId, {
        action: draft.type,
        details: draft.details || undefined,
      });
      setWorkflowByMatchId((prev) => ({
        ...prev,
        [matchId]: {
          type: result.action,
          details: result.details ?? '',
          updatedAt: new Date().toISOString(),
          pairStatus: result.pairStatus,
        },
      }));
      setDraftByMatchId((prev) => ({
        ...prev,
        [matchId]: undefined,
      }));
      setMessageByMatchId((prev) => ({ ...prev, [matchId]: result.message }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save action';
      setErrorByMatchId((prev) => ({ ...prev, [matchId]: message }));
    } finally {
      setSavingByMatchId((prev) => ({ ...prev, [matchId]: false }));
    }
  }

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
          <p className="text-xs text-indigo-700 mt-2">
            Workflow scaffold: actions are sent to API; DB persistence lands with the action-state migration.
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
            const workflowState = workflowByMatchId[match.id];
            const draft = draftByMatchId[match.id];
            const actionButtonClasses =
              'rounded-md border border-gray-200 px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50';
            const closeRecommended = workflowState?.type === 'rejected' || workflowState?.type === 'flagged';
            const pairStatus = workflowState?.pairStatus ?? match.pair_status;
            const isSaving = Boolean(savingByMatchId[match.id]);
            const saveError = errorByMatchId[match.id];
            const saveMessage = messageByMatchId[match.id];

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
                      {workflowState && (
                        <span className="rounded-full bg-indigo-50 px-2 py-1 text-xs font-bold text-indigo-700">
                          {ACTION_LABELS[workflowState.type]}
                        </span>
                      )}
                      {pairStatus !== 'open' && (
                        <span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-bold text-amber-700">
                          {pairStatus.replace(/_/g, ' ')}
                        </span>
                      )}
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
                    {workflowState && (
                      <div className="mt-4 rounded-lg border border-indigo-100 bg-indigo-50 p-3">
                        <p className="text-sm font-semibold text-indigo-800">
                          Current workflow state: {ACTION_LABELS[workflowState.type]}
                        </p>
                        {workflowState.details && (
                          <p className="mt-1 text-sm text-indigo-700">{workflowState.details}</p>
                        )}
                        <p className="mt-1 text-xs text-indigo-600">
                          Updated {formatDateTime(workflowState.updatedAt)}
                        </p>
                        {closeRecommended && (
                          <p className="mt-2 text-xs font-semibold text-red-700">
                            Suggested reconciliation: close this match and return both listings to open marketplace state.
                          </p>
                        )}
                      </div>
                    )}
                    {saveMessage && (
                      <p className="mt-3 text-xs font-semibold text-green-700">{saveMessage}</p>
                    )}
                    {saveError && (
                      <p className="mt-3 text-xs font-semibold text-red-700">{saveError}</p>
                    )}
                    <div className="mt-4">
                      <p className={`text-xs font-semibold uppercase tracking-wide ${mutedClasses}`}>
                        First action
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button
                          type="button"
                          className={actionButtonClasses}
                          disabled={isSaving}
                          onClick={() => startDraft(match.id, 'rejected')}
                        >
                          Reject
                        </button>
                        <button
                          type="button"
                          className={actionButtonClasses}
                          disabled={isSaving}
                          onClick={() => startDraft(match.id, 'clarify')}
                        >
                          Clarify
                        </button>
                        <button
                          type="button"
                          className={actionButtonClasses}
                          disabled={isSaving}
                          onClick={() => startDraft(match.id, 'soft_yes')}
                        >
                          Soft yes
                        </button>
                        <button
                          type="button"
                          className={actionButtonClasses}
                          disabled={isSaving}
                          onClick={() => startDraft(match.id, 'snoozed')}
                        >
                          Snooze
                        </button>
                        <button
                          type="button"
                          className={actionButtonClasses}
                          disabled={isSaving}
                          onClick={() => startDraft(match.id, 'flagged')}
                        >
                          Flag
                        </button>
                      </div>
                    </div>
                    {draft && (
                      <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                        <p className="text-sm font-semibold text-gray-800">
                          Draft action: {ACTION_LABELS[draft.type]}
                        </p>
                        <textarea
                          className="mt-2 w-full rounded-md border border-gray-300 bg-white p-2 text-sm text-gray-800"
                          rows={3}
                          value={draft.details}
                          placeholder="Add optional notes, conditions, or feedback visible in workflow history..."
                          onChange={(e) => updateDraft(match.id, e.target.value)}
                        />
                        <div className="mt-2 flex gap-2">
                          <button
                            type="button"
                            className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
                            disabled={isSaving}
                            onClick={() => void applyDraft(match.id)}
                          >
                            {isSaving ? 'Saving…' : 'Save action'}
                          </button>
                          <button
                            type="button"
                            className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100"
                            disabled={isSaving}
                            onClick={() => cancelDraft(match.id)}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
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