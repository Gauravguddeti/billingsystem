'use client';
import { authClient } from '@/lib/auth/client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    let authError: any = null;
    
    try {
      const { error } = await authClient.signIn.email({ email, password });
      authError = error;
    } catch (e: any) {
      authError = e;
    }

    if (authError) {
      // If Neon Auth doesn't know this user, try migrating them from old DB
      const errMsg = authError.message?.toLowerCase() || '';
      if (errMsg.includes('not found') || 
          errMsg.includes('invalid') ||
          authError.status === 401 || authError.status === 404) {
        
        setError('Checking credentials...');
        
        try {
          const migrateRes = await fetch('/api/auth/migrate-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
          });

          if (migrateRes.ok) {
            // Migration succeeded — now sign in properly via Neon Auth
            try {
              const { error: retryError } = await authClient.signIn.email({ email, password });
              if (retryError) {
                setError('Migration done but sign in failed — try again');
              } else {
                router.push('/');
                router.refresh();
              }
            } catch (retryE: any) {
              setError('Migration done but sign in failed — try again');
            }
          } else {
            // Migration failed = genuinely wrong credentials
            const errData = await migrateRes.json().catch(() => ({}));
            setError(errData.error || 'Invalid email or password');
          }
        } catch (fetchErr) {
          setError('Failed to reach migration server');
        }
      } else {
        setError(authError.message || 'Sign in failed');
      }
    } else {
      router.push('/');
      router.refresh();
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="bg-gray-900 p-8 rounded-xl w-full max-w-md border border-gray-800">
        <h1 className="text-2xl font-bold text-white mb-2">Sign in to Smart GST Billing</h1>
        <p className="text-gray-400 mb-6">Welcome back! Please sign in to continue.</p>
        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
        <form onSubmit={handleSignIn} className="space-y-4">
          <div>
            <label className="text-sm text-gray-300">Email address</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              className="w-full mt-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
              required
            />
          </div>
          <div>
            <div className="flex justify-between items-center">
              <label className="text-sm text-gray-300">Password</label>
              <a href="/forgot-password" className="text-xs text-purple-400 hover:underline">Forgot password?</a>
            </div>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              className="w-full mt-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
              required
            />
          </div>
          <button
            type="submit" disabled={loading}
            className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium disabled:opacity-50 transition"
          >
            {loading ? 'Signing in...' : 'Continue →'}
          </button>
        </form>
        <p className="text-center text-sm text-gray-400 mt-4">
          Don't have an account? <a href="/sign-up" className="text-purple-400 hover:underline">Sign up</a>
        </p>
      </div>
    </div>
  );
}
