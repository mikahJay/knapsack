import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { login, getMe } from '../lib/api';

const IS_PROD = process.env['NEXT_PUBLIC_IS_PROD'] === 'true';
const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000';

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    router.query['error'] === 'auth' ? 'Authentication failed. Please try again.' : null
  );

  // If already logged in, redirect to home
  useEffect(() => {
    getMe()
      .then(() => router.replace('/'))
      .catch(() => { /* not logged in — stay here */ });
  }, [router]);

  async function handleBypassLogin() {
    setLoading(true);
    setError(null);
    try {
      await login();
      router.replace('/');
    } catch {
      setError('Login failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-md p-10 w-full max-w-sm text-center">
        <h1 className="text-3xl font-bold text-indigo-600 mb-2">knapsack</h1>
        <p className="text-gray-500 mb-8 text-sm">Resource allocation platform</p>

        {error && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 rounded-lg p-3">{error}</div>
        )}

        {IS_PROD ? (
          /* Production: Google OAuth button */
          <a
            href={`${API_URL}/auth/google`}
            className="flex items-center justify-center gap-3 w-full border border-gray-300 rounded-lg px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden>
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Sign in with Google
          </a>
        ) : (
          /* Non-prod: one-click bypass */
          <div className="space-y-3">
            <div className="text-xs text-amber-600 bg-amber-50 rounded-lg p-2">
              Non-prod mode — logging in as <strong>bob@local.dev</strong>
            </div>
            <button
              onClick={handleBypassLogin}
              disabled={loading}
              className="w-full bg-indigo-600 text-white rounded-lg px-4 py-3 text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition"
            >
              {loading ? 'Logging in…' : 'Log in as Bob'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
