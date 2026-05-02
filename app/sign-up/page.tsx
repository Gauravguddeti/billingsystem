'use client';
import { authClient } from '@/lib/auth/client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error } = await authClient.signUp.email({ email, password, name });
    if (error) {
      setError(error.message || 'Error creating account');
    } else {
      router.push('/sign-in?registered=1');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="bg-gray-900 p-8 rounded-xl w-full max-w-md border border-gray-800">
        <h1 className="text-2xl font-bold text-white mb-2">Create an account</h1>
        <p className="text-gray-400 mb-6">Sign up to get started with Smart GST Billing.</p>
        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
        <form onSubmit={handleSignUp} className="space-y-4">
          <div>
            <label className="text-sm text-gray-300">Name</label>
            <input
              type="text" value={name} onChange={e => setName(e.target.value)}
              className="w-full mt-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
              required
            />
          </div>
          <div>
            <label className="text-sm text-gray-300">Email address</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              className="w-full mt-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
              required
            />
          </div>
          <div>
            <label className="text-sm text-gray-300">Password</label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              className="w-full mt-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
              required
              minLength={8}
            />
          </div>
          <button
            type="submit" disabled={loading}
            className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium disabled:opacity-50 transition"
          >
            {loading ? 'Creating account...' : 'Sign Up →'}
          </button>
        </form>
        <p className="text-center text-sm text-gray-400 mt-4">
          Already have an account? <a href="/sign-in" className="text-purple-400 hover:underline">Sign in</a>
        </p>
      </div>
    </div>
  );
}
