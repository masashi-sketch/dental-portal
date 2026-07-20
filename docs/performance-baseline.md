# レスポンス性能ベースライン

CLAUDE.md「レスポンス計測方針」3番（自動シナリオ計測）の実施記録。`scripts/measure-performance.mjs`（Playwright）でウォームアップ2回＋計測10回を各画面ごとに実行し、p50/p75/p95を記録する。実行コマンド：`npm run perf:measure`（`.env.local`の`TEST_CLINIC_LOGIN_ID`/`TEST_CLINIC_LOGIN_PASSWORD`を使用）。

## 対象範囲（2026-07-20時点）

- **医院ポータル**：`clinic-credentials`でログインし実施。対象アカウントは広島中央歯科クリニック。
- **患者ポータル**：直接ログイン用のテスト患者アカウントが無いため、医院スタッフの「患者ポータルをプレビュー」と同じ`demo-patient-id`クッキー機構を使って到達。実際の患者ログインフロー（`patient-credentials`によるNextAuth認証）自体の時間は含まない。
- **BGJポータル**：Google OAuthの画面自体は自動操作せず、アプリ本体と同じ`AUTH_SECRET`でNextAuthのセッションCookieを直接発行して注入する方式（`scripts/mintTestSession.mjs`）で到達している。localhost以外への発行は`assertLocalBaseUrl()`が例外を投げて拒否する安全策付き（詳細はCLAUDE.md「セキュリティ方針」）。

## 環境と既知の制約

- **ローカルdevサーバー（`npm run dev --webpack`）に対する計測であり、本番Vercel環境を代表する数値ではない。** webpack dev modeはルート初回アクセス時にオンデマンドコンパイルが走るため、ウォームアップ2回でコンパイルキャッシュを温めた上で計測しているが、本番のようなエッジキャッシュ・CDN・ビルド最適化は効いていない。dev環境の遅さも既知のトラブルとして扱う方針（本番評価に直結しないというだけで無視しない）。
- 計測完了の判定はPlaywrightの`waitUntil: 'networkidle'`（同時接続2以下が500ms継続）を使用しており、**この待機自体が各サンプルに約500msの下駄を履かせている**。絶対値ではなくページ間の相対比較・p50とp95の開き方を重視して読む。
- サンプル数は1セッション・1回の実行で各ステップ10計測（+ウォームアップ2回）。複数日・複数回の実行による再現性検証はまだ行っていない。
- 計測マシンはユーザーのローカルmacOS環境で、他プロセスと共存した状態での実行（専用の負荷試験環境ではない）。

## 計測結果（2026-07-20、commit `9124869`時点のコード。医院・患者シナリオのみ確定値）

マシンのスワップがほぼ枯渇する高負荷状態が計測中に発生し、以降の実行（BGJシナリオ追加後を含む）はp95が2〜3倍に悪化する等ノイズが大きくなったため、**負荷が軽かった最初の成功実行の値のみを確定値として採用する**。単位はms。

| ページ | p50 | p75 | p95 | TTFB p50 | domContentLoaded p50 | loadEvent p50 |
|---|---:|---:|---:|---:|---:|---:|
| 医院: ダッシュボード (/admin/dashboard) | 1873 | 1930 | 3041 | 39 | 74 | 588 |
| 医院: 注文 (/admin/orders) | 1834 | 2228 | 2988 | 37 | 74 | 573 |
| 医院: 患者詳細 (/admin/patients/[id]) | 1952 | 2218 | 2984 | 38 | 81 | 638 |
| 患者: ホーム (/home) | 1797 | 1826 | 2185 | 34 | 77 | 586 |
| 患者: 受け取り (/medication) | 1659 | 1937 | 2315 | 30 | 78 | 597 |
| 患者: 定期購入 (/subscription) | 1800 | 1883 | 2352 | 34 | 78 | 596 |

- **BGJシナリオ（ダッシュボード→得意先一覧→得意先詳細→レポート）は自動計測の仕組み自体は完成・動作確認済み**（`scripts/mintTestSession.mjs`によるセッション注入、`portal-selected`Cookie込みで`/bgj/customers`まで到達し実データを取得できることを確認）だが、マシン負荷の影響で信頼できる数値が取れていない。マシンが空いているタイミングで`npm run perf:measure`を再実行し、この節を更新する。

## API内訳（マウント後に発生したfetch呼び出し、各ページ1回ずつのサンプル。呼び出し内容の把握が目的で、所要時間は未取得）

