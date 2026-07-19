# トラブルシューティング（既知の問題と対処）

このファイルは、開発・作業中に実際に発生した問題（Claude自身の誤りを含む）を記録し、同じ問題を繰り返さないための一覧です。**新しい問題を解決したら、都度この一覧に追記すること。** CLAUDE.mdの「最短チェックリスト」からもこのファイルを参照する。

各項目は以下の形式で記録する：症状 → 原因 → 対処 → （該当すれば）気づくためのチェック方法。

---

## `npm run dev` は起動する（`Ready in ...ms`と表示される）のに、どのページも応答せず終わらない（ブラウザで「ぐるぐる」する）

- **症状**：`npm run dev`は正常に起動ログを出すが、`curl http://localhost:3000/`が`--max-time`一杯までハングして応答がない。`favicon.ico`（middlewareを経由しないパス）でも同様にハングする。
- **原因**：Next.jsの匿名テレメトリが、初回リクエスト時にVercelのテレメトリ収集エンドポイント（Vercel所有IP、TCPのTLSハンドシェイクは成立するが以降データが流れない）に接続しようとし、この環境（サンドボックス化されたネットワーク）ではそのまま応答なしでハングし続ける。プロセスのCPU使用率はほぼ0%（ビジーループではなく、ネットワーク待ちで完全に停止している状態）。
- **対処**：`npx next telemetry disable`を実行してから`npm run dev`を再起動する。実行後は`~/Library/Preferences/nextjs-nodejs/config.json`に設定が保存され、以後は毎回有効。無効化後は`/`（Google Fontsを読み込むルートレイアウトを含む、最も重いページ）を含め複数ページで連続してHTTP 200が安定して返ることを確認済み。
- **気づくためのチェック**：起動ログが出た直後に`curl -s --max-time 10 -o /dev/null -w "%{http_code}\n" http://localhost:3000/favicon.ico`を実行し、`200`が返ることを確認してから動作確認に進む。`000`（タイムアウト）ならこの問題を疑う。
- **紛らわしい別の警告（原因ではない）**：起動ログに出る`Next.js inferred your workspace root, but it may not be correct`（ホームディレクトリ直下に別プロジェクトの`package-lock.json`が存在するための誤検出）は、この応答なし問題の直接の原因ではなかった。ただし誤ったルート推測はファイルトレース範囲が不必要に広がる副作用があるため、`next.config.ts`の`outputFileTracingRoot`で明示的にこのプロジェクトのディレクトリに固定する対処は別途しておく（実施済み）。

## 開発サーバーのプロセスが残ったまま新しく起動しようとして噛み合わない

- **症状**：`lsof -nP -iTCP:3000 -sTCP:LISTEN`でポート3000を握っているプロセスがいるが、`curl`で応答がない。
- **原因**：前回のセッション・前回の作業で起動した`next-server`プロセスが、正常終了しないまま残っている（本セッションでも実際に発生）。
- **対処**：`pkill -f "next dev"`（または該当PIDを`kill`）してから改めて`npm run dev`を起動する。`kill -9`や`rm -rf`のような強制的な手段は使わず、まず通常の`kill`で様子を見る。
- **気づくためのチェック**：`ps -p <PID> -o pid,ppid,command`でプロセスの起動時刻・コマンドを確認し、想定より古い・自分が今起動した覚えがない場合は残留プロセスを疑う。

## BGJポータルのサイドバーでグループの枠を追加したのに「反映されていない」ように見えた

- **症状**：`navGroups`によるグルーピング機能自体は正しく実装・デプロイされていたが、ユーザーから「グルーピングが反映されていない」と報告された。
- **原因**：グループを囲む枠のスタイルが`bg-white/5`（白5%のオーバーレイ）のみで、紫色（`bg-violet-900`）の背景に対してほぼ視認できないほど薄かった。コードは正しく動いていたが、視覚的なコントラストが不十分で「機能していない」ように見えていた。
- **対処**：`bg-violet-950/40`＋`border border-violet-700/40`に変更し、はっきり視認できる枠にした（`src/app/bgj/components/BgjSidebar.tsx`）。
- **教訓**：UIの見た目に関わる変更（特に暗い背景に対する低不透明度のオーバーレイ）は、コードの妥当性チェックだけでなく実際の見た目（可能ならスクリーンショットや十分なコントラスト比の見積もり）で確認する。「動いているはず」で終わらせない。

