import Link from 'next/link';
import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import PublicHome from '../components/PublicHome';
import { getMe, type User } from '../lib/api';

export default function HomePage() {
  const [user, setUser] = useState<User | null | undefined>(undefined);

  useEffect(() => {
    getMe()
      .then((u) => setUser(u))
      .catch(() => setUser(null));
  }, []);

  if (user === undefined) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400 text-sm">Loading…</p>
      </div>
    );
  }

  if (!user) {
    return <PublicHome />;
  }

  return (
    <Layout>
      <h1 className="text-2xl font-bold text-gray-800 mb-2">Dashboard</h1>
      <p className="text-gray-500 mb-8">Welcome to knapsack — your resource allocation platform.</p>

      <div className="grid gap-6 sm:grid-cols-2">
        <Link
          href="/needs"
          className="block bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition border border-gray-100"
        >
          <h2 className="text-lg font-semibold text-indigo-600 mb-1">Needs</h2>
          <p className="text-sm text-gray-500">
            Browse, create and manage allocation needs.
          </p>
        </Link>

        <Link
          href="/resources"
          className="block bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition border border-gray-100"
        >
          <h2 className="text-lg font-semibold text-indigo-600 mb-1">Resources</h2>
          <p className="text-sm text-gray-500">
            Browse, create and manage available resources.
          </p>
        </Link>
      </div>
    </Layout>
  );
}
