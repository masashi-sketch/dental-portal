"use client";

import { useState } from "react";

const TABS = ["導入手順", "利用手順"] as const;
type Tab = (typeof TABS)[number];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      <h2 className="text-sm font-bold text-slate-700 mb-3">{title}</h2>
      <div className="text-sm text-slate-700 leading-relaxed flex flex-col gap-2">{children}</div>
    </div>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="block bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-mono text-xs text-slate-700 whitespace-pre-wrap break-all">
      {children}
    </code>
  );
}

export default function ManualPage() {
  const [tab, setTab] = useState<Tab>("導入手順");

  return (
    <div className="p-4 sm:p-6 max-w-3xl">
      <header className="mb-5">
        <h1 className="text-xl font-bold text-slate-800">マニュアル</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          このポータルの導入手順・利用手順をまとめています。仕様を変更したときは、このページも一緒に更新してください。
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

      {tab === "導入手順" && (
        <div className="flex flex-col gap-4">
          <Section title="1. Supabaseプロジェクトの準備">
            <p>1. <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-violet-600 underline">supabase.com</a> でプロジェクトを新規作成する。</p>
            <p>2. SQL Editorで <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">supabase/schema.sql</code>（リポジトリ内）を実行し、テーブル一式を作成する。</p>
            <p>3. Project Settings → API から以下を控える。</p>
            <ul className="list-disc list-inside pl-2">
              <li><code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">Project URL</code></li>
              <li><code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">service_role key</code></li>
              <li><code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">anon / public key</code></li>
              <li>JWT Settings → <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">Legacy JWT Secret</code></li>
            </ul>
          </Section>

          <Section title="2. 環境変数の設定（ローカル・本番の両方に必要）">
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
            <p>環境変数を追加・変更した後は、再デプロイ（下記4.）しないと反映されない。</p>
          </Section>

          <Section title="3. Google OAuth設定（BGJ社員用ログイン）">
            <p>Google Cloud ConsoleでOAuthクライアントを作成し、<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">GOOGLE_CLIENT_ID</code> / <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">GOOGLE_CLIENT_SECRET</code>を発行する。</p>
            <p>ログインは <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">@biogaia.jp</code> ドメインのアカウントのみ許可される（<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">src/auth.ts</code>で制限）。医院スタッフ・患者様はこのログインを使わない（下記「利用手順」参照）。</p>
          </Section>

          <Section title="4. デプロイ">
            <Code>{`git push origin main   # コミット・push
vercel --prod          # 本番デプロイ`}</Code>
            <p>デプロイ後は本番URLで実際に各ポータルにログインし、マスタ一覧（営業担当・役職・エリア・得意先）が正しく表示されることを確認する。</p>
          </Section>
        </div>
      )}

      {tab === "利用手順" && (
        <div className="flex flex-col gap-4">
          <Section title="BGJポータル（バイオガイア社員用）">
            <p><strong>ログイン方法：</strong>「ポータルを選択」画面 → BGJポータル → Googleアカウント（@biogaia.jp）でログイン。</p>
            <ul className="list-disc list-inside pl-2">
              <li><strong>得意先一覧：</strong>クリニック（医院）の新規登録・基本情報や経営情報の編集・担当営業の割当。</li>
              <li><strong>マスタ：</strong>営業担当者・役職・担当エリアの追加・編集・削除。</li>
              <li><strong>ログイン管理（得意先詳細の「ログイン管理」タブ）：</strong>医院スタッフ用のログインID・パスワードを発行する。ここで発行した情報を医院側に渡す。</li>
              <li><strong>基本情報タブのブランディング欄：</strong>医院に代わってポータル表示名・患者ポータル背景画像を設定することもできる（通常は医院自身が設定）。</li>
            </ul>
          </Section>

          <Section title="医院用ポータル（クリニックスタッフ用）">
            <p><strong>ログイン方法：</strong>「ポータルを選択」画面 → 医院用ポータル → BGJが発行したログインID・パスワードでログイン（<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">/clinic-login</code>）。</p>
            <ul className="list-disc list-inside pl-2">
              <li><strong>患者様管理：</strong>患者IDの発行（初期パスワードを設定）、歯周病診断（ステージ・グレード）の登録。</li>
              <li><strong>患者ポータルをプレビュー：</strong>患者様管理の各行から、その患者として患者様ポータルの見え方を確認できる。</li>
              <li><strong>医院設定：</strong>自院のポータル表示名・患者ポータルログイン画面の背景画像URLを設定できる（未設定なら標準表示）。取引条件（BGJ設定分）の確認もここ。</li>
            </ul>
          </Section>

          <Section title="患者様ポータル">
            <p><strong>ログイン方法：</strong>トップページ（<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">/</code>）で、医院から発行されたログインID・パスワードを入力。</p>
            <ul className="list-disc list-inside pl-2">
              <li><strong>お薬の受け取り：</strong>医院で登録された歯周病診断結果（ステージ・グレードと説明文）を確認できる。</li>
              <li>2回目以降のログイン画面では、自分の医院の表示名・背景画像が自動的に表示される（初回ログイン時に記憶される）。</li>
            </ul>
          </Section>

          <Section title="得意先コード・ログインの関係（全体像）">
            <p>1. BGJが得意先（クリニック）を登録し、得意先コード（例：A000001）を発行する。</p>
            <p>2. BGJが、その得意先に紐づく医院スタッフ用ログインを発行する。</p>
            <p>3. 医院スタッフが医院用ポータルにログインし、患者IDを発行する（自院の得意先コードに自動で紐づく）。</p>
            <p>4. 患者様が、発行された患者IDでログインし、自分の医院の診断結果を確認する。</p>
          </Section>
        </div>
      )}
    </div>
  );
}
