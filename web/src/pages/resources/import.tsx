import { useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import {
  commitResourceImport,
  PhotoImportDiagnostics,
  previewResourceImport,
  previewResourcePhotoImport,
  ResourceImportDraft,
} from '../../lib/api';

const INPUT_MAX_CHARS = 1000;

export default function ResourceBulkImportPage() {
  const router = useRouter();
  const [text, setText] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [drafts, setDrafts] = useState<ResourceImportDraft[]>([]);
  const [selected, setSelected] = useState<Record<number, boolean>>({});
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingPhotoPreview, setLoadingPhotoPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photoDiagnostics, setPhotoDiagnostics] = useState<PhotoImportDiagnostics | null>(null);

  function toggleSelect(index: number) {
    setSelected((prev) => ({ ...prev, [index]: !prev[index] }));
  }

  function updateDraft(index: number, next: Partial<ResourceImportDraft>) {
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
      const preview = await previewResourceImport(text);
      setDrafts(preview.items);
      setSelected({});
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoadingPreview(false);
    }
  }

  async function handlePhotoPreview() {
    if (!photoFile) {
      setError('Please choose a photo first.');
      return;
    }

    setLoadingPhotoPreview(true);
    setError(null);
    try {
      const result = await previewResourcePhotoImport(photoFile);
      setPhotoDiagnostics(result.diagnostics ?? null);
      if (result.status === 'reject') {
        setError(`Photo rejected (${result.code}).`);
        return;
      }

      setDrafts([result.draft, ...(result.additionalDrafts ?? [])]);
      setSelected({});
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoadingPhotoPreview(false);
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
          available_until: d.available_until?.trim() || null,
          quantity: Math.max(1, Math.floor(Number(d.quantity) || 1)),
          is_public: Boolean(d.is_public),
        }))
        .filter((d) => d.title.length > 0);

      if (clean.length === 0) {
        setError('No valid drafts to import.');
        return;
      }

      await commitResourceImport(clean);
      router.push('/resources');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Bulk Import Resources</h1>
        <p className="text-sm text-gray-500 mb-6">
          Paste free text (sentence or list). Claude will draft resource records for your review before saving.
        </p>

        {error && <div className="mb-4 text-sm text-red-600 bg-red-50 rounded-lg p-3">{error}</div>}

        <div className="bg-white border border-gray-100 rounded-xl p-4 mb-6">
          <label htmlFor="bulk-resource-photo" className="block text-sm font-semibold text-gray-700 mb-2">
            Or upload a photo
          </label>
          <input
            id="bulk-resource-photo"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-gray-700 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-indigo-700 hover:file:bg-indigo-100"
          />
          <div className="mt-3 mb-5 flex gap-2">
            <button
              type="button"
              disabled={loadingPhotoPreview || !photoFile}
              onClick={() => void handlePhotoPreview()}
              className="bg-emerald-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
            >
              {loadingPhotoPreview ? 'Analyzing Photo…' : 'Preview From Photo'}
            </button>
          </div>

          {photoDiagnostics && (
            <div className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
              <p className="font-semibold mb-2">Photo diagnostics (non-prod)</p>
              <ul className="space-y-1">
                <li>provider: {photoDiagnostics.provider}</li>
                <li>model: {photoDiagnostics.model}</li>
                <li>usedVision: {String(photoDiagnostics.usedVision)}</li>
                <li>latencyMs: {photoDiagnostics.latencyMs}</li>
                <li>moderationVerdict: {photoDiagnostics.moderationVerdict}</li>
                <li>relevanceVerdict: {photoDiagnostics.relevanceVerdict}</li>
                <li>extractedTextPreview: {photoDiagnostics.extractedTextPreview || '(none)'}</li>
                <li>detectionsCount: {photoDiagnostics.detectionsCount ?? 0}</li>
              </ul>
            </div>
          )}

          <div className="h-px bg-gray-100 mb-5" />

          <label htmlFor="bulk-resource-text" className="block text-sm font-semibold text-gray-700 mb-2">
            Source text
          </label>
          <textarea
            id="bulk-resource-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={8}
            maxLength={INPUT_MAX_CHARS}
            placeholder="Example: We have 20 folding chairs, 1 projector, and two vans available next week..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
            <span>{text.length.toLocaleString()} / {INPUT_MAX_CHARS.toLocaleString()} characters</span>
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
              onClick={() => router.push('/resources')}
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
                        onChange={(e) => updateDraft(idx, { status: e.target.value as ResourceImportDraft['status'] })}
                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                      >
                        <option value="available">available</option>
                        <option value="allocated">allocated</option>
                        <option value="retired">retired</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Available until</label>
                      <input
                        type="date"
                        value={draft.available_until ?? ''}
                        onChange={(e) => updateDraft(idx, { available_until: e.target.value || null })}
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
                {saving ? 'Importing…' : `Import ${drafts.length} Resources`}
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
