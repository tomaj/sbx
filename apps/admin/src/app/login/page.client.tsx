'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { login } from '@/lib/auth-client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await login(email, password);
      router.push('/');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* ── Left panel ── */}
      <div className="hidden lg:flex lg:w-[58%] flex-col bg-[#e20074] relative overflow-hidden">
        {/* Logo top-left */}
        <div className="flex items-center gap-2.5 px-10 pt-10">
          <div className="size-9 rounded-lg bg-white/20 flex items-center justify-center text-white font-bold text-base">
            S
          </div>
          <span className="text-white font-semibold text-base tracking-wide">sb-x</span>
        </div>

        {/* Headline */}
        <div className="flex-1 flex flex-col justify-start px-10 pt-14">
          <h1 className="text-white font-black text-[3.2rem] leading-[1.1] tracking-tight max-w-[520px]">
            Your content.
            <br />
            Your rules.
            <br />
            Zero limits.
          </h1>
          <p className="mt-6 text-white/75 text-lg leading-relaxed max-w-[440px]">
            A modern headless CMS that keeps your team moving — structured content, powerful
            workflows, and instant delivery at scale.
          </p>
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 bg-white">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2.5 mb-10">
          <div className="size-9 rounded-lg bg-[#e20074] flex items-center justify-center text-white font-bold text-base">
            S
          </div>
          <span className="text-gray-900 font-semibold text-base tracking-wide">sb-x</span>
        </div>

        <div className="w-full max-w-[380px]">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Welcome back</h2>
            <p className="text-sm text-gray-500 mt-1">Sign in to your sb-x account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@telekom.sk"
                required
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#e20074] focus:border-transparent transition bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#e20074] focus:border-transparent transition bg-white"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-[#e20074] hover:bg-[#c8006a] text-white font-semibold rounded-lg text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>

        {/* Bottom branding */}
        <p className="absolute bottom-6 text-xs text-gray-400">
          © {new Date().getFullYear()} Telekom Slovakia
        </p>
      </div>
    </div>
  );
}
