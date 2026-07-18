@AGENTS.md

# Web-moc-B2B（歯科医院向けB2Bポータルモック）運用メモ

このファイルは本プロジェクト（`Web-moc-B2B`）専用の引き継ぎメモです。ユーザーが他プロジェクト（wbs-app）向けに整備した開発方針をベースに、このプロジェクトの実情（技術構成・セキュリティ方針・既存コンポーネント）に合わせて翻訳・調整したものです。親フォルダの`Web/CLAUDE.md`（技術スタック・コスト方針・デプロイ方針の共通ルール）とあわせて運用します。

## 最短チェックリスト

迷ったら、まずこの順で確認する。

1. `git status --short --branch` を見る
2. 調査依頼か実装依頼か判断する
3. Next.jsコード変更なら `node_modules/next/dist/docs/` の関連ガイドを読む（このプロジェクトのNext.jsは一般知識と異なる可能性があるため）
4. 変更は小さく、1責務に絞る
5. 必要に応じて `npm run lint` / `npx tsc --noEmit` / `npm run test` / `npm run build` を実行する（下記「自動テスト方針」参照）
6. commit / push 方針を確認する
7. デプロイは明示指示がある時だけ行う

## プロジェクト情報

- ローカルパス: `/Users/masashi/Library/CloudStorage/GoogleDrive-masashi@biogaia.jp/マイドライブ/VisualCode/Claude/Web/Web-moc/Web-moc-B2B`
- GitHub: https://github.com/masashi-sketch/dental-portal-mock（ブランチ: `main`）
- Vercelプロジェクト名: `dental-portal-mock`
- データベース: Supabase（ユーザー自身のアカウントで作成したプロジェクト。環境変数は`.env.local`に設定・`.gitignore`済み）
- 3ポータル構成：患者様ポータル（`/`, `/home`, `/medication`など）、医院用ポータル（`/admin/*`）、BGJポータル（`/bgj/*`）
- 一部機能（歯周病マスタ・患者マスタ・得意先取引条件）はSupabaseで実データ管理を開始済み。それ以外の大半はまだ静的ダミーデータの「モック」段階

# 最優先ルール

## 方針の優先順位

判断が衝突した場合は、以下の順で優先する。

1. データ保護・破壊的操作の回避
2. デプロイ禁止ルール
3. ユーザーの直近指示
4. 既存仕様・既存UIの維持
5. 保守性改善
6. レスポンス改善
7. テスト追加

## デプロイ禁止ルール

- **「実装して」「進めて」「修正して」「コミットして」はデプロイ指示ではない。**
- ユーザーが**「デプロイして」「デプロイ」**と明示した場合のみ`vercel --prod`を実行する。
- デプロイ前後は`git status --short --branch`を確認する。
- デプロイ完了後はProduction URL / Inspect URL / READY状態を報告する。
- このプロジェクトには現時点でデプロイをブロックするフック（`.claude/hooks/`等）は存在しない。フックに頼らず、この文書のルールを自分で守ること。

## コスト方針

親フォルダ`Web/CLAUDE.md`に準拠する。

- 原則、無料で開発する。
- 有料サービス・有料機能・従量課金APIを使う必要がある場合は、必ず事前にユーザーへ確認する。
- npm install、外部API、Vercel、Supabase等のネットワーク操作は、目的を明示してから実行する。

## 既存変更の保護

- 作業前後に`git status --short --branch`を確認する。
- 既存の未コミット変更がある場合、それがユーザー由来か前作業由来かを意識して壊さない。
- 破壊的操作（reset / checkout / clean / force push等）は、明示指示なしに実行しない。

## 明示指示なしにやらないこと

- デプロイ
- force push
- reset / checkout / clean
- 大規模な設計変更
- UIデザインの全面変更
- `npm audit fix --force`
- 有料サービス・外部APIの利用

# 標準作業フロー

## 調査依頼と実装依頼の区別

- 「確認して」「調べて」「評価して」は原則read-only。
- 修正・実装は、ユーザーが「直して」「実装して」「進めて」「追加して」と言った場合のみ行う。
- ただし、ドキュメント整理や明示された軽微な追記は通常作業として進めてよい。

## 作業開始時の宣言

作業前に以下を短く確認・宣言する。

- 今回触る範囲
- 触らない範囲
- 検証予定
- コミット予定の有無

## 変更時の基本手順

1. `git status --short --branch`
2. 関連ファイル確認
3. 小さく変更
4. 必要な検証を実行
5. 小さくコミット
6. 状態と次のおすすめを報告

大きな変更は一気にやらず、**小さく変更 → 検証 → commit**で進める。

## 標準検証コマンド

コード変更後は原則以下を通す。

```bash
npm run lint
npx tsc --noEmit
npm run test
npm run build
```

- `npm run build`は、このプロジェクトが動く環境によってはGoogle Fonts（`next/font/google`）のネットワーク取得に失敗し完走しないことがある。その場合は`tsc`と`npm run dev`（`--webpack`）での動作確認を主たる検証とし、その旨を必ず報告する。
- `npm run test`（Vitest）は`src/lib/auth/*.test.ts`等のユニットテストを実行する。CI・pre-commitフックでの自動実行はまだ無いため、コード変更のたびに自分で実行して確認する（下記「自動テスト方針」参照）。
- ドキュメントのみの変更では、必要に応じて検証を省略してよい。ただし省略したことを報告する。

