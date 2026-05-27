import Link from 'next/link';
import { useEffect, useState } from 'react';

/** Browsers treat `default` on &lt;track&gt; inconsistently — force overlays on where supported */
function showDemoCaptions(video: HTMLVideoElement): void {
  for (let i = 0; i < video.textTracks.length; i += 1) {
    const t = video.textTracks[i];
    if (t.kind === 'captions' || t.kind === 'subtitles') {
      t.mode = 'showing';
    }
  }
}

interface ProductDemoVideoProps {
  /** When false, omit the recorder instructions in the placeholder (e.g. in-app `/demo`). */
  showRecorderHint?: boolean;
}

type AssetProbe = 'checking' | 'absent' | 'present';

export default function ProductDemoVideo({
  showRecorderHint = true,
}: ProductDemoVideoProps) {
  const [assetProbe, setAssetProbe] = useState<AssetProbe>('checking');
  const [playbackFailed, setPlaybackFailed] = useState(false);
  const [playbackAttempt, setPlaybackAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function probe(): Promise<void> {
      for (const name of ['knapsack-product-demo.webm', 'knapsack-product-demo.mp4'] as const) {
        try {
          const res = await fetch(`/demo/${name}`, { method: 'HEAD', cache: 'no-store' });
          if (cancelled) return;
          if (res.ok) {
            setAssetProbe('present');
            return;
          }
        } catch {
          /* offline / blocked */
        }
      }
      if (!cancelled) setAssetProbe('absent');
    }
    void probe();
    return () => {
      cancelled = true;
    };
  }, []);

  function renderMissing() {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-gray-600">
        <p className="font-semibold text-gray-800 mb-2">
          No demo video file ({' '}
          <code className="text-xs bg-gray-100 px-1 rounded">web/public/demo/knapsack-product-demo.webm</code>
          ).
        </p>
        {showRecorderHint && (
          <div className="text-sm mb-4 text-left max-w-xl mx-auto space-y-3">
            <p>
              Generate it from the repo root with{' '}
              <code className="bg-gray-100 px-1.5 py-0.5 rounded">npm run record:demo</code> (see{' '}
              <code className="bg-gray-100 px-1.5 py-0.5 rounded">web/public/demo/README.md</code>
              ).
            </p>
            <p className="text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 text-xs">
              <strong>Note:</strong> that command embeds Next.js&nbsp;16’s dev server, which requires{' '}
              <strong>Node.js 20.9 or newer</strong>. If your default <code className="font-mono">node</code> is 18, use{' '}
              <code className="font-mono whitespace-nowrap">nvm install 20</code>,{' '}
              <code className="font-mono whitespace-nowrap">fnm install 20</code>, etc., then retry.
            </p>
          </div>
        )}
        <Link href="/" className="text-sm font-semibold text-indigo-600 hover:text-indigo-800">
          ← Back to dashboard
        </Link>
      </div>
    );
  }

  if (assetProbe === 'checking') {
    return (
      <section aria-label="Product demo video" className="space-y-3">
        <p className="text-sm text-gray-500">Checking for demo video…</p>
      </section>
    );
  }

  if (assetProbe === 'absent') {
    return (
      <section aria-label="Product demo video" className="space-y-3">
        {renderMissing()}
      </section>
    );
  }

  return (
    <section aria-label="Product demo video" className="space-y-3">
      {playbackFailed ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950">
          <p className="font-semibold mb-2">The demo video file is present but playback failed in this browser.</p>
          <p className="mb-3">
            WebM codecs are uneven on Safari/Firefox; try Chromium/Chrome or add{' '}
            <code className="text-xs bg-white px-1 rounded">knapsack-product-demo.mp4</code> beside the WebM in{' '}
            <code className="text-xs bg-white px-1 rounded">public/demo/</code>.
          </p>
          <button
            type="button"
            className="text-xs font-semibold text-indigo-700 hover:text-indigo-900"
            onClick={() => {
              setPlaybackFailed(false);
              setPlaybackAttempt((k) => k + 1);
            }}
          >
            Try player again
          </button>
        </div>
      ) : (
        <>
          <video
            key={`demo-video-element-${playbackAttempt}`}
            className="w-full max-w-4xl rounded-xl shadow-md border border-gray-200 bg-black"
            controls
            playsInline
            preload="metadata"
            onLoadedMetadata={(e) => showDemoCaptions(e.currentTarget)}
            onCanPlay={(e) => showDemoCaptions(e.currentTarget)}
            onError={() => setPlaybackFailed(true)}
          >
            <source src="/demo/knapsack-product-demo.webm" type="video/webm" />
            <source src="/demo/knapsack-product-demo.mp4" type="video/mp4" />
            <track
              kind="captions"
              srcLang="en"
              label="English (steps)"
              src="/demo/knapsack-product-demo-en.vtt"
              default
              onLoad={(e) => {
                const t = e.currentTarget.track;
                if (t) t.mode = 'showing';
              }}
            />
            Your browser does not support embedded video.
          </video>
          <p className="text-xs text-gray-500 max-w-4xl">
            Step captions use the browser&apos;s video overlay — they&apos;re turned on by default here. Use the player&apos;s{' '}
            <span className="font-medium text-gray-600">CC / subtitles</span> control to toggle them off or change track.
          </p>
        </>
      )}
    </section>
  );
}
