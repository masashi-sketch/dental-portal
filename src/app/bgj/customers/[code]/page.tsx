"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { formatTimestampCompact } from "@/lib/formatTimestamp";
import SignupQrCard from "@/components/SignupQrCard";
import SalesRepAvatar from "@/components/SalesRepAvatar";
import ClinicStaffManager from "@/components/ClinicStaffManager";
import ClinicQaManager from "@/components/ClinicQaManager";
import ClinicAnnouncementManager from "@/components/ClinicAnnouncementManager";
import ClinicEmailTemplatesManager from "@/components/ClinicEmailTemplatesManager";
import ClinicLoginManager from "@/components/ClinicLoginManager";
import ClinicTermsManager from "@/components/ClinicTermsManager";
import ClinicSalesOrders from "@/components/ClinicSalesOrders";
import ClinicBasicInfoTab from "@/components/ClinicBasicInfoTab";
import ClinicBusinessInfoTab from "@/components/ClinicBusinessInfoTab";
import ClinicActivityFeed from "@/components/ClinicActivityFeed";
import { useToast } from "@/hooks/useToast";
import type { ClinicStatusMaster, SalesRepWithMaster } from "@/lib/supabase/types";
import { CLINIC_STATUS_BADGE_CLASS } from "@/lib/clinicStatusColors";
import { clinicToForm, type ClinicFormState, type ClinicWithStaff } from "@/lib/clinicForm";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

const TABS = ["基本情報", "経営情報", "売上・注文", "取引条件", "行動履歴", "ログイン管理", "接続情報", "メール設定", "クリニック紹介", "お知らせ", "Q&A"];

type VisitFormState = { visitDate: string; purpose: string; memo: string; nextVisitDate: string };
const EMPTY_VISIT_FORM: VisitFormState = { visitDate: "", purpose: "", memo: "", nextVisitDate: "" };