| ページ | 発生したAPI呼び出し |
|---|---|
| /admin/dashboard | `/api/bgj/external-links`（307）, `/api/auth/session`×2, `/api/admin/overview`, `/api/admin/clinic-info`×2 |
| /admin/orders | `/api/bgj/external-links`（307）, `/api/auth/session`×2, `/api/admin/product-settings`, `/api/admin/orders`, `/api/admin/patients`, `/api/admin/clinic-info` |
| /admin/patients/[id] | `/api/bgj/external-links`（307）, `/api/auth/session`×2, `/api/periodontal/master`, `/api/admin/patients/[id]/diagnoses`, `/api/admin/patients/[id]`, `/api/admin/clinic-info`×2 |
| /home | `/api/patient-portal/clinic-intro`, `/api/patient-portal/clinic-branding`, `/api/auth/session`×2, `/api/patient-portal/announcements`, `/api/patient-portal/profile` |
| /medication | `/api/auth/session`×2, `/api/patient-portal/clinic-branding`, `/api/patient-portal/orders`, `/api/patient-portal/diagnosis` |
| /subscription | `/api/patient-portal/clinic-branding`, `/api/patient-portal/clinic-intro`, `/api/auth/session`×2, `/api/patient-portal/products` |

（`/api/auth/session`が毎回2回呼ばれている点、`/api/bgj/external-links`への307リダイレクトが医院ポータルの全ページで発生している点は、それ自体が軽微な無駄呼び出しの可能性があり次点の調査候補）

## 分析・ボトルネック候補

- **`loadEvent`（〜600ms前後）と`wallMs`＝networkidle到達（1700〜2000ms前後）の間に約1100〜1600msの差がある。** これは初期HTML/JSの読み込み完了後、クライアント側`useEffect`でのAPI fetchが完了するまでの時間であり、現状のボトルネックの主因と見られる。TTFB（30〜40ms）・domContentLoaded（70〜90ms）はいずれも十分速く、サーバー応答自体は問題ない。
- 医院の「注文」「患者詳細」ページは、上記表のAPI内訳の通り1画面あたり6〜8本のfetchが発生しており、患者ポータル系（4〜6本）より本数が多い。p75が2.0秒目標をわずかに超えているのはこの2ページ（注文2228ms、患者詳細2218ms）で、fetch本数の多さと相関している可能性が高い。
- `waitUntil: 'networkidle'`は同時接続2以下が500ms継続するまで待つため、計測値には約500msの下駄が含まれる。これを差し引いても医院の「注文」「患者詳細」は他ページよりAPI待機が長い。

## 性能目標との比較

CLAUDE.md記載の目標（画面データ表示完了 p75: 2.0秒以内、p95: 3.5秒以内）に対し、`wallMs`を最も近い代理指標として比較する。**dev環境の計測であり本番の代理値ではないため、目標未達＝即問題ではない**が、傾向の把握には使える。

| ページ | p75目標(2.0s)に対して | p95目標(3.5s)に対して |
|---|---|---|
| 医院: ダッシュボード | ○ 1930ms | ○ 3041ms |
| 医院: 注文 | ✕ 2228ms（228ms超過） | ○ 2988ms |
| 医院: 患者詳細 | ✕ 2218ms（218ms超過） | ○ 2984ms |
| 患者: ホーム | ○ 1826ms | ○ 2185ms |
| 患者: 受け取り | ○ 1937ms | ○ 2315ms |
| 患者: 定期購入 | ○ 1883ms | ○ 2352ms |

## 次のステップ

1. マシンが空いているタイミングで`npm run perf:measure`を再実行し、BGJシナリオの数値とAPI呼び出しの所要時間（durationMs）を確定させる。
2. 本番URL（読み取り専用の遷移のみ）に対する同シナリオの計測を実施し、dev環境との差分を確認する。
3. 医院の「注文」「患者詳細」で発生している複数fetchが直列/並列どちらで発生しているかをコードレベルで確認し、直列になっている箇所があれば`Promise.all`統合を検討する（`bgj/customers/[code]`で実施済みのパターン）。`/api/auth/session`の重複呼び出し・`/api/bgj/external-links`への307リダイレクトの要否も合わせて確認する。
4. 重要API（`/api/bgj/dashboard-overview`・`/api/bgj/sales-report`・`/api/admin/overview`等）にServer-Timingヘッダーを追加し、認証／Supabase照会／RPC別の内訳を取れるようにする（レスポンス計測方針2番、未着手）。
5. 定期的な再計測（週次・リリース前等）をルール化し、このファイルの数値を更新し続ける。
