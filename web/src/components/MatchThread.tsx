import { useCallback, useEffect, useState } from 'react';
import { getMe, listMatchMessages, postMatchMessage, type MatchMessage, type UUID } from '../lib/api';

interface MatchThreadProps {
  matchId: string;
  enabled: boolean;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function MatchThread({ matchId, enabled }: MatchThreadProps) {
  const [myUserId, setMyUserId] = useState<UUID | null>(null);
  const [messages, setMessages] = useState<MatchMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      const [me, rows] = await Promise.all([getMe(), listMatchMessages(matchId)]);
      setMyUserId(me.id);
      setMessages(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, [matchId, enabled]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    const text = draft.trim();
    if (!text || posting) return;
    setPosting(true);
    setError(null);
    try {
      const msg = await postMatchMessage(matchId, text);
      setMessages((prev) => [...prev, msg]);
      setDraft('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send');
    } finally {
      setPosting(false);
    }
  }

  if (!enabled) {
    return null;
  }

  return (
    <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-600">Match conversation</p>
      <p className="mt-1 text-xs text-slate-500">
        Messages are visible only to you and the other party on this match.
      </p>
      {loading && <p className="mt-2 text-xs text-slate-500">Loading messages…</p>}
      {error && <p className="mt-2 text-xs font-semibold text-red-600">{error}</p>}
      <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto">
        {messages.length === 0 && !loading && (
          <li className="text-xs text-slate-500">No messages yet — say hello to coordinate details.</li>
        )}
        {messages.map((m) => {
          const mine = myUserId != null && m.user_id === myUserId;
          return (
            <li
              key={m.id}
              className={`rounded-md px-2 py-1.5 text-sm ${
                mine ? 'ml-6 bg-indigo-100 text-indigo-900' : 'mr-6 bg-white text-slate-800 ring-1 ring-slate-200'
              }`}
            >
              <span className="text-[10px] font-semibold uppercase text-slate-500">
                {mine ? 'You' : 'Counterparty'} · {formatTime(m.created_at)}
              </span>
              <p className="mt-0.5 whitespace-pre-wrap">{m.body}</p>
            </li>
          );
        })}
      </ul>
      <form className="mt-3 flex flex-col gap-2" onSubmit={(e) => void handleSubmit(e)}>
        <textarea
          className="w-full rounded-md border border-slate-300 bg-white p-2 text-sm text-slate-800"
          rows={2}
          value={draft}
          placeholder="Write a message…"
          onChange={(e) => setDraft(e.target.value)}
          disabled={posting}
        />
        <button
          type="submit"
          className="self-end rounded-md bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-900 disabled:cursor-not-allowed disabled:bg-slate-400"
          disabled={posting || !draft.trim()}
        >
          {posting ? 'Sending…' : 'Send'}
        </button>
      </form>
    </div>
  );
}