## 開発環境（localhost）でページの初回表示が数秒〜20秒以上かかり「レスポンスが非常に悪い」と感じる

- **症状**：BGJポータルの各ページ（`/bgj/manual`・`/bgj/customers`・`/api/bgj/clinics`等）に初めてアクセスすると数秒〜20秒以上かかる。同じページに2回目以降アクセスすると14〜250ms程度で速い。
- **原因**：Next.js devモードは、そのルート（ページ／APIルート）に初めてアクセスされた時にだけオンデマンドでwebpackコンパイルを行う。このプロジェクトはGoogle Driveの同期フォルダ上にあり、大量の小さいファイルI/Oを伴うコンパイルが本来より大幅に遅くなる既知の制約がある（`next dev --webpack`を強制している理由と同根、CLAUDE.md参照）。実測値の例（アクセスログの`next.js:`内訳）：`/bgj/manual`初回23.3秒中19.6秒がコンパイル、`/bgj/customers`初回23.4秒中19.6秒、`/api/bgj/clinics`初回11.3秒中9.6秒。実際のサーバー処理（ログの`application-code:`内訳）は一貫して200ms〜1.7秒程度に収まっており、Supabaseクエリ自体やアプリコードは遅くない。
- **対処（現状）**：本番環境（Vercel）では`next build`で全ルートを事前コンパイル済みのため、この現象自体は発生しない。ローカルで検証する際は「初回アクセスは待たされる」という前提で2回目以降のアクセス時間を見る、という当面の回避策はあるが、**開発時の体感速度そのものが悪いことに変わりはなく、解消不要な事象として片付けない**（2026-07-19、ユーザーより「どの環境でもレスポンスが遅いことはトラブル」と明確な方針あり）。
- **気づくためのチェック**：`npm run dev`のログで`○ Compiling <ルート> ...`の直後のリクエストにかかった時間の`next.js:`内訳を見る。ここが数秒〜数十秒あれば初回コンパイル待ちが主要因だと切り分けられる（アプリコード側の処理時間は`application-code:`内訳を見る）。
- **調査済み（2026-07-19）：webpack永続化キャッシュの場所と有効性**
  - このNext.jsバージョン（AGENTS.mdが警告する「一般知識と異なる」実例）では、devモードのビルド成果物は`.next/cache`ではなく**`.next/dev/`配下**（`.next/dev/cache/webpack/client-development`等）に生成される。当初`.next/cache`だけを見て「devキャッシュが存在しない」と誤診断したが、正しい場所を見ると`client-development`・`server-development`・`edge-server-development`のキャッシュは実際に生成されていた。
  - ただしキャッシュが存在していても、開発サーバー再起動後に既訪問ルートへ初回アクセスすると依然として7〜8秒程度かかる（キャッシュ自体もGoogle Drive同期フォルダ内にあり、読み込みも遅いままのため効果が薄いと考えられる）。
  - **対処法として`.next/dev`を同期フォルダ外の実パスへ移動しシンボリックリンク化する方法を試したが、これは失敗＝実行不可**。Node.jsの`require()`はシンボリックリンク解決後の実ファイルパスから`node_modules`を探索するため、`.next/dev`をプロジェクト外に出すと`require-in-the-middle`（Sentry/OpenTelemetry計装が依存）が見つからずサーバーが起動不能になる（`MODULE_NOT_FOUND`）。この方法は再度試さないこと。安全に戻す手順：`.next/dev`のシンボリックリンクを削除し、退避しておいた実ディレクトリをプロジェクト内の`.next/dev`へ戻す。
  - **根本対処として残る唯一の選択肢は、プロジェクト全体（ソースコード＋`node_modules`）をGoogle Drive同期フォルダの外へ移動すること**。ユーザーに提案したが、ファイルの自動バックアップ方式が変わる（git remoteへのpushを主なバックアップ手段に切り替える必要がある等）ため2026-07-19時点では見送りとなった。今後改めて着手する場合は、移動手順・影響範囲・代替バックアップ方針を先に提案してから実施すること。

