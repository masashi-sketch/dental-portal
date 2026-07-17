"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import nextDynamic from "next/dynamic";
import { formatTimestampCompact } from "@/lib/formatTimestamp";
import SignupQrCard from "@/components/SignupQrCard";
import SalesRepAvatar from "@/components/SalesRepAvatar";
import ClinicStaffManager from "@/components/ClinicStaffManager";
import ClinicQaManager from "@/components/ClinicQaManager";
import ClinicEmailTemplatesManager from "@/components/ClinicEmailTemplatesManager";
import { useToast } from "@/hooks/useToast";
import type { Clinic, ClinicIntroInfo, ClinicOrder, ClinicPatientSettings, ClinicStatus, ClinicUserPublic, ClinicVisit, SalesRepWithMaster } from "@/lib/supabase/types";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import LoadingState from "@/components/ui/LoadingState";

const SalesHistoryChart = nextDynamic(() => import("./SalesHistoryChart"), {
  ssr: false,
  loading: () => <p className="text-slate-400 text-sm text-center py-12">グラフを読み込み中...</p>,
});

type ClinicWithStaff = Clinic & ClinicPatientSettings & ClinicIntroInfo & { staff: SalesRepWithMaster | null };

const TABS = ["基本情報", "経営情報", "売上・注文", "取引条件", "訪問記録", "ログイン管理", "接続情報", "メール設定", "クリニック紹介", "Q&A"];

type ClinicFormState = {
  name: string;
  area: string;
  staffId: string;
  status: ClinicStatus;
  address: string;
  tel: string;
  contactPerson: string;
  contractSince: string;
  chairs: string;
  patientType: string;
  clinicType: string;
  waitingRoom: string;
  counselingRoom: boolean;
  closedDay: string;
  fullTimeDr: string;
  partTimeDr: string;
  hygienist: string;
  receptionist: string;
  assistant: string;
  technician: string;
  nurse: string;
  nutritionist: string;
  childcare: string;
  mainReferrer: string;
  displayName: string;
  patientBackgroundUrl: string;
  clinicHoursWeekday: string;
  clinicHoursSaturday: string;
  clinicClosedDay: string;
  clinicPhone: string;
  clinicAddress: string;
  clinicNearestStation: string;
  clinicParking: string;
};

function clinicToForm(c: ClinicWithStaff): ClinicFormState {
  return {
    name: c.name,
    area: c.area,
    staffId: c.staff_id ?? "",
    status: c.status,
    address: c.address ?? "",
    tel: c.tel ?? "",
    contactPerson: c.contact_person ?? "",
    contractSince: c.contract_since ?? "",
    chairs: String(c.chairs),
    patientType: c.patient_type ?? "",
    clinicType: c.clinic_type ?? "",
    waitingRoom: c.waiting_room ?? "",
    counselingRoom: c.counseling_room,
    closedDay: c.closed_day ?? "",
    fullTimeDr: String(c.full_time_dr),
    partTimeDr: String(c.part_time_dr),
    hygienist: String(c.hygienist),
    receptionist: String(c.receptionist),
    assistant: String(c.assistant),
    technician: String(c.technician),
    nurse: String(c.nurse),
    nutritionist: String(c.nutritionist),
    childcare: String(c.childcare),
    mainReferrer: c.main_referrer ?? "",
    displayName: c.display_name ?? "",
    patientBackgroundUrl: c.patient_background_url ?? "",
    clinicHoursWeekday: c.clinic_hours_weekday ?? "",
    clinicHoursSaturday: c.clinic_hours_saturday ?? "",
    clinicClosedDay: c.clinic_closed_day ?? "",
    clinicPhone: c.clinic_phone ?? "",
    clinicAddress: c.clinic_address ?? "",
    clinicNearestStation: c.clinic_nearest_station ?? "",
    clinicParking: c.clinic_parking ?? "",
  };
}

type TermsFormState = {
  commissionRate: string;
  wholesaleRate: string;
  paymentTermsSite: string;
  paymentMethod: string;
  contractStartedAt: string;
  contractRenewalAt: string;
};

