"use client";

import { useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import LoadingState from "@/components/ui/LoadingState";
import { useToast } from "@/hooks/useToast";

type SettingsState = { configured: boolean; webhookUrlPreview: string | null };

export default function BgjSystemSettingsPage() {
  const [settings, setSettings] = useState<SettingsState | null>(null);
  const [loading, setLoading] = useState(true);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const { toast, showToast } = useToast();

  const fetchSettings = () => {
    fetch("/api/bgj/system/settings")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setSettings(data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchSettings(); }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/bgj/system/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webhookUrl }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "保存に失敗しました");
      }
      showToast("設定を保存しました");
      setWebhookUrl("");
      fetchSettings();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-2xl">
      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-violet-600 text-white text-base px-5 py-3 rounded-2xl shadow-xl">{toast}</div>
      )}

      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-800">共通マスタ</h1>
        <p className="text-sm text-slate-500 mt-0.5">アプリ全体で共有する連携設定です</p>
      </div>

      <Card className="p-5">
        <h2 className="text-sm font-bold text-slate-700 mb-1">Slack通知</h2>
        <p className="text-xs text-slate-400 mb-4">
          医院用ポータルからの問い合わせを受信するSlackチャンネルのIncoming Webhook URLを設定します。医院様への返信はSlackではなく、通知メッセージ内のリンクからBGJポータル上で行います。
        </p>

        {loading ? (
          <LoadingState />
        ) : (
          <>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs text-slate-400">現在の状態：</span>
              {settings?.configured ? (
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                  設定済み（{settings.webhookUrlPreview}）
                </span>
              ) : (
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-red-100 text-red-700">未設定</span>
              )}
            </div>

            <label className="text-xs font-semibold text-slate-500 mb-1 block">Incoming Webhook URL</label>
            <input
              type="text"
              placeholder="https://hooks.slack.com/services/..."
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 mb-1"
            />
            <p className="text-[11px] text-slate-400 mb-4">
              空欄のまま保存すると、既存の設定は変更されません。
            </p>

            <Button theme="violet" size="sm" onClick={handleSave} disabled={saving}>
              {saving ? "保存中..." : "保存する"}
            </Button>
          </>
        )}
      </Card>
    </div>
  );
}
