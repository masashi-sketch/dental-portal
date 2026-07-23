import { Code, SubTabs, WithImage } from "./manualComponents";

export type ProcedureStep = { key: string; label: string; content: React.ReactNode };

export const procedureSteps: ProcedureStep[] = [
  {
    key: "0",
    label: "0. 全体構成",
    content: (
      <SubTabs
        items={[
          {
            label: "3ポータル構成",
            content: (
              <ul className="list-disc list-inside pl-2">
                <li><strong>患者様ポータル</strong>（<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">/</code>, <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">/home</code>, <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">/medication</code>など）：患者様がご自身の診断結果等を確認する画面。</li>
                <li><strong>医院用ポータル</strong>（<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">/admin/*</code>）：医院スタッフが患者様ID発行・診断登録・表示設定を行う画面。</li>
                <li><strong>BGJポータル</strong>（<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">/bgj/*</code>）：バイオガイア社員が得意先・営業マスタ・システムを管理する画面。</li>
              </ul>
            ),
          },
          {
            label: "認証",
            content: (
              <>
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
              </>
            ),
          },
          {
            label: "データベース",
            content: (
              <p>
                テーブル定義は<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">supabase/schema.sql</code>が唯一のDB定義書。全テーブルで<strong>RLS有効・ポリシーなし</strong>（anon/authenticatedキーからは一切読み書き不可）とし、アクセスは必ずサーバー側の<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">service_role</code>キー経由のAPIルートを介す。ブラウザに秘密鍵は一切出さない。列は<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">select(&apos;*&apos;)</code>禁止で、<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">src/lib/supabase/types.ts</code>の列指定定数を使う。
              </p>
            ),
          },
          {
            label: "エラー監視",
            content: (
              <WithImage image={{ src: "/manual/bgj-system-apps.png", alt: "システム管理・アプリ管理画面。Sentry未解決issue一覧欄" }}>
                <p>
                  <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">@sentry/nextjs</code>導入済み。<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">NEXT_PUBLIC_SENTRY_DSN</code>が未設定の間は自動的に無効化され何も送信されない。メール等の個人情報は<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">src/lib/sentryScrub.ts</code>でマスクしている。
                  BGJポータルの「システム管理」→「アプリ管理」画面には、Sentry API（Auth Token方式）経由で未解決issue一覧を表示する機能もある（<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">src/app/api/bgj/system/sentry-issues/route.ts</code>）。<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">SENTRY_AUTH_TOKEN</code>（scope: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">project:read</code>・<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">event:read</code>）が未設定の間はエラーにせず「未設定」表示になる。組織スラッグ・プロジェクトIDはDSNから判明する非秘密情報のためコード内に定数として埋め込んでいる。
                </p>
              </WithImage>
            ),
          },
          {
            label: "開発環境",
            content: (
              <Code>{`npm run dev    # 開発サーバー（--webpack固定。Turbopackは日本語パスでクラッシュするため）
npm run lint   # ESLint
npx tsc --noEmit  # 型チェック
npm run test   # ユニットテスト（Vitest）
npm run build  # 本番ビルド`}</Code>
            ),
          },
        ]}
      />
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
        <WithImage image={{ src: "/manual/join-signup-mobile.png", alt: "患者様のスマホでの登録画面（/join/[signup_slug]/mobile）" }}>
          <p>
            患者様がご自身のスマホでポータル登録できるようにする機能。<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">clinic_patient_settings</code>に以下のカラムを追加している（未適用の環境ではSupabase SQL Editorで実行すること）。
          </p>
        </WithImage>
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
        <WithImage image={{ src: "/manual/bgj-customer-email-tab.png", alt: "得意先詳細画面のメール設定タブ" }}>
          <p>
            得意先ごとに患者様向けメール（初回登録メール・パスワード変更メール）の文面をカスタマイズできる機能。BGJ得意先詳細の「メール設定」タブ（<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">src/components/ClinicEmailTemplatesManager.tsx</code>）から編集・プレビューし、実際の送信まで実装済み。
          </p>
        </WithImage>
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
        <SubTabs
          items={[
            {
              label: "概要・DB",
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
                  <WithImage image={{ src: "/manual/forgot-password-form.png", alt: "パスワード再設定の申請画面（/forgot-password）" }}>
                    <p>
                      同じトークンの仕組みで「パスワードをお忘れの方」（<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">/forgot-password</code> → <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">/api/password-reset/request</code> → メール → <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">/reset-password</code> → <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">/api/password-reset/confirm</code>）も実装済み。メールアドレスが登録されているかどうかに関わらず常に同じレスポンスを返し、登録有無を外部から探索されないようにしている。
                    </p>
                  </WithImage>
                </>
              ),
            },
            {
              label: "セキュリティ設計",
              content: (
                <>
                  <p>
                    <strong>乱用対策：</strong>認証不要の公開APIのため、同一患者・同一用途のトークン再発行に3分のクールダウンを設けている（<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">hasRecentLoginToken()</code>。第三者による実在アドレスへのメール爆撃を抑止。クールダウン中も外からは成功時と同じレスポンスに見える）。また<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">patients.email</code>には部分uniqueインデックス（null複数可）があり、同じアドレスでの二重登録は409で拒否する（重複するとパスワード再設定時の患者特定が不能になるため）。
                  </p>
                  <p>
                    <strong>レスポンス速度：</strong>SMTP送信は数秒かかることがあるため、メール送信は<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">next/server</code>の<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">after()</code>でレスポンス送信後に実行する（登録・リセット要求のAPI応答をブロックしない）。送信失敗はログのみでリトライしない。
                  </p>
                </>
              ),
            },
          ]}
        />
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
      <SubTabs
        items={[
          {
            label: "概要・DB",
            content: (
              <>
                <WithImage image={{ src: "/manual/admin-inquiry.png", alt: "医院用ポータルの問い合わせ送信画面" }}>
                  <p>
                    医院用ポータル（<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">/admin/inquiry</code>）から送信された問い合わせを、Slackへ<strong>一方向のIncoming Webhook通知</strong>として送る機能。BGJ職員はSlack通知内のリンクからBGJポータルの専用画面（<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">/bgj/inquiries/[id]</code>）へ遷移して返信する。Slack上での返信をアプリ側へ自動的に取り込む仕組みは持たない（Bot Token・Events APIは使わない、意図的にシンプルな設計）。
                  </p>
                </WithImage>
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
              </>
            ),
          },
          {
            label: "Slack設定手順",
            content: (
              <WithImage image={{ src: "/manual/bgj-system-settings.png", alt: "共通マスタ画面。Slack Incoming Webhook URLの設定欄" }}>
                <p>
                  <strong>Slack側の準備（外部作業）：</strong>対象チャンネルで「アプリを追加」→「Incoming Webhooks」を検索して追加するか、<a href="https://api.slack.com/apps" target="_blank" rel="noreferrer" className="text-violet-600 underline">api.slack.com/apps</a>で新規App作成→Incoming Webhooks機能を有効化してチャンネルを選び、Webhook URL（<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">https://hooks.slack.com/services/...</code>）を発行する。発行したURLはBGJポータルの「システム管理 &gt; 共通マスタ」（<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">/bgj/system/settings</code>）に貼り付けて保存する。
                </p>
                <p>
                  <strong>担当営業のメンション：</strong><code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">sales_reps.slack_user_id</code>（BGJポータル「マスタ &gt; 営業担当」で編集）にSlackのメンバーidを設定すると、その営業担当が割り当てられている得意先からの問い合わせ通知で<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">{`<@USER_ID>`}</code>形式でメンションされる。未設定の担当者は氏名のみ表示される。
                </p>
              </WithImage>
            ),
          },
          {
            label: "実装の流れ",
            content: (
              <>
                <p>
                  <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">POST /api/admin/inquiries</code>（clinicロール限定、自分のcustomerCodeに固定して登録）→<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">src/lib/slack/postWebhookMessage.ts</code>でWebhook送信（医院名・担当者・問い合わせ内容・返信URLを含む）。Slack送信はベストエフォートで、失敗しても問い合わせ自体の登録は成功として扱う（送信成功時のみ<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">slack_notified_at</code>を記録）。返信は<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">POST /api/bgj/inquiries/[id]/replies</code>で保存し、初回返信時に自動的にステータスを「未対応」→「対応中」に更新する。
                </p>
                <p>
                  訪問記録と問い合わせは、得意先詳細画面の「行動履歴」タブ（旧「訪問記録」タブを改称）で日付降順の1つのフィードとして統合表示される（<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">src/components/ClinicActivityFeed.tsx</code>）。
                </p>
              </>
            ),
          },
        ]}
      />
    ),
  },
  {
    key: "11",
    label: "11. お知らせ機能",
    content: (
      <>
        <WithImage image={{ src: "/manual/admin-news.png", alt: "お知らせ管理画面。日付・タグ・内容の入力フォームと登録済み一覧" }}>
          <p>
            医院用ポータル「お知らせ管理」（<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">/admin/news</code>）は元々見た目だけのモック（ローカルstateのみ、DB未連携・患者ポータル未反映）だったが、<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">clinic_qa</code>（Q&amp;A機能）と同じ設計で実データ連携する機能として実装した。医院が入力したお知らせは、患者ポータルのホーム画面（デスクトップ・モバイル両方）に表示される。
          </p>
        </WithImage>
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
        <WithImage image={{ src: "/manual/bgj-master-staff.png", alt: "営業担当マスタ画面。カード表示から一覧（テーブル）表示に変更後" }}>
          <ul className="list-disc list-inside pl-2">
            <li>「マスタ &gt; 営業担当」をカード表示から一覧（テーブル）表示に変更（氏名・役職・担当エリア・電話・メール・Slack連携有無・得意先数・今月売上・操作）。</li>
            <li>「マスタ &gt; 担当エリア」を自由入力から都道府県セレクトに変更（1エリア＝1都道府県、<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">src/lib/prefectures.ts</code>のPREFECTURESから選択。<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">staff_areas.name</code>にもCHECK制約を追加）。</li>
            <li>サイドバーの「マスタ」「システム管理」配下を枠・背景で囲んでグループとして視認しやすくした（常時展開のまま、開閉式にはしていない）。見出しラベルの視認性も強化。</li>
            <li>新設「マスタ &gt; LINKマスタ」：医院用ポータルのサイドバー「LINKS」欄（従来ハードコード3件）を、BGJが表示名称・リンクURLを自由に追加・編集・削除できるようにした（下記コード後の画像参照）。</li>
          </ul>
        </WithImage>
        <Code>{`create table public.bgj_external_links (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  url text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);`}</Code>
        <WithImage image={{ src: "/manual/bgj-master-links.png", alt: "LINKマスタ画面。表示名称とリンクURLの一覧、追加ボタン" }}>
          <p>
            <strong>実装の流れ：</strong><code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">/api/bgj/external-links</code>（GET/POST）・<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">/[id]</code>（PATCH/DELETE）で、GETのみBGJ限定にせず任意の認証済みセッションに開放している（医院用ポータルの<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">AdminSidebar.tsx</code>から参照するため）。書き込み（POST/PATCH/DELETE）は<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">requireBgjSession</code>必須で、医院用ポータル側は表示のみ（編集不可）という制約を守っている。
          </p>
        </WithImage>
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
        <WithImage image={{ src: "/manual/bgj-master-statuses.png", alt: "得意先ステータスマスタ画面。ステータス名とバッジ色の一覧" }}>
          <p>
            得意先（クリニック）の基本情報「ステータス」（活性/休眠/解約リスク）を、<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">clinics.status</code>のtext列＋CHECK制約によるハードコードから、営業担当マスタ（<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">sales_reps.role_id</code>→<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">staff_roles</code>）と同じFKパターンでBGJが追加・編集・削除できるマスタに変更した。
          </p>
        </WithImage>
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
        <WithImage image={{ src: "/manual/bgj-system-dashboard.png", alt: "システムダッシュボード画面。得意先数・アカウント数・セキュリティ状況・DB容量のKPI" }}>
          <p>
            BGJポータル「システム管理」配下に、システム運用状況を1画面で把握できる「システムダッシュボード」（<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">/bgj/system/dashboard</code>）を新設した。既存の「ダッシュボード」（<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">/bgj/dashboard</code>、営業観点のKPI・現状ダミーデータ）とは目的が異なる別画面で、こちらは実データのみを表示する。
          </p>
          <p>
            表示するKPI：得意先数（ステータス別内訳含む）、医院アカウント数（有効件数・ロック中件数）、患者アカウント数（有効件数・ロック中件数・QR自己登録経由件数）、未対応の問い合わせ件数、Sentry未解決issue数、DB容量使用率。いずれもPostgres側で<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">count</code>集計し（<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">.select(&apos;id&apos;, {'{'} count: &apos;exact&apos;, head: true {'}'})</code>パターン）、アプリ側で行を取得してループ集計する方式は使っていない。
          </p>
        </WithImage>
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
        <WithImage image={{ src: "/manual/bgj-patients-list.png", alt: "BGJ患者一覧画面。得意先・患者番号・氏名・ログインID・ステータス等の一覧と検索欄" }}>
          <p>
            BGJポータル「マスタ &gt; 得意先一覧」の下・「営業担当」の上に、全得意先を横断した「患者一覧」（<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">/bgj/patients</code>）を新設した。想定4,000人規模のため、一覧系の一般的なlimit(500)固定取得ではなく、氏名・ログインID・患者番号での検索と<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">.range()</code>によるページネーション（1ページ50件）で取得件数を絞っている。
          </p>
        </WithImage>
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
        <SubTabs
          items={[
            {
              label: "概要・DB",
              content: (
                <>
                  <div>
                    <p>
                      医院スタッフログイン（<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">/clinic-login</code>）に、患者様と同じセルフサービスの「パスワードをお忘れの方」機能を追加した。流れは
                      <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">/clinic-forgot-password</code> → <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">/api/clinic-password-reset/request</code> → メール → <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">/clinic-reset-password</code> → <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">/api/clinic-password-reset/confirm</code>。
                      BGJ職員は得意先詳細「担当者」タブの各担当者カードから、手動でログインID発行・変更・パスワード再設定を行う。
                    </p>
                  </div>
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
                </>
              ),
            },
            {
              label: "運用変更・セキュリティ",
              content: (
                <>
                  <p>
                    <strong>前提となる運用変更：</strong><code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">clinic_users</code>にはパスワード再設定用の<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">email</code>列がある。BGJ得意先詳細「担当者」タブの担当者カード（<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">ClinicContactLoginEditor.tsx</code>）から、ログインID・状態・メール・パスワードを一元管理する。<strong>メール未登録のスタッフはセルフサービス再設定を使えない</strong>（BGJによる手動リセットは可能）。
                  </p>
                  <p>
                    <strong>セキュリティ設計は患者様版（システム手順「8」）と同一：</strong>トークンは30分有効・使い捨て・SHA-256ハッシュ保存（<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">src/lib/auth/clinicLoginToken.ts</code>。<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">loginToken.ts</code>のFK先を<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">clinic_users</code>に変えた並行モジュール）。同一スタッフへの再送は3分クールダウン。メールアドレスの登録有無に関わらず常に同じ成功レスポンスを返す（アドレス探索対策）。パスワードは8文字以上。メール送信は<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">after()</code>でレスポンス後に実行。
                  </p>
                </>
              ),
            },
            {
              label: "注意点",
              content: (
                <p>
                  <strong>メール文面：</strong>患者様向けと異なり<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">clinic_email_templates</code>（得意先ごとのカスタマイズ）の対象外で、<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">src/lib/email/templates.ts</code>の固定文面（<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">DEFAULT_CLINIC_STAFF_PASSWORD_RESET_*</code>）のみ。本文はHTML版も併送し、トークン付きの長いURLがプレーンテキストの折り返しで壊れないようにしている（<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">renderEmailTemplateHtml()</code>、実際に患者様版で発生した不具合への対策）。
                </p>
              ),
            },
          ]}
        />
        <p className="bg-amber-50 border border-amber-200 text-amber-700 text-xs px-4 py-2.5 rounded-xl">
          <strong>ハマりどころ（毎回恒例）：</strong>新しい公開ページ・APIのため、<code className="bg-white px-1.5 py-0.5 rounded text-xs">src/proxy.ts</code>の許可リストに<code className="bg-white px-1.5 py-0.5 rounded text-xs">/clinic-forgot-password</code>・<code className="bg-white px-1.5 py-0.5 rounded text-xs">/clinic-reset-password</code>・<code className="bg-white px-1.5 py-0.5 rounded text-xs">/api/clinic-password-reset</code>を追加済み。
        </p>
      </>
    ),
  },
  {
    key: "17",
    label: "17. 商品マスタと医院ごとの表示設定",
    content: (
      <>
        <SubTabs
          items={[
            {
              label: "概要・画面構成",
              content: (
                <>
                  <WithImage image={{ src: "/manual/bgj-master-products-list.png", alt: "BGJポータル商品マスタ画面。商品の一覧・追加ボタン" }}>
                    <p>
                      患者ポータル「おすすめ商品」（<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">/shop</code>・<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">/shop/[id]</code>）を静的ダミーデータから実データに切り替えた（Shopify連携ロードマップのPhase 1）。構成は「<strong>BGJが商品マスタを管理 → 各医院が自院の患者ポータルへの表示有無を決定 → 患者ポータルに反映</strong>」。
                    </p>
                    <ul className="list-disc list-inside pl-2">
                      <li><strong>BGJポータル「マスタ &gt; 商品マスタ」</strong>（<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">/bgj/master/products</code>）：商品の登録・編集・削除。基本情報（名称・カテゴリ・基準価格・画像・バッジ等）、詳細ページ項目、先生のおすすめを管理する。「公開」ステータスのみ患者ポータルに掲載される。</li>
                      <li><strong>医院用ポータル「商品管理」</strong>（<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">/admin/products</code>）：商品写真、医院通常価格、3ヶ月価格、6ヶ月価格、契約仕切値、BGJ基準価格を確認し、患者表示と価格を編集する。通常購入は医院通常価格、定期購入は選択期間の価格を患者ポータルへ表示する。</li>
                    </ul>
                  </WithImage>
                  <Code>{`create table public.products (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  category      text not null check (category in ('お口と喉のケア','赤ちゃん・キッズ','抵抗力サポート','胃腸のサポート','ペット向け')),
  description   text, price int not null, unit text,
  image_type    text not null default 'supplement'
    check (image_type in ('supplement','yogurt','toothbrush','oral')),
  badge text, badge_color text
    check (badge_color in ('indigo','rose','amber','emerald','sky','slate')),
  subscription_available boolean not null default false,
  volume text, ingredients text, how_to_use text, caution text,
  working_point text, daily_amount text,
  recommendation_level text check (recommendation_level in ('◎','○')),
  doctor_comment text,
  status text not null default '下書き' check (status in ('公開','下書き')),
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.clinic_product_settings (
  customer_code text not null references public.clinics (customer_code) on delete cascade,
  product_id    uuid not null references public.products (id) on delete cascade,
  is_visible    boolean not null default true,
  clinic_price  integer check (clinic_price is null or clinic_price >= 0),
  subscription_3_month_price integer check (subscription_3_month_price is null or subscription_3_month_price >= 0),
  subscription_6_month_price integer check (subscription_6_month_price is null or subscription_6_month_price >= 0),
  updated_at    timestamptz not null default now(),
  primary key (customer_code, product_id)
);`}</Code>
                </>
              ),
            },
            {
              label: "デフォルト表示の設計",
              content: (
                <WithImage image={{ src: "/manual/patient-subscription.png", alt: "患者ポータルの定期購入画面。医院が設定した3ヶ月・6ヶ月価格を商品ごとに表示" }}>
                  <p>
                    <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">clinic_product_settings</code>に行が無い商品は「表示」かつ医院通常価格＝基準価格として扱う。3ヶ月・6ヶ月価格がNULLなら医院通常価格を使用する。仕切値は<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">products.price × clinic_terms.wholesale_rate ÷ 100</code>を1円単位で四捨五入して都度算出し、第3正規形を保つため保存しない。
                  </p>
                </WithImage>
              ),
            },
            {
              label: "API構成",
              content: (
                <>
                  <p>
                    <strong>API構成：</strong>BGJ用<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">/api/bgj/products</code>（全ハンドラ<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">requireBgjSession</code>）、医院用<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">/api/admin/product-settings</code>（GETは公開商品＋自院設定のマージ、PATCHはclinicロール限定のupsert）、患者用<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">/api/patient-portal/products</code>（公開商品から非表示分を除外した一覧のみ）。<strong>患者用APIは意図的に一覧のみで単品取得パラメータを持たない</strong>（詳細ページも一覧からfindするため、非表示・非公開の商品は直接URLアクセスでも自動的に「見つかりません」になり、認可の抜け道ができない）。
                  </p>
                  <p>
                    商品画像は<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">image_url</code>（実ファイル、手順19参照）を医院の商品管理、患者の商品一覧・詳細・定期購入へ共通表示する。未設定の場合は<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">image_type</code>のグラデーションへフォールバックする。注文時には<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">image_url_snapshot</code>へ保存し、後のマスタ変更から過去注文表示を守る。
                  </p>
                </>
              ),
            },
          ]}
        />
        <p className="bg-amber-50 border border-amber-200 text-amber-700 text-xs px-4 py-2.5 rounded-xl">
          <strong>外部連携待ち：</strong>Shopify同期・決済・定期購入契約の確定/変更/解約、医院別の先生コメント編集。商品画像・定期購入の商品表示・患者注文と受け取り進捗は、後述の手順19・18まで実データ化済み。
        </p>
      </>
    ),
  },
  {
    key: "18",
    label: "18. 患者注文・受け取り進捗（外部連携前）",
    content: (
      <>
        <WithImage image={{ src: "/manual/admin-orders.png", alt: "医院用ポータルの受け取り注文登録画面。患者・商品・数量・受け取り方法の選択フォームと進捗タブ" }}>
          <p>
            Shopify・Salesforceの接続仕様確定を待たずに完成できる部分として、医院が患者の受け取り注文を登録し、患者ポータルへ進捗を反映する内部基盤を実装した。医院用<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">/admin/orders</code>の固定患者・固定商品は廃止済み。
          </p>
          <ul className="list-disc list-inside pl-2">
            <li><strong>医院：</strong>実患者・自院で表示中の公開商品・数量・受け取り方法を指定し、医院受け取りなら医院、配送なら患者の登録済み送り先を選んで注文登録する。注文は受付済み→準備中→準備完了/配送中→完了へ更新する。</li>
            <li><strong>患者：</strong><code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">/medication</code>で本人（スタッフの場合は検証済みプレビュー患者）の複数送り先を管理し、注文商品・受け取り方法・進捗を表示する。</li>
            <li><strong>BGJ：</strong><code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">/bgj/orders?view=received</code>で全医院の患者注文を横断表示し、業務状態・連携元・同期状態・得意先コード・外部注文IDで絞り込む。「＋ 新規受注」から医院・既存患者・複数商品を選択し、医院受け取りまたは配送先付き自宅配送を代理登録できる。</li>
            <li><strong>定期購入申込：</strong>患者は3ヶ月／6ヶ月、医院受け取り／自宅配送、送り先を選んで申込する。BGJは<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">/bgj/orders?view=subscriptions</code>で受付中申込を承認・却下する。承認はShopify連携準備の確認であり、契約・決済・実受注ではない。</li>
            <li><strong>将来連携：</strong><code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">source</code>・<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">external_order_id</code>・<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">sync_status</code>を正規化注文モデルへ変換し、内部登録とShopify注文を同じ画面に統合する。</li>
          </ul>
        </WithImage>
        <p>
          注文明細は商品マスタへの参照に加えて、名称・医院通常価格・単位・画像種別・画像URL・用量・内容量・注意事項を注文時点のスナップショットとして保存する。商品マスタや医院通常価格を後日変更しても過去注文の表示・金額は変わらない。
        </p>
        <p>
          注文登録はDB関数<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">create_internal_patient_order</code>で注文ヘッダーと明細を1トランザクションとして作成する。画面が生成する<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">idempotency_key</code>は失敗・再試行中も維持し、同じ通信が再送されても既存注文IDを返すため二重登録されない。Shopify webhookの重複配信にも同じ設計を流用する。
        </p>
        <p>
          医院・BGJの登録は共通DB関数<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">create_portal_patient_order</code>を使用する。JSONは複数明細の入力境界だけで、保存先は第3正規形の<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">patient_orders</code>・<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">patient_order_items</code>・<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">delivery_destinations</code>・<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">order_delivery_destinations</code>・<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">patient_order_events</code>に分離する。医院・患者は複数送り先を持てる。注文には選択したマスタIDと注文時点の住所を1注文1行の履歴事実として保存するため、後日の変更や論理削除でも過去表示は変わらない。進行中の注文が参照する送り先の論理削除はDBで拒否する。患者の医院所属・有効状態、商品の公開状態・医院表示設定、数量、重複商品、送り先の所有者をDBでも再検証し、登録経路と操作者を監査履歴へ残す。
        </p>
        <p>
          BGJ受注一覧API<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">/api/bgj/orders</code>はBGJ権限限定・50件ページングで、DB行を<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">OrderIntegrationRecord</code>（<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">schemaVersion: 1</code>）へ変換して返す。画面や将来の外部アダプターがSupabaseの行構造へ直接依存しない境界として維持する。
        </p>
        <p className="bg-amber-50 border border-amber-200 text-amber-700 text-xs px-4 py-2.5 rounded-xl">
          <strong>未実装：</strong>決済・在庫確定・定期課金・Shopify webhook・Salesforce同期。画面だけ成功に見せる仮処理は作らず、外部仕様確定後にアダプターとして追加する。
        </p>
      </>
    ),
  },
  {
    key: "19",
    label: "19. 商品画像アップロード（Supabase Storage）",
    content: (
      <>
        <WithImage image={{ src: "/manual/bgj-master-products-modal.png", alt: "商品追加モーダルの商品画像アップロード欄（Choose Fileボタン）" }}>
          <p>
            商品マスタ（手順17）にSupabase Storageへの実画像アップロード機能を追加した。<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">products.image_url</code>が設定されている商品は共通コンポーネント<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">ProductVisual.tsx</code>が実画像を表示し、未設定の商品は従来通り<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">image_type</code>のグラデーション表示にフォールバックする。
          </p>
        </WithImage>
        <ul className="list-disc list-inside pl-2">
          <li><strong>バケット：</strong><code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">product-images</code>（public、5MB上限、jpeg/png/webp/gifのみ許可をバケット設定にも二重で設定）。このプロジェクトでSupabase Storageを使うのはこれが最初。</li>
          <li><strong>アップロードAPI：</strong><code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">/api/bgj/products/upload-image</code>（<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">requireBgjSession</code>限定）。<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">FormData</code>で受け取ったファイルをMIME・サイズ検証後、<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">crypto.randomUUID()</code>で採番したファイル名でservice_roleキーによりアップロードし、公開URLを返す。</li>
          <li><strong>保存の流れ：</strong>BGJの商品追加・編集モーダルでファイルを選択すると即アップロードして公開URLをフォームstateに保持し、他フィールドと一緒に既存の<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">POST/PATCH /api/bgj/products</code>で保存する（新規商品もID発行前にアップロードできるよう、商品IDに依存しない設計）。</li>
        </ul>
        <p>
          <strong>セキュリティ設計：</strong><code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">storage.objects</code>にはRLSポリシーを一切定義しない。読み取りはpublicバケットのpublicエンドポイントで完結し、書き込みは上記APIのservice_roleキー経由のみに限定される（DBの「RLS有効・ポリシーなし・service_roleキー経由のみ」という既存方針をStorageにも踏襲したもの。商品写真自体は非機密の販促用コンテンツのため読み取りのみ意図的に公開にしている）。
        </p>
        <p className="bg-amber-50 border border-amber-200 text-amber-700 text-xs px-4 py-2.5 rounded-xl">
          <strong>既知の制約：</strong>画像差し替え・商品削除時に旧Storageオブジェクトの自動削除は行わない（意図的なスコープ外）。
        </p>
      </>
    ),
  },
  {
    key: "20",
    label: "20. BGJダッシュボード・レポートの実データ化",
    content: (
      <SubTabs
        items={[
          {
            label: "概要（KPI一覧）",
            content: (
              <WithImage image={{ src: "/manual/bgj-dashboard.png", alt: "BGJダッシュボード画面。総得意先数・今月売上・要フォロー件数・月次売上推移・要フォローアラート一覧" }}>
                <p>
                  <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">/bgj/dashboard</code>・<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">/bgj/reports</code>のKPI・アラート・売上推移・担当別／エリア別集計・ランキングは、全て固定配列だった。<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">get_admin_overview</code>と同じ設計規約（<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">security definer</code>＋service_role限定）の新規RPC<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">get_bgj_dashboard_overview</code>・<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">get_bgj_sales_report</code>に置き換えた。
                </p>
                <ul className="list-disc list-inside pl-2">
                  <li><strong>ダッシュボード：</strong>総得意先数・今月売上・要フォロー件数・休眠リスク件数、要フォローアラート一覧、直近6ヶ月の月次売上推移（全体＋担当者別）、直近注文5件、当月ランキング上位5件。</li>
                  <li><strong>レポート：</strong>対象期間の売上合計・月平均・総注文件数・平均注文単価・前年比、月次推移、担当別（得意先数・当月売上・当月訪問数・1得意先あたり売上）、エリア別、上位得意先TOP5。</li>
                </ul>
              </WithImage>
            ),
          },
          {
            label: "アラート閾値・集計期間の自己管理",
            content: (
              <WithImage image={{ src: "/manual/bgj-system-settings.png", alt: "共通マスタ画面。ダッシュボード・レポート設定（要フォロー閾値・休眠閾値・レポート集計期間）" }}>
                <p>
                  「何日未注文で要フォローとするか」を架空の固定日数にせず、BGJが自己管理できる設定値にした（<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">/bgj/system/settings</code>）。<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">app_settings</code>に4列追加：
                </p>
                <ul className="list-disc list-inside pl-2">
                  <li><code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">dashboard_followup_days</code>（既定60）：この日数以上未注文で「要フォロー」。</li>
                  <li><code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">dashboard_dormant_days</code>（既定90）：この日数以上未注文で「休眠・解約リスク」。要フォロー閾値より大きい値というDB制約あり。</li>
                  <li><code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">dashboard_include_never_ordered</code>（既定true）：1件も注文が無い得意先を、契約開始日（<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">contract_since</code>）起点の経過日数でアラート対象に含めるか。</li>
                  <li><code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">report_period_months</code>（既定6、1〜24）：レポート画面の集計対象月数（現在月を含む直近Nヶ月のローリング窓）。</li>
                </ul>
                <p>
                  旧固定データにあった「30日で軽微アラート」という3段階目は、上記2閾値（medium/high）に対応しない項目のため廃止し、2段階＋「担当未割当」フラグ（日数条件と独立に必ず付与）に単純化した。
                </p>
              </WithImage>
            ),
          },
          {
            label: "月次売上推移グラフの担当者別内訳",
            content: (
              <WithImage image={{ src: "/manual/bgj-dashboard.png", alt: "BGJダッシュボード画面の月次売上推移グラフ" }}>
                <p>
                  担当者数が増えても破綻しないよう、直接描画する系列は当該期間の合計値降順で上位4名までに制限し、残りは「その他」1本に合算する（<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">MonthlySalesChart.tsx</code>の<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">buildMonthlySalesChartData</code>）。色の割り当ては選ばれた上位4名の中で<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">staffId</code>の昇順に固定し、他の担当者の実績変動で色が入れ替わらないようにしている。
                </p>
              </WithImage>
            ),
          },
          {
            label: "CSV出力",
            content: (
              <WithImage image={{ src: "/manual/bgj-reports.png", alt: "売上レポート画面。CSV出力ボタンと月次推移タブ" }}>
                <p>
                  <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">/bgj/reports</code>のCSV出力ボタン（旧実装は<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">onClick</code>未接続のダミー）を接続した。新規サーバーエンドポイントは作らず、<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">src/lib/csv.ts</code>（RFC4180エスケープ＋UTF-8 BOM付与）でクライアント側の取得済みJSONから生成し、現在選択中のタブのテーブルをそのままエクスポートする。
                </p>
              </WithImage>
            ),
          },
        ]}
      />
    ),
  },
  {
    key: "21",
    label: "21. ウェビナー Phase 1",
    content: (
      <>
        <p>BGJがGoogle Meet／Zoomの参加URLを対象医院へ公開する第一段階。外部APIの認証・会議自動作成はまだ行わない。</p>
        <ul className="list-disc list-inside pl-2">
          <li><strong>BGJ：</strong><code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">/bgj/webinars</code>で下書き作成・編集・公開・中止と対象医院を管理する。</li>
          <li><strong>医院：</strong><code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">/admin/webinars</code>で、自院が対象の公開中ウェビナーだけを確認して外部参加URLを開く。</li>
          <li><strong>DB：</strong><code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">webinars</code>・<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">webinar_sessions</code>・<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">webinar_target_clinics</code>・<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">webinar_events</code>に第3正規形で分離する。保存・状態遷移はDB関数でトランザクション化し、versionで更新競合を検出する。</li>
          <li><strong>通知：</strong>公開確定後、「ウェビナー・メール」が有効な医院担当者へ既存Workspace SMTPで送る。設定がない医院のみ有効な医院ログインのメールへフォールバックする。画面レスポンスを待たせないため<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">after()</code>を使い、送信失敗で公開自体は取り消さない。</li>
          <li><strong>次段階：</strong>Google Calendar／Meet APIとZoom Server-to-Server OAuthをAdapterで接続する。登録者・Webhook・出席・録画情報はその後に追加する。</li>
        </ul>
      </>
    ),
  },
  {
    key: "22",
    label: "22. 医院担当者管理",
    content: (
      <>
        <p>医院代表情報・医院ログイン・患者向けスタッフ紹介とは別に、業務連絡担当者を医院ごとに複数管理する。</p>
        <ul className="list-disc list-inside pl-2">
          <li><strong>画面：</strong>BGJの<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">/bgj/contacts</code>で全医院を横断検索し、得意先・役職・担当者名・担当内容別に絞り込む。得意先詳細「担当者」タブと医院用<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">/admin/clinic-info/contacts</code>は共通編集コンポーネントを使用し、医院ログインは自院スコープへ固定する。</li>
          <li><strong>DB：</strong><code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">clinic_contacts</code>・<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">clinic_contact_notification_preferences</code>・<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">clinic_contact_events</code>へ第3正規形で分離する。</li>
          <li><strong>整合性：</strong>主担当は医院ごとに最大1人、医院内の有効な担当者メールと医院ログイン関連は重複不可。保存・主担当切替・通知設定・履歴はDB関数で1トランザクションにする。</li>
          <li><strong>削除：</strong>物理削除せず<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">deleted_at</code>を設定し、操作履歴を保持する。</li>
          <li><strong>通知：</strong>ウェビナーは担当者設定を優先し、未設定医院だけ従来の医院ログインメールへフォールバックする。</li>
        </ul>
      </>
    ),
  },
];
