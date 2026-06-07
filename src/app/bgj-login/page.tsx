'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function BgjLoginPage() {
  const [staffId, setStaffId] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden bg-gradient-to-br from-violet-950 via-purple-900 to-violet-800">
      {/* 背景装飾 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-violet-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-sm">

        {/* ロゴ */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center mb-4 shadow-lg border border-white/20">
            <svg width="28" height="28" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-white text-xl font-bold">BGJポータル</h1>
          <p className="text-violet-300 text-sm mt-1">バイオガイア Japan 社員専用</p>
        </div>

        {/* ログインカード */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-7 border border-white/20 shadow-2xl">
          <h2 className="text-white font-bold text-lg mb-1">スタッフログイン</h2>
          <p className="text-violet-300 text-xs mb-6">社員専用ページです</p>

          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-violet-200 text-sm font-medium mb-1.5">スタッフID</label>
              <input
                type="text"
                value={staffId}
                onChange={(e) => setStaffId(e.target.value)}
                placeholder="例）biogaia"
                className="w-full bg-white/10 border border-white/20 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400/50 focus:border-violet-400 transition-colors placeholder-violet-400"
              />
            </div>
            <div>
              <label className="block text-violet-200 text-sm font-medium mb-1.5">パスワード</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-white/10 border border-white/20 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400/50 focus:border-violet-400 transition-colors placeholder-violet-400"
              />
            </div>
            <button
              onClick={() => router.push('/bgj/dashboard')}
              className="w-full bg-violet-500 hover:bg-violet-400 text-white py-3 rounded-xl font-bold transition-colors shadow-sm mt-1 cursor-pointer"
            >
              ログイン
            </button>
          </div>

          <p className="text-xs text-center text-violet-400/60 mt-5">
            他のポータルは{' '}
            <Link href="/auth/signin" className="text-violet-300 hover:underline">こちら</Link>
          </p>
        </div>

        <p className="text-center text-violet-400/40 text-xs mt-6">
          © 2026 バイオガイア株式会社. All Rights Reserved.
        </p>
      </div>
    </div>
  );
}
