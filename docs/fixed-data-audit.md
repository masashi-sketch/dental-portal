# 全画面固定データ監査台帳

更新日: 2026-07-20

対象: `src/app/**/page.tsx` 全54ページルート、および画面から参照される主要コンポーネント

目的: 業務上の事実に見える固定データ、保存されない操作、未接続リンクをなくし、意図的な静的コンテンツと明確に区別する。

## 判定基準

- **実データ**: 認証済みAPI、Supabase、Sentry等から取得し、必要な書き込みも永続化される。
- **P0**: 架空の業務事実、疑似成功、未接続操作。最初に除去する。
- **P1**: 実データ化またはデータ所有主体の決定が必要。P0後に対応する。
- **外部待ち**: Shopify／Salesforceを正本とするためローカルでは成立させない。未連携表示または操作無効が正しい。
- **静的許可**: 説明文、選択肢、マニュアル、サービス一覧、フォーム入力例等。業務実績ではない固定コンテンツ。

## 患者・公開・認証画面（20画面）

| # | ルート | 現在のデータ源 | 判定 | 次の対応 |
|---:|---|---|---|---|
| 1 | `/` | NextAuth患者認証、医院branding API | 実データ | 維持。fallbackは汎用表示として許可 |
| 2 | `/home` | 医院branding、主治医、医院お知らせ、患者プロフィールAPI | 対応済み | 新設`/api/patient-portal/profile`（`resolveEffectivePatientId`経由）で患者名を実データ化。予約データ源が無いため予約欄は撤去済み |
| 3 | `/medication` | 患者注文、歯周病診断API | 対応済み | 注文日を`activeOrder.ordered_at`から実データ化。担当者・来院予定はデータ源が無いため撤去済み |
| 4 | `/clinic` | 医院紹介・スタッフAPI＋固定診療メニュー | **P1** | 診療メニューを医院設定へ移す。未設定なら表示しない |
| 5 | `/qa` | 公開中の医院Q&A API | 対応済み | `href="#"`の質問導線・共通ナビ・フッター法務リンクは撤去済み（正規ナビはPatientSidebarNav/BottomNav） |
| 6 | `/shop` | 患者向け公開商品API | 対応済み | 未接続共通リンク（ヘッダー・モバイルメニュー・フッター）は撤去済み |
| 7 | `/shop/[id]` | 患者向け公開商品API | 対応済み | 未接続共通リンクは撤去済み |
| 8 | `/subscription` | `subscription_available`商品のAPI、説明・特典は静的 | **外部待ち** | 未接続リンクは撤去済み。契約状態は作らない（Shopify確定待ち） |
| 9 | `/subscription/[id]` | 商品API＋参考料金シミュレーション | **外部待ち** | 未接続リンクは撤去済み。申込ボタン無効と「参考」表記を維持。Shopify確定前に契約成功を表示しない |
| 10 | `/join/[slug]` | 公開医院設定API、患者登録API | 実データ | 維持 |
| 11 | `/join/[slug]/mobile` | 公開医院設定API、患者登録API | 実データ | 維持 |
| 12 | `/join/verify` | 使い捨てトークン、NextAuth magic link | 実データ | 維持 |
| 13 | `/forgot-password` | 患者パスワード再設定API | 実データ | 維持 |
| 14 | `/reset-password` | 患者パスワード再設定確定API | 実データ | 維持 |
| 15 | `/clinic-login` | NextAuth医院credentials | 実データ | 維持 |
| 16 | `/clinic-forgot-password` | 医院パスワード再設定API | 実データ | 維持 |
| 17 | `/clinic-reset-password` | 医院パスワード再設定確定API | 実データ | 維持 |
| 18 | `/bgj-login` | Google OAuth | 実データ | 維持 |
| 19 | `/auth/signin` | 実際の3ポータル認証画面への導線 | 静的許可 | ポータル定義は設定値として維持 |
| 20 | `/auth/error` | 認証エラー種別と静的説明文 | 静的許可 | エラー文言として維持 |

## 医院ポータル（16画面）

