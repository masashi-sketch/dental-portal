'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import BottomNav from '../components/BottomNav';
import PatientSidebarNav, { IconLogout } from '@/components/PatientSidebarNav';
import PreviewModeBanner from '@/components/PreviewModeBanner';
import ProductVisual from '@/components/ProductVisual';
import { usePatientClinicBranding } from '@/hooks/usePatientClinicBranding';
import { usePatientOrders } from '@/hooks/usePatientOrders';
import { ORDER_STATUS_LABEL } from '@/lib/orders';
import type { PatientOrderStatus } from '@/lib/supabase/types';

type PeriodontalDiagnosisView = {
  diagnosedAt: string;
  memo: string | null;
  stage: { code: number; label: string; name: string; description: string } | null;
  grade: { code: string; label: string; name: string; description: string } | null;
} | null;

function IconBell() {
  return <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>;
}
function IconUser() {
  return <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>;
}
function IconStore() {
  return <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M3 9l1-5h16l1 5" /><path d="M4 9v10a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9" /><path d="M9 20v-6h6v6" /></svg>;
}
function IconTruck() {
  return <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><rect x="1" y="3" width="15" height="13" /><polygon points="16 8 20 8 23 11 23 16 16 16 16 8" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" /></svg>;
}
function IconTooth() {
  return <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M12 2C8 2 5 4.5 5 8.5c0 3 1 5 1.5 8 .3 1.6.7 3.5 2 3.5 1.5 0 1.5-3 2-5 .3-1.2.7-1.5 1.5-1.5s1.2.3 1.5 1.5c.5 2 .5 5 2 5 1.3 0 1.7-1.9 2-3.5.5-3 1.5-5 1.5-8C19 4.5 16 2 12 2Z" /></svg>;
}

const pickupSteps: { status: PatientOrderStatus; label: string }[] = [
  { status: 'received', label: '受付済み' },
  { status: 'preparing', label: '準備中' },
  { status: 'ready', label: '準備完了' },
  { status: 'completed', label: '受け取り済み' },
];
const deliverySteps: { status: PatientOrderStatus; label: string }[] = [
  { status: 'received', label: '受付済み' },
  { status: 'preparing', label: '準備中' },
  { status: 'shipped', label: '配送中' },
  { status: 'completed', label: '受け取り済み' },
];

