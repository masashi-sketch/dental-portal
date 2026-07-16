'use client';

import { useState } from 'react';
import Link from 'next/link';
import AdminSidebar from '../../components/AdminSidebar';
import { useToast } from '@/hooks/useToast';
import { useClinicInfo } from '@/hooks/useClinicInfo';
import { useSignupPinRegenerate } from '@/hooks/useSignupPinRegenerate';
import { formatTimestampCompact } from '@/lib/formatTimestamp';
import SignupQrCard from '@/components/SignupQrCard';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

export default function AdminClinicQrPage() {
  const { toast, showToast } = useToast();
  const { isClinicRole, clinic, setClinic, customerCode } = useClinicInfo();
  const { regenerate, regenerating } = useSignupPinRegenerate(setClinic, showToast);
  const [confirmingRegen, setConfirmingRegen] = useState(false);
  const [urlCopied, setUrlCopied] = useState(false);

  // 得意先コードは連番で推測可能なためURLには使わず、無関係なランダム文字列である
  // signup_slugを使う。originはSSR時に取得できないため、クライアントでの
  // レンダリング時にのみ算出する（set-state-in-effectを避ける）。
  const joinUrl = isClinicRole && clinic?.signup_slug && typeof window !== 'undefined'
    ? `${window.location.origin}/join/${clinic.signup_slug}/mobile`
    : '';
  const signupPinIssuedAt = formatTimestampCompact(clinic?.signup_pin_issued_at);
  const qrValue = joinUrl && signupPinIssuedAt ? `${joinUrl}?t=${signupPinIssuedAt}` : joinUrl;

  return (
    <div className="min-h-screen flex bg-sky-50">
      <AdminSidebar active="clinicQr" />

      <div className="flex-1 flex flex-col min-w-0 pt-14 md:pt-0">
        <header className="bg-white border-b border-sky-100 px-4 sm:px-6 py-4 shadow-sm">
          <h1 className="text-slate-800 font-bold text-xl">QR設定</h1>
          <p className="text-slate-600 text-sm mt-0.5">
            {isClinicRole ? '患者様の新規ポータル登録用QRコード・受付PINを発行・管理します' : 'BGJ職員向けの得意先ごとの設定はBGJポータルから行います'}
          </p>
        </header>

        <main className="flex-1 p-5 sm:p-6">
          {toast && (
            <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-sky-600 text-white text-base px-5 py-3 rounded-2xl shadow-xl">{toast}</div>
          )}

          {!isClinicRole && (
            <Card theme="sky" className="p-5 sm:p-6 shadow-sm max-w-2xl">
              <p className="text-sm font-bold text-slate-700 mb-1">この画面はクリニックログイン専用です</p>
              <p className="text-slate-500 text-sm mb-4">
                得意先ごとのQR・受付PINは、BGJポータルの「得意先一覧」の「接続情報」タブから確認・発行できます。
              </p>
              <Link
                href="/bgj/customers"
                className="inline-block bg-sky-500 hover:bg-sky-400 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-colors"
              >
                BGJポータルの得意先一覧へ
              </Link>
            </Card>
          )}

          {isClinicRole && clinic && (
            <Card theme="sky" className="p-5 sm:p-6 shadow-sm max-w-2xl">
              <p className="text-sm font-bold text-slate-700 mb-1">患者様の新規ポータル登録（QRコード）</p>
              <p className="text-xs text-slate-400 mb-4">
                クリニック共通のQRコードです。窓口に掲示し、受付PINと合わせて患者様にお伝えください。患者様はご自身のスマホでスキャンし、その場でログインID・パスワードを設定して登録できます。BGJポータルの「得意先一覧＞接続情報」タブからも同じQR・PINを確認・再発行できます。
              </p>

              {!clinic.signup_pin || !clinic.signup_slug ? (
                <>
                  <p className="text-slate-400 text-sm mb-4">まだ受付PINが発行されていません。</p>
                  <Button theme="sky" onClick={regenerate} disabled={regenerating}>
                    {regenerating ? '発行中...' : '発行する'}
                  </Button>
                </>
              ) : (
                <div className="flex flex-col gap-4">
                  <SignupQrCard
                    clinicName={clinic.display_name || clinic.name}
                    signupPin={clinic.signup_pin}
                    signupPinIssuedAt={signupPinIssuedAt}
                    qrValue={qrValue}
                    pdfFilename={`患者登録QR_${customerCode}.pdf`}
                    theme="sky"
                  />

                  <div className="flex gap-3">
                    <Button
                      theme="sky"
                      fullWidth
                      onClick={() => {
                        navigator.clipboard.writeText(qrValue);
                        setUrlCopied(true);
                        setTimeout(() => setUrlCopied(false), 2000);
                      }}
                    >
                      {urlCopied ? '✓ コピーしました' : 'URLをコピー'}
                    </Button>
                  </div>

                  {confirmingRegen ? (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex flex-wrap items-center gap-3">
                      <p className="text-amber-700 text-xs flex-1 min-w-[200px]">
                        再発行すると、これまでのQRコード・受付PINは無効になります。よろしいですか？
                      </p>
                      <button
                        onClick={() => { regenerate(); setConfirmingRegen(false); }}
                        disabled={regenerating}
                        className="text-xs text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 font-semibold px-3 py-1.5 rounded-lg"
                      >
                        {regenerating ? '発行中...' : '再発行する'}
                      </button>
                      <button
                        onClick={() => setConfirmingRegen(false)}
                        className="text-xs text-slate-500 hover:text-slate-700 font-semibold"
                      >
                        キャンセル
                      </button>
                    </div>
                  ) : (
                    <Button theme="sky" onClick={() => setConfirmingRegen(true)}>
                      PIN・QRを再発行する
                    </Button>
                  )}
                </div>
              )}
            </Card>
          )}
        </main>
      </div>
    </div>
  );
}
