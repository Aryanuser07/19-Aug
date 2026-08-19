import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { Zap, LogIn } from 'lucide-react';
import { devSeedUsers } from '../config/devSeedUsers';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading, error } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    const success = await login(email, password);
    if (success) navigate('/');
  };

  const handleQuickLogin = async (userEmail: string, userPass: string) => {
    setEmail(userEmail);
    setPassword(userPass);
    const success = await login(userEmail, userPass);
    if (success) navigate('/');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-dark-950 via-dark-900 to-dark-850 p-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-dark-900/90 p-8 shadow-2xl backdrop-blur-xl">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-500/30">
            <Zap className="h-8 w-8" />
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-white">Team Collaboration Platform</h1>
          <p className="mt-1.5 text-xs text-gray-400">Discord + Zoom Hybrid for Engineering Teams</p>
        </div>

        {/* Dev Quick-Login Panel (Gated behind import.meta.env.DEV) */}
        {import.meta.env.DEV && (
          <div className="mt-6 rounded-xl border border-brand-500/20 bg-brand-500/5 p-3.5">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold text-brand-300">⚡ Dev Quick-Login (1-Click)</span>
              <span className="rounded bg-brand-500/20 px-1.5 py-0.5 text-[10px] font-mono text-brand-300">LOCAL DEV</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {devSeedUsers.map((devUser) => {
                const IconComponent = devUser.icon;
                return (
                  <button
                    key={devUser.email}
                    type="button"
                    onClick={() => handleQuickLogin(devUser.email, devUser.password)}
                    className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition hover:scale-[1.02] ${devUser.color}`}
                  >
                    <IconComponent className="h-4 w-4 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs font-medium truncate">{devUser.label}</div>
                      <div className="text-[10px] opacity-70 font-mono">{devUser.role}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="alex@team.com"
              required
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-dark-800 px-4 py-3 text-sm text-white placeholder-gray-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-dark-800 px-4 py-3 text-sm text-white placeholder-gray-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-600/30 transition hover:bg-brand-500 active:scale-[0.99] disabled:opacity-50"
          >
            {isLoading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <>
                <LogIn className="h-4 w-4" />
                Sign In to Workspace
              </>
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-gray-400">
          Don't have an account?{' '}
          <Link to="/register" className="font-semibold text-brand-400 hover:underline">
            Register new user
          </Link>
        </p>
      </div>
    </div>
  );
};