| # | ルート | 現在のデータ源 | 判定 | 次の対応 |
|---:|---|---|---|---|
| 21 | `/admin` | `/bgj`と同型のサーバーリダイレクト（`redirect('/admin/dashboard')`） | 対応済み | `/clinic-login`のNextAuth認証後にここへ着地し、即座にdashboardへ進む |
| 22 | `/admin/dashboard` | `useAdminOverview`／`get_admin_overview` | 実データ | 参考注文金額と確定売上を引き続き区別 |
| 23 | `/admin/commission` | `useAdminOverview`／契約率／内部注文集計 | 実データ＋外部待ち | Shopify確定売上・確定コミッションは連携まで`—`を維持 |
| 24 | `/admin/orders` | 患者・商品・患者注文API | 実データ | 3 API初期取得を性能計測対象にする |
| 25 | `/admin/patients` | 患者API、医院設定API | 実データ | 維持 |
| 26 | `/admin/patients/[id]` | 患者・診断・歯周病マスタ・医院情報API | 実データ | 多段取得を性能計測対象にする |
| 27 | `/admin/products` | 医院別商品表示設定API | 実データ | 維持 |
| 28 | `/admin/news` | `ClinicAnnouncementManager`／医院お知らせAPI | 実データ | 維持 |
| 29 | `/admin/qa` | `ClinicQaManager`／医院Q&A API | 実データ | 維持 |
| 30 | `/admin/inquiry` | 医院問い合わせAPI、Slack通知 | 実データ | 維持 |
| 31 | `/admin/clinic-intro` | 医院紹介・スタッフAPI | 実データ | 維持 |
| 32 | `/admin/clinic-info/config` | 医院branding・患者ナビ設定API | 実データ | 維持 |
| 33 | `/admin/clinic-info/contract` | 医院取引条件API | 実データ | 維持 |
| 34 | `/admin/clinic-info/qr` | 医院QR・PIN設定API | 実データ | 維持 |
| 35 | `/admin/campaign` | 固定6件、追加・編集・削除ボタンは無効化済み | **P1** | 対応済み：追加・編集・削除ボタンを無効化し、注記バナーでサンプル表示であることを明示。残るのは所有主体決定後の実データ化 |
| 36 | `/admin/biogaia` | 固定6件、追加・編集・削除ボタンは無効化済み | **P1** | 対応済み：追加・編集・削除ボタンを無効化し、注記バナーでサンプル表示であることを明示。残るのはBGJ配信コンテンツ正本決定後の実データ化 |

## BGJポータル（18画面）

| # | ルート | 現在のデータ源 | 判定 | 次の対応 |
|---:|---|---|---|---|
| 37 | `/bgj` | `/bgj/dashboard`へのserver redirect | 静的許可 | 維持 |
| 38 | `/bgj/dashboard` | `get_bgj_dashboard_overview` RPC（`clinic_orders`・`clinic_visits`・医院・担当者マスタの集計） | 対応済み | KPI・アラート・注文・ランキング・月次売上推移を実データ化。アラート閾値は`/bgj/system/settings`でBGJが自己管理 |
| 39 | `/bgj/reports` | `get_bgj_sales_report` RPC | 対応済み | サマリー・月次推移・担当別・エリア別・上位得意先を実データ化。CSV出力は表示中タブの実データから生成。集計期間（月数）は`/bgj/system/settings`でBGJが自己管理 |
| 40 | `/bgj/customers` | 医院・取引条件・営業担当・ステータスAPI | 実データ | 4 API初期取得を性能計測対象にする |
| 41 | `/bgj/customers/[code]` | 医院詳細と各タブの実API | 実データ | 初期取得とタブ別取得を性能計測対象にする |
| 42 | `/bgj/patients` | BGJ患者検索API | 実データ | 維持 |
| 43 | `/bgj/inquiries/[id]` | 問い合わせ・返信API | 実データ | 維持 |
| 44 | `/bgj/manual` | 手順・利用マニュアルの静的定義 | 静的許可 | 仕様書として維持し、機能変更時に更新 |
| 45 | `/bgj/master/areas` | 担当エリアAPI | 実データ | 維持 |
| 46 | `/bgj/master/links` | 外部リンクAPI | 実データ | 維持 |
| 47 | `/bgj/master/products` | 商品マスタAPI | 実データ | 将来Shopify同期の投影先として維持 |
| 48 | `/bgj/master/roles` | 役職マスタAPI | 実データ | 維持 |
| 49 | `/bgj/master/staff` | 営業担当・役職・エリア・医院API＋固定担当変更履歴 | **P1（一部）** | 固定履歴を撤去。必要なら担当変更監査ログを新設 |
| 50 | `/bgj/master/statuses` | 得意先ステータスマスタAPI | 実データ | 維持 |
| 51 | `/bgj/system/apps` | 静的サービス台帳＋環境変数・Sentry API | 静的許可＋実データ | サービス台帳は構成情報として維持 |
| 52 | `/bgj/system/dashboard` | システム集計・Sentry・DB使用量API | 実データ | 3 API初期取得を性能計測対象にする |
| 53 | `/bgj/system/db` | DB使用量RPC/API | 実データ | 維持 |
| 54 | `/bgj/system/settings` | 共通設定API | 実データ | 維持 |

