import Link from 'next/link';
import { useRouter } from 'next/router';
import { ReactNode, useEffect, useState } from 'react';
import { getMe, getUnseenMatchesCount, login, logout, User } from '../lib/api';

interface LayoutProps {
  children: ReactNode;
}

const IS_PROD = process.env['NEXT_PUBLIC_IS_PROD'] === 'true';

export default function Layout({ children }: LayoutProps) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [matchCount, setMatchCount] = useState(0);

  async function refreshUnseenCount() {
    try {
      const payload = await getUnseenMatchesCount();
      setMatchCount(payload.count);
    } catch {
      setMatchCount(0);
    }
  }

  useEffect(() => {
    const handleRefresh = () => {
      void refreshUnseenCount();
    };

    getMe()
      .then(async (currentUser) => {
        setUser(currentUser);
        await refreshUnseenCount();
      })
      .catch(async () => {
        if (!IS_PROD) {
          try {
            await login();
            const currentUser = await getMe();
            setUser(currentUser);
            await refreshUnseenCount();
            return;
          } catch {
            // Fall through to explicit login page if bypass login fails.
          }
        }
        router.push('/login');
      });

    window.addEventListener('matches:refresh-unseen', handleRefresh);
    return () => {
      window.removeEventListener('matches:refresh-unseen', handleRefresh);
    };
  }, [router]);

  async function handleLogout() {
    await logout();
    setUser(null);
    setMatchCount(0);
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
            <Link
              href="/matches"
              aria-label={matchCount > 0 ? `Matches (${matchCount})` : 'Matches'}
              className="hover:text-indigo-600 inline-flex items-center gap-2"
            >
              <span>Matches</span>
              {matchCount > 0 && (
                <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-green-100 px-1.5 py-0.5 text-xs font-semibold text-green-700">
                  {matchCount}
                </span>
              )}
            </Link>
            {user.is_admin && (
              <Link href="/admin" className="hover:text-indigo-600">
                Admin
              </Link>
            )}
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
