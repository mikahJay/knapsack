import type { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import ProductDemoVideo from '../components/ProductDemoVideo';

const IS_PROD = process.env['NEXT_PUBLIC_IS_PROD'] === 'true';

export const getServerSideProps: GetServerSideProps = async () => {
  if (IS_PROD) {
    return { redirect: { destination: '/', permanent: false } };
  }
  return { props: {} };
};

export default function ProductDemoPage() {
  return (
    <>
      <Head>
        <title>Product demo — knapsack</title>
      </Head>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <header className="bg-white border-b border-gray-100 shadow-sm">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
            <Link href="/" className="text-xl font-bold text-indigo-600 hover:text-indigo-800">
              knapsack
            </Link>
            <div className="flex items-center gap-4 text-sm font-semibold text-indigo-600">
              <Link href="/" className="hover:text-indigo-800">
                Home
              </Link>
              <Link href="/login" className="hover:text-indigo-800">
                Sign in
              </Link>
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-10">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Product demo</h1>
          <p className="text-gray-600 text-sm mb-6 max-w-3xl">
            Photo import → matching need → match workflow (non-production recording). Captions outline each step; use CC
            in the player if they are hidden.
          </p>
          <ProductDemoVideo showRecorderHint />
        </main>
      </div>
    </>
  );
}