## コミット方針

- 1コミット = 1責務。
- 動く単位・戻せる単位でコミットする。
- 移動・切り出しコミットと機能変更コミットを混ぜない。
- 例:
  - `feat: add periodontal diagnosis to medication page`
  - `refactor: extract clinic master data to src/lib/clinics.ts`
  - `fix: require customer code format on patient registration`
  - `docs: rewrite CLAUDE.md for this project`

## コミット後の報告

コミット後は以下を報告する。

- コミットID
- 変更概要
- 実行した検証
- 未実施の検証があれば理由
- 次のおすすめ

## push漏れ防止

- コミット後は必ず`git status --short --branch`を確認する。
- `ahead`が残っている場合はユーザーに報告する。
- ユーザーが「コミット」と明示していた場合は、pushまで実行する。

## コミット＝プッシュ

- ユーザーが「コミット」と明示した場合: `git commit`と`git push origin main`を**セットで実行**する。確認不要。
- 自律的にコミットした場合: pushせず、`ahead`を報告する。

## push / deploy

通常の反映順:

```bash
git push origin main
```

デプロイ指示がある場合のみ:

```bash
vercel --prod
```

# 技術・環境固有の注意

- **Next.js 16.2.7。devもbuildも必ず`--webpack`を使う**（`package.json`に設定済み）。プロジェクトパスに日本語フォルダ「マイドライブ」を含むため、標準のTurbopackはUTF-8境界処理のバグでクラッシュする。
- 認証：NextAuth v5、3種類のセッションロールがある。`role`(`'bgj' | 'clinic' | 'patient'`)・`customerCode`・`patientId`がセッションに載る（`src/auth.ts`）。
  - `bgj`：Google OAuth、`@biogaia.jp`ドメインのみ（社員用）。
  - `clinic`：`clinic-credentials`（`clinic_users`テーブル、`/clinic-login`）。自分の`customerCode`に固定。
  - `patient`：`patient-credentials`（`patients`テーブル、`/`）。自分の`patientId`/`customerCode`に固定。
- DB：Supabase。サーバー専用クライアント（`src/lib/supabase/server.ts`）のみを使用し、`@supabase/ssr`は導入しない。クライアント（ブラウザ）に秘密鍵を一切露出しない設計。患者の歯周病診断読み取りのみ、`src/lib/auth/scopedSupabaseClient.ts`経由でRLSも効くDBレベルの多層防御を追加済み。
- 残っているデモ用cookie：`portal-selected`（ポータル種別）、`demo-patient-id`（スタッフが患者ポータルをプレビューするための対象患者ID、`resolveEffectivePatientId`で検証）、`patient-last-clinic`（患者ログイン画面の表示ブランディングだけに使う非機密cookie）。`active-customer-code`（旧・BGJ職員が医院用ポータルで得意先を選択する仕組み）は廃止済み。
- **エラー監視は`@sentry/nextjs`を導入済み**（`src/instrumentation.ts` / `src/instrumentation-client.ts` / `sentry.server.config.ts` / `sentry.edge.config.ts` / `src/app/global-error.tsx`）。`.env.local`の`NEXT_PUBLIC_SENTRY_DSN`が未設定の間はSentry SDKが自動的に無効化され、何も送信されない（sentry.ioで無料プロジェクトを作成しDSNを設定すると有効化される）。`sendDefaultPii`は無効のまま（Cookie/Authorizationヘッダーは送信しない）で、`src/lib/sentryScrub.ts`のbeforeSendでメール文字列も多層防御的にマスクしている。**2026-07-18にDSNを本番設定し有効化済み**（sentry.io組織スラッグ`biogaiajp`）。あわせて`bgj/system/apps`画面にSentry APIから未解決issue一覧を取得表示する`SentryIssuesPanel`を追加した（`SENTRY_AUTH_TOKEN`、scope: `project:read`・`event:read`。未設定でもエラーにせず「未設定」表示にする設計、詳細は次のおすすめ7番参照）。
- **`rm -rf`はツール権限で一律ブロックされる**（ユーザーがチャットで承認しても解除されない）。`node_modules`等をクリーンに作り直す必要がある場合は`rm -r`（`-f`なし）を使う。このプロジェクトパスはGoogle Drive同期フォルダのため、同期ロックにより`Directory not empty`で一度失敗することがあるが、大抵は同じ`rm -r`コマンドをもう一度実行するだけで解消する（`rm -rf`を使うための回避策を探さないこと）。

# セキュリティ方針

- **新規Supabaseテーブルは`enable row level security`のみ行い、ポリシーは定義しない**（anon/authenticatedキーからは読み書き一切不可にする）。読み書きは必ずサーバー側の`service_role`キー経由のAPIルート（Route Handler）を介す。
  - これはユーザーが別プロジェクト（wbs-app）で採用している「RLSを無効化する」方針とは意図的に異なる。このプロジェクトはSupabase Authを使わずNextAuthのみで完結させる設計のため、RLSを有効のまま塞いでおく方が安全と判断している。テーブル追加時にRLS無効化SQLを提示しないこと。
