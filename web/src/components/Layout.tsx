import Link from 'next/link';
import { useRouter } from 'next/router';
import { ReactNode, useEffect, useState } from 'react';
import { getMe, logout, User } from '../lib/api';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    getMe()
      .then(setUser)
      .catch(() => router.push('/login'));
  }, [router]);

  async function handleLogout() {
    await logout();
    setUser(null);
    router.push('/login');
  }

  if (!user) return null; // redirect pending

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top nav */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-indigo-600">
            knapsack
          </Link>
          <div className="flex gap-6 items-center text-sm font-medium text-gray-600">
            <Link href="/needs" className="hover:text-indigo-600">
              Needs
            </Link>
            <Link href="/resources" className="hover:text-indigo-600">
              Resources
            </Link>
            <span className="text-gray-400">|</span>
            <span>{user.name ?? user.email}</span>
            <button
              onClick={handleLogout}
              className="text-gray-500 hover:text-red-500"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      {/* Page content */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8">
        {children}
      </main>
    </div>
  );
}
