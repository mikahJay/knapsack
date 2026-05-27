import Head from 'next/head';
import Link from 'next/link';
import { useState } from 'react';

export default function PublicHome() {
  const [videoMissing, setVideoMissing] = useState(false);

  return (
    <>
      <Head>
        <title>knapsack — resource allocation</title>
        <meta
          name="description"
          content="Match posted needs with available resources—from a photo listing to coordinated handoff."
        />
      </Head>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <header className="bg-white border-b border-gray-100 shadow-sm">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
            <span className="text-xl font-bold text-indigo-600">knapsack</span>
            <Link
              href="/login"
              className="text-sm font-semibold text-indigo-600 hover:text-indigo-800"
            >
              Sign in
            </Link>
          </div>
        </header>

        <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-10">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
            Resource allocation, from photo to match
          </h1>
          <p className="text-gray-600 text-lg mb-2 max-w-3xl">
            See how a supply listing is captured from a photo, how a related need is posted, and how the match
            workflow kicks off—subtitles walk through each step.
          </p>
          <p className="text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-8 max-w-3xl">
            In the product today, <strong>photo import</strong> extracts a <strong>resource</strong> (what is
            available). You then post a <strong>need</strong> and use <strong>Matches</strong> to coordinate with the
            other party.
          </p>

          <section aria-label="Product demo video" className="space-y-3">
            {videoMissing ? (
              <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-gray-600">
                <p className="font-semibold text-gray-800 mb-2">Demo video not found in this checkout</p>
                <p className="text-sm mb-4">
                  Run <code className="bg-gray-100 px-1.5 py-0.5 rounded">npm run record:demo</code> from the repo
                  root to record it with Playwright (see <code className="bg-gray-100 px-1.5 py-0.5 rounded">web/public/demo/README.md</code>
                  ).
                </p>
                <Link href="/login" className="text-sm font-semibold text-indigo-600 hover:text-indigo-800">
                  Sign in to try the app →
                </Link>
              </div>
            ) : (
              <video
                className="w-full max-w-4xl rounded-xl shadow-md border border-gray-200 bg-black"
                controls
                playsInline
                preload="metadata"
                onError={() => setVideoMissing(true)}
              >
                <source src="/demo/knapsack-product-demo.webm" type="video/webm" />
                <source src="/demo/knapsack-product-demo.mp4" type="video/mp4" />
                <track
                  kind="subtitles"
                  srcLang="en"
                  label="English"
                  src="/demo/knapsack-product-demo-en.vtt"
                  default
                />
                Your browser does not support embedded video.{' '}
                <Link href="/login" className="text-indigo-600">
                  Sign in
                </Link>{' '}
                to use knapsack.
              </video>
            )}
            <p className="text-xs text-gray-500 max-w-4xl">
              Use your player&apos;s closed-caption / subtitles control to show step-by-step captions (WebVTT).
            </p>
          </section>

          <div className="mt-10">
            <Link
              href="/login"
              className="inline-flex bg-indigo-600 text-white text-sm font-semibold px-6 py-3 rounded-lg hover:bg-indigo-700 transition"
            >
              Sign in to get started
            </Link>
          </div>
        </main>
      </div>
    </>
  );
}