## Google OAuthで`redirect_uri_mismatch`が繰り返し発生する（設定を直したはずなのに直らない）

- **症状**：Google Cloud ConsoleでOAuthクライアントのリダイレクトURIを追加・修正したのに、`redirect_uri_mismatch`エラーが解消しない。何度設定を見直しても再発する。
- **原因**：このプロジェクトのGoogle Cloud Consoleには、名前が似た複数のOAuth 2.0クライアントID（BGJ_ALL、MocB2B、supabase、JamfPro等）が存在し、Console画面の見た目だけで正しいクライアントを判別するのを誤った。実際にアプリが送信している`client_id`と違うクライアントを編集し続けていた。
- **対処**：`curl`で`/api/auth/signin/google`へCSRFトークン付きPOSTし、返ってくる`Location`ヘッダーの`redirect_uri`・`client_id`パラメータを直接確認する。この値と完全一致するクライアントID（末尾の文字列まで）をConsoleのクライアント一覧から探して編集する。**Console画面の見た目（名前・アイコン）だけで「たぶんこれだろう」と判断しない。**
- **気づくためのチェック**：似た名前のOAuthクライアントが複数存在する場合は、必ず実際の送信値を`curl`で確認してから設定変更する。

## `vercel env pull`で環境変数の値が空に見える（実際は正しく設定されている）

- **症状**：`vercel env pull`で取得した`.env`ファイルを見ると、`AUTH_SECRET`等の機密情報系の環境変数が空文字（`""`）になっている。「設定が消えた/反映されていない」ように見える。
- **原因**：`vercel env pull`は、Sensitive（機密）指定された環境変数の値を**常にマスクして空文字として出力する**仕様。これは新しく設定した値だけでなく、何日も前から正常に動いている既存の値（実際に確認できた例：41日間問題なく動作していた`AUTH_SECRET`）でも同様に空になる。
- **対処**：`vercel env pull`の出力を環境変数が正しく設定されているかの確認手段として使わない。設定確認はVercelダッシュボードのEnvironment Variables画面で行うか、実際にその環境変数を使う機能（ログイン等）が動くかどうかで判断する。
- **気づくためのチェック**：`vercel env pull`で空に見えても、それだけで「未設定」と即断しない。既存の動いている値でも同じ見え方になることを念頭に置く。

## 新規APIルートで`clinics`テーブルへのcountクエリが原因不明の500エラーになる

- **症状**：BGJポータル「システムダッシュボード」（`/bgj/system/dashboard`）で「システムダッシュボードの取得に失敗しました」と表示される。開発サーバーのログ（`GET /api/bgj/system/dashboard 500`）には例外のスタックトレースが出ず、原因が分からない。
- **原因**：`.select('id', { count: 'exact', head: true })`という、他テーブル（`clinic_users`・`patients`・`clinic_inquiries`等）でも使っている定型のcount取得パターンを`clinics`テーブルにもそのまま適用したが、`clinics`テーブルの主キーは`id`ではなく`customer_code`（`supabase/schema.sql`参照）で、`id`列自体が存在しない。Supabaseはこの場合`{code: '42703', message: 'column clinics.id does not exist'}`というPostgrestErrorを返すが、`head: true`（レスポンスボディを返さない設定）のcount系クエリでは、実装側で`error.message`をそのままクライアントに返す設計にしていたため、ブラウザ側では素っ気ない「取得に失敗しました」としか見えず、サーバーログにも例外として出力されなかった（`NextResponse.json({error:...},{status:500})`を正常にreturnしているだけで、例外を投げていないため）。
- **対処**：`clinics`テーブルへのcountクエリは`.select('customer_code', {count:'exact', head:true})`に変更する。
- **気づくためのチェック**：`head: true`のcountクエリが原因不明の500になったら、ブラウザのエラー表示だけで判断せず、`.env.local`の`SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`を使った簡易Node スクリプトで同じクエリを直接実行し、`error`オブジェクト全体（`message`だけでなく`code`/`details`）を出力して確認する。特にheadなしの`select('列名, 別の列名').limit(3)`のような素朴なクエリに変えて実行すると、`column ... does not exist`のような列名の誤りがすぐ判明する。新しいテーブルに対するcountクエリを書くときは、まず`supabase/schema.sql`でそのテーブルの主キー列名を確認してから書く。