- `SUPABASE_SERVICE_ROLE_KEY`などの秘密情報は会話・ログに出力しない。`.env.local`は`.gitignore`済み。
- 新規APIルート（`/api/admin/*`, `/api/bgj/*`, `/api/patient-portal/*`）は原則`@/auth`の`auth()`でセッション確認してから処理する。
- **ログインの総当たり対策**：`clinic-credentials`・`patient-credentials`は`src/lib/auth/loginLockout.ts`でアカウント単位のロックアウトを行う（5回連続失敗で15分ロック、`patients`/`clinic_users`の`failed_login_attempts`/`locked_until`列で管理）。IPベースのレート制限は未導入（必要になったらVercel/WAF等の有料機能導入を検討し、事前にユーザーへ確認する）。

# 共通部品の方針

## 新しいUIを書く前に必ず確認すること

`src/components/`にある既存部品（`Header.tsx` / `Sidebar.tsx` / `Footer.tsx` / `icons.tsx` / `SupplementImage.tsx` / `ProductImage.tsx` / `Providers.tsx`、患者ポータル用`BottomNav.tsx` / `PatientSidebarNav.tsx`）を先に使う。なければ新規作成し、同じディレクトリに追加する。

患者ポータルのデスクトップ用サイドバー（qa/medication/clinic/subscription/shop/shop/[id]/home）は`src/components/PatientSidebarNav.tsx`に共通化済み。`active`（`'home' | PatientNavKey`）と`navVisibility`をpropsで渡し、ページ固有のフッター（ログアウトリンク等）は`children`として渡す。アイコン（`IconHome`/`IconClinic`/`IconFile`/`IconPill`/`IconRefresh`/`IconBag`/`IconQA`/`IconLogout`）も同ファイルから名前付きexportで再利用できる。

## 3回以上同じパターンが出たら共通化する

- 同じclassNameの組み合わせが3箇所以上 → コンポーネント化
- 同じロジックが2ファイル以上 → `src/hooks/`または`src/lib/`に切り出す
- 共通化した部品は必ず`src/components/`（UI専用なら`src/components/ui/`を新設）に置き、既存ファイルからimportに置き換える

**現状把握**：トースト通知は`src/hooks/useToast.ts`に共通化済み（状態管理のみ共通化、見た目はポータルごとに維持）。新規ページでトーストが必要な場合はこのフックを使う。

**共通UIコンポーネント**：`src/components/ui/`に`Button.tsx` / `Card.tsx` / `LoadingState.tsx` / `ConfirmDialog.tsx`を新設し、admin・bgj両ポータルの該当箇所を置き換え済み。いずれも`theme: 'sky' | 'violet'`propを持つ（`sky`=admin/管理ポータル、`violet`=bgjポータルのデフォルト）。これは見た目の統一ではなく、**既存の意図的な差異をそのまま保持するための設計**：
- `Card`：admin側は`border-sky-100`、bgj側（および一部adminの例外画面）は`border-slate-200`が正で、これは元々ポータルごとに使い分けられていた配色。`theme`未指定時は`violet`（`border-slate-200`）がデフォルト。
- `ConfirmDialog`：admin側は`border-sky-100 rounded-2xl`+`text-base`、bgj側は`rounded-3xl`（ボーダーなし）+`text-sm`という元々の差異をそのまま`theme`で出し分けている。
- `Button`：`size: 'sm' | 'lg'`固定（`rounded-xl`）。`sm`=`px-4 py-2.5 text-sm font-semibold`、`lg`=`px-5 py-3 text-base font-bold`。既存コードの微妙なpadding差（px-4/5/6、py-2/2.5/3など）はこの2サイズに正規化済み（意図的な統合、見た目の破壊的変更ではない）。
- 新しいカード・ボタン・削除確認モーダル・ローディング表示を追加するときは、必ずこれらのコンポーネントを`theme`propと共に使う。独自にTailwindクラスを再実装しない。
- スコープ外（意図的に共通化していないもの）：Linkベースの装飾カード（hover演出付きの統計カードなど）、`rounded-lg`+`text-xs`の小さいピルボタン、患者ポータル全体。

**患者様QR自己登録の共通部品**：QRコード＋受付PIN＋発行日時＋PDF出力のカードUIは`src/components/SignupQrCard.tsx`に共通化済み（BGJ得意先詳細「接続情報」タブ・`/admin/patients`のQRモーダル・`/admin/clinic-info/qr`の3箇所で使用、3箇所目を追加した時点で共通化した実例）。クリニック側のPIN再発行処理（`/api/admin/clinic-info`へのPATCH）は`src/hooks/useSignupPinRegenerate.ts`に共通化済み（BGJ側は別エンドポイント`/api/bgj/clinics/[code]`のため対象外、page側で個別に実装する）。

# コーディング禁止事項

