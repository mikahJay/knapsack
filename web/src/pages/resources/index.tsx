import { useEffect, useState } from 'react';
import Link from 'next/link';
import Layout from '../../components/Layout';
import { listResources, deleteResource, Resource } from '../../lib/api';

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

  useEffect(() => {
    listResources().then(setResources).finally(() => setLoading(false));
  }, []);

  async function handleDelete(id: string) {
    if (!confirm('Delete this resource?')) return;
    await deleteResource(id);
    setResources((prev) => prev.filter((r) => r.id !== id));
  }

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Resources</h1>
        <Link
          href="/resources/new"
          className="bg-indigo-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
        >
          + New Resource
        </Link>
      </div>

      {loading ? (
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