## ローカル開発サーバーの一過性エラーがSentryに届き、本番障害と誤認しやすい

- **症状**：BGJ職員宛のSentry通知メールで`ENOENT: no such file or directory, stat`（`GET /bgj/manual`等）のようなエラーが届く。本番で障害が起きたように見える。
- **原因**：`sentry.server.config.ts`・`sentry.edge.config.ts`・`src/instrumentation-client.ts`のいずれも`environment`を明示せず、`NEXT_PUBLIC_SENTRY_DSN`が設定されていれば常時有効になる設定だった。そのため`npm run dev`のローカル開発サーバーで発生したエラー（今回の実例：作業中に`.next`ディレクトリを削除した際、同時に起動していたdevサーバーのwebpackキャッシュ（`.next/dev/cache/webpack/...`）が消え`ENOENT`が発生）も、本番と同じDSNに送信されていた。イベント詳細（`url: http://localhost:3000/...`、ファイルパスがローカルの絶対パス）を見れば本番でないことは分かるが、メール本文だけでは判別しづらい。
- **対処**：2026-07-19に3設定ファイルすべてへ`enabled: process.env.NODE_ENV === 'production'`を追加し、開発環境ではSDK自体を無効化した。
- **気づくためのチェック**：Sentry通知メールを見たら、まず本文の「View on Sentry」またはSentry APIのイベント詳細で`url`とスタックトレース中のファイルパスを確認する。`localhost`やローカルの絶対パス（`/Users/...`）が含まれていれば、本番障害ではなくローカル作業由来。`SENTRY_AUTH_TOKEN`を使えば`curl https://sentry.io/api/0/organizations/{org}/issues/{id}/events/latest/ -H "Authorization: Bearer $SENTRY_AUTH_TOKEN"`でメール本文より詳しい生イベントを取得できる。

## 医院用ポータル右下の「お問い合わせ」ボタンがクリックしても無反応

- **症状**：医院用ポータル（`/admin/*`）で画面右下に固定表示される営業担当カード内の「お問い合わせ」ボタンをクリックしても何も起きない。
- **原因**：`src/app/admin/components/AdminSidebar.tsx`の`SalesRepCard`内で`href={salesRep.email ? `mailto:${salesRep.email}` : undefined}`としていた。`sales_reps.email`はnullable列（`supabase/schema.sql`）で、担当営業のメールアドレスが未登録の場合`href`が`undefined`になり、`<a>`タグが「見た目だけボタン風の死んだリンク」になっていた。同じサイドバー内に別の「お問い合わせ」リンク（`/admin/inquiry`固定）が存在するため紛らわしいが、両者は別物。
- **対処**：`email`が無い場合は`/admin/inquiry`（既存の問い合わせフォーム）にフォールバックするよう修正（2026-07-19）。
- **気づくためのチェック**：`<a>`タグに`href={条件 ? 値 : undefined}`のような書き方をした場合、条件がfalseになるケース（マスタ未登録・NULL等）で必ずクリック無反応になる。`href`を出し分けるときは、両方の分岐で有効なURLになるようにする（`mailto:`が無理なら内部リンク等のフォールバック先を必ず用意する）。

## 同一ブラウザで患者/医院/BGJポータルを別タブで同時に開くと「Unexpected token '<'」エラーになる