- `alert()`禁止 → 各ページの既存トースト実装を使う（共通`useToast()`ができるまでの暫定）
- `console.log`禁止 → 本番コードに残さない。ただしAPIルートでのエラー原因調査用`console.error(...)`はサーバーログにのみ出力され機密情報を含まない前提で許容する（例：`src/app/api/admin/patients/route.ts`のSupabaseエラーログ）
- `eslint-disable`安易に使わない → 根本原因を修正する
- **`select('*')`禁止** → 必ず列名を明示する。このプロジェクトでは`src/lib/supabase/types.ts`に列指定の定数（`PATIENT_COLUMNS`等）を集約しているので、新規クエリはそこに追加して再利用する
- **`limit`なしの全件取得禁止** → 必ず上限を設定する（一覧系は`limit(500)`程度、履歴系は`limit(100)`程度を目安にする）
- **患者様の`login_id`を手入力・編集させるUI/APIを復活させない** → 全クリニック共通の連番（`BU`+6桁）をDB側の生成列で自動採番する方針（詳細は「次のおすすめ」9番）

# 標準コーディングパターン

```ts
// Supabaseへのアクセスは必ずサーバー専用クライアント経由（ブラウザから直接叩かない）
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { PATIENT_COLUMNS } from '@/lib/supabase/types';

const supabase = getSupabaseServerClient();
const { data, error } = await supabase
  .from('patients')
  .select(PATIENT_COLUMNS)
  .limit(500);
```

- 権限チェック（`usePermission()`相当）はこのプロジェクトには存在しない。認可は「Google OAuthで`@biogaia.jp`にログインできているか」のみで、画面ごとの細かい権限分岐は行っていない。
- トースト通知は`src/hooks/useToast.ts`を使う（`const { toast, showToast } = useToast();`）。
- クリニックの自院情報（`/api/admin/clinic-info`）を扱うページは`src/hooks/useClinicInfo.ts`を使う。取得成功時に編集フォームstateを初期化したい場合は`onLoad`コールバック引数を使う（`useEffect`内で直接`setState`すると`react-hooks/set-state-in-effect`に引っかかるため）。

# 新しい画面を追加するときの手順

以下をセットで対応すること。1つでも欠けると画面がサイドバー/ナビに出ない。

1. 対象ポータル配下（`src/app/admin/*`, `src/app/bgj/*`, 患者ポータルは`src/app/*`直下）にpage.tsxを作成する
2. 対応するナビ配列を更新する
   - 医院用ポータル: `src/app/admin/components/AdminSidebar.tsx`の`AdminPage`型と`navItems`
   - BGJポータル: `src/app/bgj/components/BgjSidebar.tsx`の`navItems`
   - 患者様ポータル: デスクトップは`src/components/PatientSidebarNav.tsx`のNAV_ITEMS定数、モバイルは`src/app/components/BottomNav.tsx`のitems定数（両方に追加が必要）
3. Supabaseの新規テーブルが必要な場合は`supabase/schema.sql`に追記し、増分SQLをユーザーに提示する（下記「データベースを変更するときのルール」参照）
4. 権限テーブルはこのプロジェクトに存在しないため対応不要。ただし**`src/app/bgj/manual/page.tsx`は存在する**（BGJポータル「マニュアル」、システム手順／利用マニュアルの2タブ構成）。DB・APIの新規変更や新機能を追加したときは、このページも一緒に更新すること（ページ冒頭にもその旨の注記あり）。カード等を縦に並べるのではなく、共通`SubTabs`コンポーネントでタブ切り替えにする方針（画面スクロールを減らすため）

# データベースを変更するときのルール

1. `CREATE TABLE` / `ALTER TABLE`のSQLは、必ず以下をセットで提示する。
   ```sql
   alter table public.テーブル名 enable row level security;
   -- ポリシーは定義しない（service_roleキーのみアクセス可能な状態を維持する）
   ```
   **wbs-appのようにRLSを無効化するSQLは提示しない。**このプロジェクトの方針はRLS有効・ポリシーなしで統一する。
2. `supabase/schema.sql`を単一のDB定義書として常に最新に保つ（テーブル追加・変更時は追記する）。このプロジェクトには`/manual`のようなDB定義書ページは無いため、schema.sqlがそれを兼ねる。
3. 新規テーブルの列は`src/lib/supabase/types.ts`に型と列指定定数（`XXX_COLUMNS`）をセットで追加する。

## DB変更SQLに含める内容

DB変更SQLを提示するときは、以下をセットにする。

- 目的
- 影響テーブル
- 既存データへの影響
- rollback SQLまたは戻し方
- 実行後の確認SQL

# Next.js作業ルール

- このプロジェクトのNext.jsは一般知識と異なる可能性があるため、コード変更前に`node_modules/next/dist/docs/`の該当ガイドを読む。
- Route HandlerおよびClient Componentページの`params`はPromise。Client Componentでは`use(params)`で取り出す（`await`できないため）。
- Cookieの読み取りはRoute Handler内で`await cookies()`を使う。
- `'use client'`境界は広げすぎない。
- 大きなClient Componentに重い部品を静的importしない。

# レスポンス改善方針（次に触るときの指針）

## 改善の優先順位

1. 不要な再取得を減らす
2. 初期表示に不要なコンポーネントを遅延読み込みする
3. 重いstate更新を局所化する
4. DB index / queryを見直す
5. 最後にUIの細かい最適化を行う

