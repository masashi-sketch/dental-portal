'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import AdminSidebar from '../components/AdminSidebar';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import LoadingState from '@/components/ui/LoadingState';
import { useToast } from '@/hooks/useToast';

export default function AdminInquiryPage() {
  const { data: session, status: sessionStatus } = useSession();
  const isClinicRole = session?.user?.role === 'clinic';
  const ready = sessionStatus !== 'loading';
  const { toast, showToast } = useToast();

  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    if (!subject.trim() || !body.trim()) {
      showToast('件名と本文を入力してください');
      return;
    }
    setSending(true);
    try {
      const res = await fetch('/api/admin/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, body }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? '送信に失敗しました');
      }
      setSent(true);
      setSubject('');
      setBody('');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'エラーが発生しました');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-sky-50">
      <AdminSidebar active="inquiry" />

      <div className="flex-1 flex flex-col min-w-0 pt-14 md:pt-0">
        {toast && (
          <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-sky-600 text-white text-base px-5 py-3 rounded-2xl shadow-xl">{toast}</div>
        )}

        <header className="bg-white border-b border-sky-100 px-4 sm:px-6 py-4 shadow-sm">
          <h1 className="text-slate-800 font-bold text-xl">BGJへのお問い合わせ</h1>
          <p className="text-slate-600 text-sm mt-0.5">担当営業へ問い合わせを送信します</p>
        </header>

        <main className="flex-1 p-5 sm:p-6">
          {!ready && <LoadingState />}

          {ready && !isClinicRole && (
            <Card theme="sky" className="p-5 sm:p-6 shadow-sm max-w-2xl">
              <p className="text-sm font-bold text-slate-700 mb-1">この画面はクリニックログイン専用です</p>
              <p className="text-slate-500 text-sm mb-4">
                問い合わせの確認は、BGJポータルの「得意先一覧」の行動履歴から行えます。
              </p>
              <Link
                href="/bgj/customers"
                className="inline-block bg-sky-500 hover:bg-sky-400 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-colors"
              >
                BGJポータルの得意先一覧へ
              </Link>
            </Card>
          )}

          {ready && isClinicRole && (
            <Card theme="sky" className="p-5 sm:p-6 shadow-sm max-w-2xl">
              {sent && (
                <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm px-4 py-3 rounded-xl">
                  送信しました。担当者からの返信をお待ちください。
                </div>
              )}
              <div className="flex flex-col gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1 block">件名</label>
                  <input
                    type="text"
                    placeholder="例）在庫について"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 mb-1 block">本文</label>
                  <textarea
                    rows={6}
                    placeholder="お問い合わせ内容をご記入ください"
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 resize-none"
                  />
                </div>
                <Button theme="sky" size="sm" onClick={handleSubmit} disabled={sending} className="self-start">
                  {sending ? '送信中...' : '送信する'}
                </Button>
              </div>
            </Card>
          )}
        </main>
      </div>
    </div>
  );
}
