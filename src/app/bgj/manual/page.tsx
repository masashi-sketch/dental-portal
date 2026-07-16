"use client";

import { useState } from "react";

const TABS = ["システム手順", "利用マニュアル"] as const;
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

function GuideCard({
  audience,
  color,
  children,
}: {
  audience: string;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className={`px-5 py-3 ${color}`}>
        <p className="text-sm font-bold text-white">{audience}</p>
      </div>
      <div className="p-5 flex flex-col gap-5">{children}</div>
    </div>
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
            <p>ログインは <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">@biogaia.jp</code> ドメインのアカウントのみ許可される（<code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">src/auth.ts</code>で制限）。医院スタッフ・患者様はこのログインを使わない（「利用マニュアル」参照）。</p>
          </Section>

          <Section title="4. デプロイ">
            <Code>{`git push origin main   # コミット・push
vercel --prod          # 本番デプロイ`}</Code>
            <p>デプロイ後は本番URLで実際に各ポータルにログインし、マスタ一覧（営業担当・役職・エリア・得意先）が正しく表示されることを確認する。</p>
          </Section>
        </div>
      )}

      {tab === "利用マニュアル" && (
        <div className="flex flex-col gap-5">
          <GuideCard audience="BGJ社内の皆様へ" color="bg-violet-600">
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
          </GuideCard>

          <GuideCard audience="医院様へ" color="bg-teal-600">
            <p className="text-sm text-slate-600">
              いつも当ポータルをご利用いただきありがとうございます。医院用ポータルでは、患者様IDの発行や歯周病診断の登録、ポータルの表示設定を行っていただけます。
            </p>
            <Steps title="ログインのしかた">
              <li>「ポータルを選択」の画面で「医院用ポータル」を選びます。</li>
              <li>バイオガイア担当者よりお伝えしたログインID・パスワードを入力してください。</li>
            </Steps>
            <Steps title="患者様のIDを発行する">
              <li>サイドバーの「患者様管理」を開きます。</li>
              <li>「＋患者IDを発行」から、患者様のお名前・ログインID・初期パスワードを入力して登録します。</li>
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
          </GuideCard>

          <GuideCard audience="患者様へ" color="bg-sky-600">
            <p className="text-sm text-slate-600">
              患者様ポータルでは、通院先の医院で登録された歯周病の診断結果を、いつでもご確認いただけます。
            </p>
            <Steps title="ログインのしかた">
              <li>患者様ポータルのトップページを開きます。</li>
              <li>通院先の医院からお渡しされたログインID・パスワードを入力し、「ログイン」を押してください。</li>
            </Steps>
            <Steps title="診断結果を確認する">
              <li>ログイン後、「サプリメントの受け取り」を開きます。</li>
              <li>歯周病の状態（ステージ・グレード）と、その内容の説明が表示されます。</li>
              <li>まだ診断が登録されていない場合は、次回ご来院時に医院にてご確認ください。</li>
            </Steps>
            <div className="bg-slate-50 rounded-xl px-4 py-3 text-xs text-slate-500">
              一度ログインいただくと、次回からはログイン画面にも通院先医院に合わせた表示が出るようになります。ログインID・パスワードをお忘れの場合は、通院先の医院までお問い合わせください。
            </div>
          </GuideCard>

          <Section title="全体の流れ（参考）">
            <p>1. BGJが医院様を登録し、得意先コード（例：A000001）を発行します。</p>
            <p>2. BGJが、その医院様用のログインを発行します。</p>
            <p>3. 医院様が医院用ポータルにログインし、患者様のIDを発行します（ご自身の得意先コードに自動的に紐づきます）。</p>
            <p>4. 患者様が、発行されたIDでログインし、ご自身の診断結果を確認します。</p>
          </Section>
        </div>
      )}
    </div>
  );
}