- **症状**：医院用ポータルの画面で「Unexpected token '<', "<!DOCTYPE "... is not valid JSON」という生のJSエラーが表示される。他の画面でも同種のエラーが起こりうる。
- **原因**：NextAuthのセッションクッキーは1ブラウザにつき1つ。患者ポータルタブでログインするとブラウザ全体のセッションが`role: patient`に切り替わり、別タブで開いていた医院ポータルが`/api/admin/*`を呼ぶと、認証ガード（`src/proxy.ts`）が`/home`へリダイレクトする。fetchはこのリダイレクトを自動的にたどり、`/home`のHTML（200 OK）をそのまま返す。呼び出し側は`res.ok`しかチェックしていなかったため、HTMLを`res.json()`でパースしようとして分かりにくいJSエラーがそのまま表示されていた。
- **対処**：`src/lib/parseJsonResponse.ts`（成功レスポンスのcontent-typeを確認し、JSON以外なら「セッションの状態が変わった可能性があります。ページを再読み込みしてください。」という分かりやすいエラーを投げる）を新設し、`src/app/admin/patients/page.tsx`に適用（2026-07-19）。同様の`fetch().then(res => res.json())`パターンは他に27ファイルあり、そちらは今回未対応（新規実装・修正時に順次適用する方針）。
- **気づくためのチェック**：複数ロールを同時に確認したい場合は、片方を別ブラウザまたはシークレット/プライベートウィンドウで開く（同一ブラウザの別タブは避ける）。「Unexpected token '<'」系のエラーを見たら、まずこの複数タブ・ロール競合を疑う。新しいfetch処理を書くときは、成功時の`res.json()`も`parseJsonResponse()`経由にする。

## Web特有のエラーへの共通対策（2026-07-19、上記2件を機に横展開）

上記のセッション競合対応をきっかけに、同種の「Webアプリ特有の見落としがちなエラー」を洗い出し、共通フックを新設した。

- **race condition（画面遷移直後の古いfetchレスポンスによる上書き）**：`src/hooks/useSafeState.ts`（アンマウント後はsetStateを何もしない、useStateと同じ使い方）を新設し、マウント時に自動fetchする`usePatientClinicBranding`・`useActiveClinic`・`usePrimaryDoctor`の3フックに適用済み。`useSignupPinRegenerate`のようなユーザー操作起点のフック（既に`submitting`相当の状態を持つ）は対象外。
- **二重送信（フォーム連打による重複データ）**：`src/hooks/useSubmitGuard.ts`（処理中は多重実行しない、`submitting`フラグをボタンの`disabled`に使える）を新設し、`src/app/admin/patients/page.tsx`の`handleSave`・`handleDelete`に適用済み。`src/components/ui/ConfirmDialog.tsx`に`disabled` propを追加（後方互換、他の使用箇所には影響なし）。他ページは今回未対応（新規実装・修正時に順次適用）。
- **hydration mismatch（サーバーとクライアントで表示が食い違う）**：`src/app/home/page.tsx`の挨拶文（朝/昼/夜の判定に`new Date().getHours()`を使用）が、レンダリング中に直接呼ばれていた。VercelのサーバーはUTC・クライアントはJSTのため、時刻境界付近でSSRとCSRの初回描画が食い違いhydration警告が出る可能性があった。SSR/CSR初回描画では中立的な文言（「こんにちは」）を使い、マウント後の`useEffect`でのみ実際の時刻ベースの文言に更新するよう修正（`react-hooks/set-state-in-effect`はマウント時1回だけの値確定という正当な理由でコメント付きで無効化）。
- **気づくためのチェック**：新しく「マウント時に自動fetchするカスタムフック」を書くときは素の`useState`ではなく`useSafeState`を使う。新しい「保存・削除ボタン」を書くときは`useSubmitGuard`でラップし、ボタン/`ConfirmDialog`に`disabled`を渡す。`new Date()`や`Math.random()`等クライアント環境に依存する値をレンダリング中に直接使わない（`useEffect`後に確定させる）。

---

## 今後の運用方針

- Claude自身の作業ミス・見落とし・環境起因の問題に気づいたら、この`TROUBLESHOOTING.md`に追記してから次の作業に進む。
- 同じ症状に遭遇したら、まずこのファイルを検索してから調査を始める（車輪の再発明をしない）。
- 内容が古くなった・もう発生しなくなった項目は、放置せず更新または削除する。
