"use client";

import { useState } from "react";
import Card from "@/components/ui/Card";

const TABS = ["システム手順", "利用マニュアル"] as const;
type Tab = (typeof TABS)[number];

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="block bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-mono text-xs text-slate-700 whitespace-pre-wrap break-all">
      {children}
    </code>
  );
}

function Steps({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-sm font-bold text-slate-800 mb-2">{title}</p>
      <ol className="list-decimal list-inside text-sm text-slate-700 leading-relaxed flex flex-col gap-1.5 pl-1">
        {children}
      </ol>
    </div>
  );
}

type SubTabItem = { label: string; content: React.ReactNode; activeClassName?: string };

// カードを縦に積んでスクロールさせるのではなく、タブで1つずつ切り替えて見せるための
// 共通UI。システム手順の項目・利用マニュアルの対象者別案内・QR機能の案内、
// いずれもこれで統一する（ネストして使ってもよい）。
function SubTabs({ items }: { items: SubTabItem[] }) {
  const [active, setActive] = useState(0);
  return (
    <div>
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-4 w-fit flex-wrap">
        {items.map((item, i) => (
          <button
            key={item.label}
            onClick={() => setActive(i)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              active === i ? (item.activeClassName ?? "bg-white text-violet-700 shadow-sm") : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-4 text-sm text-slate-700 leading-relaxed">{items[active].content}</div>
    </div>
  );
}

export default function ManualPage() {
  const [tab, setTab] = useState<Tab>("利用マニュアル");

  return (
    <div className="p-4 sm:p-6 max-w-3xl">
      <header className="mb-5">
        <h1 className="text-xl font-bold text-slate-800">マニュアル</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          「システム手順」は開発・運用担当者向けの技術的な設定手順、「利用マニュアル」はBGJ・医院様・患者様それぞれに向けたご案内です。仕様を変更したときは、このページも一緒に更新してください。
        </p>
      </header>

      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-5 w-fit">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${
              tab === t ? "bg-white text-violet-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "システム手順" && (
        <div className="flex flex-col gap-4">
          <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs px-4 py-2.5 rounded-xl">
            このタブは開発・運用を担当する方向けの技術手順です。医院様・患者様にご案内する内容ではありません。
          </div>

          <Card className="p-5">
            <SubTabs
              items={[
                {
                  label: "0. 全体構成",
                  content: (
                    <>
                      <p className="font-bold text-slate-800">3ポータル構成</p>
                      <ul className="list-disc list-inside pl-2">
                        <li><strong>患者様ポータル</strong>（<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">/</code>, <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">/home</code>, <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">/medication</code>など）：患者様がご自身の診断結果等を確認する画面。</li>
                        <li><strong>医院用ポータル</strong>（<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">/admin/*</code>）：医院スタッフが患者様ID発行・診断登録・表示設定を行う画面。</li>
                        <li><strong>BGJポータル</strong>（<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">/bgj/*</code>）：バイオガイア社員が得意先・営業マスタ・システムを管理する画面。</li>
                      </ul>
                      <p className="font-bold text-slate-800 mt-2">認証（NextAuth v5、<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">src/auth.ts</code>）</p>
                      <ul className="list-disc list-inside pl-2">
                        <li><code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">bgj</code>：Google OAuth。<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">@biogaia.jp</code>ドメインのみ許可。</li>
                        <li><code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">clinic</code>：ログインID・パスワード（<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">clinic_users</code>テーブル、<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">/clinic-login</code>）。自分の得意先コードに固定される。</li>
                        <li><code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">patient</code>：ログインID・パスワード（<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">patients</code>テーブル）。自分の患者ID・得意先コードに固定される。</li>
                        <li><code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">patient-magiclink</code>：メール内リンクの使い捨てトークンによるワンクリックログイン（システム手順「8」参照）。</li>
                      </ul>
                      <p>
                        いずれのログインも5回連続で失敗すると15分間ロックされる（<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">src/lib/auth/loginLockout.ts</code>、clinic/patientのみ）。
                        ほぼ全パスは<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">src/proxy.ts</code>（Next.js 16でのmiddleware）が認証必須にしており、公開ページは明示的な許可リストで管理する。
                      </p>
                      <p className="font-bold text-slate-800 mt-2">データベース（Supabase）</p>
                      <p>
                        テーブル定義は<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">supabase/schema.sql</code>が唯一のDB定義書。全テーブルで<strong>RLS有効・ポリシーなし</strong>（anon/authenticatedキーからは一切読み書き不可）とし、アクセスは必ずサーバー側の<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">service_role</code>キー経由のAPIルートを介す。ブラウザに秘密鍵は一切出さない。列は<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">select(&apos;*&apos;)</code>禁止で、<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">src/lib/supabase/types.ts</code>の列指定定数を使う。
                      </p>
                      <p className="font-bold text-slate-800 mt-2">エラー監視（Sentry）</p>
                      <p>
                        <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">@sentry/nextjs</code>導入済み。<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">NEXT_PUBLIC_SENTRY_DSN</code>が未設定の間は自動的に無効化され何も送信されない。メール等の個人情報は<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">src/lib/sentryScrub.ts</code>でマスクしている。
                        BGJポータルの「システム管理」→「アプリ管理」画面には、Sentry API（Auth Token方式）経由で未解決issue一覧を表示する機能もある（<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">src/app/api/bgj/system/sentry-issues/route.ts</code>）。<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">SENTRY_AUTH_TOKEN</code>（scope: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">project:read</code>・<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">event:read</code>）が未設定の間はエラーにせず「未設定」表示になる。組織スラッグ・プロジェクトIDはDSNから判明する非秘密情報のためコード内に定数として埋め込んでいる。
                      </p>
                      <p className="font-bold text-slate-800 mt-2">開発環境</p>
                      <Code>{`npm run dev    # 開発サーバー（--webpack固定。Turbopackは日本語パスでクラッシュするため）
npm run lint   # ESLint
npx tsc --noEmit  # 型チェック
npm run test   # ユニットテスト（Vitest）
npm run build  # 本番ビルド`}</Code>
                    </>
                  ),
                },
                {
                  label: "1. Supabase準備",
                  content: (
                    <>
                      <p>1. <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-violet-600 underline">supabase.com</a> でプロジェクトを新規作成する。</p>
                      <p>2. SQL Editorで <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">supabase/schema.sql</code>（リポジトリ内）を実行し、テーブル一式を作成する。</p>
                      <p>3. Project Settings → API から以下を控える。</p>
                      <ul className="list-disc list-inside pl-2">
                        <li><code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">Project URL</code></li>
                        <li><code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">service_role key</code></li>
                        <li><code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">anon / public key</code></li>
                        <li>JWT Settings → <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">Legacy JWT Secret</code></li>
                      </ul>
                    </>
                  ),
                },
                {
                  label: "2. 環境変数",
                  content: (
                    <>
                      <p>
                        <strong className="text-red-600">重要：</strong>ローカルの<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">.env.local</code>だけでなく、
                        <strong>Vercel側（Production環境）にも同じ値を必ず設定すること。</strong>
                        片方だけ設定した状態だと「ローカルでは動くのに本番だけ動かない」という気づきにくい不具合になる
                        （実際に本番でマスタ取得が500エラーになる不具合が、Supabase系の環境変数が本番に未設定だったために発生したことがある）。
                      </p>
                      <Code>{`GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
AUTH_SECRET=
AUTH_URL=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_ANON_KEY=
SUPABASE_JWT_SECRET=`}</Code>
                      <p>Vercelへの設定は管理画面（Project → Settings → Environment Variables）、またはCLIで行う。</p>
                      <Code>{`vercel env add SUPABASE_URL production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add SUPABASE_ANON_KEY production
vercel env add SUPABASE_JWT_SECRET production`}</Code>
                      <p>環境変数を追加・変更した後は、再デプロイ（「4. デプロイ」タブ）しないと反映されない。</p>
                    </>
                  ),
                },
                {
                  label: "3. Google OAuth",
                  content: (
                    <>
                      <p>Google Cloud ConsoleでOAuthクライアントを作成し、<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">GOOGLE_CLIENT_ID</code> / <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">GOOGLE_CLIENT_SECRET</code>を発行する。</p>
                      <p>ログインは <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">@biogaia.jp</code> ドメインのアカウントのみ許可される（<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">src/auth.ts</code>で制限）。医院スタッフ・患者様はこのログインを使わない（「利用マニュアル」参照）。</p>
                    </>
                  ),
                },
                {
                  label: "4. デプロイ",
                  content: (
                    <>
                      <Code>{`git push origin main   # コミット・push
vercel --prod          # 本番デプロイ`}</Code>
                      <p>デプロイ後は本番URLで実際に各ポータルにログインし、マスタ一覧（営業担当・役職・エリア・得意先）が正しく表示されることを確認する。</p>
                    </>
                  ),
                },
                {
                  label: "5. QR自己登録",
                  content: (
                    <>
                      <p>
                        患者様がご自身のスマホでポータル登録できるようにする機能。<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">clinic_patient_settings</code>に以下のカラムを追加している（未適用の環境ではSupabase SQL Editorで実行すること）。
                      </p>
                      <Code>{`alter table public.clinic_patient_settings
  add column if not exists signup_pin text,
  add column if not exists signup_pin_failed_attempts int not null default 0,
  add column if not exists signup_pin_locked_until timestamptz,
  add column if not exists signup_pin_issued_at timestamptz;`}</Code>
                      <p>
                        新規依存パッケージ：<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">qrcode.react</code>（QR描画）、
                        <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">jspdf</code> / <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">html2canvas-pro</code>（PDF出力）。
                        このプロジェクトはTailwind v4（oklchカラー関数）を使っているため、無印の<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">html2canvas</code>ではなく対応フォークの<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">html2canvas-pro</code>を使う（無印だと色の解釈でエラーになる）。
                      </p>
                      <p>
                        新規の公開（認証不要）ルート：QRコードが実際に開く、クリニック指定背景・スマホ専用の登録画面<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">/join/[signup_slug]/mobile</code>、PC等での確認用の簡易版<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">/join/[signup_slug]</code>、共通の送信先API<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">/api/join/[signup_slug]</code>。受付PINで本人確認し、5回連続で間違えると15分ロックする（<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">src/lib/auth/signupPin.ts</code>）。
                      </p>
                      <p>
                        <strong className="text-red-600">重要：</strong>URLの`[signup_slug]`は得意先コードとは無関係なランダム文字列（`generateSignupSlug()`、PINと同時に再発行）。得意先コードは連番で推測可能なため、URLには一切使わない（単純なハッシュ化では全パターン先回り計算で逆引きされるため不十分、という判断）。
                      </p>
                      <p>
                        患者様の登録項目（氏名・パスワード）を追加・変更する場合は、上記2つの登録ページと送信先APIを必ず連動して更新すること（各ファイル冒頭にもこの方針をコメントで残している）。ログインIDは手入力させず、全クリニック共通の連番（「BU」+6桁、<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">patients.login_id</code>の生成列）をDB側で自動採番する（詳細はシステム手順「6. ログインIDの自動採番」参照）。
                      </p>
                      <p>
                        QR・PINの発行/再発行は、BGJ側（得意先詳細＞接続情報タブ）・医院側（クリニック情報＞QR設定、および患者様管理のQRモーダル）のどちらからも行え、実体は同じ<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">clinic_patient_settings</code>の1行なので双方向に反映される。QRの見た目・PDFファイル名にはPIN発行日時（<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">yyyymmddhhmmss</code>）を埋め込み、再発行のたびにQRが変わるようにしている。
                      </p>
                      <p className="bg-amber-50 border border-amber-200 text-amber-700 text-xs px-4 py-2.5 rounded-xl">
                        <strong>ハマりどころ：</strong>このプロジェクトのNext.js 16では<code className="bg-white px-1.5 py-0.5 rounded text-xs">middleware.ts</code>が<code className="bg-white px-1.5 py-0.5 rounded text-xs">src/proxy.ts</code>という名前に変わっている。ほぼ全パスを認証必須にする関所として動くため、
                        <strong>新しい公開（認証不要）ページ・APIを追加したら、必ず<code className="bg-white px-1.5 py-0.5 rounded text-xs">src/proxy.ts</code>の許可リストにも追加すること。</strong>
                        実際に<code className="bg-white px-1.5 py-0.5 rounded text-xs">/join/[signup_slug]</code>を追加した際にこれを見落とし、QRからスマホでアクセスすると本番でログイン画面にリダイレクトされる不具合が発生した（あわせて、既存の<code className="bg-white px-1.5 py-0.5 rounded text-xs">/bgj-login</code>も同じ理由で許可リスト漏れだったため修正済み）。
                      </p>
                    </>
                  ),
                },
                {
                  label: "6. ログインIDの自動採番",
                  content: (
                    <>
                      <p>
                        患者様のログインIDは、発行経路（医院/BGJの手動発行・QR自己登録のどちらか）によらず、全クリニック共通の連番（<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">BU</code>+6桁、例：<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">BU000001</code>）で自動採番する。手入力は一切できない。
                      </p>
                      <p>
                        実装は<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">patients.login_id</code>を「生成列（generated always as ... stored）」にすることで実現している。既存の<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">patient_no</code>（<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">{`'T-' || lpad(seq_no,5,'0')`}</code>）と全く同じ<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">seq_no</code>（自動採番の識別子）から算出するため、採番ロジックが増えるのではなく、既存の仕組みに相乗りする形。
                      </p>
                      <Code>{`-- 既存のlogin_idは履歴として残しつつ、新しいlogin_idを自動採番に置き換える
alter table public.patients rename column login_id to login_id_legacy;
alter table public.patients drop constraint if exists patients_login_id_key;

alter table public.patients
  add column login_id text generated always as ('BU' || lpad(seq_no::text, 6, '0')) stored;
alter table public.patients
  add constraint patients_login_id_key unique (login_id);`}</Code>
                      <p className="bg-amber-50 border border-amber-200 text-amber-700 text-xs px-4 py-2.5 rounded-xl">
                        <strong>重要：</strong>このSQLを実行すると、<strong>既存の患者様全員のログインIDが新しい値（BU000001〜）に変わる</strong>（パスワードは変わらない）。既存のログインIDは<code className="bg-white px-1.5 py-0.5 rounded text-xs">login_id_legacy</code>列に残るので確認・切り戻しの参考にできるが、実際のログインには使えなくなる。実行前に、影響を受ける患者様への新しいIDの案内が必要。
                      </p>
                      <p>
                        生成列はINSERT/UPDATE時に明示的な値を渡すとPostgresがエラーにするため、<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">/api/admin/patients</code>・<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">/api/join/[slug]</code>のどちらも<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">login_id</code>を一切渡さずINSERTし、返ってきた行から採番結果を読む。新しい登録経路を追加する場合もこのパターンを踏襲すること。
                      </p>
                    </>
                  ),
                },
                {
                  label: "7. 患者様メール文面のカスタマイズ",
                  content: (
                    <>
                      <p>
                        得意先ごとに患者様向けメール（初回登録メール・パスワード変更メール）の文面をカスタマイズできる機能。BGJ得意先詳細の「メール設定」タブ（<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">src/components/ClinicEmailTemplatesManager.tsx</code>）から編集・プレビューし、実際の送信まで実装済み。
                      </p>
                      <Code>{`create table public.clinic_email_templates (
  customer_code           text primary key references public.clinics (customer_code) on delete cascade,
  sender_name             text,
  welcome_subject         text,
  welcome_body            text,
  password_reset_subject  text,
  password_reset_body     text,
  updated_at              timestamptz not null default now()
);`}</Code>
                      <p>
                        未設定（null）の項目は<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">src/lib/email/templates.ts</code>の共通デフォルト文面を使う。件名・本文には<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">{`{{患者名}}`}</code>・<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">{`{{ログインID}}`}</code>・<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">{`{{医院名}}`}</code>・<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">{`{{リンク}}`}</code>のプレースホルダを使え、<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">renderEmailTemplate()</code>で実際の値に置換する。DBからカスタム文面を取得して置換まで行う共通ロジックは<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">src/lib/email/resolveClinicEmail.ts</code>（サーバー専用）。
                      </p>
                      <p>
                        <strong>送信方式：</strong>GoogleWorkSpaceの<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">jyosys@biogaia.jp</code>のアプリパスワードでSMTP認証し、<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">nodemailer</code>で送信する（<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">src/lib/email/sendEmail.ts</code>、新規の有料サービス契約は不要）。<strong>実際のメールアドレス自体は得意先ごとに変えず、共通のエイリアス1つ（<code className="bg-white px-1.5 py-0.5 rounded text-xs">no-reply@biogaia.jp</code>）に固定し、差出人表示名（<code className="bg-white px-1.5 py-0.5 rounded text-xs">sender_name</code>）だけを得意先ごとに変える</strong>設計にしている（実アドレスを得意先の数だけ用意するのはWorkSpace管理上非現実的なため）。環境変数：<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">WORKSPACE_SMTP_USER</code>・<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">WORKSPACE_SMTP_APP_PASSWORD</code>・<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">WORKSPACE_SENDER_ALIAS</code>。
                      </p>
                      <p>
                        メール送信が失敗しても登録・パスワード再設定処理自体は失敗させない（<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">try/catch</code>で囲みログのみ）。患者様は発行済みのログインIDで通常どおりログインできるため。
                      </p>
                    </>
                  ),
                },
                {
                  label: "8. ワンクリックログイン・パスワード再設定",
                  content: (
                    <>
                      <p>
                        患者様のQR自己登録（<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">/join/[slug]</code>系）でメールアドレスが必須項目になった（<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">patients.email</code>列、admin/patientsの手動発行では引き続き収集していない）。登録完了時に「初回登録メール」が届き、本文のリンクから<strong>パスワード入力なしでそのままログイン完了</strong>できる。
                      </p>
                      <Code>{`create table public.patient_login_tokens (
  id          uuid primary key default gen_random_uuid(),
  patient_id  uuid not null references public.patients (id) on delete cascade,
  token_hash  text not null,
  purpose     text not null check (purpose in ('first_login', 'password_reset')),
  expires_at  timestamptz not null,
  used_at     timestamptz,
  created_at  timestamptz not null default now(),
  unique (token_hash)
);`}</Code>
                      <p>
                        トークンは30分間有効・使い捨て（<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">src/lib/auth/loginToken.ts</code>）。平文はDBに保存せずSHA-256でハッシュ化してから保存する（パスワードと違い高エントロピーな値のため低速ハッシュは不要）。NextAuthに専用の認証方式<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">patient-magiclink</code>（<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">src/auth.ts</code>）を追加し、リンク先<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">/join/verify?token=...</code>でトークンを検証してログイン状態にする。
                      </p>
                      <p>
                        同じトークンの仕組みで「パスワードをお忘れの方」（<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">/forgot-password</code> → <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">/api/password-reset/request</code> → メール → <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">/reset-password</code> → <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">/api/password-reset/confirm</code>）も実装済み。メールアドレスが登録されているかどうかに関わらず常に同じレスポンスを返し、登録有無を外部から探索されないようにしている。
                      </p>
                      <p>
                        <strong>乱用対策：</strong>認証不要の公開APIのため、同一患者・同一用途のトークン再発行に3分のクールダウンを設けている（<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">hasRecentLoginToken()</code>。第三者による実在アドレスへのメール爆撃を抑止。クールダウン中も外からは成功時と同じレスポンスに見える）。また<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">patients.email</code>には部分uniqueインデックス（null複数可）があり、同じアドレスでの二重登録は409で拒否する（重複するとパスワード再設定時の患者特定が不能になるため）。
                      </p>
                      <p>
                        <strong>レスポンス速度：</strong>SMTP送信は数秒かかることがあるため、メール送信は<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">next/server</code>の<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">after()</code>でレスポンス送信後に実行する（登録・リセット要求のAPI応答をブロックしない）。送信失敗はログのみでリトライしない。
                      </p>
                      <p className="bg-amber-50 border border-amber-200 text-amber-700 text-xs px-4 py-2.5 rounded-xl">
                        <strong>ハマりどころ：</strong>新しい公開ページ・APIを追加したので、今回も<code className="bg-white px-1.5 py-0.5 rounded text-xs">src/proxy.ts</code>の許可リストに<code className="bg-white px-1.5 py-0.5 rounded text-xs">/forgot-password</code>・<code className="bg-white px-1.5 py-0.5 rounded text-xs">/reset-password</code>・<code className="bg-white px-1.5 py-0.5 rounded text-xs">/api/password-reset</code>を追加済み（<code className="bg-white px-1.5 py-0.5 rounded text-xs">/join/verify</code>は既存の<code className="bg-white px-1.5 py-0.5 rounded text-xs">/join/</code>許可で自動的にカバーされる）。
                      </p>
                    </>
                  ),
                },
                {
                  label: "9. テストとCI",
                  content: (
                    <>
                      <p className="bg-violet-50 border border-violet-200 text-violet-800 text-xs px-4 py-2.5 rounded-xl">
                        <strong>方針：新しい機能・コンポーネント・APIルートを作成するときは、必ず同時にテストケースも作成する。</strong>
                        「あとでまとめて書く」は行わず、実装とテストを同じコミット（または同じ作業単位）に含める。既存機能の修正時も、修正した箇所にテストが無ければ追加する。
                      </p>
                      <p>
                        テスト基盤は<strong>Vitest + React Testing Library + jsdom</strong>（<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">vitest.config.ts</code> / <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">vitest.setup.ts</code>）。テストファイルはテスト対象と同じディレクトリに<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">◯◯.test.ts</code>（UIは<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">.test.tsx</code>）の名前で置く。
                      </p>
                      <Code>{`npm run test               # 全テストを実行
npx vitest run <ファイルパス>  # 特定のテストだけ実行`}</Code>
                      <p className="font-bold text-slate-800 mt-1">書き方の雛形（既存テストを参照）</p>
                      <ul className="list-disc list-inside pl-2">
                        <li><strong>純粋関数</strong>：そのままimportして入出力を検証（<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">src/lib/patientNav.test.ts</code>）。</li>
                        <li><strong>サーバー専用モジュール</strong>：ファイル先頭に<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">{`// @vitest-environment node`}</code>を書く（<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">src/lib/auth/loginToken.test.ts</code>）。</li>
                        <li><strong>APIルート</strong>：<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">@/auth</code>と<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">@/lib/supabase/server</code>を<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">vi.mock</code>し、ハンドラ関数を直接呼ぶ（<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">src/app/api/admin/clinic-staff/[id]/route.test.ts</code>が雛形）。<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">after()</code>を使うルートは<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">next/server</code>をmockしてコールバックを溜めて明示実行する（<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">src/app/api/join/[slug]/route.test.ts</code>が雛形）。</li>
                        <li><strong>UIコンポーネント</strong>：<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">render()</code>して表示・クリック時のコールバックを検証（<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">src/components/PatientSidebarNav.test.tsx</code>が雛形）。fetchするコンポーネントは<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">global.fetch</code>を<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">vi.stubGlobal</code>でmockする。</li>
                      </ul>
                      <p className="font-bold text-slate-800 mt-1">CI（自動実行）</p>
                      <p>
                        GitHub Actions（<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">.github/workflows/ci.yml</code>）で、push / pull_request のたびに lint・型チェック・テストが自動実行される。ローカルでもコミット前に<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">npm run lint</code>・<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">npx tsc --noEmit</code>・<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">npm run test</code>を通すこと。
                      </p>
                    </>
                  ),
                },
              ]}
            />
          </Card>
        </div>
      )}

      {tab === "利用マニュアル" && (
        <Card className="p-5">
          <SubTabs
            items={[
              {
                label: "BGJ社内の皆様へ",
                activeClassName: "bg-violet-600 text-white shadow-sm",
                content: (
                  <>
                    <Steps title="ログインのしかた">
                      <li>「ポータルを選択」の画面で「BGJポータル」を選びます。</li>
                      <li>お使いの <span className="font-semibold">@biogaia.jp</span> のGoogleアカウントでログインしてください。</li>
                    </Steps>
                    <Steps title="医院様（クリニック）を新しく登録する">
                      <li>サイドバーの「得意先一覧」を開きます。</li>
                      <li>新規登録ボタンから、医院名・エリア・得意先コードなどの基本情報を入力します。</li>
                      <li>担当の営業担当者を割り当てます（未登録の場合は先に「マスタ」から営業担当者を追加してください）。</li>
                    </Steps>
                    <Steps title="医院様用のログインを発行する">
                      <li>「得意先一覧」から対象の医院を開きます。</li>
                      <li>「ログイン管理」タブを開き、ログインID・初期パスワードを発行します。</li>
                      <li>発行したログインID・パスワードを、医院様にお伝えください（医院様はこの情報で医院用ポータルにログインします）。</li>
                      <li>パスワードを再設定したい場合や、ログインを無効化したい場合も同じ画面から行えます。</li>
                    </Steps>
                    <Steps title="営業担当者・役職・担当エリアを管理する">
                      <li>サイドバーの「マスタ」配下から、それぞれの追加・編集・削除ができます。</li>
                      <li>営業担当者には顔写真（画像URL）・役職・担当エリアを設定できます。</li>
                    </Steps>
                    <Steps title="医院様に代わって表示名・背景画像を設定する（サポート対応）">
                      <li>「得意先一覧」→対象医院→「基本情報」タブに、ポータル表示名・患者様ポータルの背景画像URLの入力欄があります。</li>
                      <li>同じタブに、患者様向けの診療時間・アクセス情報（住所・最寄駅・駐車場など）の入力欄もあります。</li>
                      <li>通常は医院様ご自身で設定していただく項目ですが、お問い合わせがあった場合はこちらから代理で設定できます。</li>
                    </Steps>
                    <Steps title="医院様に代わってクリニック紹介・Q&amp;Aを編集する（サポート対応）">
                      <li>「得意先一覧」→対象医院→「クリニック紹介」タブで、スタッフ紹介の追加・編集・削除・並び替えができます。</li>
                      <li>「Q&amp;A」タブで、質問・回答の追加・編集・削除・並び替えができます。</li>
                      <li>いずれも医院様ご自身で編集いただける項目ですが、お問い合わせがあった場合はこちらから代理で編集できます。</li>
                    </Steps>
                    <Steps title="患者様向けメールの文面を得意先ごとにカスタマイズする">
                      <li>「得意先一覧」→対象医院→「メール設定」タブを開きます。</li>
                      <li>初回登録メール・パスワード変更メールそれぞれの差出人表示名・件名・本文を編集できます（未設定の項目は共通の標準文面が使われます）。</li>
                      <li>本文には「患者名」「ログインID」「医院名」「リンク」の差し込み項目（二重波かっこで囲む）が使えます。プレビューで実際の見え方を確認してから保存してください。</li>
                    </Steps>
                    <Steps title="システムの状態を確認する（システム管理）">
                      <li>サイドバーの「システム管理」→「DB管理」で、データベースの使用容量・テーブルごとの内訳を確認できます。</li>
                      <li>「システム管理」→「アプリ管理」で、連携している外部サービスの一覧と、環境変数の設定漏れがないかを確認できます（設定値そのものは表示されません）。同じ画面の「エラー監視状況」欄に、Sentryで検知した未解決エラーの一覧（直近14日・頻度順）が表示されます。詳しく調べたい場合は欄内のリンクからSentry本体を開いてください。</li>
                    </Steps>
                  </>
                ),
              },
              {
                label: "医院様へ",
                activeClassName: "bg-teal-600 text-white shadow-sm",
                content: (
                  <>
                    <p className="text-sm text-slate-600">
                      いつも当ポータルをご利用いただきありがとうございます。医院用ポータルでは、患者様IDの発行や歯周病診断の登録、ポータルの表示設定を行っていただけます。
                    </p>
                    <Steps title="ログインのしかた">
                      <li>「ポータルを選択」の画面で「医院用ポータル」を選びます。</li>
                      <li>バイオガイア担当者よりお伝えしたログインID・パスワードを入力してください。</li>
                    </Steps>
                    <Steps title="患者様のIDを発行する">
                      <li>サイドバーの「患者様管理」を開きます。</li>
                      <li>「＋患者IDを発行」から、患者様のお名前・初期パスワードを入力して登録します（ログインIDは全クリニック共通の連番で自動的に発行され、手入力はできません）。</li>
                      <li>発行された患者番号・ログインID・パスワードを、患者様にお渡しください。</li>
                    </Steps>
                    <Steps title="歯周病の診断結果を登録する">
                      <li>「患者様管理」から対象の患者様の「詳細」を開きます。</li>
                      <li>「＋新規診断を記録」から、ステージ（1〜4）とグレード（A〜C）を選んで登録します。</li>
                      <li>登録した内容は、患者様ポータルの「サプリメントの受け取り」画面にすぐ反映されます。</li>
                    </Steps>
                    <Steps title="患者様からの見え方を確認する">
                      <li>「患者様管理」の一覧から、確認したい患者様の行にある「患者ポータルをプレビュー」を押します。</li>
                      <li>新しいタブで、その患者様として見た場合の画面が開きます（実際にログインするわけではありません）。</li>
                    </Steps>
                    <Steps title="医院の基本情報・取引条件を確認する">
                      <li>サイドバーの「クリニック情報」→「医院契約情報」を開きます。</li>
                      <li>基本情報と取引条件が左右に並んで表示されます（この画面は確認のみで、変更はバイオガイア担当者へのお問い合わせが必要です）。</li>
                    </Steps>
                    <Steps title="医院の表示名・背景画像を設定する">
                      <li>サイドバーの「クリニック情報」→「医院設定情報」を開きます。</li>
                      <li>「ブランディング設定」に、ポータルに表示したい名称や、患者様ポータルのログイン画面に使いたい背景画像のURLを入力し、「保存する」を押します。</li>
                      <li>未入力のままにしておくと、標準の名称・背景画像がそのまま使われますので、必須ではありません。</li>
                    </Steps>
                    <Steps title="患者様ポータルのメニュー表示を選ぶ">
                      <li>「医院設定情報」の「患者ポータルの表示設定」で、クリニック紹介・診療情報・サプリメントの受け取り・定期購入・おすすめ商品・Q&amp;Aの表示/非表示をチェックボックスで選べます（「ホーム」は常に表示されます）。</li>
                      <li>チェックを外した項目は、患者様のメニューに表示されなくなります（少なくとも1つは表示のままにする必要があります）。</li>
                      <li>選び終えたら「保存する」を押してください。</li>
                    </Steps>
                    <Steps title="歯周病の表示を切り替える">
                      <li>「医院設定情報」の「歯周病表示」で、歯周病の診断結果を患者様ポータルに表示するかどうかを選べます。</li>
                      <li>オフにすると、患者様ポータルの「サプリメントの受け取り」画面から歯周病の診断結果が消え、患者様管理の詳細画面でも新規診断の入力ができなくなります（登録済みの履歴は残ります）。</li>
                      <li>選び終えたら「保存する」を押してください。</li>
                    </Steps>
                    <Steps title="クリニック紹介のスタッフ紹介を編集する">
                      <li>サイドバーの「クリニック紹介」を開きます。</li>
                      <li>「＋スタッフを追加」から、役職（タブ名）・氏名・資格経歴・紹介文・顔写真の画像URLを入力して登録します。</li>
                      <li>上下の矢印ボタンで、患者様ポータルに表示される順番を並び替えられます。診療時間・アクセス情報もこの画面から設定できます。</li>
                    </Steps>
                    <Steps title="Q&amp;Aを編集する">
                      <li>サイドバーの「Q &amp; A」を開きます。</li>
                      <li>「＋Q&amp;Aを追加」から、カテゴリ・質問・回答を入力して登録します。ステータスを「下書き」にすると患者様ポータルには表示されません。</li>
                      <li>患者様ポータルのカテゴリタブは、ここで登録したカテゴリから自動的に作られます。</li>
                    </Steps>
                    <div className="bg-slate-50 rounded-xl px-4 py-3 text-xs text-slate-500">
                      ログインID・パスワードがご不明な場合や再発行をご希望の場合は、バイオガイア担当者までお問い合わせください。基本情報・取引条件（医院契約情報）の変更は、バイオガイア担当者までご連絡ください。
                    </div>
                  </>
                ),
              },
              {
                label: "患者様へ",
                activeClassName: "bg-sky-600 text-white shadow-sm",
                content: (
                  <>
                    <p className="text-sm text-slate-600">
                      患者様ポータルでは、通院先の医院で登録された歯周病の診断結果を、いつでもご確認いただけます。
                    </p>
                    <Steps title="ログインのしかた">
                      <li>患者様ポータルのトップページを開きます。</li>
                      <li>通院先の医院からお渡しされたログインID・パスワードを入力し、「ログイン」を押してください。</li>
                    </Steps>
                    <Steps title="パスワードをお忘れの場合">
                      <li>ログイン画面の「パスワードをお忘れの方」から、ご登録のメールアドレスを入力してください（QRコードで自己登録された方のみご利用いただけます）。</li>
                      <li>再設定用のリンクが記載されたメールが届きますので、リンク先で新しいパスワードを設定してください（30分間有効）。</li>
                    </Steps>
                    <Steps title="診断結果を確認する">
                      <li>ログイン後、「サプリメントの受け取り」を開きます。</li>
                      <li>歯周病の状態（ステージ・グレード）と、その内容の説明が表示されます。</li>
                      <li>まだ診断が登録されていない場合は、次回ご来院時に医院にてご確認ください。</li>
                    </Steps>
                    <div className="bg-slate-50 rounded-xl px-4 py-3 text-xs text-slate-500">
                      一度ログインいただくと、次回からはログイン画面にも通院先医院に合わせた表示が出るようになります。メールアドレスをご登録でない場合（医院での窓口発行）のパスワード再設定は、通院先の医院までお問い合わせください。
                    </div>
                  </>
                ),
              },
              {
                label: "患者様のQR自己登録（新機能）",
                activeClassName: "bg-slate-700 text-white shadow-sm",
                content: (
                  <>
                    <p className="text-sm text-slate-600">
                      患者様ご自身のスマホで、QRコードと受付PINを使ってポータル登録できる機能です。BGJ・医院様どちらの画面からでも発行・確認ができます。
                    </p>
                    <SubTabs
                      items={[
                        {
                          label: "QR・受付PINの発行",
                          content: (
                            <>
                              <Steps title="BGJポータルから発行する">
                                <li>「得意先一覧」→対象の医院を開き、「接続情報」タブを開きます。</li>
                                <li>右上（またはタブ内）の「PIN・QRを発行する」を押します。すでに発行済みの場合は「PIN・QRを再発行する」と表示されます。</li>
                              </Steps>
                              <Steps title="医院用ポータルから発行する">
                                <li>サイドバーの「クリニック情報」→「QR設定」を開きます。</li>
                                <li>「発行する」（再発行の場合は「PIN・QRを再発行する」）を押します。「患者様管理」の「QRで招待」ボタンからも同じ内容を確認できます。</li>
                              </Steps>
                              <div className="bg-amber-50 border border-amber-200 text-amber-700 text-xs px-4 py-2.5 rounded-xl">
                                再発行すると、それまでのQRコード・受付PINは無効になります。窓口に古いQRを貼ったままにしないよう注意してください。BGJ・医院様のどちらで発行しても、もう一方の画面を開き直せば最新のものが表示されます（自動では切り替わりません）。
                              </div>
                            </>
                          ),
                        },
                        {
                          label: "患者様のスマホでの登録",
                          content: (
                            <Steps title="患者様ご自身での登録手順">
                              <li>窓口に掲示されたQRコードを、ご自身のスマホのカメラで読み取ります。</li>
                              <li>開いた画面で、窓口でお伝えした受付PINを入力します。</li>
                              <li>お名前・メールアドレス・パスワードを入力し、「登録する」を押すと完了です。</li>
                              <li>完了画面に、その場で発行された「あなたのログインID」（BU＋6桁の数字）が表示されます。次回以降のログインに必要なので必ず控えてください。</li>
                              <li>ご登録のメールアドレス宛にも登録完了メールが届きます。<strong>本文のリンクをクリックすると、パスワード入力なしでそのままログインできます</strong>（30分間有効）。</li>
                              <li>次回以降は、通常どおり発行されたログインIDと設定したパスワードでもログインできます。</li>
                            </Steps>
                          ),
                        },
                        {
                          label: "PDFで保存する",
                          content: (
                            <Steps title="QR・PINをPDFにして保存・印刷する">
                              <li>「接続情報」タブ、または「QR設定」画面の「PDFをダウンロード」を押します。</li>
                              <li>QRコード・受付PIN・発行日時をまとめた1枚のPDFがダウンロードされます。</li>
                              <li>印刷して窓口に掲示する際にお使いください。再発行するたびに新しいPDFを作り直してください（古いPDFのQRは無効になります）。</li>
                            </Steps>
                          ),
                        },
                      ]}
                    />
                  </>
                ),
              },
              {
                label: "全体の流れ（参考）",
                content: (
                  <>
                    <p>1. BGJが医院様を登録し、得意先コード（例：A000001）を発行します。</p>
                    <p>2. BGJが、その医院様用のログインを発行します。</p>
                    <p>3. 医院様が医院用ポータルにログインし、患者様のIDを発行します（ご自身の得意先コードに自動的に紐づきます）。</p>
                    <p>4. 患者様が、発行されたIDでログインし、ご自身の診断結果を確認します。</p>
                  </>
                ),
              },
            ]}
          />
        </Card>
      )}
    </div>
  );
}
