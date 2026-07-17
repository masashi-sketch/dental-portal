'use client';

import { useCallback, useEffect, useState } from 'react';
import { useToast } from '@/hooks/useToast';
import Button from '@/components/ui/Button';
import LoadingState from '@/components/ui/LoadingState';
import {
  DEFAULT_PASSWORD_RESET_BODY,
  DEFAULT_PASSWORD_RESET_SUBJECT,
  DEFAULT_WELCOME_BODY,
  DEFAULT_WELCOME_SUBJECT,
  PREVIEW_SAMPLE_VARS,
  renderEmailTemplate,
} from '@/lib/email/templates';
import type { ClinicEmailTemplates } from '@/lib/supabase/types';

type TemplateType = 'welcome' | 'password_reset';

const TEMPLATE_TABS: { key: TemplateType; label: string }[] = [
  { key: 'welcome', label: '初回登録メール' },
  { key: 'password_reset', label: 'パスワード変更メール' },
];

const DEFAULTS: Record<TemplateType, { subject: string; body: string }> = {
  welcome: { subject: DEFAULT_WELCOME_SUBJECT, body: DEFAULT_WELCOME_BODY },
  password_reset: { subject: DEFAULT_PASSWORD_RESET_SUBJECT, body: DEFAULT_PASSWORD_RESET_BODY },
};

type FormState = {
  senderName: string;
  welcomeSubject: string;
  welcomeBody: string;
  passwordResetSubject: string;
  passwordResetBody: string;
};
const EMPTY_FORM: FormState = { senderName: '', welcomeSubject: '', welcomeBody: '', passwordResetSubject: '', passwordResetBody: '' };

const THEMES = {
  sky: { active: 'bg-white text-sky-700 shadow-sm', ring: 'focus:ring-sky-400', button: 'sky' as const },
  violet: { active: 'bg-white text-violet-700 shadow-sm', ring: 'focus:ring-violet-400', button: 'violet' as const },
};

// 得意先ごとの患者様向けメール文面（初回登録メール・パスワード変更メール）の
// 編集・プレビュー。現時点では実際の送信機能は未実装で、この画面は文面の
// 編集・保存・見た目確認のみを行う（bgj/customers/[code]の「メール設定」タブから使用）。
export default function ClinicEmailTemplatesManager({
  customerCode,
  clinicName,
  theme = 'violet',
}: {
  customerCode: string;
  clinicName: string;
  theme?: 'sky' | 'violet';
}) {
  const t = THEMES[theme];
  const { toast, showToast } = useToast();
  const [activeType, setActiveType] = useState<TemplateType>('welcome');
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchTemplate = useCallback(() => {
    fetch(`/api/bgj/clinics/${customerCode}/email-templates`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const template: ClinicEmailTemplates | null = data?.template ?? null;
        setForm({
          senderName: template?.sender_name ?? '',
          welcomeSubject: template?.welcome_subject ?? '',
          welcomeBody: template?.welcome_body ?? '',
          passwordResetSubject: template?.password_reset_subject ?? '',
          passwordResetBody: template?.password_reset_body ?? '',
        });
      })
      .finally(() => setLoading(false));
  }, [customerCode]);

  useEffect(() => {
    fetchTemplate();
  }, [fetchTemplate]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/bgj/clinics/${customerCode}/email-templates`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? '保存に失敗しました');
      }
      showToast('メール文面を保存しました');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'エラーが発生しました');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingState />;

  const subjectKey = activeType === 'welcome' ? 'welcomeSubject' : 'passwordResetSubject';
  const bodyKey = activeType === 'welcome' ? 'welcomeBody' : 'passwordResetBody';
  const defaults = DEFAULTS[activeType];
  const previewSubject = renderEmailTemplate(form[subjectKey] || defaults.subject, { ...PREVIEW_SAMPLE_VARS, clinicName });
  const previewBody = renderEmailTemplate(form[bodyKey] || defaults.body, { ...PREVIEW_SAMPLE_VARS, clinicName });
  const previewSenderName = form.senderName || clinicName;

  return (
    <div className="flex flex-col gap-4">
      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-slate-800 text-white text-sm px-5 py-3 rounded-2xl shadow-xl">{toast}</div>
      )}

      <div>
        <label className="text-xs font-semibold text-slate-500 mb-1 block">差出人表示名（初回登録メール・パスワード変更メール共通）</label>
        <input
          value={form.senderName}
          onChange={(e) => setForm({ ...form, senderName: e.target.value })}
          placeholder={clinicName}
          className={`w-full max-w-sm border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 ${t.ring}`}
        />
        <p className="text-xs text-slate-400 mt-1">
          未入力の場合はクリニック名（{clinicName}）がそのまま使われます。送信アドレス自体は共通のWorkSpaceアドレスで固定です。
        </p>
      </div>

      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {TEMPLATE_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveType(tab.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              activeType === tab.key ? t.active : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <p className="text-xs text-slate-400">
        未入力の項目は共通のデフォルト文面がそのまま使われます。件名・本文には <code className="bg-slate-100 px-1.5 py-0.5 rounded">{'{{患者名}}'}</code>{' '}
        <code className="bg-slate-100 px-1.5 py-0.5 rounded">{'{{ログインID}}'}</code> <code className="bg-slate-100 px-1.5 py-0.5 rounded">{'{{医院名}}'}</code>{' '}
        <code className="bg-slate-100 px-1.5 py-0.5 rounded">{'{{リンク}}'}</code> が使えます（送信時に実際の値へ自動的に置き換わります）。
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 編集フォーム */}
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">件名</label>
            <input
              value={form[subjectKey]}
              onChange={(e) => setForm({ ...form, [subjectKey]: e.target.value })}
              placeholder={defaults.subject}
              className={`w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 ${t.ring}`}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">本文</label>
            <textarea
              value={form[bodyKey]}
              onChange={(e) => setForm({ ...form, [bodyKey]: e.target.value })}
              placeholder={defaults.body}
              rows={12}
              className={`w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 ${t.ring} font-mono whitespace-pre-wrap`}
            />
          </div>
          <Button theme={t.button} size="sm" onClick={handleSave} disabled={saving} className="self-start">
            {saving ? '保存中...' : '保存する'}
          </Button>
        </div>

        {/* プレビュー */}
        <div>
          <p className="text-xs font-semibold text-slate-500 mb-1">プレビュー（サンプルデータで表示）</p>
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
            <div className="bg-slate-50 border-b border-slate-200 px-4 py-3">
              <p className="text-xs text-slate-400">差出人</p>
              <p className="text-sm text-slate-600 mb-2 break-words">
                {previewSenderName} <span className="text-slate-400">{'<no-reply@biogaia.jp>'}</span>
              </p>
              <p className="text-xs text-slate-400">件名</p>
              <p className="text-sm font-semibold text-slate-800 break-words">{previewSubject}</p>
            </div>
            <div className="px-4 py-3">
              <p className="text-sm text-slate-700 whitespace-pre-wrap break-words">{previewBody}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
