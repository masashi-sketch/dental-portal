@AGENTS.md

# Web-moc-B2B（歯科医院向けB2Bポータルモック）運用メモ

このファイルは本プロジェクト（`Web-moc-B2B`）専用の引き継ぎメモです。ユーザーが他プロジェクト（wbs-app）向けに整備した開発方針をベースに、このプロジェクトの実情（技術構成・セキュリティ方針・既存コンポーネント）に合わせて翻訳・調整したものです。親フォルダの`Web/CLAUDE.md`（技術スタック・コスト方針・デプロイ方針の共通ルール）とあわせて運用します。

## 最短チェックリスト

迷ったら、まずこの順で確認する。

1. `git status --short --branch` を見る
2. 調査依頼か実装依頼か判断する
3. Next.jsコード変更なら `node_modules/next/dist/docs/` の関連ガイドを読む（このプロジェクトのNext.jsは一般知識と異なる可能性があるため）
4. 変更は小さく、1責務に絞る
5. 必要に応じて `npm run lint` / `npx tsc --noEmit` / `npm run build` を実行する（`npm run test`は未整備。下記「自動テスト方針」参照）
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
npm run build
```

- `npm run build`は、このプロジェクトが動く環境によってはGoogle Fonts（`next/font/google`）のネットワーク取得に失敗し完走しないことがある。その場合は`tsc`と`npm run dev`（`--webpack`）での動作確認を主たる検証とし、その旨を必ず報告する。
- `npm run test`に相当するテスト基盤は未整備（下記「自動テスト方針」参照）。整備するまでは検証コマンドから除外する。
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

# セキュリティ方針

- **新規Supabaseテーブルは`enable row level security`のみ行い、ポリシーは定義しない**（anon/authenticatedキーからは読み書き一切不可にする）。読み書きは必ずサーバー側の`service_role`キー経由のAPIルート（Route Handler）を介す。
  - これはユーザーが別プロジェクト（wbs-app）で採用している「RLSを無効化する」方針とは意図的に異なる。このプロジェクトはSupabase Authを使わずNextAuthのみで完結させる設計のため、RLSを有効のまま塞いでおく方が安全と判断している。テーブル追加時にRLS無効化SQLを提示しないこと。
- `SUPABASE_SERVICE_ROLE_KEY`などの秘密情報は会話・ログに出力しない。`.env.local`は`.gitignore`済み。
- 新規APIルート（`/api/admin/*`, `/api/bgj/*`, `/api/patient-portal/*`）は原則`@/auth`の`auth()`でセッション確認してから処理する。

# 共通部品の方針

## 新しいUIを書く前に必ず確認すること

`src/components/`にある既存部品（`Header.tsx` / `Sidebar.tsx` / `Footer.tsx` / `icons.tsx` / `SupplementImage.tsx` / `ProductImage.tsx` / `Providers.tsx`、患者ポータル用`BottomNav.tsx`）を先に使う。なければ新規作成し、同じディレクトリに追加する。

## 3回以上同じパターンが出たら共通化する

- 同じclassNameの組み合わせが3箇所以上 → コンポーネント化
- 同じロジックが2ファイル以上 → `src/hooks/`または`src/lib/`に切り出す
- 共通化した部品は必ず`src/components/`（UI専用なら`src/components/ui/`を新設）に置き、既存ファイルからimportに置き換える

**現状把握**：トースト通知（`toast`state + `setTimeout`で消す実装）が12ファイルで個別実装されている。次にトースト関連を触る機会があれば、`src/hooks/useToast.ts`（または`src/components/ui/Toast.tsx`）への共通化を優先的に検討する。

# コーディング禁止事項

- `alert()`禁止 → 各ページの既存トースト実装を使う（共通`useToast()`ができるまでの暫定）
- `console.log`禁止 → 本番コードに残さない。ただしAPIルートでのエラー原因調査用`console.error(...)`はサーバーログにのみ出力され機密情報を含まない前提で許容する（例：`src/app/api/admin/patients/route.ts`のSupabaseエラーログ）
- `eslint-disable`安易に使わない → 根本原因を修正する
- **`select('*')`禁止** → 必ず列名を明示する。このプロジェクトでは`src/lib/supabase/types.ts`に列指定の定数（`PATIENT_COLUMNS`等）を集約しているので、新規クエリはそこに追加して再利用する
- **`limit`なしの全件取得禁止** → 必ず上限を設定する（一覧系は`limit(500)`程度、履歴系は`limit(100)`程度を目安にする）

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
- トースト通知の共通hookは未整備。当面は各ページのローカル実装（`useState` + `setTimeout`）を踏襲し、`src/hooks/useToast.ts`を作る際にまとめて置き換える。

# 新しい画面を追加するときの手順

以下をセットで対応すること。1つでも欠けると画面がサイドバー/ナビに出ない。

1. 対象ポータル配下（`src/app/admin/*`, `src/app/bgj/*`, 患者ポータルは`src/app/*`直下）にpage.tsxを作成する
2. 対応するナビ配列を更新する
   - 医院用ポータル: `src/app/admin/components/AdminSidebar.tsx`の`AdminPage`型と`navItems`
   - BGJポータル: `src/app/bgj/components/BgjSidebar.tsx`の`navItems`
   - 患者様ポータル: 各ページ内の`navItems`/`sideNavItems`配列（ページごとに重複定義されている。将来的に共通化候補）、モバイルは`src/app/components/BottomNav.tsx`
3. Supabaseの新規テーブルが必要な場合は`supabase/schema.sql`に追記し、増分SQLをユーザーに提示する（下記「データベースを変更するときのルール」参照）
4. 権限テーブルや`/manual`ページはこのプロジェクトに存在しないため対応不要

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

- `admin/patients`, `admin/patients/[id]`, `admin/settings`, `bgj/customers/[code]`の各ページは、登録・更新・削除の成功後に**一覧を毎回全件再取得**している（楽観更新はしていない）。データ量が今は小さいため実害はないが、次にこれらのページを触る際は「返却行をstateにマージする」方式への置き換えを検討する。
- 上記4ページとも`useEffect`内で条件分岐しつつ直接`setState`する初期化パターンを使っており、`npm run lint`で`react-hooks/set-state-in-effect`の指摘が出る（このプロジェクトの既存コード、例:`AdminSidebar.tsx`にも同種の指摘が既にあり、今回のセッションで新規に広げたものではない）。プロジェクト全体に及ぶため、まとまった別作業として対応するのが望ましい。

# 自動テスト方針

- このプロジェクトには**テスト基盤（Vitest等）が未整備**。`package.json`に`test`スクリプトは無い。
- 整備する場合は、Vitest + React Testing Library + jsdomを採用し、Supabaseや外部サービスに直接アクセスせずmock/fakeを使う方針を踏襲する。
- テスト導入はまとまった作業になるため、着手前にユーザーに確認する（無断で devDependencies を追加しない）。

# 評価観点と次のおすすめ

## 評価観点

- 保守性
- レスポンス
- 安全運用（RLS・秘密鍵の扱い）
- UI一貫性
- DB設計・クエリ効率
- 引き継ぎやすさ

## 次のおすすめ

1. トースト通知の共通hook化（`useToast`）— 12ファイルの重複を解消
2. `admin/patients`系ページの楽観更新への置き換え
3. `react-hooks/set-state-in-effect` / `react-hooks/static-components`のlint指摘をプロジェクト全体で棚卸し・是正
4. テスト基盤（Vitest）導入の要否をユーザーと確認
5. 得意先マスタ（BGJポータルの得意先一覧）自体のSupabase移行（現状は`src/lib/clinics.ts`の静的データ）
