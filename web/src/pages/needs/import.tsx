import { useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import { commitNeedImport, NeedImportDraft, previewNeedImport } from '../../lib/api';

const DEFAULT_INPUT_MAX_CHARS = 400000;

export default function NeedBulkImportPage() {
  const router = useRouter();
  const [text, setText] = useState('');
  const [drafts, setDrafts] = useState<NeedImportDraft[]>([]);
  const [selected, setSelected] = useState<Record<number, boolean>>({});
  const [inputMaxChars, setInputMaxChars] = useState(DEFAULT_INPUT_MAX_CHARS);
  const [estimatedTokens, setEstimatedTokens] = useState<number | null>(null);
  const [tokenLimit, setTokenLimit] = useState<number | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleSelect(index: number) {
    setSelected((prev) => ({ ...prev, [index]: !prev[index] }));
  }

  function updateDraft(index: number, next: Partial<NeedImportDraft>) {
    setDrafts((prev) => prev.map((d, i) => (i === index ? { ...d, ...next } : d)));
  }

  function removeDraft(index: number) {
    setDrafts((prev) => prev.filter((_, i) => i !== index));
    setSelected((prev) => {
      const next: Record<number, boolean> = {};
      for (const [k, v] of Object.entries(prev)) {
        const oldIndex = Number(k);
        if (oldIndex < index) next[oldIndex] = v;
        if (oldIndex > index) next[oldIndex - 1] = v;
      }
      return next;
    });
  }

  function removeSelected() {
    setDrafts((prev) => prev.filter((_, i) => !selected[i]));
    setSelected({});
  }

  async function handlePreview() {
    setLoadingPreview(true);
    setError(null);
    try {
      const preview = await previewNeedImport(text);
      setDrafts(preview.items);
      setSelected({});
      setEstimatedTokens(preview.estimatedTokens);
      setTokenLimit(preview.inputTokenLimit);
      setInputMaxChars(preview.inputMaxChars);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoadingPreview(false);
    }
  }

  async function handleCommit() {
    setSaving(true);
    setError(null);
    try {
      const clean = drafts
        .map((d) => ({
          ...d,
          title: d.title.trim(),
          description: d.description?.trim() || null,
          needed_by: d.needed_by?.trim() || null,
          quantity: Math.max(1, Math.floor(Number(d.quantity) || 1)),
          is_public: Boolean(d.is_public),
        }))
        .filter((d) => d.title.length > 0);

      if (clean.length === 0) {
        setError('No valid drafts to import.');
        return;
      }

      await commitNeedImport(clean);
      router.push('/needs');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Bulk Import Needs</h1>
        <p className="text-sm text-gray-500 mb-6">
          Paste free text (sentence or list). Claude will draft need records for your review before saving.
        </p>

        {error && <div className="mb-4 text-sm text-red-600 bg-red-50 rounded-lg p-3">{error}</div>}

        <div className="bg-white border border-gray-100 rounded-xl p-4 mb-6">
          <label htmlFor="bulk-need-text" className="block text-sm font-semibold text-gray-700 mb-2">
            Source text
          </label>
          <textarea
            id="bulk-need-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={8}
            maxLength={inputMaxChars}
            placeholder="Example: We need 12 sleeping bags, 2 portable heaters, and volunteer drivers for Friday night..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
            <span>{text.length.toLocaleString()} / {inputMaxChars.toLocaleString()} characters</span>
            <span>
              {estimatedTokens !== null && tokenLimit !== null
                ? `${estimatedTokens.toLocaleString()} / ${tokenLimit.toLocaleString()} est. tokens`
                : 'Token guard: roughly half of the configured lowest model limit'}
            </span>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={loadingPreview || text.trim().length === 0}
              onClick={() => void handlePreview()}
              className="bg-indigo-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {loadingPreview ? 'Analyzing…' : 'Preview Drafts'}
            </button>
            <button
              type="button"
              onClick={() => router.push('/needs')}
              className="text-sm font-medium text-gray-500 hover:text-gray-700"
            >
              Cancel
            </button>
          </div>
        </div>

        {drafts.length > 0 && (
          <div className="bg-white border border-gray-100 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-800">Review Drafts ({drafts.length})</h2>
              <button
                type="button"
                onClick={removeSelected}
                className="text-xs font-semibold text-red-500 hover:text-red-700"
              >
                Delete selected
              </button>
            </div>

            <ul className="space-y-4">
              {drafts.map((draft, idx) => (
                <li key={idx} className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <label className="inline-flex items-center gap-2 text-sm text-gray-600">
                      <input type="checkbox" checked={!!selected[idx]} onChange={() => toggleSelect(idx)} />
                      Select
                    </label>
                    <button
                      type="button"
                      onClick={() => removeDraft(idx)}
                      className="text-xs font-semibold text-red-500 hover:text-red-700"
                    >
                      Delete
                    </button>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Title</label>
                      <input
                        type="text"
                        value={draft.title}
                        onChange={(e) => updateDraft(idx, { title: e.target.value })}
                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Description</label>
                      <textarea
                        rows={2}
                        value={draft.description ?? ''}
                        onChange={(e) => updateDraft(idx, { description: e.target.value || null })}
                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Quantity</label>
                      <input
                        type="number"
                        min={1}
                        value={draft.quantity}
                        onChange={(e) => updateDraft(idx, { quantity: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Status</label>
                      <select
                        value={draft.status}
                        onChange={(e) => updateDraft(idx, { status: e.target.value as NeedImportDraft['status'] })}
                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                      >
                        <option value="open">open</option>
                        <option value="fulfilled">fulfilled</option>
                        <option value="closed">closed</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Needed by</label>
                      <input
                        type="date"
                        value={draft.needed_by ?? ''}
                        onChange={(e) => updateDraft(idx, { needed_by: e.target.value || null })}
                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                      />
                    </div>

                    <div className="flex items-center pt-5">
                      <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={draft.is_public}
                          onChange={(e) => updateDraft(idx, { is_public: e.target.checked })}
                        />
                        Public
                      </label>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                disabled={saving || drafts.length === 0}
                onClick={() => void handleCommit()}
                className="bg-green-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {saving ? 'Importing…' : `Import ${drafts.length} Needs`}
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
