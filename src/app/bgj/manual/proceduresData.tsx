import { Code } from "./manualComponents";

export type ProcedureStep = { key: string; label: string; content: React.ReactNode };

export const procedureSteps: ProcedureStep[] = [
  {
    key: "0",
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
    key: "1",
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
    key: "2",
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
    key: "3",
    label: "3. Google OAuth",
    content: (
      <>
        <p>Google Cloud ConsoleでOAuthクライアントを作成し、<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">GOOGLE_CLIENT_ID</code> / <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">GOOGLE_CLIENT_SECRET</code>を発行する。</p>
        <p>ログインは <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">@biogaia.jp</code> ドメインのアカウントのみ許可される（<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">src/auth.ts</code>で制限）。医院スタッフ・患者様はこのログインを使わない（「利用マニュアル」参照）。</p>
      </>
    ),
  },
  {
    key: "4",
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
    key: "5",
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
    key: "6",
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
    key: "7",
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
    key: "8",
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
    key: "9",
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
  {
    key: "10",
    label: "10. クリニック問い合わせ→Slack連携",
    content: (
      <>
        <p>
          医院用ポータル（<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">/admin/inquiry</code>）から送信された問い合わせを、Slackへ<strong>一方向のIncoming Webhook通知</strong>として送る機能。BGJ職員はSlack通知内のリンクからBGJポータルの専用画面（<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">/bgj/inquiries/[id]</code>）へ遷移して返信する。Slack上での返信をアプリ側へ自動的に取り込む仕組みは持たない（Bot Token・Events APIは使わない、意図的にシンプルな設計）。
        </p>
        <Code>{`create table public.app_settings (
  id smallint primary key default 1 check (id = 1),
  slack_webhook_url text,
  updated_by text,
  updated_at timestamptz not null default now()
);

create table public.clinic_inquiries (
  id uuid primary key default gen_random_uuid(),
  customer_code text not null references public.clinics (customer_code) on delete cascade,
  subject text not null,
  body text not null,
  status text not null default '未対応' check (status in ('未対応','対応中','完了')),
  created_by text,
  slack_notified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.clinic_inquiry_replies (
  id uuid primary key default gen_random_uuid(),
  inquiry_id uuid not null references public.clinic_inquiries (id) on delete cascade,
  author_name text,
  author_email text,
  body text not null,
  created_at timestamptz not null default now()
);`}</Code>
        <p>
          <strong>Slack側の準備（外部作業）：</strong>対象チャンネルで「アプリを追加」→「Incoming Webhooks」を検索して追加するか、<a href="https://api.slack.com/apps" target="_blank" rel="noreferrer" className="text-violet-600 underline">api.slack.com/apps</a>で新規App作成→Incoming Webhooks機能を有効化してチャンネルを選び、Webhook URL（<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">https://hooks.slack.com/services/...</code>）を発行する。発行したURLはBGJポータルの「システム管理 &gt; 共通マスタ」（<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">/bgj/system/settings</code>）に貼り付けて保存する。
        </p>
        <p>
          <strong>担当営業のメンション：</strong><code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">sales_reps.slack_user_id</code>（BGJポータル「マスタ &gt; 営業担当」で編集）にSlackのメンバーidを設定すると、その営業担当が割り当てられている得意先からの問い合わせ通知で<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">{`<@USER_ID>`}</code>形式でメンションされる。未設定の担当者は氏名のみ表示される。
        </p>
        <p>
          <strong>実装の流れ：</strong><code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">POST /api/admin/inquiries</code>（clinicロール限定、自分のcustomerCodeに固定して登録）→<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">src/lib/slack/postWebhookMessage.ts</code>でWebhook送信（医院名・担当者・問い合わせ内容・返信URLを含む）。Slack送信はベストエフォートで、失敗しても問い合わせ自体の登録は成功として扱う（送信成功時のみ<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">slack_notified_at</code>を記録）。返信は<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">POST /api/bgj/inquiries/[id]/replies</code>で保存し、初回返信時に自動的にステータスを「未対応」→「対応中」に更新する。
        </p>
        <p>
          訪問記録と問い合わせは、得意先詳細画面の「行動履歴」タブ（旧「訪問記録」タブを改称）で日付降順の1つのフィードとして統合表示される（<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">src/components/ClinicActivityFeed.tsx</code>）。
        </p>
      </>
    ),
  },
  {
    key: "11",
    label: "11. お知らせ機能",
    content: (
      <>
        <p>
          医院用ポータル「お知らせ管理」（<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">/admin/news</code>）は元々見た目だけのモック（ローカルstateのみ、DB未連携・患者ポータル未反映）だったが、<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">clinic_qa</code>（Q&amp;A機能）と同じ設計で実データ連携する機能として実装した。医院が入力したお知らせは、患者ポータルのホーム画面（デスクトップ・モバイル両方）に表示される。
        </p>
        <Code>{`create table public.clinic_announcements (
  id uuid primary key default gen_random_uuid(),
  customer_code text not null references public.clinics (customer_code) on delete cascade,
  announcement_date date not null default current_date,
  tag text not null default 'お知らせ' check (tag in ('重要','お知らせ','キャンペーン')),
  text text not null,
  status text not null default '公開' check (status in ('公開','下書き')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);`}</Code>
        <p>
          Q&amp;A機能と異なり<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">sort_order</code>による手動並び替えは持たず、<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">announcement_date</code>の新しい順に自動表示する。
        </p>
        <p>
          <strong>実装の流れ：</strong><code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">/api/admin/clinic-announcements</code>（GET/POST）・<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">/[id]</code>（PATCH/DELETE）が管理用CRUD（<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">resolveScopedCustomerCode</code>で医院は自院固定・BGJは代理編集）、<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">/api/patient-portal/announcements</code>が患者ポータル向けの公開read専用API（<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">status=&apos;公開&apos;</code>のみ返す）。共有コンポーネント<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">src/components/ClinicAnnouncementManager.tsx</code>を医院用ポータルとBGJポータル（得意先詳細「お知らせ」タブ、代理編集）の両方から使う。
        </p>
        <p className="bg-amber-50 border border-amber-200 text-amber-700 text-xs px-4 py-2.5 rounded-xl">
          患者ポータルのホーム画面はお知らせ取得に失敗しても欄ごと非表示になり、ホーム画面の他の機能（メニューカード等）には影響しない設計にしている。
        </p>
      </>
    ),
  },
  {
    key: "12",
    label: "12. BGJポータル使い勝手改善（マスタ一覧化・LINKマスタ）",
    content: (
      <>
        <p>
          BGJポータルの運用改善として、以下5点をまとめて実施した。
        </p>
        <ul className="list-disc list-inside pl-2">
          <li>「マスタ &gt; 営業担当」をカード表示から一覧（テーブル）表示に変更（氏名・役職・担当エリア・電話・メール・Slack連携有無・得意先数・今月売上・操作）。</li>
          <li>「マスタ &gt; 担当エリア」を自由入力から都道府県セレクトに変更（1エリア＝1都道府県、<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">src/lib/prefectures.ts</code>のPREFECTURESから選択。<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">staff_areas.name</code>にもCHECK制約を追加）。</li>
          <li>サイドバーの「マスタ」「システム管理」配下を枠・背景で囲んでグループとして視認しやすくした（常時展開のまま、開閉式にはしていない）。見出しラベルの視認性も強化。</li>
          <li>新設「マスタ &gt; LINKマスタ」：医院用ポータルのサイドバー「LINKS」欄（従来ハードコード3件）を、BGJが表示名称・リンクURLを自由に追加・編集・削除できるようにした。</li>
        </ul>
        <Code>{`create table public.bgj_external_links (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  url text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);`}</Code>
        <p>
          <strong>実装の流れ：</strong><code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">/api/bgj/external-links</code>（GET/POST）・<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">/[id]</code>（PATCH/DELETE）で、GETのみBGJ限定にせず任意の認証済みセッションに開放している（医院用ポータルの<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">AdminSidebar.tsx</code>から参照するため）。書き込み（POST/PATCH/DELETE）は<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">requireBgjSession</code>必須で、医院用ポータル側は表示のみ（編集不可）という制約を守っている。
        </p>
        <p className="bg-amber-50 border border-amber-200 text-amber-700 text-xs px-4 py-2.5 rounded-xl">
          現在は開発中のため、担当エリアの都道府県制約導入にあたって既存データの移行は行っていない。本番運用開始前に、登録済みのエリア名が47都道府県名と一致しているか要確認。
        </p>
      </>
    ),
  },
  {
    key: "13",
    label: "13. 得意先ステータスのマスタ化",
    content: (
      <>
        <p>
          得意先（クリニック）の基本情報「ステータス」（活性/休眠/解約リスク）を、<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">clinics.status</code>のtext列＋CHECK制約によるハードコードから、営業担当マスタ（<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">sales_reps.role_id</code>→<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">staff_roles</code>）と同じFKパターンでBGJが追加・編集・削除できるマスタに変更した。
        </p>
        <Code>{`create table public.clinic_statuses (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  color      text not null default 'slate'
    check (color in ('emerald','amber','red','sky','violet','slate')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.clinics
  add column status_id uuid references public.clinic_statuses (id) on delete set null;`}</Code>
        <p>
          <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">status_id</code>は<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">staff_reps.role_id</code>/<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">area_id</code>と同じくnullable・on delete set nullで、マスタ側の項目が削除されても得意先データ自体は消えず「未設定」に戻るだけにしている。バッジ色（<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">color</code>列）もマスタに持たせ、BGJが新しいステータスを追加した際に色も選べるようにした。Tailwindの動的クラス名生成を避けるため色は固定6色（emerald/amber/red/sky/violet/slate）のCHECK制約とし、<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">src/lib/clinicStatusColors.ts</code>で静的なクラス名マップに変換している（ステータスマスタ管理画面・得意先一覧・得意先詳細の3箇所で共通利用）。
        </p>
        <p>
          <strong>実装の流れ：</strong><code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">/api/bgj/clinic-statuses</code>（GET/POST、<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">requireBgjSession</code>必須）・<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">/[id]</code>（PATCH/DELETE）は<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">staff-roles</code>と同型。既存の<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">/api/bgj/clinics</code>系は、<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">sales_reps</code>→<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">staff_roles</code>/<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">staff_areas</code>の結合と同じMapベースパターンで<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">clinic_statuses</code>を結合するよう更新した。管理画面は「マスタ &gt; 得意先一覧」配下の「ステータス」（サイドバーの折りたたみ子項目）から開く。
        </p>
      </>
    ),
  },
  {
    key: "14",
    label: "14. システムダッシュボード",
    content: (
      <>
        <p>
          BGJポータル「システム管理」配下に、システム運用状況を1画面で把握できる「システムダッシュボード」（<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">/bgj/system/dashboard</code>）を新設した。既存の「ダッシュボード」（<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">/bgj/dashboard</code>、営業観点のKPI・現状ダミーデータ）とは目的が異なる別画面で、こちらは実データのみを表示する。
        </p>
        <p>
          表示するKPI：得意先数（ステータス別内訳含む）、医院アカウント数（有効件数・ロック中件数）、患者アカウント数（有効件数・ロック中件数・QR自己登録経由件数）、未対応の問い合わせ件数、Sentry未解決issue数、DB容量使用率。いずれもPostgres側で<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">count</code>集計し（<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">.select(&apos;id&apos;, {'{'} count: &apos;exact&apos;, head: true {'}'})</code>パターン）、アプリ側で行を取得してループ集計する方式は使っていない。
        </p>
        <p>
          「流入元」（アクセス解析）は、ページビュー・リファラーを記録する仕組みが現状無く新規計装が必要なためスコープ外とした（新規導入する場合はVercel Analytics導入等を別途検討する）。
        </p>
        <p>
          <strong>実装の流れ：</strong>新規APIルート<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">/api/bgj/system/dashboard</code>（GET、<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">requireBgjSession</code>必須）が得意先・医院アカウント・患者アカウント・問い合わせのcount集計をまとめて返す。Sentry未解決issue数・DB容量は、既存の<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">/api/bgj/system/sentry-issues</code>・<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">/api/bgj/system/db-usage</code>をページ側で個別にfetchして再利用し、Sentry API呼び出し・環境変数未設定時のフォールバックロジックを重複実装しないようにしている。サイドバーは「システム管理」グループの先頭に配置した。
        </p>
      </>
    ),
  },
  {
    key: "15",
    label: "15. BGJ患者一覧",
    content: (
      <>
        <p>
          BGJポータル「マスタ &gt; 得意先一覧」の下・「営業担当」の上に、全得意先を横断した「患者一覧」（<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">/bgj/patients</code>）を新設した。想定4,000人規模のため、一覧系の一般的なlimit(500)固定取得ではなく、氏名・ログインID・患者番号での検索と<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">.range()</code>によるページネーション（1ページ50件）で取得件数を絞っている。
        </p>
        <p>
          表示項目：得意先コード・医院名、患者番号、氏名、ログインID（現在発行されている連番BU+6桁）、メールアドレス、ステータス、登録日、アカウントロック状態。行の「詳細へ」リンクは既存の医院用ポータル<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">/admin/patients/[id]</code>（患者詳細・歯周病診断入力画面）をそのまま代理閲覧・編集先として使う。新規にBGJ専用の詳細画面は作らず、既存資産を再利用している。
        </p>
        <p>
          <strong>実装の流れ：</strong>新規APIルート<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">/api/bgj/patients</code>（GET、<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">requireBgjSession</code>必須）が検索・ページネーション済みの<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">patients</code>を取得し、含まれる得意先コードの集合だけで<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">clinics</code>を<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">.in()</code>で一括取得してMapで医院名を結合する（既存の<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">/api/bgj/clinics</code>と同じMapベースの結合パターン）。列指定は新設の<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">PATIENT_BGJ_LIST_COLUMNS</code>（<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">PATIENT_PUBLIC_COLUMNS</code>にロック状態表示用の<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">locked_until</code>を追加したもの、パスワードハッシュは含めない）。
        </p>
        <p>
          <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">/admin/patients/[id]</code>は元々クリニックログインのセッション（<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">session.user.customerCode</code>）に依存する箇所が1つあり、BGJ職員のセッションには<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">customerCode</code>が無いため歯周病診断のオン/オフ設定取得が動かなかった。取得済みの患者データの<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">customer_code</code>を使うよう修正し、クリニック・BGJどちらのセッションでも動くようにした。周辺の権限チェック（<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">isPatientInScope</code>等）は元々BGJ職員を常に許可する設計だったため変更不要だった。
        </p>
      </>
    ),
  },
  {
    key: "16",
    label: "16. 医院スタッフのパスワードリセット",
    content: (
      <>
        <p>
          医院スタッフログイン（<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">/clinic-login</code>）に、患者様と同じセルフサービスの「パスワードをお忘れの方」機能を追加した。流れは
          <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">/clinic-forgot-password</code> → <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">/api/clinic-password-reset/request</code> → メール → <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">/clinic-reset-password</code> → <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">/api/clinic-password-reset/confirm</code>。
          従来どおりBGJ職員が得意先詳細「ログイン設定」タブから手動でパスワード再設定する運用も併存する（置き換えではない）。
        </p>
        <Code>{`alter table public.clinic_users add column email text;
create unique index clinic_users_email_key on public.clinic_users (email) where email is not null;

create table public.clinic_login_tokens (
  id             uuid primary key default gen_random_uuid(),
  clinic_user_id uuid not null references public.clinic_users (id) on delete cascade,
  token_hash     text not null,
  purpose        text not null check (purpose in ('password_reset')),
  expires_at     timestamptz not null,
  used_at        timestamptz,
  created_at     timestamptz not null default now(),
  unique (token_hash)
);`}</Code>
        <p>
          <strong>前提となる運用変更：</strong><code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">clinic_users</code>にはメールアドレス列が無かったため、<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">email</code>列を追加した。得意先詳細「ログイン設定」タブ（<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">src/components/ClinicLoginManager.tsx</code>）で、新規発行時のメールアドレス入力と、既存ログインへの後付け登録・編集ができる。<strong>メール未登録のスタッフはこの機能を使えない</strong>（従来どおりBGJによる手動リセットのみ）。
        </p>
        <p>
          <strong>セキュリティ設計は患者様版（システム手順「8」）と同一：</strong>トークンは30分有効・使い捨て・SHA-256ハッシュ保存（<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">src/lib/auth/clinicLoginToken.ts</code>。<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">loginToken.ts</code>のFK先を<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">clinic_users</code>に変えた並行モジュール）。同一スタッフへの再送は3分クールダウン。メールアドレスの登録有無に関わらず常に同じ成功レスポンスを返す（アドレス探索対策）。パスワードは8文字以上。メール送信は<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">after()</code>でレスポンス後に実行。
        </p>
        <p>
          <strong>メール文面：</strong>患者様向けと異なり<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">clinic_email_templates</code>（得意先ごとのカスタマイズ）の対象外で、<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">src/lib/email/templates.ts</code>の固定文面（<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">DEFAULT_CLINIC_STAFF_PASSWORD_RESET_*</code>）のみ。本文はHTML版も併送し、トークン付きの長いURLがプレーンテキストの折り返しで壊れないようにしている（<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">renderEmailTemplateHtml()</code>、実際に患者様版で発生した不具合への対策）。
        </p>
        <p className="bg-amber-50 border border-amber-200 text-amber-700 text-xs px-4 py-2.5 rounded-xl">
          <strong>ハマりどころ（毎回恒例）：</strong>新しい公開ページ・APIのため、<code className="bg-white px-1.5 py-0.5 rounded text-xs">src/proxy.ts</code>の許可リストに<code className="bg-white px-1.5 py-0.5 rounded text-xs">/clinic-forgot-password</code>・<code className="bg-white px-1.5 py-0.5 rounded text-xs">/clinic-reset-password</code>・<code className="bg-white px-1.5 py-0.5 rounded text-xs">/api/clinic-password-reset</code>を追加済み。
        </p>
      </>
    ),
  },
];
