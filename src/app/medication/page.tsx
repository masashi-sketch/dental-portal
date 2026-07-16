'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import BottomNav from '../components/BottomNav';
import PatientSidebarNav, { IconLogout } from '@/components/PatientSidebarNav';
import PreviewModeBanner from '@/components/PreviewModeBanner';
import { usePatientClinicBranding } from '@/hooks/usePatientClinicBranding';
import { medications } from './data';

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
function IconMenu() {
  return <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>;
}
function IconX() {
  return <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>;
}
function IconCheck() {
  return <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg>;
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

/* ── サプリメントアイコン ── */
function MedicineImage({ type, size = 'md' }: { type: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizeMap = { sm: 52, md: 72, lg: 96 };
  const s = sizeMap[size];

  const configs: Record<string, { from: string; to: string; icon: React.ReactNode }> = {
    capsule: {
      from: '#2563EB', to: '#60a5fa',
      icon: (
        <svg width={s} height={s} fill="none" viewBox="0 0 80 80">
          <ellipse cx="40" cy="40" rx="16" ry="26" fill="white" fillOpacity="0.18" />
          <ellipse cx="40" cy="26" rx="16" ry="12" fill="white" fillOpacity="0.32" />
          <ellipse cx="40" cy="54" rx="16" ry="12" fill="white" fillOpacity="0.12" />
          <line x1="24" y1="40" x2="56" y2="40" stroke="white" strokeWidth="2" strokeOpacity="0.45" />
        </svg>
      ),
    },
    tablet: {
      from: '#0d9488', to: '#5eead4',
      icon: (
        <svg width={s} height={s} fill="none" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r="22" fill="white" fillOpacity="0.2" />
          <circle cx="40" cy="40" r="16" fill="white" fillOpacity="0.18" />
          <line x1="24" y1="40" x2="56" y2="40" stroke="white" strokeWidth="2" strokeOpacity="0.4" />
          <line x1="40" y1="24" x2="40" y2="56" stroke="white" strokeWidth="2" strokeOpacity="0.4" />
        </svg>
      ),
    },
    powder: {
      from: '#0369a1', to: '#7dd3fc',
      icon: (
        <svg width={s} height={s} fill="none" viewBox="0 0 80 80">
          <path d="M20 30h40l-4 34a4 4 0 0 1-4 4H28a4 4 0 0 1-4-4z" fill="white" fillOpacity="0.18" />
          <path d="M20 30h40" stroke="white" strokeWidth="2" strokeOpacity="0.4" />
          <path d="M30 30v-8a4 4 0 0 1 4-4h12a4 4 0 0 1 4 4v8" stroke="white" strokeWidth="2" strokeOpacity="0.35" fill="none" />
          <line x1="27" y1="45" x2="53" y2="45" stroke="white" strokeWidth="2" strokeOpacity="0.3" strokeDasharray="2 4" />
        </svg>
      ),
    },
    ointment: {
      from: '#be185d', to: '#f9a8d4',
      icon: (
        <svg width={s} height={s} fill="none" viewBox="0 0 80 80">
          <path d="M30 14h20l3 10H27z" fill="white" fillOpacity="0.28" />
          <path d="M27 24h26l-5 42a4 4 0 0 1-4 4H36a4 4 0 0 1-4-4z" fill="white" fillOpacity="0.18" />
          <line x1="30" y1="36" x2="50" y2="36" stroke="white" strokeWidth="2" strokeOpacity="0.35" />
          <line x1="31" y1="46" x2="49" y2="46" stroke="white" strokeWidth="2" strokeOpacity="0.3" />
        </svg>
      ),
    },
  };

  const c = configs[type] ?? configs.tablet;
  const heightMap = { sm: 'h-36', md: 'h-48', lg: 'h-56 sm:h-64' };
  return (
    <div
      className={`w-full ${heightMap[size]} flex items-center justify-center rounded-2xl`}
      style={{ background: `linear-gradient(145deg, ${c.from}, ${c.to})` }}
    >
      {c.icon}
    </div>
  );
}

const headerNavLinks = ['クリニック紹介', '診療案内', 'アクセス', 'よくある質問', 'お問い合わせ'];

const steps = [
  { label: 'ご注文受付', desc: '医院からのご注文情報を受付' },
  { label: '準備中', desc: 'スタッフが商品の準備を行っています' },
  { label: '準備完了', desc: '受け取り可能になりました' },
  { label: 'お受け取り完了', desc: 'サプリメントをお渡し済みです' },
];
const currentStep = 2; // 0-indexed：準備完了の段階

export default function MedicationPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { clinicName, navVisibility, showPeriodontalDiagnosis } = usePatientClinicBranding();
  const [receiveMethod, setReceiveMethod] = useState<'pickup' | 'delivery'>('pickup');
  const [diagnosis, setDiagnosis] = useState<PeriodontalDiagnosisView>(null);
  const [diagnosisLoaded, setDiagnosisLoaded] = useState(false);

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
          <nav className="hidden md:flex items-center gap-7 text-sm text-gray-600">
            {headerNavLinks.map((label) => (
              <a key={label} href="#" className="hover:text-[#2563EB] transition-colors">{label}</a>
            ))}
          </nav>
          <div className="flex items-center gap-3 text-gray-500">
            <button className="hover:text-[#2563EB] transition-colors"><IconBell /></button>
            <button className="hover:text-[#2563EB] transition-colors hidden sm:block"><IconUser /></button>
            <button className="md:hidden hover:text-[#2563EB] transition-colors" onClick={() => setMenuOpen(!menuOpen)}>
              {menuOpen ? <IconX /> : <IconMenu />}
            </button>
          </div>
        </div>
        {menuOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white px-4 pb-4">
            {headerNavLinks.map((label) => (
              <a key={label} href="#" className="block py-3 text-sm text-gray-600 border-b border-gray-50 hover:text-[#2563EB] transition-colors">{label}</a>
            ))}
          </div>
        )}
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
          <div className="bg-gradient-to-r from-[#2563EB] to-[#60a5fa] rounded-2xl p-5 sm:p-6 text-white">
            <span className="inline-block bg-white/20 text-white text-xs font-semibold px-3 py-1 rounded-full mb-3">
              ご注文情報
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 text-sm">
              <div>
                <p className="text-blue-100 text-xs mb-1">注文日</p>
                <p className="font-semibold">◯月◯日（◯）</p>
              </div>
              <div>
                <p className="text-blue-100 text-xs mb-1">担当スタッフ</p>
                <p className="font-semibold">◯◯　◯◯</p>
              </div>
              <div>
                <p className="text-blue-100 text-xs mb-1">次回受診予定</p>
                <p className="font-semibold">◯月◯日（◯）◯◯:◯◯</p>
              </div>
            </div>
          </div>

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
            </div>
          )}

          {/* 受け取りステータス */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6">
            <p className="text-sm font-bold text-gray-900 mb-5">サプリメントの受け取り状況</p>
            <div className="flex items-start">
              {steps.map((step, i) => (
                <div key={step.label} className="flex-1 flex flex-col items-center text-center relative">
                  {i > 0 && (
                    <div
                      className={`absolute top-4 right-1/2 w-full h-0.5 ${i <= currentStep ? 'bg-[#2563EB]' : 'bg-gray-200'}`}
                    />
                  )}
                  <div
                    className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                      i < currentStep
                        ? 'bg-[#2563EB] text-white'
                        : i === currentStep
                        ? 'bg-[#2563EB] text-white ring-4 ring-blue-100'
                        : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {i < currentStep ? <IconCheck /> : i + 1}
                  </div>
                  <p className={`mt-2 text-xs font-semibold ${i <= currentStep ? 'text-gray-900' : 'text-gray-400'}`}>{step.label}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5 leading-snug hidden sm:block">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ご注文内容一覧 */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-base font-bold text-gray-900">今回のご注文内容</p>
              <span className="text-xs text-gray-400">{medications.length}品目</span>
            </div>
            <div className="flex flex-col gap-4">
              {medications.map((med) => (
                <div key={med.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="flex flex-col sm:flex-row">
                    <div className="sm:w-44 sm:shrink-0 p-4">
                      <div className="relative">
                        <MedicineImage type={med.imageType} size="sm" />
                        <span className={`absolute top-2 left-2 text-xs font-semibold px-2.5 py-1 rounded-full ${med.badgeColor}`}>
                          {med.badge}
                        </span>
                      </div>
                    </div>
                    <div className="flex-1 px-4 pb-5 sm:py-5 sm:pr-5 sm:pl-0">
                      <h2 className="text-lg font-bold text-gray-900 mb-2">{med.name}</h2>
                      <div className="flex flex-col gap-1 text-xs text-gray-600 mb-3">
                        <p><span className="text-gray-400">用法・用量：</span>{med.dosage}</p>
                        <p><span className="text-gray-400">数量：</span>{med.quantity}</p>
                      </div>
                      {med.remainingDays != null && med.totalDays != null && (
                        <div className="mb-3">
                          <div className="flex items-center justify-between text-[11px] text-gray-400 mb-1">
                            <span>残り{med.remainingDays}日分</span>
                            <span>{med.totalDays}日分中</span>
                          </div>
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-400 rounded-full"
                              style={{ width: `${(med.remainingDays / med.totalDays) * 100}%` }}
                            />
                          </div>
                        </div>
                      )}
                      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 leading-relaxed">
                        {med.note}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 受け取り方法選択 */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6">
            <p className="text-sm font-bold text-gray-900 mb-4">受け取り方法を選択してください</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <button
                onClick={() => setReceiveMethod('pickup')}
                className={`text-left p-4 rounded-2xl border-2 transition-colors ${
                  receiveMethod === 'pickup' ? 'border-[#2563EB] bg-[#F0F7FF]' : 'border-gray-100 hover:border-gray-200'
                }`}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${receiveMethod === 'pickup' ? 'bg-[#2563EB] text-white' : 'bg-gray-100 text-gray-500'}`}>
                  <IconStore />
                </div>
                <p className="text-sm font-semibold text-gray-900 mb-1">来局して受け取る</p>
                <p className="text-xs text-gray-400 leading-relaxed">最短で本日中にお渡し可能です。</p>
              </button>
              <button
                onClick={() => setReceiveMethod('delivery')}
                className={`text-left p-4 rounded-2xl border-2 transition-colors ${
                  receiveMethod === 'delivery' ? 'border-[#2563EB] bg-[#F0F7FF]' : 'border-gray-100 hover:border-gray-200'
                }`}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${receiveMethod === 'delivery' ? 'bg-[#2563EB] text-white' : 'bg-gray-100 text-gray-500'}`}>
                  <IconTruck />
                </div>
                <p className="text-sm font-semibold text-gray-900 mb-1">ご自宅へ配送</p>
                <p className="text-xs text-gray-400 leading-relaxed">発送まで1〜2日程度お時間をいただきます。</p>
              </button>
            </div>
            <button className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#2563EB] text-white px-6 py-3 rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity shadow-sm active:scale-95">
              この方法で受け取る
            </button>
          </div>

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
          <div className="flex items-center gap-5 flex-wrap justify-center">
            <a href="#" className="hover:text-white transition-colors">プライバシーポリシー</a>
            <a href="#" className="hover:text-white transition-colors">特定商取引法</a>
            <a href="#" className="hover:text-white transition-colors">お問い合わせ</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