## 現状の既知の課題

- `admin/patients`, `admin/patients/[id]`, `ClinicStaffManager`, `ClinicQaManager`, `bgj/customers/[code]`は、登録・更新・削除成功時にAPIレスポンスの行をローカルstateにマージする楽観的更新方式に統一済み（全件再取得はしない）。新しいCRUD操作を追加する際もこのパターンを踏襲する。
- `react-hooks/set-state-in-effect` / `react-hooks/static-components`のlint指摘は解消済み（`npm run lint`は0エラー）。マウント時にfetchする関数は「`useCallback`でメモ化 → `useEffect`の依存配列に関数を含める」のパターンに統一し、`.then()`チェーンで書く（`async/await`+`try/catch`で書くと、effectから直接呼んだ場合に指摘が出ることがある）。
- 患者ポータルの`navItems`配列（qa/medication/clinic/subscription/shop/homeの6ページ）は依然として個別定義のまま（共通化は意図的にスコープ外としている）。
- `src/app/api/periodontal/master/route.ts`はほぼ変化しないマスタデータのため`next/cache`の`unstable_cache`で1時間キャッシュ済み。`auth()`（cookie読み取り）はキャッシュ対象外に置き、認可は毎回そのまま効かせている。同様に「ほぼ変化しないマスタ + 認証必須」なAPIルートを追加する際はこのパターンを踏襲する。
- recharts（`admin/commission`・`bgj/customers/[code]`・`bgj/dashboard`・`bgj/reports`）は`next/dynamic`（`ssr: false`）で遅延読み込み済み。チャート部分は同ディレクトリの子コンポーネント（例：`CommissionChart.tsx`）に切り出し、データが動的な場合はprops経由で渡す（`SalesHistoryChart.tsx`が例）。新しく重いチャートを追加する場合もこのパターンを踏襲する。
- **複数得意先を横断集計するAPI（`/api/bgj/clinics`等）は、行単位でlimit付き取得してアプリ側でループ集計してはいけない**。得意先数・履歴件数が増えると`limit`を超えた時点で古い得意先の集計が欠落するバグになる（実際に`clinic_orders`の`last_order_date`/`month_sales`集計で発生し、Postgres関数`public.bgj_clinic_order_summary()`に置き換えて修正済み）。同様の「全得意先を横断する集計」を追加する場合は、Postgres側の集計関数（`group by`）をRPCで呼び出す設計にする。
- **PDF出力を追加する場合は`jspdf` + `html2canvas-pro`を使う（無印`html2canvas`は使わない）**。このプロジェクトはTailwind v4を採用しており、コンパイル後のCSSは`oklch(...)`カラー関数を多用する（実際に確認済み）。無印`html2canvas`はoklchを解釈できずエラーになるため、対応済みフォークの`html2canvas-pro`を使うこと。両ライブラリともボタンクリック時にのみ動的`import()`で読み込み、初期バンドルに含めない（`src/lib/exportElementAsPdf.ts`が実装例）。
- **意図的に認証不要な公開APIルート**（`/api/clinics/[code]/branding`、`/api/join/[slug]`など）は、ログイン前の画面から呼ばれるという明確な理由をコメントで残し、返す情報を必要最小限に絞る。書き込み系（`join`など）は追加でPIN等の本人確認手段と、失敗時のロックアウト（`src/lib/auth/signupPin.ts`のような専用モジュール）を必ず設ける。
- **新しい公開（認証不要）ページ・APIを追加したら、必ず`src/proxy.ts`の許可リストにも追加すること**。このプロジェクトのNext.js 16では`middleware.ts`が`src/proxy.ts`という名前に変わっており、ほぼ全パスを認証必須にする関所として動く。ここへの追加を忘れると、ページ・APIを実装しても本番で未認証アクセスが強制的に`/auth/signin`へリダイレクトされる（実際に`/join/[slug]`追加時にこれで発生し、あわせて既存の`/bgj-login`も同じ理由で漏れていたため修正した）。
- **連番など推測可能な小さな値（得意先コードなど）をURLで使う必要がある場合、単純なハッシュ化では不十分**。値の候補が少なければ全パターンを先回りでハッシュ化して逆引きできてしまうため、本当に隠したい場合は値と無関係なランダムトークンを別カラムに持たせて発行する（`clinic_patient_settings.signup_slug`、`src/lib/auth/signupPin.ts`の`generateSignupSlug()`が実装例）。得意先コード自体はBGJ・admin内部の一覧・詳細画面ではこれまでどおり表示してよく、変更が必要なのはURL等の外部公開箇所のみ。

# 自動テスト方針

