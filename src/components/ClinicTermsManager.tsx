'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/useToast';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import LoadingState from '@/components/ui/LoadingState';

type TermsFormState = {
  commissionRate: string;
  wholesaleRate: string;
  paymentTermsSite: string;
  paymentMethod: string;
  contractStartedAt: string;
  contractRenewalAt: string;
};

const EMPTY_TERMS_FORM: TermsFormState = {
  commissionRate: '0',
  wholesaleRate: '0',
  paymentTermsSite: '',
  paymentMethod: '',
  contractStartedAt: '',
  contractRenewalAt: '',
};

// BGJポータル（/bgj/customers/[code]、取引条件タブ）専用。得意先ごとの
// コミッション率・仕切値率・支払条件を編集する。
export default function ClinicTermsManager({
  customerCode,
  theme = 'violet',
}: {
  customerCode: string;
  theme?: 'sky' | 'violet';
}) {
  const { toast, showToast } = useToast();
  const [termsForm, setTermsForm] = useState<TermsFormState>(EMPTY_TERMS_FORM);
  const [termsLoading, setTermsLoading] = useState(true);
  const [termsSaving, setTermsSaving] = useState(false);

  useEffect(() => {
    (async () => {
      setTermsLoading(true);
      try {
        const res = await fetch(`/api/bgj/clinic-terms/${customerCode}`);
        if (res.ok) {
          const { terms } = await res.json();
          if (terms) {
            setTermsForm({
              commissionRate: String(terms.commission_rate),
              wholesaleRate: String(terms.wholesale_rate),
              paymentTermsSite: terms.payment_terms_site ?? '',
              paymentMethod: terms.payment_method ?? '',
              contractStartedAt: terms.contract_started_at ?? '',
              contractRenewalAt: terms.contract_renewal_at ?? '',
            });
          }
        }
      } finally {
        setTermsLoading(false);
      }
    })();
  }, [customerCode]);

  const handleSaveTerms = async () => {
    setTermsSaving(true);
    try {
      const res = await fetch(`/api/bgj/clinic-terms/${customerCode}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commissionRate: Number(termsForm.commissionRate) || 0,
          wholesaleRate: Number(termsForm.wholesaleRate) || 0,
          paymentTermsSite: termsForm.paymentTermsSite,
          paymentMethod: termsForm.paymentMethod,
          contractStartedAt: termsForm.contractStartedAt,
          contractRenewalAt: termsForm.contractRenewalAt,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? '保存に失敗しました');
      }
      showToast('取引条件を保存しました');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'エラーが発生しました');
    } finally {
      setTermsSaving(false);
    }
  };

  return (
    <Card theme={theme} className="p-5">
      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-violet-600 text-white text-base px-5 py-3 rounded-2xl shadow-xl">{toast}</div>
      )}
      {termsLoading ? (
        <LoadingState />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">コミッション率（%）</label>
              <input type="number" step="0.01" value={termsForm.commissionRate}
                onChange={(e) => setTermsForm({ ...termsForm, commissionRate: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">仕切値率（%）</label>
              <input type="number" step="0.01" value={termsForm.wholesaleRate}
                onChange={(e) => setTermsForm({ ...termsForm, wholesaleRate: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">支払条件（サイト）</label>
              <input type="text" placeholder="例）月末締め翌月末払い" value={termsForm.paymentTermsSite}
                onChange={(e) => setTermsForm({ ...termsForm, paymentTermsSite: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">支払方法</label>
              <input type="text" placeholder="例）銀行振込" value={termsForm.paymentMethod}
                onChange={(e) => setTermsForm({ ...termsForm, paymentMethod: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">契約開始日</label>
              <input type="date" value={termsForm.contractStartedAt}
                onChange={(e) => setTermsForm({ ...termsForm, contractStartedAt: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">次回更新日</label>
              <input type="date" value={termsForm.contractRenewalAt}
                onChange={(e) => setTermsForm({ ...termsForm, contractRenewalAt: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
            </div>
          </div>
          <Button theme={theme} size="sm" onClick={handleSaveTerms} disabled={termsSaving}>
            {termsSaving ? '保存中...' : '保存する'}
          </Button>
        </>
      )}
    </Card>
  );
}
