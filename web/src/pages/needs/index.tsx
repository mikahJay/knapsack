import { useEffect, useState } from 'react';
import Link from 'next/link';
import Layout from '../../components/Layout';
import { listNeeds, deleteNeed, Need } from '../../lib/api';

const STATUS_COLOURS: Record<string, string> = {
  open: 'bg-green-100 text-green-700',
  fulfilled: 'bg-blue-100 text-blue-700',
  closed: 'bg-gray-100 text-gray-600',
};

export default function NeedsPage() {
  const [needs, setNeeds] = useState<Need[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listNeeds().then(setNeeds).finally(() => setLoading(false));
  }, []);

  async function handleDelete(id: string) {
    if (!confirm('Delete this need?')) return;
    await deleteNeed(id);
    setNeeds((prev) => prev.filter((n) => n.id !== id));
  }

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Needs</h1>
        <Link
          href="/needs/new"
          className="bg-indigo-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
        >
          + New Need
        </Link>
      </div>

      {loading ? (
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
              <div>
                <Link
                  href={`/needs/${need.id}`}
                  className="font-semibold text-gray-800 hover:text-indigo-600"
                >
                  {need.title}
                </Link>
                {need.description && (
                  <p className="text-sm text-gray-500 mt-1">{need.description}</p>
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