export default function CustomerDetailPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const [activeTab, setActiveTab] = useState("基本情報");
  const { toast, showToast } = useToast();

  // 得意先本体
  const [clinic, setClinic] = useState<ClinicWithStaff | null>(null);
  const [clinicForm, setClinicForm] = useState<ClinicFormState | null>(null);
  const [editingClinic, setEditingClinic] = useState(false);
  const [savingClinic, setSavingClinic] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [salesReps, setSalesReps] = useState<SalesRepWithMaster[]>([]);
  const [clinicStatuses, setClinicStatuses] = useState<ClinicStatusMaster[]>([]);

  // 行動履歴（訪問記録・問い合わせの統合表示はClinicActivityFeedが自己fetchする）
  const [showVisitModal, setShowVisitModal] = useState(false);
  const [visitForm, setVisitForm] = useState<VisitFormState>(EMPTY_VISIT_FORM);
  const [savingVisit, setSavingVisit] = useState(false);
  const [activityRefreshKey, setActivityRefreshKey] = useState(0);

  // 接続情報（患者様の自己登録用QR + 受付PIN）。得意先コードは連番で推測可能なため
  // URLには使わず、無関係なランダム文字列であるsignup_slugを使う。originはSSR時に
  // 取得できないため、クライアントでのレンダリング時にのみ算出する
  // （set-state-in-effectを避ける）。
  const joinUrl =
    typeof window !== "undefined" && clinic?.signup_slug
      ? `${window.location.origin}/join/${clinic.signup_slug}/mobile`
      : "";
  const signupPinIssuedAt = formatTimestampCompact(clinic?.signup_pin_issued_at);
  // QRの内容にタイムスタンプを含めることで、再発行のたびにQRの見た目自体が変わり、
  // 窓口に古いQRが貼られたままになっていないか目視でも判別しやすくする。
  const qrValue = joinUrl && signupPinIssuedAt ? `${joinUrl}?t=${signupPinIssuedAt}` : joinUrl;

  const fetchAll = useCallback(() => {
    Promise.all([
      fetch(`/api/bgj/clinics/${code}`),
      fetch("/api/bgj/sales-reps"),
      fetch("/api/bgj/clinic-statuses"),
    ])
      .then(([clinicRes, repsRes, statusesRes]) => {
        if (!clinicRes.ok) throw new Error("得意先情報の取得に失敗しました");
        return Promise.all([
          clinicRes.json(),
          repsRes.ok ? repsRes.json() : Promise.resolve(null),
          statusesRes.ok ? statusesRes.json() : Promise.resolve(null),
        ]);
      })
      .then(([clinicData, repsData, statusesData]) => {
        const { clinic } = clinicData;
        setClinic(clinic);
        if (clinic) setClinicForm(clinicToForm(clinic));
        setSalesReps(repsData?.salesReps ?? []);
        setClinicStatuses(statusesData?.clinicStatuses ?? []);
        setError(null);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "エラーが発生しました");
      })
      .finally(() => setLoading(false));
  }, [code]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleSaveClinic = async () => {
    if (!clinicForm) return;
    setSavingClinic(true);
    try {
      const res = await fetch(`/api/bgj/clinics/${code}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...clinicForm,
          chairs: Number(clinicForm.chairs) || 0,
          fullTimeDr: Number(clinicForm.fullTimeDr) || 0,
          partTimeDr: Number(clinicForm.partTimeDr) || 0,
          hygienist: Number(clinicForm.hygienist) || 0,
          receptionist: Number(clinicForm.receptionist) || 0,
          assistant: Number(clinicForm.assistant) || 0,
          technician: Number(clinicForm.technician) || 0,
          nurse: Number(clinicForm.nurse) || 0,
          nutritionist: Number(clinicForm.nutritionist) || 0,
          childcare: Number(clinicForm.childcare) || 0,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "保存に失敗しました");
      }
      const { clinic: updatedRow } = await res.json();
      const staff = salesReps.find((s) => s.id === updatedRow.staff_id) ?? null;
      const clinicStatus = clinicStatuses.find((s) => s.id === updatedRow.status_id) ?? null;
      const merged: ClinicWithStaff = { ...updatedRow, staff, status: clinicStatus };
      setClinic(merged);
      setClinicForm(clinicToForm(merged));
      showToast("得意先情報を保存しました");
      setEditingClinic(false);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setSavingClinic(false);
    }
  };

  const handleSaveVisit = async () => {
    if (!visitForm.purpose.trim()) return;
    setSavingVisit(true);
    try {
      const res = await fetch(`/api/bgj/clinics/${code}/visits`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(visitForm),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "保存に失敗しました");
      }
      showToast("訪問記録を追加しました");
      setShowVisitModal(false);
      setVisitForm(EMPTY_VISIT_FORM);
      setActivityRefreshKey((k) => k + 1);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setSavingVisit(false);
    }
  };

  const [regeneratingPin, setRegeneratingPin] = useState(false);
  const [confirmingPinRegen, setConfirmingPinRegen] = useState(false);

  const handleRegenerateSignupPin = async () => {
    setRegeneratingPin(true);
    try {
      const res = await fetch(`/api/bgj/clinics/${code}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ regenerateSignupPin: true }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "PINの発行に失敗しました");
      }
      const { clinic: updated } = await res.json();
      setClinic(updated);
      showToast("受付PINを発行しました");
      setConfirmingPinRegen(false);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setRegeneratingPin(false);
    }
  };

  return (
    <div className="p-4 sm:p-6">
      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-violet-600 text-white text-base px-5 py-3 rounded-2xl shadow-xl">{toast}</div>
      )}

      {/* パンくず */}
      <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-4">
        <Link href="/bgj/customers" className="hover:text-violet-600">得意先一覧</Link>
        <span>/</span>
        <span className="text-slate-600">{clinic?.name ?? code}</span>
      </div>

      {loading && <p className="text-slate-400">読み込み中...</p>}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>
      )}

      {!loading && clinic && clinicForm && (
        <>
          {/* ヘッダー */}
          <div className="flex flex-wrap items-start justify-between gap-y-3 mb-5">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <span className="font-mono text-sm text-violet-600 font-bold bg-violet-50 px-2 py-0.5 rounded-lg">
                  {clinic.customer_code}
                </span>
                {clinic.status ? (
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${CLINIC_STATUS_BADGE_CLASS[clinic.status.color]}`}>
                    {clinic.status.name}
                  </span>
                ) : (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-400">未設定</span>
                )}
              </div>
              <h1 className="text-xl font-bold text-slate-800">{clinic.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-slate-500">{clinic.area} · 担当：</span>
                {clinic.staff ? (
                  <span className="flex items-center gap-1.5">
                    <SalesRepAvatar name={clinic.staff.name} photoUrl={clinic.staff.photo_url} size={20} className="text-[10px]" />
                    <span className="text-sm text-slate-700 font-semibold">{clinic.staff.name}</span>
                  </span>
                ) : (
                  <span className="text-sm text-slate-500">未割当</span>
                )}
              </div>
            </div>
            {activeTab === "接続情報" ? (
              clinic.signup_pin && clinic.signup_slug ? (
                <Button theme="violet" size="sm" className="shadow-sm" onClick={() => setConfirmingPinRegen(true)}>
                  PIN・QRを再発行する
                </Button>
              ) : (
                <Button theme="violet" size="sm" className="shadow-sm" onClick={handleRegenerateSignupPin} disabled={regeneratingPin}>
                  {regeneratingPin ? "発行中..." : "PIN・QRを発行する"}
                </Button>
              )
            ) : (
              <Button theme="violet" size="sm" className="shadow-sm" onClick={() => setShowVisitModal(true)}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                訪問記録を追加
              </Button>
            )}
          </div>

          {/* タブ */}
          <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-5 overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${
                  activeTab === tab ? "bg-white text-violet-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* 基本情報 */}
          {activeTab === "基本情報" && (
            <ClinicBasicInfoTab
              clinic={clinic}
              clinicForm={clinicForm}
              editingClinic={editingClinic}
              savingClinic={savingClinic}
              salesReps={salesReps}
              statuses={clinicStatuses}
              onEdit={() => setEditingClinic(true)}
              onCancel={() => { setEditingClinic(false); setClinicForm(clinicToForm(clinic)); }}
              onSave={handleSaveClinic}
              onFormChange={setClinicForm}
            />
          )}

          {/* 経営情報 */}
          {activeTab === "経営情報" && (
            <ClinicBusinessInfoTab
              clinic={clinic}
              clinicForm={clinicForm}
              editingClinic={editingClinic}
              savingClinic={savingClinic}
              onEdit={() => setEditingClinic(true)}
              onCancel={() => { setEditingClinic(false); setClinicForm(clinicToForm(clinic)); }}
              onSave={handleSaveClinic}
              onFormChange={setClinicForm}
            />
          )}

          {/* 売上・注文 */}
          {activeTab === "売上・注文" && <ClinicSalesOrders customerCode={code} />}

          {/* 取引条件 */}
          {activeTab === "取引条件" && <ClinicTermsManager customerCode={code} theme="violet" />}

          {/* 行動履歴（訪問記録＋問い合わせの統合表示） */}
          {activeTab === "行動履歴" && <ClinicActivityFeed customerCode={code} refreshKey={activityRefreshKey} />}

          {/* ログイン管理 */}
          {activeTab === "ログイン管理" && (
            <ClinicLoginManager customerCode={code} defaultName={clinic.staff?.name} theme="violet" />
          )}

          {/* 接続情報（患者様の自己登録用QR + 受付PIN） */}
          {activeTab === "接続情報" && (
            <Card className="p-5">
              <h3 className="text-sm font-bold text-slate-700 mb-1">患者様の新規ポータル登録（QRコード）</h3>
              <p className="text-xs text-slate-400 mb-4">
                クリニック共通のQRコードです。窓口に掲示し、受付PINと合わせて患者様にお伝えください。患者様はご自身のスマホでスキャンし、その場でログインID・パスワードを設定して登録できます。
              </p>

              {!clinic?.signup_pin || !clinic.signup_slug ? (
                <p className="text-slate-400 text-sm mb-4">まだ受付PINが発行されていません。</p>
              ) : (
                <SignupQrCard
                  clinicName={clinic.name}
                  signupPin={clinic.signup_pin}
                  signupPinIssuedAt={signupPinIssuedAt}
                  qrValue={qrValue}
                  pdfFilename={`接続情報_${code}.pdf`}
                  theme="violet"
                />
              )}

              {confirmingPinRegen && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex flex-wrap items-center gap-3">
                  <p className="text-amber-700 text-xs flex-1 min-w-[200px]">
                    再発行すると、これまでのQRコード・受付PINは無効になります。よろしいですか？
                  </p>
                  <button
                    onClick={handleRegenerateSignupPin}
                    disabled={regeneratingPin}
                    className="text-xs text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 font-semibold px-3 py-1.5 rounded-lg"
                  >
                    {regeneratingPin ? "発行中..." : "再発行する"}
                  </button>
                  <button
                    onClick={() => setConfirmingPinRegen(false)}
                    className="text-xs text-slate-500 hover:text-slate-700 font-semibold"
                  >
                    キャンセル
                  </button>
                </div>
              )}
            </Card>
          )}

          {/* メール設定（初回登録メール・パスワード変更メールの文面カスタマイズ） */}
          {activeTab === "メール設定" && clinic && (
            <Card className="p-5">
              <h3 className="text-sm font-bold text-slate-700 mb-1">患者様向けメール文面</h3>
              <p className="text-xs text-slate-400 mb-4">
                この得意先専用の文面にカスタマイズできます。実際の送信機能は現在準備中で、この画面では文面の編集・保存・プレビューのみ行えます。
              </p>
              <ClinicEmailTemplatesManager customerCode={code} clinicName={clinic.name} theme="violet" />
            </Card>
          )}

          {/* クリニック紹介（代理編集） */}
          {activeTab === "クリニック紹介" && (
            <Card className="p-5">
              <p className="text-xs text-slate-400 mb-4">
                患者様ポータルの「クリニック紹介」画面に表示するスタッフ紹介を、医院様に代わって編集できます。診療時間・アクセス情報は「基本情報」タブから編集してください。
              </p>
              <ClinicStaffManager customerCode={code} theme="violet" />
            </Card>
          )}

          {/* お知らせ（代理編集） */}
          {activeTab === "お知らせ" && (
            <Card className="p-5">
              <p className="text-xs text-slate-400 mb-4">
                患者様ポータルのホーム画面に表示するお知らせを、医院様に代わって編集できます。
              </p>
              <ClinicAnnouncementManager customerCode={code} theme="violet" />
            </Card>
          )}

          {/* Q&A（代理編集） */}
          {activeTab === "Q&A" && (
            <Card className="p-5">
              <p className="text-xs text-slate-400 mb-4">
                患者様ポータルの「Q&A」画面に表示する質問・回答を、医院様に代わって編集できます。
              </p>
              <ClinicQaManager customerCode={code} theme="violet" />
            </Card>
          )}
        </>
      )}

      {/* 訪問記録モーダル */}
      {showVisitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-5">訪問記録を追加</h2>
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1 block">訪問日</label>
                <input type="date" value={visitForm.visitDate}
                  onChange={(e) => setVisitForm({ ...visitForm, visitDate: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1 block">訪問目的</label>
                <input type="text" placeholder="定期訪問・提案など" value={visitForm.purpose}
                  onChange={(e) => setVisitForm({ ...visitForm, purpose: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1 block">メモ</label>
                <textarea rows={3} placeholder="商談内容・気づきなど" value={visitForm.memo}
                  onChange={(e) => setVisitForm({ ...visitForm, memo: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1 block">次回訪問予定日</label>
                <input type="date" value={visitForm.nextVisitDate}
                  onChange={(e) => setVisitForm({ ...visitForm, nextVisitDate: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowVisitModal(false)}
                className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors">
                キャンセル
              </button>
              <Button theme="violet" size="sm" fullWidth onClick={handleSaveVisit} disabled={savingVisit}>
                {savingVisit ? "保存中..." : "保存"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