- **最重要ルール：新しい機能・コンポーネント・APIルート・libモジュールを新規作成するときは、必ず同じ作業単位（同じコミットまたは同じ一連の作業）でテストケースも作成する。**「あとでまとめて書く」はしない。既存コードの修正時も、修正箇所にテストが無ければ追加する。ユーザーからの機能追加依頼にテスト作成の指示が含まれていなくても、この方針に従ってテストを作成すること（2026-07-18にユーザーが明示した方針）。
- テスト基盤は**Vitest + React Testing Library + jsdom**（`vitest.config.ts`・`vitest.setup.ts`）。`npm run test`（= `npx vitest run`）で実行する。テストファイルはテスト対象と同じディレクトリに`◯◯.test.ts`（UIは`.test.tsx`）で置く。
- `server-only`パッケージはテスト実行時のみ無害な`empty.js`にエイリアスしている（`vitest.config.ts`の`resolve.alias`）。サーバー専用ファイル（`import 'server-only'`を含む）のテストは、jsdomの`window`と衝突しないようファイル先頭に`// @vitest-environment node`を書く。
- Supabaseや`next/headers`等の外部依存は直接叩かず、mock/fakeを使う（`src/lib/auth/*.test.ts`、`src/app/api/**/*.test.ts`を参照）。APIルートハンドラ（`route.ts`のPATCH/DELETE等）は`@/auth`と`@/lib/supabase/server`を`vi.mock`し、ハンドラ関数を直接呼び出してテストできる（`src/app/api/admin/clinic-staff/[id]/route.test.ts`が雛形）。
- **fetchするクライアントコンポーネントのテスト**は`vi.stubGlobal('fetch', fetchMock)`でURL・HTTPメソッド分岐のmockを組み、`afterEach`で`vi.unstubAllGlobals()`する（`src/components/ClinicTermsManager.test.tsx`・`ClinicLoginManager.test.tsx`が雛形）。rechartsなどjsdomで描画できない部品は`vi.mock`で差し替える（`ClinicSalesOrders.test.tsx`が雛形）。
- フィールド数の多い`ClinicWithStaff`等の共通フィクスチャは`src/test/fixtures.ts`のファクトリ（`makeClinicWithStaff()`）を使う。テスト専用ファイルであり、アプリ本体からはimportしない。
- 現状のカバレッジ：`src/lib/auth/`配下・`src/lib/patientNav.ts`・`src/lib/clinicForm.ts`のロジック、APIルート数本（clinic-staff・patients・diagnoses・env-check・branding・join・password-reset）、UIコンポーネント（`src/components/ui/`のButton/Card/LoadingState/ConfirmDialog、`PatientSidebarNav`、得意先詳細から抽出したClinicVisitList/ClinicBasicInfoTab/ClinicBusinessInfoTab/ClinicTermsManager/ClinicLoginManager/ClinicSalesOrders）、`useToast`。
- **CI（GitHub Actions、`.github/workflows/ci.yml`）でpush/pull_request時にlint/tsc/testを自動実行する**。git pre-commitフックは未設定。
- 新しいテストを追加する場合は既存の書き方（`vitest`のdescribe/it、上記のmockパターン）を踏襲する。

## CI失敗通知を受け取ったときの対応方針（2026-07-18にユーザーが明示）

