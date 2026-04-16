import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '../../components/Layout';
import { createNeed } from '../../lib/api';

export default function NewNeedPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [neededBy, setNeededBy] = useState(() => new Date().toISOString().slice(0, 10));
  const [isPublic, setIsPublic] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setError('Title is required.'); return; }
    setSaving(true);
    setError(null);
    try {
      await createNeed({
        title: title.trim(),
        description: description.trim() || undefined,
        quantity,
        needed_by: neededBy || undefined,
        is_public: isPublic,
      });
      router.push('/needs');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Layout>
      <div className="max-w-lg">
        <div className="mb-6 flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-gray-800">New Need</h1>
          <Link
            href="/needs/import"
            className="border border-indigo-200 text-indigo-700 text-sm font-semibold px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition"
          >
            Bulk Import
          </Link>
        </div>
        {error && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 rounded-lg p-3">{error}</div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              id="description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
              <input
                id="quantity"
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div>
              <label htmlFor="needed_by" className="block text-sm font-medium text-gray-700 mb-1">Needed by</label>
              <input
                id="needed_by"
                type="date"
                value={neededBy}
                onChange={(e) => setNeededBy(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              id="is_public"
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-400"
            />
            <label htmlFor="is_public" className="text-sm font-medium text-gray-700">
              Make public (visible to all users)
            </label>
          </div>
          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="bg-indigo-600 text-white text-sm font-semibold px-5 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition"
            >
              {saving ? 'Saving…' : 'Create'}
            </button>
            <button
              type="button"
              onClick={() => router.push('/needs')}
              className="text-sm font-medium text-gray-500 hover:text-gray-700"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