## 横断コンポーネントの監査結果

| 対象 | 現状 | 分類 | 対応 |
|---|---|---|---|
| `src/app/admin/components/AdminSidebar.tsx` | キャンペーン・記事の未読数と更新日時が固定 | 対応済み | `CONTENT_UNREAD`・未読バッジ表示ロジックを撤去（`/admin/campaign`・`/admin/biogaia`自体の操作無効化は#35・#36で対応済み） |
| `src/components/Header.tsx` / `Footer.tsx` | テスト医院名、`href="#"` | 対応済み | プロジェクト全体からimportされていない未使用コンポーネントと判明し削除（付随して同様に未使用だった`Sidebar.tsx`・`src/lib/constants.ts`も削除） |
| `src/app/layout.tsx` | metadataがテスト医院名 | **P1** | 汎用metadataまたは医院別metadataへ変更 |
| `bgj/dashboard/MonthlySalesChart.tsx` | 売上推移が固定 | 対応済み | `monthlySales`をpropsで受け取る設計に変更。担当者別直接描画は上位4名までとし、超過分は「その他」に合算（dataviz skillのCVD検証済みカテゴリカル色は4色まで） |
| `bgj/reports/ReportsCharts.tsx` | 月次・エリア別データが固定 | 対応済み | `monthlyTrend`・`byArea`をpropsで受け取る設計に変更 |
| `src/components/ProductVisual.tsx` | 実画像前の生成ビジュアル | 静的許可／外部待ち | 「画像準備中」相当として維持し、Shopify商品画像連携時に置換 |

## CI監査の運用

`npm run audit:static-data`は`src/app`と`src/components`の本番コードを走査し、以下を検出する。

- `href="#"`
- テスト医院名
- 患者・予約・注文情報に見える伏字
- 既知のローカル固定コレクション
- KPI・売上・ランキングの固定配列
- 固定得意先コード・固定日付
- handlerのない既知の追加ボタン
- 固定未読状態

既存候補は`config/static-business-data-allowlist.json`に件数・分類・理由を記録する。新規候補、件数増加、解消後に残った許可項目はいずれもCIを失敗させる。意図的な静的コンテンツを追加する場合も、理由なしでは許可しない。

## 性能計測の優先候補

まだ実測値ではない。コード上の複数取得から、次の順に基準値を取る。

1. `/admin/patients/[id]`：初期3 API＋患者確定後の医院情報API
2. `/bgj/customers`：初期4 API
3. `/bgj/master/staff`：初期4 API
4. `/bgj/customers/[code]`：初期医院情報＋営業担当＋ステータス、その後タブ別API
5. `/admin/orders`：初期3 API
6. `/bgj/system/dashboard`：初期3 API
7. 患者ホーム・商品画面：branding、主治医、商品、お知らせ等のhook間重複

計測前に一律統合・キャッシュは行わない。Web Vitals、API span、データ表示完了時間のp50／p75／p95を取得してから、目標を外れた画面だけを改善する。

## 消化順

1. 本台帳とCI監査を導入する。
2. P0から、疑似ログイン、患者情報プレースホルダー、固定未読、ローカルだけのキャンペーン／記事操作、`href="#"`を除去する。
3. Web VitalsとAPI／DB計測を追加し、性能基準レポートを作る。
4. BGJダッシュボード／レポートを実集計化する。
5. P1を消化し、Shopify／Salesforce連携時に外部待ち項目を正本データへ置換する。