- CI失敗メール（GitHub Actionsからの`Run failed`通知）を見せられたら、憶測で答えず必ず`gh run list --branch main --limit 5`で単発の失敗か継続的な失敗かをまず確認する。直近複数回が失敗していれば、直前の1コミットではなく共通原因（依存関係・環境）を疑う。
- `gh run view <ID>`でどのステップ（lint/tsc/test/build）が落ちているかを特定し、`gh run view <ID> --log-failed`で実際のログを読んでから対応する。
- **既知パターン**：`vitest`はvite本体をpeerDependencyとしてバージョン範囲だけ指定しており、npmは範囲内の最新版を自動解決する。この解決先が実験的な最新メジャー版（例：Rolldownベースのvite 8系）に浮くと、npmのoptionalDependencies多重プラットフォーム解決バグ（[npm/cli#4828](https://github.com/npm/cli/issues/4828)）でLinux（CI）環境だけネイティブバイナリが見つからず`npm run test`が起動時エラーになることがある（macOSローカルでは`npm run test`が通ってしまうため気づきにくい）。対処は`package.json`で`vite`・関連プラグイン（`@vitejs/plugin-react`等）を安定版に明示固定し、`package-lock.json`をクリーン再生成する（`rm -r node_modules` → `rm package-lock.json` → `npm install`）。
- 修正をpushしたら`gh run watch <実行ID> --exit-status`等で**実際にCIがグリーンになったことを確認してから**完了報告する。pushしただけで「直りました」と報告しない。

# 評価観点と次のおすすめ

## 評価観点

- 保守性
- レスポンス
- 安全運用（RLS・秘密鍵の扱い）
- UI一貫性
- DB設計・クエリ効率
- 引き継ぎやすさ

## 次のおすすめ

1. テストカバレッジのさらなる拡大。`src/components/ui/`全部・得意先詳細から抽出した6コンポーネント・`src/lib/clinicForm.ts`まで拡大済み（詳細は「自動テスト方針」の現状カバレッジ参照）。**以後は「新規作成時にテストも同時作成」ルール（自動テスト方針の最重要ルール）で自然に増やす。**次点候補：残りのAPIルート（bgj/clinics系・clinic-terms・sales-reps等）、既存の大きめコンポーネント（ClinicStaffManager・ClinicQaManager・ClinicEmailTemplatesManager・SignupQrCard）
2. `clinics`テーブルは`clinic_patient_settings`・`clinic_intro_info`に分割済み（正規化完了。詳細はメモリ`project_db_normalization_policy`参照）
3. CI（GitHub Actions、`.github/workflows/ci.yml`）導入済み。push/pull_request時にlint/tsc/testを自動実行する。pre-commitフック（husky等）の追加は未実施・要否は都度確認
4. レスポンス改善：`periodontal/master`のキャッシュ化・recharts4ページの遅延読み込みは完了。次点候補はクライアント側フェッチのキャッシュ層（SWR/React Query）導入（今回は意図的にスコープ外）
5. UI一貫性：`src/components/ui/`のButton/Card/LoadingState/ConfirmDialogをadmin・bgj全ページに適用済み。次点候補は患者ポータルへの適用要否の検討（現状は意図的にスコープ外）
6. 本番リリース（想定300クリニック・4,000ユーザー）に向けて、`bgj_clinic_order_summary`によるDB集計バグ修正・ログインの総当たり対策（アカウント単位ロックアウト）・Sentry導入（DSN未設定時は無効化）が完了。残タスク：(a) Sentryの`NEXT_PUBLIC_SENTRY_DSN`をsentry.ioで発行して設定する、(b) Supabase/Vercelのプラン見直し（帯域・接続数・バックアップ要件の整理、ユーザー確認要）、(c) BGJダッシュボード/レポート画面を中心とした簡易負荷試験
7. BGJポータルに「システム管理」（DB管理`/bgj/system/db`・アプリ管理`/bgj/system/apps`）を新設済み。DB容量はPostgres内蔵関数（`bgj_db_total_size`/`bgj_db_table_usage`、Free tier上限500MBは目安値でコード内定数）で取得し、Supabase Management APIは未連携（帯域・ストレージはダッシュボードへのリンク案内のみ）。アプリ管理は`bgj/manual`と同様の静的ページ＋環境変数の設定有無チェック（値は非表示）に加えて、Sentry APIから未解決issue一覧を取得表示する`SentryIssuesPanel`（`src/components/SentryIssuesPanel.tsx`、API側は`src/app/api/bgj/system/sentry-issues/route.ts`）を追加済み。Sentryの組織スラッグ・プロジェクトID（DSNに含まれる数値、秘密情報ではない）はルート内に定数で埋め込み、`SENTRY_AUTH_TOKEN`（scope: `project:read`・`event:read`）のみ環境変数で管理する。次点候補（今回は見送り）：Supabase Management API連携によるプロジェクト全体の使用量取得、バックアップ状況の自動チェック、CI実行状況の埋め込み表示
8. 患者様のQR自己登録機能（クリニック共通QR＋受付PIN）を新設済み。`clinic_patient_settings`に`signup_pin`系4カラム＋`signup_slug`（得意先コードとは無関係なランダム文字列、PINと同時に再発行）を追加し、公開ルートで患者様自身がログインID・パスワードを設定できる。QRが実際に開く先は**スマホ専用・クリニック指定背景**の`/join/[signup_slug]/mobile`（`SignupQrCard`が生成するQR・URLはすべてこちらを指す）。`/join/[signup_slug]`はPC等での確認用の簡易版として別途残している（意図的に別ページ、混同しないこと）。送信先API`/api/join/[slug]`は共通。**得意先コードは連番で推測可能なため、URLには一切使わない**（単純ハッシュ化は全パターン先回り計算で逆引きされ不十分、という判断。得意先コード自体はBGJ・admin内部の一覧・詳細画面ではこれまでどおり表示している）。発行・再発行はBGJ（得意先詳細＞接続情報タブ）・医院（クリニック情報＞QR設定、患者様管理のQRモーダル）の両方から可能で、実体は同じ行なので双方向に反映される。QR表示・PDF出力は共通部品化済み（上記「共通部品の方針」参照）。**患者様の登録項目（氏名・パスワード）を追加・変更する場合は、`/join/[signup_slug]/mobile`・`/join/[signup_slug]`・`/api/join/[slug]`の3箇所を必ず連動して更新すること**（各ファイル冒頭にコメントで明記済み）。次点候補（今回は見送り）：受付PINの誤入力ロックはアプリ内カウンタのみで、IPベースのレート制限は未導入（総合的なレート制限方針が固まったら見直す）
9. **患者様のログインIDは全クリニック共通の連番（`BU`+6桁、例：`BU000001`）で自動採番済み。手入力・編集は一切できない**（`patients.login_id`を`patient_no`と同じ`seq_no`から算出する生成列にした。マニュアル`bgj/manual`のシステム手順「6. ログインIDの自動採番」に移行SQLと詳細あり）。新しい患者登録経路を追加する場合、INSERT時に`login_id`を渡すとPostgresがエラーになるため、渡さずに`.select()`で採番結果を読み取ること。既存患者の旧ログインIDは`login_id_legacy`列に保持している（実ログインには使えない、確認用）。
10. 得意先ごとにカスタマイズできる患者様向けメール文面（初回登録メール・パスワード変更メール）の編集・プレビュー（`clinic_email_templates`テーブル、BGJ得意先詳細「メール設定」タブ）から**実際の送信まで実装済み**。GoogleWorkSpace（`jyosys@biogaia.jp`のアプリパスワード）経由の`nodemailer`でSMTP送信（`src/lib/email/sendEmail.ts`、新規の有料サービス契約は不要）。差出人は共通のエイリアス`no-reply@biogaia.jp`1つに固定し、`sender_name`列で得意先ごとに表示名だけ変える。得意先のカスタム文面を取得して置換する共通ロジックは`src/lib/email/resolveClinicEmail.ts`（サーバー専用、`templates.ts`本体はクライアントのプレビューでも使うため`server-only`を付けていない点に注意）。メール送信失敗時も登録・パスワード再設定処理自体は失敗させない（`try/catch`でログのみ）。環境変数：`WORKSPACE_SMTP_USER`・`WORKSPACE_SMTP_APP_PASSWORD`・`WORKSPACE_SENDER_ALIAS`（`bgj/system/apps`・`env-check`にも追加済み）。詳細はマニュアル`bgj/manual`のシステム手順「7. 患者様メール文面のカスタマイズ」参照。次点候補：医院側での自己編集（現在はBGJ専用、CLAUDE.md方針上は「BGJポータルで整ってから」検討）。
11. QR自己登録（`/join/[slug]`系）に**メールアドレスが必須項目として追加**（`patients.email`列、admin/patients手動発行では引き続き未収集）。登録完了時に初回登録メールが届き、本文のリンクから**パスワード入力なしでそのままログイン完了**できる「ワンクリックログイン」を実装済み。使い捨て・30分有効・SHA-256ハッシュ化保存のトークン（`patient_login_tokens`テーブル、`src/lib/auth/loginToken.ts`）を、NextAuthの新しい認証方式`patient-magiclink`（`src/auth.ts`）で検証する。リンク先は`/join/verify?token=...`。同じトークンの仕組みで「パスワードをお忘れの方」の自己リセット（`/forgot-password` → `/api/password-reset/request` → メール → `/reset-password` → `/api/password-reset/confirm`）も実装済み。メールアドレスの登録有無に関わらず常に同じレスポンスを返し、外部から探索されないようにしている。**新しい公開ページ・APIを追加する際は今回も`src/proxy.ts`の許可リストへの追加を忘れないこと**（`/forgot-password`・`/reset-password`・`/api/password-reset`を追加済み。`/join/verify`は既存の`/join/`許可で自動的にカバーされる）。詳細はマニュアル`bgj/manual`のシステム手順「8. ワンクリックログイン・パスワード再設定」参照。
12. システム評価を受けた堅牢化を実施済み：(a) `/api/password-reset/request`は同一患者・同一用途3分クールダウン（`hasRecentLoginToken()`、メール爆撃対策。クールダウン中も成功時と同じレスポンスを返す）、(b) `patients.email`に部分uniqueインデックス（null複数可）を追加し、QR登録の重複メールは409で拒否、(c) 患者パスワードは全経路（QR登録・admin手動発行・admin再設定・リセット確定）で8文字以上に統一、(d) メール送信は`next/server`の`after()`でレスポンス送信後に実行（SMTPの数秒がAPI応答をブロックしない。**Route Handlerのテストで`after`を使う場合は`vi.mock('next/server', ...)`でコールバックを溜めて明示実行する**、`src/app/api/join/[slug]/route.test.ts`が雛形）。残る既知の課題：`/bgj-login`が見た目のみ（実認証未接続）、負荷試験未実施。Sentry DSN設定・`bgj/customers/[code]/page.tsx`のタブ単位分割は完了済み（詳細は本節7番・13番、および直前のコミット履歴参照）。
13. クリニック（医院用ポータル`/admin/inquiry`）からの問い合わせをSlackへ**一方向のIncoming Webhook通知**として送る機能を実装済み。BGJ職員は通知内のリンクからBGJポータルの返信専用画面（`/bgj/inquiries/[id]`）へ遷移して返信する（Bot Token・Events APIは使わない、意図的にシンプルな設計。当初はSlack Appでの双方向連携を検討したが、営業担当者の返信はポータル上で行うという要件明確化により一方向通知＋返信画面URLの方式に変更した）。Slack Webhook URLはBGJポータル「システム管理 &gt; 共通マスタ」（`/bgj/system/settings`、新設のシングルトンテーブル`app_settings`）からUIで自己管理し、Vercel環境変数の再設定・再デプロイを不要にしている。`sales_reps.slack_user_id`を設定した担当者は、自分が担当する得意先からの問い合わせ通知で`&lt;@USER_ID&gt;`メンションされる。訪問記録（`clinic_visits`）と問い合わせ（`clinic_inquiries`/`clinic_inquiry_replies`）は、得意先詳細画面の「行動履歴」タブ（旧「訪問記録」タブを改称、`src/components/ClinicActivityFeed.tsx`）で日付降順の1つのフィードとして統合表示する。詳細はマニュアル`bgj/manual`のシステム手順「10. クリニック問い合わせ→Slack連携」参照。次点候補（今回は見送り）：Slack上での返信をアプリへ自動取り込みする双方向連携（Bot Token・Events API・署名検証が別途必要になり、Slack側の追加設定も要するため意図的にスコープ外とした）。
