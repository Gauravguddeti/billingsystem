'use client';
import { authClient } from '@/lib/auth/client';
import { useState } from 'react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    // Fallback to window.location.origin if NEXT_PUBLIC_APP_URL is not set
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
    
    const { error: resetError } = await (authClient as any).forgetPassword({
      email,
      redirectTo: `${appUrl}/reset-password`,
    });
    
    if (resetError) {
      setError(resetError.message || 'Error requesting password reset');
    } else {
      setSent(true);
    }
    setLoading(false);
  };

  return sent ? (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="bg-gray-900 p-8 rounded-xl w-full max-w-md border border-gray-800 text-center">
        <h2 className="text-xl font-bold text-white mb-2">Check your email</h2>
        <p className="text-gray-400">If this email exists, a reset link was sent.</p>
        <a href="/sign-in" className="mt-4 inline-block text-purple-400 hover:underline text-sm">Back to sign in</a>
      </div>
    </div>
  ) : (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="bg-gray-900 p-8 rounded-xl w-full max-w-md border border-gray-800">
        <h1 className="text-2xl font-bold text-white mb-2">Reset password</h1>
        <p className="text-gray-400 mb-6">Enter your email and we'll send you a reset link.</p>
        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm text-gray-300">Email address</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              className="w-full mt-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
              required
            />
          </div>
          <button
            type="submit" disabled={loading}
            className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium disabled:opacity-50 transition"
          >
            {loading ? 'Sending link...' : 'Send Reset Link'}
          </button>
        </form>
        <p className="text-center text-sm text-gray-400 mt-4">
          Remember your password? <a href="/sign-in" className="text-purple-400 hover:underline">Sign in</a>
        </p>
      </div>
    </div>
  );
}