const EMPTY_TERMS_FORM: TermsFormState = {
  commissionRate: "0",
  wholesaleRate: "0",
  paymentTermsSite: "",
  paymentMethod: "",
  contractStartedAt: "",
  contractRenewalAt: "",
};

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

  // 注文履歴
  const [orders, setOrders] = useState<ClinicOrder[]>([]);

  // 訪問記録
  const [visits, setVisits] = useState<ClinicVisit[]>([]);
  const [showVisitModal, setShowVisitModal] = useState(false);
  const [visitForm, setVisitForm] = useState<VisitFormState>(EMPTY_VISIT_FORM);
  const [savingVisit, setSavingVisit] = useState(false);

  // 取引条件
  const [termsForm, setTermsForm] = useState<TermsFormState>(EMPTY_TERMS_FORM);
  const [termsLoading, setTermsLoading] = useState(true);
  const [termsSaving, setTermsSaving] = useState(false);

  // ログイン管理（医院スタッフ用アカウント）
  const [clinicUsers, setClinicUsers] = useState<ClinicUserPublic[]>([]);
  const [clinicUsersLoading, setClinicUsersLoading] = useState(true);
  const [newLoginForm, setNewLoginForm] = useState({ loginId: "", password: "", name: "" });
  const [creatingLogin, setCreatingLogin] = useState(false);
  const [resetPasswordId, setResetPasswordId] = useState<string | null>(null);
  const [resetPasswordValue, setResetPasswordValue] = useState("");
  const [savingLoginAction, setSavingLoginAction] = useState(false);

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

  const fetchClinicUsers = useCallback(() => {
    fetch(`/api/bgj/clinics/${code}/user`)
      .then((res) => (res.ok ? res.json() : { clinicUsers: [] }))
      .then((data) => setClinicUsers(data.clinicUsers ?? []))
      .finally(() => setClinicUsersLoading(false));
  }, [code]);

  const fetchAll = useCallback(() => {
    Promise.all([
      fetch(`/api/bgj/clinics/${code}`),
      fetch(`/api/bgj/clinics/${code}/orders`),
      fetch(`/api/bgj/clinics/${code}/visits`),
    ])
      .then(([clinicRes, ordersRes, visitsRes]) => {
        if (!clinicRes.ok) throw new Error("得意先情報の取得に失敗しました");
        return Promise.all([
          clinicRes.json(),
          ordersRes.ok ? ordersRes.json() : Promise.resolve(null),
          visitsRes.ok ? visitsRes.json() : Promise.resolve(null),
        ]);
      })
      .then(([clinicData, ordersData, visitsData]) => {
        const { clinic } = clinicData;
        setClinic(clinic);
        if (clinic) setClinicForm(clinicToForm(clinic));
        // 新規ログイン発行フォームの担当者名は、未入力なら担当営業の名前を初期値にする
        if (clinic?.staff?.name) {
          setNewLoginForm((f) => (f.name ? f : { ...f, name: clinic.staff.name }));
        }
        if (ordersData) setOrders(ordersData.orders ?? []);
        if (visitsData) setVisits(visitsData.visits ?? []);
        setError(null);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "エラーが発生しました");
      })
      .finally(() => setLoading(false));
  }, [code]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    fetch("/api/bgj/sales-reps")
      .then((res) => (res.ok ? res.json() : { salesReps: [] }))
      .then((data) => setSalesReps(data.salesReps ?? []))
      .catch(() => setSalesReps([]));
  }, []);

  useEffect(() => { fetchClinicUsers(); }, [fetchClinicUsers]);

  useEffect(() => {
    (async () => {
      setTermsLoading(true);
      try {
        const res = await fetch(`/api/bgj/clinic-terms/${code}`);
        if (res.ok) {
          const { terms } = await res.json();
          if (terms) {
            setTermsForm({
              commissionRate: String(terms.commission_rate),
              wholesaleRate: String(terms.wholesale_rate),
              paymentTermsSite: terms.payment_terms_site ?? "",
              paymentMethod: terms.payment_method ?? "",
              contractStartedAt: terms.contract_started_at ?? "",
              contractRenewalAt: terms.contract_renewal_at ?? "",
            });
          }
        }
      } finally {
        setTermsLoading(false);
      }
    })();
  }, [code]);

  const salesHistory = useMemo(() => {
    const months: { key: string; month: string; sales: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, month: `${d.getMonth() + 1}月`, sales: 0 });
    }
    for (const o of orders) {
      const key = o.order_date.slice(0, 7);
      const bucket = months.find((m) => m.key === key);
      if (bucket) bucket.sales += o.amount;
    }
    return months;
  }, [orders]);

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
      const merged: ClinicWithStaff = { ...updatedRow, staff };
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

  const handleSaveTerms = async () => {
    setTermsSaving(true);
    try {
      const res = await fetch(`/api/bgj/clinic-terms/${code}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
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
        throw new Error(body?.error ?? "保存に失敗しました");
      }
      showToast("取引条件を保存しました");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setTermsSaving(false);
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
      const { visit } = await res.json();
      setVisits((prev) => [visit, ...prev]);
      showToast("訪問記録を追加しました");
      setShowVisitModal(false);
      setVisitForm(EMPTY_VISIT_FORM);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setSavingVisit(false);
    }
  };

  const handleCreateLogin = async () => {
    if (!newLoginForm.loginId.trim() || !newLoginForm.password.trim()) {
      showToast("ログインIDと初期パスワードを入力してください");
      return;
    }
    setCreatingLogin(true);
    try {
      const res = await fetch(`/api/bgj/clinics/${code}/user`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newLoginForm),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "作成に失敗しました");
      }
      const { clinicUser } = await res.json();
      setClinicUsers((prev) => [clinicUser, ...prev]);
      showToast("ログインを発行しました");
      setNewLoginForm({ loginId: "", password: "", name: "" });
    } catch (e) {
      showToast(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setCreatingLogin(false);
    }
  };

  const handleResetPassword = async (id: string) => {
    if (!resetPasswordValue.trim()) return;
    setSavingLoginAction(true);
    try {
      const res = await fetch(`/api/bgj/clinics/${code}/user`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, password: resetPasswordValue }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "更新に失敗しました");
      }
      const { clinicUser } = await res.json();
      setClinicUsers((prev) => prev.map((u) => (u.id === clinicUser.id ? clinicUser : u)));
      showToast("パスワードを再設定しました");
      setResetPasswordId(null);
      setResetPasswordValue("");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setSavingLoginAction(false);
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

  const handleToggleLoginStatus = async (user: ClinicUserPublic) => {
    setSavingLoginAction(true);
    try {
      const res = await fetch(`/api/bgj/clinics/${code}/user`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: user.id, status: user.status === "有効" ? "無効" : "有効" }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "更新に失敗しました");
      }
      const { clinicUser } = await res.json();
      setClinicUsers((prev) => prev.map((u) => (u.id === clinicUser.id ? clinicUser : u)));
      showToast(user.status === "有効" ? "無効化しました" : "有効化しました");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setSavingLoginAction(false);
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
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  clinic.status === "活性" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                }`}>
                  {clinic.status}
                </span>
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
            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-slate-700">基本情報</h2>
                {!editingClinic ? (
                  <button onClick={() => setEditingClinic(true)}
                    className="text-xs text-violet-600 hover:text-violet-800 font-semibold">編集する</button>
                ) : (
                  <div className="flex gap-2">
                    <button onClick={() => { setEditingClinic(false); setClinicForm(clinicToForm(clinic)); }}
                      className="text-xs text-slate-500 hover:text-slate-700 font-semibold">キャンセル</button>
                    <button onClick={handleSaveClinic} disabled={savingClinic}
                      className="text-xs text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-50 font-semibold px-3 py-1.5 rounded-lg">
                      {savingClinic ? "保存中..." : "保存する"}
                    </button>
                  </div>
                )}
              </div>
              {!editingClinic ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8">
                  {[
                    ["医院名", clinic.name],
                    ["得意先コード", clinic.customer_code],
                    ["エリア", clinic.area],
                    ["住所", clinic.address || "—"],
                    ["電話番号", clinic.tel || "—"],
                    ["担当者", clinic.contact_person || "—"],
                    ["取引開始日", clinic.contract_since || "—"],
                    ["ポータル表示名", clinic.display_name || "（未設定・医院名を表示）"],
                    ["患者ポータル背景画像URL", clinic.patient_background_url || "（未設定・標準画像を使用）"],
                    ["患者様向け・平日診療時間", clinic.clinic_hours_weekday || "（未設定）"],
                    ["患者様向け・土曜診療時間", clinic.clinic_hours_saturday || "（未設定）"],
                    ["患者様向け・休診日", clinic.clinic_closed_day || "（未設定）"],
                    ["患者様向け・電話番号", clinic.clinic_phone || "（未設定）"],
                    ["患者様向け・住所", clinic.clinic_address || "（未設定）"],
                    ["患者様向け・最寄駅", clinic.clinic_nearest_station || "（未設定）"],
                    ["患者様向け・駐車場", clinic.clinic_parking || "（未設定）"],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <p className="text-xs text-slate-400 mb-0.5">{label}</p>
                      <p className="text-sm text-slate-800 font-semibold break-all">{value}</p>
                    </div>
                  ))}
                  <div>
                    <p className="text-xs text-slate-400 mb-0.5">担当営業</p>
                    {clinic.staff ? (
                      <div className="flex items-center gap-2 mt-0.5">
                        <SalesRepAvatar name={clinic.staff.name} photoUrl={clinic.staff.photo_url} size={28} className="text-xs" />
                        <p className="text-sm text-slate-800 font-semibold">{clinic.staff.name}</p>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-800 font-semibold">未割当</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-500 mb-1 block">医院名</label>
                    <input value={clinicForm.name} onChange={(e) => setClinicForm({ ...clinicForm, name: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 mb-1 block">エリア</label>
                    <input value={clinicForm.area} onChange={(e) => setClinicForm({ ...clinicForm, area: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 mb-1 block">住所</label>
                    <input value={clinicForm.address} onChange={(e) => setClinicForm({ ...clinicForm, address: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 mb-1 block">電話番号</label>
                    <input value={clinicForm.tel} onChange={(e) => setClinicForm({ ...clinicForm, tel: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 mb-1 block">担当者</label>
                    <input value={clinicForm.contactPerson} onChange={(e) => setClinicForm({ ...clinicForm, contactPerson: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 mb-1 block">担当営業</label>
                    <select value={clinicForm.staffId} onChange={(e) => setClinicForm({ ...clinicForm, staffId: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white">
                      <option value="">未割当</option>
                      {salesReps.map((r) => (
                        <option key={r.id} value={r.id}>{r.name}（{r.role?.name || "—"}）</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 mb-1 block">取引開始日</label>
                    <input type="date" value={clinicForm.contractSince} onChange={(e) => setClinicForm({ ...clinicForm, contractSince: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 mb-1 block">ステータス</label>
                    <select value={clinicForm.status} onChange={(e) => setClinicForm({ ...clinicForm, status: e.target.value as ClinicStatus })}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white">
                      <option value="活性">活性</option>
                      <option value="休眠">休眠</option>
                      <option value="解約リスク">解約リスク</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 mb-1 block">ポータル表示名（医院自身も設定可）</label>
                    <input value={clinicForm.displayName} onChange={(e) => setClinicForm({ ...clinicForm, displayName: e.target.value })}
                      placeholder={clinic.name}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 mb-1 block">患者ポータル背景画像URL（医院自身も設定可）</label>
                    <input value={clinicForm.patientBackgroundUrl} onChange={(e) => setClinicForm({ ...clinicForm, patientBackgroundUrl: e.target.value })}
                      placeholder="https://..."
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 mb-1 block">患者様向け・平日診療時間（医院自身も設定可）</label>
                    <input value={clinicForm.clinicHoursWeekday} onChange={(e) => setClinicForm({ ...clinicForm, clinicHoursWeekday: e.target.value })}
                      placeholder="例）9:00〜18:00"
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 mb-1 block">患者様向け・土曜診療時間（医院自身も設定可）</label>
                    <input value={clinicForm.clinicHoursSaturday} onChange={(e) => setClinicForm({ ...clinicForm, clinicHoursSaturday: e.target.value })}
                      placeholder="例）9:00〜13:00"
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 mb-1 block">患者様向け・休診日（医院自身も設定可）</label>
                    <input value={clinicForm.clinicClosedDay} onChange={(e) => setClinicForm({ ...clinicForm, clinicClosedDay: e.target.value })}
                      placeholder="例）水・日・祝日"
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 mb-1 block">患者様向け・電話番号（医院自身も設定可）</label>
                    <input value={clinicForm.clinicPhone} onChange={(e) => setClinicForm({ ...clinicForm, clinicPhone: e.target.value })}
                      placeholder="例）00-0000-0000"
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 mb-1 block">患者様向け・住所（医院自身も設定可）</label>
                    <input value={clinicForm.clinicAddress} onChange={(e) => setClinicForm({ ...clinicForm, clinicAddress: e.target.value })}
                      placeholder="例）〒000-0000 ◯◯県◯◯市◯◯"
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 mb-1 block">患者様向け・最寄駅（医院自身も設定可）</label>
                    <input value={clinicForm.clinicNearestStation} onChange={(e) => setClinicForm({ ...clinicForm, clinicNearestStation: e.target.value })}
                      placeholder="例）◯◯線「◯◯駅」徒歩◯分"
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 mb-1 block">患者様向け・駐車場（医院自身も設定可）</label>
                    <input value={clinicForm.clinicParking} onChange={(e) => setClinicForm({ ...clinicForm, clinicParking: e.target.value })}
                      placeholder="例）専用駐車場3台あり"
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* 経営情報 */}
          {activeTab === "経営情報" && (
            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-slate-700">経営情報</h2>
                {!editingClinic ? (
                  <button onClick={() => setEditingClinic(true)}
                    className="text-xs text-violet-600 hover:text-violet-800 font-semibold">編集する</button>
                ) : (
                  <div className="flex gap-2">
                    <button onClick={() => { setEditingClinic(false); setClinicForm(clinicToForm(clinic)); }}
                      className="text-xs text-slate-500 hover:text-slate-700 font-semibold">キャンセル</button>
                    <button onClick={handleSaveClinic} disabled={savingClinic}
                      className="text-xs text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-50 font-semibold px-3 py-1.5 rounded-lg">
                      {savingClinic ? "保存中..." : "保存する"}
                    </button>
                  </div>
                )}
              </div>
              {!editingClinic ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-4 gap-x-8">
                  {[
                    ["患者層分類", clinic.patient_type || "—"],
                    ["診療区分", clinic.clinic_type || "—"],
                    ["チェア数", `${clinic.chairs}台`],
                    ["待合室規模", clinic.waiting_room || "—"],
                    ["カウンセリングルーム", clinic.counseling_room ? "あり" : "なし"],
                    ["休診日", clinic.closed_day || "—"],
                    ["常勤医師数", `${clinic.full_time_dr}名`],
                    ["非常勤医師数", `${clinic.part_time_dr}名`],
                    ["歯科衛生士数", `${clinic.hygienist}名`],
                    ["受付・TC数", `${clinic.receptionist}名`],
                    ["歯科助手数", `${clinic.assistant}名`],
                    ["歯科技工士数", `${clinic.technician}名`],
                    ["看護師数", `${clinic.nurse}名`],
                    ["管理栄養士数", `${clinic.nutritionist}名`],
                    ["保育士数", `${clinic.childcare}名`],
                    ["主な紹介者", clinic.main_referrer || "—"],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <p className="text-xs text-slate-400 mb-0.5">{label}</p>
                      <p className="text-sm text-slate-800 font-semibold">{value}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {([
                    ["患者層分類", "patientType"], ["診療区分", "clinicType"], ["チェア数", "chairs"],
                    ["待合室規模", "waitingRoom"], ["休診日", "closedDay"],
                    ["常勤医師数", "fullTimeDr"], ["非常勤医師数", "partTimeDr"], ["歯科衛生士数", "hygienist"],
                    ["受付・TC数", "receptionist"], ["歯科助手数", "assistant"], ["歯科技工士数", "technician"],
                    ["看護師数", "nurse"], ["管理栄養士数", "nutritionist"], ["保育士数", "childcare"],
                    ["主な紹介者", "mainReferrer"],
                  ] as [string, keyof ClinicFormState][]).map(([label, key]) => (
                    <div key={key}>
                      <label className="text-xs font-semibold text-slate-500 mb-1 block">{label}</label>
                      <input value={clinicForm[key] as string} onChange={(e) => setClinicForm({ ...clinicForm, [key]: e.target.value })}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
                    </div>
                  ))}
                  <div className="flex items-center gap-2 pt-6">
                    <input type="checkbox" checked={clinicForm.counselingRoom}
                      onChange={(e) => setClinicForm({ ...clinicForm, counselingRoom: e.target.checked })}
                      className="w-4 h-4" />
                    <label className="text-sm text-slate-600">カウンセリングルームあり</label>
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* 売上・注文 */}
          {activeTab === "売上・注文" && (
            <div className="flex flex-col gap-4">
              <Card className="p-5">
                <h3 className="text-sm font-bold text-slate-700 mb-4">月次売上推移（円）</h3>
                <SalesHistoryChart data={salesHistory} />
              </Card>
              <Card className="overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100">
                  <h3 className="text-sm font-bold text-slate-700">注文履歴</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        {["日付", "商品", "数量", "金額", "ステータス"].map((h) => (
                          <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {orders.length === 0 && (
                        <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400 text-sm">注文履歴はまだありません</td></tr>
                      )}
                      {orders.map((o) => (
                        <tr key={o.id} className="border-t border-slate-50 hover:bg-slate-50">
                          <td className="px-4 py-3 text-slate-400 text-xs">{o.order_date}</td>
                          <td className="px-4 py-3 text-slate-700 text-xs">{o.product_name}</td>
                          <td className="px-4 py-3 text-slate-600 text-xs text-center">{o.quantity}</td>
                          <td className="px-4 py-3 font-semibold text-slate-700">¥{o.amount.toLocaleString()}</td>
                          <td className="px-4 py-3">
                            <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-semibold">{o.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* 取引条件 */}
          {activeTab === "取引条件" && (
            <Card className="p-5">
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
                  <Button theme="violet" size="sm" onClick={handleSaveTerms} disabled={termsSaving}>
                    {termsSaving ? "保存中..." : "保存する"}
                  </Button>
                </>
              )}
            </Card>
          )}

          {/* 訪問記録 */}
          {activeTab === "訪問記録" && (
            <div className="flex flex-col gap-3">
              {visits.length === 0 && (
                <Card className="p-5 text-center text-slate-400 text-sm">
                  訪問記録はまだありません
                </Card>
              )}
              {visits.map((v) => (
                <Card key={v.id} className="p-5">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <span className="text-xs text-slate-400">{v.visit_date}</span>
                      <p className="text-sm font-bold text-slate-700 mt-0.5">{v.purpose}</p>
                    </div>
                    {v.next_visit_date && (
                      <span className="text-xs text-slate-400 shrink-0">次回予定：{v.next_visit_date}</span>
                    )}
                  </div>
                  {v.memo && <p className="text-sm text-slate-600 bg-slate-50 rounded-xl px-3 py-2">{v.memo}</p>}
                </Card>
              ))}
            </div>
          )}

          {/* ログイン管理 */}
          {activeTab === "ログイン管理" && (
            <div className="flex flex-col gap-4">
              <Card className="p-5">
                <h3 className="text-sm font-bold text-slate-700 mb-1">医院ログイン一覧</h3>
                <p className="text-xs text-slate-400 mb-4">
                  ここで発行したログインID・パスワードで、医院側が「/clinic-login」から自分の得意先コードに閉じたセッションでログインできます。
                </p>
                {clinicUsersLoading ? (
                  <LoadingState />
                ) : clinicUsers.length === 0 ? (
                  <p className="text-slate-400 text-sm">まだログインは発行されていません。</p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {clinicUsers.map((u) => (
                      <div key={u.id} className="border border-slate-100 rounded-xl p-4">
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <div>
                            <p className="text-sm font-semibold text-slate-800">{u.login_id}</p>
                            <p className="text-xs text-slate-400">{u.name || "担当者名未設定"}</p>
                          </div>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            u.status === "有効" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                          }`}>
                            {u.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-3">
                          {resetPasswordId === u.id ? (
                            <>
                              <input
                                type="text"
                                placeholder="新しいパスワード"
                                value={resetPasswordValue}
                                onChange={(e) => setResetPasswordValue(e.target.value)}
                                className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                              />
                              <button
                                onClick={() => handleResetPassword(u.id)}
                                disabled={savingLoginAction}
                                className="text-xs text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-50 font-semibold px-3 py-1.5 rounded-lg"
                              >
                                確定
                              </button>
                              <button
                                onClick={() => { setResetPasswordId(null); setResetPasswordValue(""); }}
                                className="text-xs text-slate-500 hover:text-slate-700 font-semibold"
                              >
                                キャンセル
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => { setResetPasswordId(u.id); setResetPasswordValue(""); }}
                                className="text-xs text-violet-600 hover:text-violet-800 font-semibold"
                              >
                                パスワード再設定
                              </button>
                              <button
                                onClick={() => handleToggleLoginStatus(u)}
                                disabled={savingLoginAction}
                                className="text-xs text-slate-500 hover:text-slate-700 font-semibold disabled:opacity-50"
                              >
                                {u.status === "有効" ? "無効化する" : "有効化する"}
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              <Card className="p-5">
                <h3 className="text-sm font-bold text-slate-700 mb-4">新規ログインを発行</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-500 mb-1 block">ログインID</label>
                    <input value={newLoginForm.loginId}
                      onChange={(e) => setNewLoginForm({ ...newLoginForm, loginId: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 mb-1 block">初期パスワード</label>
                    <input value={newLoginForm.password}
                      onChange={(e) => setNewLoginForm({ ...newLoginForm, password: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 mb-1 block">担当者名（任意）</label>
                    <input value={newLoginForm.name}
                      onChange={(e) => setNewLoginForm({ ...newLoginForm, name: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
                  </div>
                </div>
                <Button theme="violet" size="sm" onClick={handleCreateLogin} disabled={creatingLogin}>
                  {creatingLogin ? "発行中..." : "発行する"}
                </Button>
              </Card>
            </div>
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