export default function MedicationPage() {
  const { clinicName, navVisibility, showPeriodontalDiagnosis } = usePatientClinicBranding();
  const [diagnosis, setDiagnosis] = useState<PeriodontalDiagnosisView>(null);
  const [diagnosisLoaded, setDiagnosisLoaded] = useState(false);
  const { orders, loaded: ordersLoaded, error: ordersError } = usePatientOrders();
  const activeOrder = orders.find((order) => order.status !== 'completed' && order.status !== 'canceled') ?? orders[0] ?? null;
  const statusSteps = activeOrder?.fulfillment_method === 'delivery' ? deliverySteps : pickupSteps;
  const currentStep = activeOrder ? statusSteps.findIndex((step) => step.status === activeOrder.status) : -1;

  useEffect(() => {
    let cancelled = false;
    fetch('/api/patient-portal/diagnosis')
      .then((res) => (res.ok ? res.json() : { diagnosis: null }))
      .then((data) => { if (!cancelled) setDiagnosis(data.diagnosis ?? null); })
      .catch(() => { if (!cancelled) setDiagnosis(null); })
      .finally(() => { if (!cancelled) setDiagnosisLoaded(true); });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 pb-20 md:pb-0">

      <PreviewModeBanner />

      {/* アナウンスバー */}
      <div className="bg-[#F0F7FF] text-[#2563EB] text-xs text-center py-2 px-4">
        医師監修のもと提供される患者様専用のポータルサービスです
      </div>

      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#2563EB] rounded-lg flex items-center justify-center">
              <svg width="18" height="18" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            </div>
            <span className="text-gray-900 font-bold text-lg tracking-tight">{clinicName ?? 'デンタルポータル'}</span>
          </div>
          <div className="flex items-center gap-3 text-gray-500">
            <button className="hover:text-[#2563EB] transition-colors"><IconBell /></button>
            <button className="hover:text-[#2563EB] transition-colors hidden sm:block"><IconUser /></button>
          </div>
        </div>
      </header>

      {/* ボディ */}
      <div className="flex flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8 gap-6 sm:gap-8">

        {/* サイドバー */}
        <aside className="hidden md:block w-52 shrink-0">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3">
            <PatientSidebarNav active="medication" navVisibility={navVisibility}>
              <div className="my-2 h-px bg-gray-100" />
              <Link href="/" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-500 hover:bg-gray-50 transition-colors">
                <span className="text-gray-400"><IconLogout /></span>ログアウト
              </Link>
            </PatientSidebarNav>
          </div>
        </aside>

        {/* メインコンテンツ */}
        <main className="flex-1 flex flex-col gap-6 min-w-0">

          {/* ご注文情報カード */}
          {activeOrder && (
            <div className="bg-gradient-to-r from-[#2563EB] to-[#60a5fa] rounded-2xl p-5 sm:p-6 text-white">
              <span className="inline-block bg-white/20 text-white text-xs font-semibold px-3 py-1 rounded-full mb-3">
                ご注文情報
              </span>
              <div className="text-sm">
                <p className="text-blue-100 text-xs mb-1">注文日</p>
                <p className="font-semibold">{new Date(activeOrder.ordered_at).toLocaleDateString('ja-JP')}</p>
              </div>
            </div>
          )}

          {/* 歯周病の状態 */}
          {diagnosisLoaded && showPeriodontalDiagnosis && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-[#2563EB]"><IconTooth /></span>
                <p className="text-sm font-bold text-gray-900">歯周病の状態</p>
              </div>
              {diagnosis ? (
                <>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {diagnosis.stage && (
                      <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-[#EFF6FF] text-[#2563EB]">
                        {diagnosis.stage.label}
                      </span>
                    )}
                    {diagnosis.grade && (
                      <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-gray-100 text-gray-600">
                        {diagnosis.grade.label}
                      </span>
                    )}
                  </div>
                  {diagnosis.stage && (
                    <p className="text-sm font-bold text-gray-900 mb-1">{diagnosis.stage.name}</p>
                  )}
                  <p className="text-xs text-gray-500 leading-relaxed mb-3">
                    {diagnosis.stage?.description}
                    {diagnosis.grade && <>　{diagnosis.grade.description}</>}
                  </p>
                  <p className="text-[11px] text-gray-400 mb-3">前回診断日：{diagnosis.diagnosedAt}</p>
                  <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2 leading-relaxed">
                    医院にて定期的に経過を確認しています。今回のご案内内容は、この診断結果に基づいています。
                  </p>
                </>
              ) : (
                <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2 leading-relaxed">
                  歯周病の診断結果はまだ登録されていません。次回受診時に医院にてご確認ください。
                </p>
              )}
              <Link
                href="/shop"
                className="mt-3 flex items-center justify-between gap-2 bg-[#F0F7FF] hover:bg-[#e3effe] transition-colors rounded-xl px-4 py-3"
              >
                <span className="text-xs sm:text-sm text-[#2563EB] font-semibold">
                  {diagnosis ? 'この結果を踏まえたおすすめのケア用品を見る' : 'おすすめのケア用品を見る'}
                </span>
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="text-[#2563EB] shrink-0">
                  <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                </svg>
              </Link>
            </div>
          )}

          {/* 受け取りステータス */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6">
            <p className="text-sm font-bold text-gray-900 mb-5">サプリメントの受け取り状況</p>
            {!ordersLoaded && <p className="text-sm text-gray-400">受け取り情報を読み込んでいます…</p>}
            {ordersError && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{ordersError}</p>}
            {ordersLoaded && !ordersError && !activeOrder && (
              <p className="rounded-xl bg-gray-50 px-4 py-4 text-sm text-gray-500">現在、受け取り予定の商品はありません。</p>
            )}
            {activeOrder?.status === 'canceled' && (
              <p className="rounded-xl bg-red-50 px-4 py-4 text-sm text-red-600">この注文はキャンセルされました。</p>
            )}
            {activeOrder && activeOrder.status !== 'canceled' && (
              <div className="flex items-start">
                {statusSteps.map((step, index) => (
                  <div key={step.status} className="relative flex flex-1 flex-col items-center text-center">
                    {index > 0 && <div className={`absolute right-1/2 top-4 h-0.5 w-full ${index <= currentStep ? 'bg-[#2563EB]' : 'bg-gray-200'}`} />}
                    <div className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${index <= currentStep ? 'bg-[#2563EB] text-white' : 'bg-gray-100 text-gray-400'}`}>
                      {index + 1}
                    </div>
                    <p className={`mt-2 text-xs font-semibold ${index <= currentStep ? 'text-gray-900' : 'text-gray-400'}`}>{step.label}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ご注文内容一覧 */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-base font-bold text-gray-900">今回のご注文内容</p>
              <span className="text-xs text-gray-400">{activeOrder?.items.length ?? 0}品目</span>
            </div>
            {ordersLoaded && !ordersError && !activeOrder && (
              <p className="rounded-xl bg-white px-4 py-10 text-center text-sm text-gray-500">注文内容はありません。</p>
            )}
            <div className="flex flex-col gap-4">
              {activeOrder?.items.map((item) => (
                <div key={item.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="flex flex-col sm:flex-row">
                    <div className="sm:w-44 sm:shrink-0 p-4">
                      <ProductVisual type={item.image_type_snapshot} className="w-full h-36 flex items-center justify-center rounded-2xl" />
                    </div>
                    <div className="flex-1 px-4 pb-5 sm:py-5 sm:pr-5 sm:pl-0">
                      <h2 className="text-lg font-bold text-gray-900 mb-2">{item.product_name}</h2>
                      <div className="flex flex-col gap-1 text-xs text-gray-600 mb-3">
                        <p><span className="text-gray-400">用法・用量：</span>{item.daily_amount_snapshot ?? '医院へご確認ください'}</p>
                        <p><span className="text-gray-400">数量：</span>{item.quantity}{item.unit_snapshot ?? '点'}</p>
                        <p><span className="text-gray-400">内容量：</span>{item.volume_snapshot ?? '—'}</p>
                      </div>
                      {item.caution_snapshot && <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 leading-relaxed">{item.caution_snapshot}</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {activeOrder && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6">
              <p className="text-sm font-bold text-gray-900 mb-4">登録されている受け取り方法</p>
              <div className="flex items-center gap-3 rounded-xl bg-[#F0F7FF] px-4 py-4 text-[#2563EB]">
                {activeOrder.fulfillment_method === 'pickup' ? <IconStore /> : <IconTruck />}
                <div>
                  <p className="text-sm font-semibold">{activeOrder.fulfillment_method === 'pickup' ? '医院で受け取る' : 'ご自宅へ配送'}</p>
                  <p className="mt-0.5 text-xs text-gray-500">現在の状態：{ORDER_STATUS_LABEL[activeOrder.status]}</p>
                </div>
              </div>
            </div>
          )}

          {/* 注意事項 */}
          <div className="bg-gray-50 rounded-2xl border border-gray-200 p-5 text-xs text-gray-500 leading-relaxed">
            <p className="font-semibold text-gray-700 mb-2">サプリメントに関するご注意</p>
            <ul className="flex flex-col gap-1.5 list-disc list-inside">
              <li>用法・用量を守り、自己判断で摂取を中止・変更しないでください。</li>
              <li>体調の変化を感じた場合は、速やかに医師・スタッフにご相談ください。</li>
              <li>他に服用中のサプリメントやお薬がある場合は、次回受診時に医院へお伝えください。</li>
              <li>直射日光・高温多湿を避けて保管してください。</li>
            </ul>
          </div>

        </main>
      </div>

      {/* ボトムナビ（モバイル） */}
      <BottomNav active="medication" navVisibility={navVisibility} />

      {/* フッター */}
      <footer className="bg-gray-900 text-gray-400 mt-auto hidden md:block">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col items-center gap-4 text-xs sm:text-sm md:flex-row md:justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-[#2563EB] rounded-md flex items-center justify-center">
              <svg width="13" height="13" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>
            </div>
            <span className="text-white font-semibold">{clinicName ?? 'デンタルポータル'}</span>
          </div>
          <div className="text-gray-500 text-xs">© 2026 {clinicName ?? 'デンタルポータル'}. All Rights Reserved.</div>
        </div>
      </footer>

    </div>
  );
}
