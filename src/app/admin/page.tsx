'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AdminLoginPage() {
  const [adminId, setAdminId] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden"
      style={{ backgroundImage: 'url(/admin-login-bg.png)', backgroundSize: 'cover', backgroundPosition: 'center top', backgroundRepeat: 'no-repeat' }}
    >
      <div className="absolute inset-0 bg-gray-900/50" />
      <div className="relative z-10 w-full max-w-sm">

        {/* ロゴ */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-teal-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
            <svg width="28" height="28" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </div>
          <h1 className="text-white text-xl font-bold">テストデンタル歯科</h1>
          <p className="text-gray-400 text-sm mt-1">医院管理ポータル</p>
        </div>

        {/* ログインカード */}
        <div className="bg-gray-800 rounded-2xl p-7 border border-gray-700">
          <h2 className="text-white font-bold text-lg mb-1">管理者ログイン</h2>
          <p className="text-gray-400 text-xs mb-6">医院スタッフ専用ページです</p>

          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-1.5">管理者ID</label>
              <input
                type="text"
                value={adminId}
                onChange={(e) => setAdminId(e.target.value)}
                placeholder="例）clinic"
                className="w-full bg-gray-700 border border-gray-600 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500 transition-colors placeholder-gray-500"
              />
            </div>
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-1.5">パスワード</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-gray-700 border border-gray-600 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500 transition-colors placeholder-gray-500"
              />
            </div>
            <button
              onClick={() => router.push('/admin/dashboard')}
              className="w-full bg-teal-500 hover:bg-teal-400 text-white py-3 rounded-xl font-bold transition-colors shadow-sm mt-1 cursor-pointer"
            >
              ログイン
            </button>
          </div>

          <p className="text-xs text-center text-gray-600 mt-5">
            他のポータルは{' '}
            <Link href="/auth/signin" className="text-teal-400 hover:underline">こちら</Link>
          </p>
        </div>

        <p className="text-center text-gray-600 text-xs mt-6">
          © 2026 テストデンタル歯科. All Rights Reserved.
        </p>
      </div>
    </div>
  );
}
