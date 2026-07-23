#!/usr/bin/env python3

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
import re
from xml.sax.saxutils import escape, quoteattr
from zipfile import ZIP_DEFLATED, ZipFile


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "project_clinic_order_management_db_definition.xlsx"


@dataclass
class ColumnDefinition:
    japanese_name: str
    physical_name: str
    data_type: str
    key: str = ""
    nullable: str = "NO"
    default: str = ""
    reference_or_constraint: str = ""
    description: str = ""


@dataclass
class TableDefinition:
    phase: str
    japanese_name: str
    physical_name: str
    status: str
    purpose: str
    columns: list[ColumnDefinition]


@dataclass
class Sheet:
    name: str
    cells: dict[tuple[int, int], tuple[str, int]] = field(default_factory=dict)
    merges: list[str] = field(default_factory=list)
    widths: dict[int, float] = field(default_factory=dict)
    heights: dict[int, float] = field(default_factory=dict)
    freeze_row: int | None = None
    freeze_col: int | None = None
    auto_filter: str | None = None
    landscape: bool = True

    def set(self, row: int, column: int, value: object, style: int = 4) -> None:
        self.cells[(row, column)] = ("" if value is None else str(value), style)

    def merge(self, start_row: int, start_col: int, end_row: int, end_col: int) -> None:
        self.merges.append(f"{cell_ref(start_row, start_col)}:{cell_ref(end_row, end_col)}")

    def merged_value(
        self,
        start_row: int,
        start_col: int,
        end_row: int,
        end_col: int,
        value: object,
        style: int,
    ) -> None:
        self.set(start_row, start_col, value, style)
        self.merge(start_row, start_col, end_row, end_col)


def c(
    japanese_name: str,
    physical_name: str,
    data_type: str,
    key: str = "",
    nullable: str = "NO",
    default: str = "",
    constraint: str = "",
    description: str = "",
) -> ColumnDefinition:
    return ColumnDefinition(
        japanese_name,
        physical_name,
        data_type,
        key,
        nullable,
        default,
        constraint,
        description,
    )


CURRENT_TABLES = [
    TableDefinition(
        "現行",
        "医院",
        "clinics",
        "実装済み・参照先",
        "患者注文を医院単位に分離する親マスタ。注文ERでは主要列のみ掲載。",
        [
            c("得意先コード", "customer_code", "text", "PK", default="-", constraint="^[A-Z]\\d{6}$"),
            c("医院名", "name", "text"),
        ],
    ),
    TableDefinition(
        "現行",
        "患者",
        "patients",
        "実装済み・参照先",
        "医院に所属する患者。注文ERでは主要列のみ掲載。",
        [
            c("患者ID", "id", "uuid", "PK", default="gen_random_uuid()"),
            c("得意先コード", "customer_code", "text", "FK", constraint="clinics.customer_code"),
            c("患者番号", "patient_no", "text", nullable="NO", default="生成列 T-+5桁"),
            c("患者氏名", "name", "text"),
            c("患者状態", "status", "text", default="有効", constraint="有効 / 無効"),
        ],
    ),
    TableDefinition(
        "現行",
        "商品",
        "products",
        "実装済み・参照先",
        "注文時の商品スナップショット元。注文ERでは主要列のみ掲載。",
        [
            c("商品ID", "id", "uuid", "PK", default="gen_random_uuid()"),
            c("商品名", "name", "text"),
            c("基準価格", "price", "integer", nullable="NO", constraint=">= 0"),
            c("商品画像URL", "image_url", "text", nullable="YES", description="Supabase Storage公開URL"),
            c("公開状態", "status", "text", default="下書き", constraint="公開 / 下書き"),
        ],
    ),
    TableDefinition(
        "現行",
        "医院契約情報",
        "clinic_terms",
        "実装済み・価格計算元",
        "医院ごとの契約仕切値率。仕切値は基準価格×仕切値率を1円単位で四捨五入し、保存しない。",
        [
            c("得意先コード", "customer_code", "text", "PK / FK", constraint="clinics.customer_code ON DELETE CASCADE"),
            c("コミッション率", "commission_rate", "numeric(5,2)", default="0"),
            c("仕切値率", "wholesale_rate", "numeric(5,2)", default="0", constraint="0〜100"),
            c("支払条件", "payment_terms_site", "text", nullable="YES"),
            c("支払方法", "payment_method", "text", nullable="YES"),
            c("契約開始日", "contract_started_at", "date", nullable="YES"),
            c("契約更新日", "contract_renewal_at", "date", nullable="YES"),
            c("更新日時", "updated_at", "timestamptz", default="now()"),
            c("更新者", "updated_by", "text", nullable="YES"),
        ],
    ),
    TableDefinition(
        "現行",
        "医院商品設定",
        "clinic_product_settings",
        "実装済み・患者表示／定期価格",
        "医院×商品の表示設定、医院通常価格、3ヶ月／6ヶ月定期価格。期間別価格がNULLなら医院通常価格を使用する。",
        [
            c("得意先コード", "customer_code", "text", "PK / FK", constraint="clinics.customer_code ON DELETE CASCADE"),
            c("商品ID", "product_id", "uuid", "PK / FK", constraint="products.id ON DELETE CASCADE"),
            c("表示可否", "is_visible", "boolean", default="true"),
            c("医院通常価格", "clinic_price", "integer", nullable="YES", constraint=">= 0。NULLは基準価格を使用"),
            c("3ヶ月価格", "subscription_3_month_price", "integer", nullable="YES", constraint=">= 0。NULLは医院通常価格を使用"),
            c("6ヶ月価格", "subscription_6_month_price", "integer", nullable="YES", constraint=">= 0。NULLは医院通常価格を使用"),
            c("更新日時", "updated_at", "timestamptz", default="now()"),
        ],
    ),
    TableDefinition(
        "現行",
        "患者注文",
        "patient_orders",
        "実装済み",
        "医院が管理する患者注文ヘッダー。内部注文IDは将来も維持する。",
        [
            c("内部注文ID", "id", "uuid", "PK", default="gen_random_uuid()"),
            c("得意先コード", "customer_code", "text", "FK / UK2構成", constraint="clinics.customer_code"),
            c("患者ID", "patient_id", "uuid", "FK", constraint="patients.id ON DELETE CASCADE", description="本番前にRESTRICT等へ変更予定"),
            c("注文区分", "order_type", "text", default="one_time", constraint="one_time / subscription"),
            c("受取方法", "fulfillment_method", "text", default="pickup", constraint="pickup / delivery"),
            c("医院業務状態", "status", "text", default="received", constraint="received / preparing / ready / shipped / completed / canceled"),
            c("注文日時", "ordered_at", "timestamptz", default="now()"),
            c("次回提供予定日", "next_fulfillment_date", "date", nullable="YES"),
            c("作成元", "source", "text", "UK1構成", default="internal", constraint="internal / shopify"),
            c("登録経路", "created_via", "text", default="clinic_portal", constraint="clinic_portal / bgj_portal / shopify"),
            c("外部注文ID", "external_order_id", "text", "UK1構成", nullable="YES"),
            c("同期状態", "sync_status", "text", default="local", constraint="local / pending / synced / error"),
            c("同期エラー", "sync_error", "text", nullable="YES"),
            c("冪等キー", "idempotency_key", "uuid", "UK2構成", nullable="YES"),
            c("外部更新日時", "external_updated_at", "timestamptz", nullable="YES"),
            c("作成日時", "created_at", "timestamptz", default="now()"),
            c("更新日時", "updated_at", "timestamptz", default="now()"),
        ],
    ),
    TableDefinition(
        "現行",
        "患者注文明細",
        "patient_order_items",
        "実装済み",
        "商品変更後も過去注文を保持するため、注文時点の値を保存する。",
        [
            c("注文明細ID", "id", "uuid", "PK", default="gen_random_uuid()"),
            c("内部注文ID", "order_id", "uuid", "FK", constraint="patient_orders.id ON DELETE CASCADE"),
            c("商品ID", "product_id", "uuid", "FK", nullable="YES", constraint="products.id ON DELETE SET NULL"),
            c("注文時商品名", "product_name", "text"),
            c("注文時単価", "unit_price", "integer", nullable="NO", constraint=">= 0"),
            c("数量", "quantity", "integer", default="1", constraint="> 0"),
            c("単位スナップショット", "unit_snapshot", "text", nullable="YES"),
            c("画像種別スナップショット", "image_type_snapshot", "text", default="supplement", constraint="supplement / yogurt / toothbrush / oral"),
            c("画像URLスナップショット", "image_url_snapshot", "text", nullable="YES"),
            c("用量スナップショット", "daily_amount_snapshot", "text", nullable="YES"),
            c("内容量スナップショット", "volume_snapshot", "text", nullable="YES"),
            c("注意事項スナップショット", "caution_snapshot", "text", nullable="YES"),
            c("外部明細ID", "external_line_item_id", "text", nullable="YES"),
            c("作成日時", "created_at", "timestamptz", default="now()"),
        ],
    ),
    TableDefinition(
        "現行",
        "送り先マスタ",
        "delivery_destinations",
        "実装済み",
        "医院または患者が複数所有できる送り先。論理削除と既定送り先を管理する。",
        [
            c("送り先ID", "id", "uuid", "PK", default="gen_random_uuid()"),
            c("医院得意先コード", "clinic_customer_code", "text", "FK", nullable="YES", constraint="clinics.customer_code ON DELETE RESTRICT"),
            c("患者ID", "patient_id", "uuid", "FK", nullable="YES", constraint="patients.id ON DELETE RESTRICT"),
            c("送り先名", "label", "text", constraint="1〜50文字"),
            c("郵便番号", "postal_code", "text", constraint="^[0-9]{3}-[0-9]{4}$"),
            c("都道府県", "prefecture", "text", constraint="2〜4文字"),
            c("市区町村", "city", "text", constraint="1〜100文字"),
            c("住所1", "address_line1", "text", constraint="1〜200文字"),
            c("住所2", "address_line2", "text", nullable="YES", constraint="200文字以内"),
            c("受取人名", "recipient_name", "text", constraint="1〜100文字"),
            c("電話番号", "phone", "text", constraint="数字10〜15桁"),
            c("既定", "is_default", "boolean", default="false"),
            c("削除日時", "deleted_at", "timestamptz", nullable="YES"),
            c("作成日時", "created_at", "timestamptz", default="now()"),
            c("更新日時", "updated_at", "timestamptz", default="now()"),
        ],
    ),
    TableDefinition(
        "現行",
        "注文配送先",
        "order_delivery_destinations",
        "実装済み",
        "選択した送り先を注文時点の不変スナップショットとして1対1で保存する。",
        [
            c("内部注文ID", "order_id", "uuid", "PK / FK", constraint="patient_orders.id ON DELETE CASCADE"),
            c("送り先ID", "delivery_destination_id", "uuid", "FK", constraint="delivery_destinations.id ON DELETE RESTRICT"),
            c("送り先名", "label", "text"),
            c("郵便番号", "postal_code", "text"),
            c("都道府県", "prefecture", "text"),
            c("市区町村", "city", "text"),
            c("住所1", "address_line1", "text"),
            c("住所2", "address_line2", "text", nullable="YES"),
            c("受取人名", "recipient_name", "text"),
            c("電話番号", "phone", "text"),
            c("作成日時", "created_at", "timestamptz", default="now()"),
        ],
    ),
    TableDefinition(
        "現行",
        "注文操作履歴",
        "patient_order_events",
        "実装済み",
        "注文登録と状態変更について、操作者と変更前後の状態を保存する監査イベント。",
        [
            c("イベントID", "id", "uuid", "PK", default="gen_random_uuid()"),
            c("内部注文ID", "order_id", "uuid", "FK", constraint="patient_orders.id ON DELETE CASCADE"),
            c("イベント種別", "event_type", "text"),
            c("操作者種別", "actor_type", "text"),
            c("操作者識別子", "actor_identifier", "text"),
            c("変更前状態", "from_status", "text", nullable="YES"),
            c("変更後状態", "to_status", "text", nullable="YES"),
            c("発生日時", "created_at", "timestamptz", default="now()"),
        ],
    ),
    TableDefinition("現行", "定期購入申込", "patient_subscription_requests", "実装済み",
        "患者が送信しBGJが審査する申込。Shopify契約・実受注とは分離する。", [
            c("申込ID", "id", "uuid", "PK", default="gen_random_uuid()"),
            c("申込番号", "request_number", "bigint", "UK", default="identity"),
            c("得意先コード", "customer_code", "text", "FK / UK2構成", constraint="clinics.customer_code ON DELETE RESTRICT"),
            c("患者ID", "patient_id", "uuid", "FK", constraint="patients.id ON DELETE RESTRICT"),
            c("契約期間月数", "term_months", "smallint", constraint="3 / 6"),
            c("受け取り方法", "fulfillment_method", "text", constraint="pickup / delivery"),
            c("申込状態", "status", "text", default="submitted", constraint="submitted / approved / rejected / canceled"),
            c("冪等キー", "idempotency_key", "uuid", "UK2構成"),
            c("排他バージョン", "version", "integer", default="1"),
            c("申込日時", "submitted_at", "timestamptz", default="now()"),
            c("審査日時", "reviewed_at", "timestamptz", nullable="YES"),
            c("取消日時", "canceled_at", "timestamptz", nullable="YES"),
            c("作成日時", "created_at", "timestamptz", default="now()"),
            c("更新日時", "updated_at", "timestamptz", default="now()"),
        ]),
    TableDefinition("現行", "定期購入申込明細", "patient_subscription_request_items", "実装済み",
        "申込時点の商品名・期間別月額・画像と数量を保存する。", [
            c("明細ID", "id", "uuid", "PK", default="gen_random_uuid()"),
            c("申込ID", "request_id", "uuid", "FK / UK1構成", constraint="patient_subscription_requests.id ON DELETE CASCADE"),
            c("商品ID", "product_id", "uuid", "FK / UK1構成", nullable="YES", constraint="products.id ON DELETE SET NULL"),
            c("申込時商品名", "product_name", "text"),
            c("申込時月額", "unit_price", "integer", constraint=">= 0"),
            c("数量", "quantity", "integer", constraint="1〜100"),
            c("申込時画像URL", "image_url_snapshot", "text", nullable="YES"),
            c("作成日時", "created_at", "timestamptz", default="now()"),
        ]),
    TableDefinition("現行", "定期購入申込配送先", "patient_subscription_request_destinations", "実装済み",
        "申込時点の医院または患者送り先を1対1で不変保存する。", [
            c("申込ID", "request_id", "uuid", "PK / FK", constraint="patient_subscription_requests.id ON DELETE CASCADE"),
            c("送り先ID", "delivery_destination_id", "uuid", "FK", constraint="delivery_destinations.id ON DELETE RESTRICT"),
            c("送り先名", "label", "text"), c("郵便番号", "postal_code", "text"),
            c("都道府県", "prefecture", "text"), c("市区町村", "city", "text"),
            c("住所1", "address_line1", "text"), c("住所2", "address_line2", "text", nullable="YES"),
            c("受取人名", "recipient_name", "text"), c("電話番号", "phone", "text"),
            c("作成日時", "created_at", "timestamptz", default="now()"),
        ]),
    TableDefinition("現行", "定期購入申込履歴", "patient_subscription_request_events", "実装済み",
        "申込・承認・却下・取消の操作者、変更前後、理由を監査保存する。", [
            c("イベントID", "id", "uuid", "PK", default="gen_random_uuid()"),
            c("申込ID", "request_id", "uuid", "FK", constraint="patient_subscription_requests.id ON DELETE CASCADE"),
            c("イベント種別", "event_type", "text"), c("操作者種別", "actor_type", "text"),
            c("操作者識別子", "actor_identifier", "text"), c("変更前状態", "from_status", "text", nullable="YES"),
            c("変更後状態", "to_status", "text"), c("理由", "reason", "text", nullable="YES"),
            c("発生日時", "created_at", "timestamptz", default="now()"),
        ]),
    TableDefinition("現行", "ウェビナー", "webinars", "実装済み・Phase 1",
        "BGJが管理するプロバイダー非依存のウェビナー本体。", [
            c("ウェビナーID", "id", "uuid", "PK", default="gen_random_uuid()"),
            c("タイトル", "title", "text", constraint="1〜200文字"),
            c("説明", "description", "text", nullable="YES"),
            c("公開状態", "status", "text", default="draft", constraint="draft / published / canceled"),
            c("主催者メール", "organizer_email", "text"), c("排他バージョン", "version", "integer", default="1"),
            c("公開日時", "published_at", "timestamptz", nullable="YES"), c("中止日時", "canceled_at", "timestamptz", nullable="YES"),
            c("作成日時", "created_at", "timestamptz", default="now()"), c("更新日時", "updated_at", "timestamptz", default="now()"),
        ]),
    TableDefinition("現行", "ウェビナー開催枠", "webinar_sessions", "実装済み・Phase 1",
        "開催日時、Google Meet／Zoomと参加URLを本体から分離する。", [
            c("開催枠ID", "id", "uuid", "PK", default="gen_random_uuid()"),
            c("ウェビナーID", "webinar_id", "uuid", "FK / UK1構成", constraint="webinars.id ON DELETE CASCADE"),
            c("配信サービス", "provider", "text", constraint="google_meet / zoom"),
            c("開始日時", "starts_at", "timestamptz", "UK1構成"), c("終了日時", "ends_at", "timestamptz", constraint="開始より後"),
            c("タイムゾーン", "timezone", "text", default="Asia/Tokyo"), c("参加URL", "join_url", "text", constraint="https://"),
            c("外部スペースID", "external_space_id", "text", nullable="YES", description="API連携後に使用"),
            c("作成日時", "created_at", "timestamptz", default="now()"), c("更新日時", "updated_at", "timestamptz", default="now()"),
        ]),
    TableDefinition("現行", "ウェビナー対象医院", "webinar_target_clinics", "実装済み・Phase 1",
        "公開対象となる医院をウェビナーとの多対多中間表で管理する。", [
            c("ウェビナーID", "webinar_id", "uuid", "PK / FK", constraint="webinars.id ON DELETE CASCADE"),
            c("得意先コード", "customer_code", "text", "PK / FK", constraint="clinics.customer_code ON DELETE RESTRICT"),
            c("作成日時", "created_at", "timestamptz", default="now()"),
        ]),
    TableDefinition("現行", "ウェビナー操作履歴", "webinar_events", "実装済み・Phase 1",
        "作成・編集・公開・中止を監査保存する。", [
            c("イベントID", "id", "uuid", "PK", default="gen_random_uuid()"),
            c("ウェビナーID", "webinar_id", "uuid", "FK", constraint="webinars.id ON DELETE CASCADE"),
            c("イベント種別", "event_type", "text"), c("操作者メール", "actor_email", "text"),
            c("変更前状態", "from_status", "text", nullable="YES"), c("変更後状態", "to_status", "text"),
            c("発生日時", "created_at", "timestamptz", default="now()"),
        ]),
    TableDefinition("現行", "医院業務連絡担当者", "clinic_contacts", "実装済み",
        "医院ごとに複数の業務連絡担当者と主担当、論理削除、排他制御を管理する。", [
            c("担当者ID", "id", "uuid", "PK", default="gen_random_uuid()"),
            c("得意先コード", "customer_code", "text", "FK", constraint="clinics.customer_code ON DELETE RESTRICT"),
            c("医院ログインID", "clinic_user_id", "uuid", "FK", nullable="YES", constraint="clinic_users.id ON DELETE SET NULL"),
            c("氏名", "name", "text"), c("部署", "department", "text", nullable="YES"), c("役職", "title", "text", nullable="YES"),
            c("メールアドレス", "email", "text", nullable="YES"), c("電話番号", "phone", "text", nullable="YES"),
            c("主担当", "is_primary", "boolean", default="false"), c("状態", "status", "text", default="active", constraint="active / inactive"),
            c("備考", "notes", "text", nullable="YES"), c("排他バージョン", "version", "integer", default="1"),
            c("論理削除日時", "deleted_at", "timestamptz", nullable="YES"),
            c("作成日時", "created_at", "timestamptz", default="now()"), c("更新日時", "updated_at", "timestamptz", default="now()"),
        ]),
    TableDefinition("現行", "担当者通知設定", "clinic_contact_notification_preferences", "実装済み",
        "担当者ごとの連絡内容と方法を多値属性として分離する。", [
            c("担当者ID", "contact_id", "uuid", "PK / FK", constraint="clinic_contacts.id ON DELETE RESTRICT"),
            c("通知種別", "topic", "text", "PK", constraint="webinar / orders / billing / product / system / sales"),
            c("連絡方法", "channel", "text", "PK", constraint="email / phone"),
            c("有効", "enabled", "boolean", default="true"),
            c("作成日時", "created_at", "timestamptz", default="now()"), c("更新日時", "updated_at", "timestamptz", default="now()"),
        ]),
    TableDefinition("現行", "担当者操作履歴", "clinic_contact_events", "実装済み",
        "登録・更新・無効化・主担当変更・論理削除を監査保存する。", [
            c("イベントID", "id", "uuid", "PK", default="gen_random_uuid()"),
            c("担当者ID", "contact_id", "uuid", "FK", constraint="clinic_contacts.id ON DELETE RESTRICT"),
            c("イベント種別", "event_type", "text"), c("操作者種別", "actor_type", "text"),
            c("操作者識別子", "actor_identifier", "text"), c("発生日時", "created_at", "timestamptz", default="now()"),
        ]),
]


FUTURE_TABLES = [
    TableDefinition(
        "Shopify接続",
        "外部コマース接続",
        "commerce_accounts",
        "将来案",
        "Shopifyストア等の外部接続先。医院との対応方式は接続構成確定後に決定する。",
        [
            c("接続ID", "id", "uuid", "PK", default="gen_random_uuid()"),
            c("プロバイダー", "provider", "text", "UK1構成", constraint="shopify 等"),
            c("外部アカウントID", "external_account_id", "text", "UK1構成"),
            c("接続状態", "status", "text", default="active"),
            c("作成日時", "created_at", "timestamptz", default="now()"),
            c("更新日時", "updated_at", "timestamptz", default="now()"),
        ],
    ),
    TableDefinition(
        "Shopify接続",
        "患者注文拡張",
        "patient_orders",
        "既存テーブル拡張案",
        "既存IDを維持し、外部・金額・排他制御の列を追加する。",
        [
            c("定期購入契約ID", "subscription_id", "uuid", "FK", nullable="YES", constraint="patient_subscriptions.id"),
            c("外部接続ID", "commerce_account_id", "uuid", "FK / UK5構成", nullable="YES", constraint="commerce_accounts.id"),
            c("外部注文ID", "external_order_id", "text", "UK5構成", nullable="YES"),
            c("医院業務状態", "clinic_fulfillment_status", "text", default="received"),
            c("外部注文状態", "external_order_status", "text", nullable="YES"),
            c("決済状態", "payment_status", "text", nullable="YES"),
            c("外部配送状態", "external_fulfillment_status", "text", nullable="YES"),
            c("通貨コード", "currency", "char(3)", default="JPY"),
            c("参考注文金額", "reference_amount", "bigint", nullable="YES"),
            c("確定総額", "confirmed_total_amount", "bigint", nullable="YES"),
            c("返金額", "refunded_amount", "bigint", nullable="YES"),
            c("排他制御バージョン", "version", "integer", default="1"),
        ],
    ),
    TableDefinition(
        "Shopify接続",
        "患者注文明細拡張",
        "patient_order_items",
        "既存テーブル拡張案",
        "外部明細と通貨を明確化し、既存スナップショットを維持する。",
        [
            c("外部明細ID", "external_line_item_id", "text", nullable="YES"),
            c("通貨コード", "currency", "char(3)", default="JPY"),
        ],
    ),
    TableDefinition(
        "決済接続",
        "決済返金投影",
        "order_transaction_projections",
        "将来案",
        "Shopify上の決済・返金を表示する投影。会計台帳ではない。",
        [
            c("取引投影ID", "id", "uuid", "PK", default="gen_random_uuid()"),
            c("内部注文ID", "order_id", "uuid", "FK", constraint="patient_orders.id"),
            c("外部取引ID", "external_transaction_id", "text", "UK"),
            c("取引種別", "transaction_type", "text", constraint="authorization / capture / refund 等"),
            c("取引状態", "status", "text"),
            c("金額", "amount", "bigint"),
            c("通貨コード", "currency", "char(3)"),
            c("処理日時", "processed_at", "timestamptz", nullable="YES"),
            c("外部更新日時", "external_updated_at", "timestamptz"),
        ],
    ),
    TableDefinition(
        "配送開始",
        "受取配送",
        "patient_fulfillments",
        "将来案",
        "医院受け取り・配送・部分引き渡しの単位。",
        [
            c("受取配送ID", "id", "uuid", "PK", default="gen_random_uuid()"),
            c("内部注文ID", "order_id", "uuid", "FK", constraint="patient_orders.id"),
            c("受取配送区分", "fulfillment_type", "text", constraint="pickup / delivery"),
            c("状態", "status", "text"),
            c("受取人スナップショット", "recipient_snapshot", "text", nullable="YES"),
            c("住所スナップショット", "address_snapshot", "jsonb", nullable="YES"),
            c("配送会社", "carrier", "text", nullable="YES"),
            c("追跡番号", "tracking_number", "text", nullable="YES"),
            c("準備完了日時", "ready_at", "timestamptz", nullable="YES"),
            c("出荷日時", "shipped_at", "timestamptz", nullable="YES"),
            c("完了日時", "completed_at", "timestamptz", nullable="YES"),
        ],
    ),
    TableDefinition(
        "配送開始",
        "受取配送明細",
        "patient_fulfillment_items",
        "将来案",
        "部分受け取り・部分配送時の対象明細と数量。",
        [
            c("受取配送明細ID", "id", "uuid", "PK", default="gen_random_uuid()"),
            c("受取配送ID", "fulfillment_id", "uuid", "FK / UK2構成", constraint="patient_fulfillments.id"),
            c("注文明細ID", "order_item_id", "uuid", "FK / UK2構成", constraint="patient_order_items.id"),
            c("対象数量", "quantity", "integer", constraint="> 0"),
        ],
    ),
    TableDefinition(
        "定期購入接続",
        "患者定期購入",
        "patient_subscriptions",
        "将来案",
        "Shopify上の定期購入契約を患者ポータルへ表示する投影。",
        [
            c("内部契約ID", "id", "uuid", "PK", default="gen_random_uuid()"),
            c("患者ID", "patient_id", "uuid", "FK", constraint="patients.id"),
            c("外部接続ID", "commerce_account_id", "uuid", "FK / UK3構成", constraint="commerce_accounts.id"),
            c("外部契約ID", "external_subscription_id", "text", "UK3構成"),
            c("契約状態", "status", "text"),
            c("次回課金日", "next_billing_date", "date", nullable="YES"),
            c("次回提供予定日", "next_fulfillment_date", "date", nullable="YES"),
            c("同期状態", "sync_status", "text", default="pending"),
            c("外部更新日時", "external_updated_at", "timestamptz"),
        ],
    ),
    TableDefinition(
        "定期購入接続",
        "定期購入明細",
        "patient_subscription_items",
        "将来案",
        "契約時点の商品・数量・単価の投影。",
        [
            c("契約明細ID", "id", "uuid", "PK", default="gen_random_uuid()"),
            c("内部契約ID", "subscription_id", "uuid", "FK", constraint="patient_subscriptions.id"),
            c("商品ID", "product_id", "uuid", "FK", nullable="YES", constraint="products.id"),
            c("外部契約明細ID", "external_line_item_id", "text", nullable="YES"),
            c("数量", "quantity", "integer", constraint="> 0"),
            c("契約時単価", "unit_price_snapshot", "bigint"),
            c("通貨コード", "currency", "char(3)"),
        ],
    ),
    TableDefinition(
        "Shopify接続",
        "外部受信イベント",
        "commerce_webhook_events",
        "将来案",
        "Webhookを先に永続化し、重複排除・再試行するInbox。",
        [
            c("受信イベントID", "id", "uuid", "PK", default="gen_random_uuid()"),
            c("外部接続ID", "commerce_account_id", "uuid", "FK / UK4構成", constraint="commerce_accounts.id"),
            c("外部イベントID", "external_event_id", "text", "UK4構成"),
            c("トピック", "topic", "text"),
            c("処理状態", "status", "text", default="received"),
            c("受信内容", "payload", "jsonb"),
            c("再試行回数", "retry_count", "integer", default="0"),
            c("最終エラー", "last_error", "text", nullable="YES"),
            c("受信日時", "received_at", "timestamptz", default="now()"),
            c("処理完了日時", "processed_at", "timestamptz", nullable="YES"),
        ],
    ),
    TableDefinition(
        "Shopify接続",
        "外部送信キュー",
        "commerce_outbox",
        "将来案",
        "外部APIへ送る処理を永続化するOutbox。",
        [
            c("送信キューID", "id", "uuid", "PK", default="gen_random_uuid()"),
            c("外部接続ID", "commerce_account_id", "uuid", "FK", constraint="commerce_accounts.id"),
            c("内部注文ID", "order_id", "uuid", "FK", nullable="YES", constraint="patient_orders.id"),
            c("送信処理種別", "command_type", "text"),
            c("送信冪等キー", "idempotency_key", "uuid", "UK"),
            c("送信内容", "payload", "jsonb"),
            c("送信状態", "status", "text", default="pending"),
            c("再試行回数", "retry_count", "integer", default="0"),
            c("次回再試行日時", "next_retry_at", "timestamptz", nullable="YES"),
            c("作成日時", "created_at", "timestamptz", default="now()"),
            c("処理完了日時", "processed_at", "timestamptz", nullable="YES"),
        ],
    ),
]


EXACT_SCHEMA_TABLES = {
    "clinic_terms",
    "clinic_product_settings",
    "patient_orders",
    "patient_order_items",
    "delivery_destinations",
    "order_delivery_destinations",
    "patient_order_events",
    "patient_subscription_requests",
    "patient_subscription_request_items",
    "patient_subscription_request_destinations",
    "patient_subscription_request_events",
    "webinars",
    "webinar_sessions",
    "webinar_target_clinics",
    "webinar_events",
    "clinic_contacts",
    "clinic_contact_notification_preferences",
    "clinic_contact_events",
}


def validate_current_tables() -> None:
    """Fail generation when the visual current DB definition drifts from schema.sql."""
    schema = (ROOT / "supabase" / "schema.sql").read_text(encoding="utf-8")
    current_by_name = {table.physical_name: table for table in CURRENT_TABLES}
    errors: list[str] = []

    for table_name, table in current_by_name.items():
        match = re.search(
            rf"create table(?: if not exists)? public\.{re.escape(table_name)}\s*\((.*?)\n\);",
            schema,
            flags=re.DOTALL | re.IGNORECASE,
        )
        if match is None:
            errors.append(f"{table_name}: schema.sqlにCREATE TABLEがありません")
            continue

        schema_columns = {
            column_match.group(1)
            for line in match.group(1).splitlines()
            if (column_match := re.match(r"^\s{2}([a-z][a-z0-9_]*)\s+", line))
            and column_match.group(1) not in {"constraint", "primary", "unique", "check", "foreign"}
        }
        documented_columns = {column.physical_name for column in table.columns}

        missing = documented_columns - schema_columns
        if missing:
            errors.append(f"{table_name}: DB定義書にのみ存在={sorted(missing)}")

        if table_name in EXACT_SCHEMA_TABLES:
            undocumented = schema_columns - documented_columns
            if undocumented:
                errors.append(f"{table_name}: DB定義書へ未反映={sorted(undocumented)}")

    if errors:
        raise RuntimeError("schema.sqlと画面用DB定義書が不一致です:\n- " + "\n- ".join(errors))


RELATIONSHIPS_CURRENT = [
    ("医院", "clinics.customer_code", "1", "0..1", "clinic_terms.customer_code", "医院契約情報", "PK・FK・CASCADE"),
    ("医院", "clinics.customer_code", "1", "N", "clinic_product_settings.customer_code", "医院商品設定", "PK・FK・CASCADE"),
    ("商品", "products.id", "1", "N", "clinic_product_settings.product_id", "医院商品設定", "PK・FK・CASCADE"),
    ("医院", "clinics.customer_code", "1", "N", "patient_orders.customer_code", "患者注文", "FK"),
    ("患者", "patients.id", "1", "N", "patient_orders.patient_id", "患者注文", "FK・現状CASCADE"),
    ("患者注文", "patient_orders.id", "1", "N", "patient_order_items.order_id", "患者注文明細", "FK・CASCADE"),
    ("医院", "clinics.customer_code", "1", "N", "delivery_destinations.clinic_customer_code", "送り先マスタ", "FK・RESTRICT"),
    ("患者", "patients.id", "1", "N", "delivery_destinations.patient_id", "送り先マスタ", "FK・RESTRICT"),
    ("送り先マスタ", "delivery_destinations.id", "1", "N", "order_delivery_destinations.delivery_destination_id", "注文配送先", "FK・RESTRICT"),
    ("患者注文", "patient_orders.id", "1", "0..1", "order_delivery_destinations.order_id", "注文配送先", "PK・FK・CASCADE"),
    ("患者注文", "patient_orders.id", "1", "N", "patient_order_events.order_id", "注文操作履歴", "FK・CASCADE"),
    ("商品", "products.id", "0..1", "N", "patient_order_items.product_id", "患者注文明細", "FK・SET NULL"),
    ("医院", "clinics.customer_code", "1", "N", "patient_subscription_requests.customer_code", "定期購入申込", "FK・RESTRICT"),
    ("患者", "patients.id", "1", "N", "patient_subscription_requests.patient_id", "定期購入申込", "FK・RESTRICT"),
    ("定期購入申込", "patient_subscription_requests.id", "1", "N", "patient_subscription_request_items.request_id", "定期購入申込明細", "FK・CASCADE"),
    ("定期購入申込", "patient_subscription_requests.id", "1", "0..1", "patient_subscription_request_destinations.request_id", "定期購入申込配送先", "PK・FK・CASCADE"),
    ("定期購入申込", "patient_subscription_requests.id", "1", "N", "patient_subscription_request_events.request_id", "定期購入申込履歴", "FK・CASCADE"),
    ("送り先マスタ", "delivery_destinations.id", "1", "N", "patient_subscription_request_destinations.delivery_destination_id", "定期購入申込配送先", "FK・RESTRICT"),
    ("ウェビナー", "webinars.id", "1", "N", "webinar_sessions.webinar_id", "ウェビナー開催枠", "FK・CASCADE"),
    ("ウェビナー", "webinars.id", "1", "N", "webinar_target_clinics.webinar_id", "ウェビナー対象医院", "PK・FK・CASCADE"),
    ("医院", "clinics.customer_code", "1", "N", "webinar_target_clinics.customer_code", "ウェビナー対象医院", "PK・FK・RESTRICT"),
    ("ウェビナー", "webinars.id", "1", "N", "webinar_events.webinar_id", "ウェビナー操作履歴", "FK・CASCADE"),
    ("医院", "clinics.customer_code", "1", "N", "clinic_contacts.customer_code", "医院業務連絡担当者", "FK・RESTRICT"),
    ("医院ログイン", "clinic_users.id", "1", "0..1", "clinic_contacts.clinic_user_id", "医院業務連絡担当者", "FK・SET NULL"),
    ("医院業務連絡担当者", "clinic_contacts.id", "1", "N", "clinic_contact_notification_preferences.contact_id", "担当者通知設定", "PK・FK・RESTRICT"),
    ("医院業務連絡担当者", "clinic_contacts.id", "1", "N", "clinic_contact_events.contact_id", "担当者操作履歴", "FK・RESTRICT"),
]


RELATIONSHIPS_FUTURE = [
    ("患者注文", "patient_orders.id", "1", "N", "order_transaction_projections.order_id", "決済返金投影", "FK"),
    ("患者注文", "patient_orders.id", "1", "N", "patient_fulfillments.order_id", "受取配送", "FK"),
    ("受取配送", "patient_fulfillments.id", "1", "N", "patient_fulfillment_items.fulfillment_id", "受取配送明細", "FK"),
    ("注文明細", "patient_order_items.id", "1", "N", "patient_fulfillment_items.order_item_id", "受取配送明細", "FK"),
    ("外部コマース接続", "commerce_accounts.id", "1", "N", "patient_orders.commerce_account_id", "患者注文", "FK"),
    ("外部コマース接続", "commerce_accounts.id", "1", "N", "commerce_webhook_events.commerce_account_id", "外部受信イベント", "FK"),
    ("外部コマース接続", "commerce_accounts.id", "1", "N", "commerce_outbox.commerce_account_id", "外部送信キュー", "FK"),
    ("患者", "patients.id", "1", "N", "patient_subscriptions.patient_id", "患者定期購入", "FK"),
    ("患者定期購入", "patient_subscriptions.id", "1", "N", "patient_subscription_items.subscription_id", "定期購入明細", "FK"),
    ("患者定期購入", "patient_subscriptions.id", "0..1", "N", "patient_orders.subscription_id", "患者注文", "FK"),
]


CONSTRAINTS = [
    ("現行", "UK1", "patient_orders", "source, external_order_id", "UNIQUE", "外部注文の重複登録防止。NULLは複数可。"),
    ("現行", "UK2", "patient_orders", "customer_code, idempotency_key", "PARTIAL UNIQUE", "idempotency_key IS NOT NULL。通信再送時の二重登録防止。"),
    ("現行", "IDX1", "patient_orders", "patient_id, ordered_at DESC", "INDEX", "患者ポータルの履歴取得。"),
    ("現行", "IDX2", "patient_orders", "customer_code, ordered_at DESC", "INDEX", "医院注文一覧。"),
    ("現行", "IDX3", "patient_order_items", "order_id", "INDEX", "注文明細結合。"),
    ("現行", "UK3", "delivery_destinations", "clinic_customer_code WHERE is_default AND deleted_at IS NULL", "PARTIAL UNIQUE", "医院ごとの有効な既定送り先を1件に限定。"),
    ("現行", "UK4", "delivery_destinations", "patient_id WHERE is_default AND deleted_at IS NULL", "PARTIAL UNIQUE", "患者ごとの有効な既定送り先を1件に限定。"),
    ("現行", "IDX4", "order_delivery_destinations", "delivery_destination_id", "INDEX", "使用中送り先の削除可否判定。"),
    ("現行", "UK5", "patient_subscription_requests", "request_number", "UNIQUE", "表示用申込番号の一意性。"),
    ("現行", "UK6", "patient_subscription_requests", "customer_code, idempotency_key", "UNIQUE", "申込再送時の二重登録防止。"),
    ("現行", "UK7", "patient_subscription_request_items", "request_id, product_id", "UNIQUE", "同じ申込内の商品重複防止。"),
    ("現行", "IDX5", "patient_subscription_requests", "status, submitted_at DESC", "INDEX", "BGJ申込一覧。"),
    ("現行", "UK8", "webinar_sessions", "webinar_id, starts_at", "UNIQUE", "同一ウェビナーの開催日時重複防止。"),
    ("現行", "UK9", "webinar_target_clinics", "webinar_id, customer_code", "PRIMARY KEY", "対象医院の重複防止。"),
    ("現行", "IDX6", "webinar_target_clinics", "customer_code, webinar_id", "INDEX", "医院別公開ウェビナー取得。"),
    ("現行", "UK10", "clinic_contacts", "customer_code WHERE is_primary AND status='active' AND deleted_at IS NULL", "PARTIAL UNIQUE", "医院ごとの有効な主担当を1人に限定。"),
    ("現行", "UK11", "clinic_contacts", "customer_code, lower(email) WHERE deleted_at IS NULL", "PARTIAL UNIQUE", "医院内の担当者メール重複防止。"),
    ("現行", "UK12", "clinic_contacts", "clinic_user_id WHERE deleted_at IS NULL", "PARTIAL UNIQUE", "1ログインと複数担当者の誤関連防止。"),
    ("将来案", "UK1", "commerce_accounts", "provider, external_account_id", "UNIQUE", "外部接続先の重複防止。"),
    ("将来案", "UK2", "patient_fulfillment_items", "fulfillment_id, order_item_id", "UNIQUE", "同一配送への明細重複防止。"),
    ("将来案", "UK3", "patient_subscriptions", "commerce_account_id, external_subscription_id", "UNIQUE", "外部契約の重複防止。"),
    ("将来案", "UK4", "commerce_webhook_events", "commerce_account_id, external_event_id", "UNIQUE", "Webhook重複配信の無害化。"),
    ("将来案", "UK5", "patient_orders", "commerce_account_id, external_order_id", "UNIQUE", "複数ストアを考慮した外部注文の一意性。"),
    ("将来案", "UK6", "commerce_outbox", "idempotency_key", "UNIQUE", "外部送信コマンドの二重実行防止。"),
]


MIGRATION_PLAN = [
    ("Phase 0", "完了", "patient_orders / patient_order_items", "内部注文・明細・冪等性・商品スナップショットを運用。", "現行IDを維持する。"),
    ("Phase 1-1", "次に実施", "患者削除方式", "物理削除を無効化・匿名化へ変更し、注文FKのCASCADEを見直す。", "注文履歴を消さない。"),
    ("Phase 1-2", "一部完了", "patient_order_events", "状態変更、操作者、変更前後を記録済み。変更理由の記録は今後追加する。", "注文更新と同一トランザクション。"),
    ("Phase 1-3", "次に実施", "patient_orders.version", "楽観的排他を導入する。", "競合時は409。"),
    ("Phase 1-4", "完了", "delivery_destinations / order_delivery_destinations", "医院・患者の複数送り先と注文時スナップショットを運用する。", "進行中注文の送り先は論理削除不可。"),
    ("Phase 1-5", "完了", "clinic_product_settings / patient_order_items", "医院通常・期間別価格と注文時商品画像を運用する。", "仕切値と価格既定値は重複保存しない。"),
    ("Phase 2-1", "仕様確定後", "commerce_accounts / Inbox / Outbox", "Shopify接続・Webhook受信・外部送信を分離する。", "外部仕様確定前に作り込まない。"),
    ("Phase 2-2", "仕様確定後", "決済・返金・配送投影", "Shopify状態を医院業務状態と別軸で保持する。", "確定額と参考額を混同しない。"),
    ("Phase 2-3", "仕様確定後", "patient_subscriptions", "定期購入契約を読み取り用投影として追加する。", "変更・解約はShopify正本。"),
    ("Phase 3", "仕様確定後", "Salesforce外部ID対応", "医院・患者・活動の同期方向を定義する。", "CRM正本はSalesforce。"),
]


def column_letter(number: int) -> str:
    result = ""
    while number:
        number, remainder = divmod(number - 1, 26)
        result = chr(65 + remainder) + result
    return result


def cell_ref(row: int, column: int) -> str:
    return f"{column_letter(column)}{row}"


def key_style(key: str) -> int:
    if "PK" in key:
        return 5
    if "FK" in key:
        return 6
    if "UK" in key:
        return 7
    return 4


def add_title(sheet: Sheet, title: str, subtitle: str, last_col: int) -> None:
    sheet.merged_value(1, 1, 1, last_col, title, 1)
    sheet.merged_value(2, 1, 2, last_col, subtitle, 8)
    sheet.heights[1] = 28
    sheet.heights[2] = 36


def make_overview_sheet() -> Sheet:
    sheet = Sheet("概要")
    add_title(sheet, "医院向け患者注文管理 DB定義書・ER図", "現行の実DBとShopify連携後の目標論理DBを分けて記載。将来案は未実装であり、外部仕様確定後に物理設計を確定する。", 8)
    sheet.widths.update({1: 18, 2: 30, 3: 24, 4: 24, 5: 24, 6: 24, 7: 24, 8: 24})
    rows = [
        ("文書バージョン", "0.2 Draft"),
        ("更新日", "2026-07-23"),
        ("対象", "医院が患者向け商品を管理するpatient_orders系列、ウェビナー、医院業務連絡担当者"),
        ("対象外", "BGJから医院へのB2B仕入履歴clinic_orders。患者注文とは統合しない。"),
        ("現行正本", "Supabaseの患者注文・定期購入申込・送り先・ウェビナー・医院担当者各テーブル"),
        ("将来正本", "商品・注文・決済・返金・定期購入はShopify、医院・患者CRMはSalesforce"),
        ("KEY凡例", "PK=主キー、FK=外部キー、UK=一意キー、IDX=非一意インデックス"),
        ("重要課題1", "患者物理削除で注文が連鎖削除され得るため、本番前に無効化・匿名化とFK見直しが必要。"),
        ("実装済み2", "医院・患者は複数送り先を持ち、order_delivery_destinationsへ注文時点の送り先を保存する。"),
        ("重要課題2", "patient_order_eventsは実装済み。変更理由の保存は今後追加する。"),
    ]
    sheet.set(4, 1, "項目", 3)
    sheet.merged_value(4, 2, 4, 8, "内容", 3)
    row = 5
    for label, value in rows:
        sheet.set(row, 1, label, 13)
        sheet.merged_value(row, 2, row, 8, value, 4)
        sheet.heights[row] = 34
        row += 1
    sheet.merged_value(row + 1, 1, row + 1, 8, "シート構成", 2)
    for offset, (name, description) in enumerate([
        ("テーブル一覧", "現行・将来テーブルの日本語名、物理名、役割"),
        ("現行DB定義", "実装済みカラムの型、KEY、NULL、DEFAULT、制約"),
        ("将来DB定義", "Shopify接続後の目標論理カラム"),
        ("KEY・制約", "複合UK、INDEX、リレーション"),
        ("ER図_現行", "現在の実DBをセル上のエンティティ図で表示"),
        ("ER図_将来", "注文以降の目標論理ER"),
        ("遷移計画", "安全なDB変更順"),
    ], start=row + 2):
        sheet.set(offset, 1, name, 13)
        sheet.merged_value(offset, 2, offset, 8, description, 4)
    return sheet


def make_table_list_sheet() -> Sheet:
    sheet = Sheet("テーブル一覧")
    add_title(sheet, "テーブル一覧", "日本語名と物理テーブル名を併記。clinic_ordersは別ドメインとして注記のみ。", 6)
    headers = ["区分", "DB日本語名", "物理テーブル名", "状態", "目的", "備考"]
    for index, header in enumerate(headers, 1):
        sheet.set(4, index, header, 3)
    sheet.widths.update({1: 16, 2: 24, 3: 36, 4: 22, 5: 54, 6: 42})
    row = 5
    for table in CURRENT_TABLES + FUTURE_TABLES:
        sheet.set(row, 1, table.phase)
        sheet.set(row, 2, table.japanese_name)
        sheet.set(row, 3, table.physical_name)
        sheet.set(row, 4, table.status)
        sheet.set(row, 5, table.purpose)
        sheet.set(row, 6, "")
        sheet.heights[row] = 34
        row += 1
    sheet.set(row, 1, "別ドメイン", 8)
    sheet.set(row, 2, "医院仕入注文", 8)
    sheet.set(row, 3, "clinic_orders", 8)
    sheet.set(row, 4, "実装済み", 8)
    sheet.set(row, 5, "BGJから医院へのB2B仕入・売上履歴", 8)
    sheet.set(row, 6, "患者注文系列へ統合しない", 8)
    sheet.auto_filter = f"A4:F{row}"
    sheet.freeze_row = 4
    return sheet


DEFINITION_HEADERS = [
    "区分",
    "DB日本語名",
    "物理テーブル名",
    "項目日本語名",
    "物理カラム名",
    "データ型",
    "KEY",
    "NULL可",
    "DEFAULT・生成",
    "参照先・制約",
    "説明",
]


def make_definition_sheet(name: str, title: str, subtitle: str, tables: list[TableDefinition]) -> Sheet:
    sheet = Sheet(name)
    add_title(sheet, title, subtitle, len(DEFINITION_HEADERS))
    widths = [14, 24, 34, 28, 34, 20, 18, 12, 26, 48, 48]
    sheet.widths.update({index: width for index, width in enumerate(widths, 1)})
    for index, header in enumerate(DEFINITION_HEADERS, 1):
        sheet.set(4, index, header, 3)
    row = 5
    for table in tables:
        for column in table.columns:
            values = [
                table.phase,
                table.japanese_name,
                table.physical_name,
                column.japanese_name,
                column.physical_name,
                column.data_type,
                column.key,
                column.nullable,
                column.default,
                column.reference_or_constraint,
                column.description,
            ]
            for index, value in enumerate(values, 1):
                style = key_style(column.key) if index == 7 else 4
                sheet.set(row, index, value, style)
            sheet.heights[row] = 30
            row += 1
    sheet.auto_filter = f"A4:K{row - 1}"
    sheet.freeze_row = 4
    sheet.freeze_col = 3
    return sheet


def make_constraints_sheet() -> Sheet:
    sheet = Sheet("KEY・制約")
    add_title(sheet, "KEY・制約・リレーション", "複合一意キーは各カラムを単独UKとは扱わず、構成列をセットで管理する。", 8)
    sheet.widths.update({1: 14, 2: 14, 3: 34, 4: 54, 5: 20, 6: 56, 7: 20, 8: 20})
    headers = ["区分", "KEY名", "テーブル", "構成カラム", "種別", "目的・条件"]
    for index, header in enumerate(headers, 1):
        sheet.set(4, index, header, 3)
    row = 5
    for phase, key_name, table, columns, kind, purpose in CONSTRAINTS:
        for index, value in enumerate([phase, key_name, table, columns, kind, purpose], 1):
            sheet.set(row, index, value, 7 if index == 2 and "UK" in key_name else 4)
        row += 1
    row += 1
    sheet.merged_value(row, 1, row, 8, "現行リレーション", 2)
    row += 1
    rel_headers = ["親DB日本語名", "親KEY", "親多重度", "子多重度", "子FK", "子DB日本語名", "削除・備考"]
    for index, header in enumerate(rel_headers, 1):
        sheet.set(row, index, header, 3)
    row += 1
    for relationship in RELATIONSHIPS_CURRENT:
        for index, value in enumerate(relationship, 1):
            sheet.set(row, index, value)
        row += 1
    row += 1
    sheet.merged_value(row, 1, row, 8, "将来リレーション案", 2)
    row += 1
    for index, header in enumerate(rel_headers, 1):
        sheet.set(row, index, header, 3)
    row += 1
    for relationship in RELATIONSHIPS_FUTURE:
        for index, value in enumerate(relationship, 1):
            sheet.set(row, index, value)
        row += 1
    sheet.freeze_row = 4
    return sheet


def write_entity_box(
    sheet: Sheet,
    top: int,
    left: int,
    japanese_name: str,
    physical_name: str,
    fields: list[tuple[str, str, str]],
    future: bool = False,
    width: int = 5,
) -> int:
    title_style = 10 if future else 9
    sheet.merged_value(top, left, top + 1, left + width - 1, f"{japanese_name}\n{physical_name}", title_style)
    sheet.heights[top] = 23
    sheet.heights[top + 1] = 23
    sheet.set(top + 2, left, "日本語項目", 3)
    sheet.merge(top + 2, left, top + 2, left + 1)
    sheet.set(top + 2, left + 2, "物理カラム", 3)
    sheet.merge(top + 2, left + 2, top + 2, left + 3)
    sheet.set(top + 2, left + 4, "KEY", 3)
    row = top + 3
    for japanese_field, physical_field, key in fields:
        sheet.merged_value(row, left, row, left + 1, japanese_field, 11)
        sheet.merged_value(row, left + 2, row, left + 3, physical_field, 11)
        sheet.set(row, left + 4, key, key_style(key))
        row += 1
    return row - 1


def add_relationship_table(sheet: Sheet, start_row: int, relationships: list[tuple[str, ...]], last_col: int) -> None:
    sheet.merged_value(start_row, 1, start_row, last_col, "リレーション一覧", 2)
    headers = ["親DB", "親KEY", "親", "子", "子FK", "子DB", "備考"]
    row = start_row + 1
    for index, header in enumerate(headers, 1):
        sheet.set(row, index, header, 3)
    row += 1
    for relationship in relationships:
        for index, value in enumerate(relationship, 1):
            sheet.set(row, index, value)
        row += 1


def make_current_er_sheet() -> Sheet:
    sheet = Sheet("ER図_現行")
    add_title(sheet, "ER図：現在の実DB", "日本語DB名・物理テーブル名・主要KEYを表示。全カラムは「現行DB定義」シートを参照。", 17)
    for column in range(1, 18):
        sheet.widths[column] = 15
    write_entity_box(sheet, 4, 1, "医院", "clinics", [("得意先コード", "customer_code", "PK"), ("医院名", "name", "")])
    write_entity_box(sheet, 4, 7, "患者", "patients", [("患者ID", "id", "PK"), ("得意先コード", "customer_code", "FK"), ("患者番号", "patient_no", ""), ("患者氏名", "name", "")])
    write_entity_box(sheet, 4, 13, "商品", "products", [("商品ID", "id", "PK"), ("商品名", "name", ""), ("基準価格", "price", "")])
    sheet.merged_value(12, 4, 13, 10, "医院 1 ───< N 患者注文 >─── 1 患者", 12)
    write_entity_box(sheet, 15, 3, "患者注文", "patient_orders", [
        ("内部注文ID", "id", "PK"),
        ("得意先コード", "customer_code", "FK/UK2"),
        ("患者ID", "patient_id", "FK"),
        ("作成元", "source", "UK1"),
        ("外部注文ID", "external_order_id", "UK1"),
        ("冪等キー", "idempotency_key", "UK2"),
        ("医院業務状態", "status", ""),
    ])
    sheet.merged_value(18, 9, 19, 11, "1 ───< N", 12)
    write_entity_box(sheet, 15, 12, "患者注文明細", "patient_order_items", [
        ("注文明細ID", "id", "PK"),
        ("内部注文ID", "order_id", "FK"),
        ("商品ID", "product_id", "FK"),
        ("注文時商品名", "product_name", ""),
        ("注文時単価", "unit_price", ""),
        ("数量", "quantity", ""),
        ("画像URL", "image_url_snapshot", ""),
    ])
    sheet.merged_value(25, 12, 26, 17, "商品 0..1 ───< N 注文明細", 12)
    write_entity_box(sheet, 29, 1, "送り先マスタ", "delivery_destinations", [
        ("送り先ID", "id", "PK"),
        ("医院得意先コード", "clinic_customer_code", "FK"),
        ("患者ID", "patient_id", "FK"),
        ("送り先名", "label", ""),
        ("既定", "is_default", ""),
        ("削除日時", "deleted_at", ""),
    ])
    write_entity_box(sheet, 29, 10, "注文配送先", "order_delivery_destinations", [
        ("内部注文ID", "order_id", "PK/FK"),
        ("送り先ID", "delivery_destination_id", "FK"),
        ("送り先名", "label", ""),
        ("郵便番号", "postal_code", ""),
        ("住所1", "address_line1", ""),
        ("受取人名", "recipient_name", ""),
    ])
    write_entity_box(sheet, 44, 6, "注文操作履歴", "patient_order_events", [
        ("イベントID", "id", "PK"),
        ("内部注文ID", "order_id", "FK"),
        ("イベント種別", "event_type", ""),
        ("操作者種別", "actor_type", ""),
        ("変更前状態", "from_status", ""),
        ("変更後状態", "to_status", ""),
    ])
    write_entity_box(sheet, 44, 1, "医院契約情報", "clinic_terms", [
        ("得意先コード", "customer_code", "PK/FK"),
        ("仕切値率", "wholesale_rate", ""),
    ])
    write_entity_box(sheet, 58, 1, "医院商品設定", "clinic_product_settings", [
        ("得意先コード", "customer_code", "PK/FK"),
        ("商品ID", "product_id", "PK/FK"),
        ("表示可否", "is_visible", ""),
        ("医院通常価格", "clinic_price", ""),
        ("3ヶ月価格", "subscription_3_month_price", ""),
        ("6ヶ月価格", "subscription_6_month_price", ""),
    ])
    sheet.merged_value(26, 2, 27, 10, "患者注文 1 ─── 0..1 注文配送先", 12)
    add_relationship_table(sheet, 72, RELATIONSHIPS_CURRENT, 17)
    return sheet


def make_future_er_sheet() -> Sheet:
    sheet = Sheet("ER図_将来")
    add_title(sheet, "ER図：Shopify連携後の目標論理DB", "紫色のエンティティは未実装の将来案。外部仕様確定後に物理設計・NULL・制約を確定する。", 23)
    for column in range(1, 24):
        sheet.widths[column] = 14
    write_entity_box(sheet, 4, 1, "外部コマース接続", "commerce_accounts", [("接続ID", "id", "PK"), ("プロバイダー", "provider", "UK1"), ("外部アカウントID", "external_account_id", "UK1")], True)
    write_entity_box(sheet, 4, 7, "患者", "patients", [("患者ID", "id", "PK"), ("得意先コード", "customer_code", "FK")])
    write_entity_box(sheet, 4, 13, "商品", "products", [("商品ID", "id", "PK"), ("商品名", "name", "")])
    write_entity_box(sheet, 4, 19, "外部受信イベント", "commerce_webhook_events", [("イベントID", "id", "PK"), ("外部接続ID", "commerce_account_id", "FK/UK4"), ("外部イベントID", "external_event_id", "UK4")], True)

    write_entity_box(sheet, 15, 1, "患者定期購入", "patient_subscriptions", [("内部契約ID", "id", "PK"), ("患者ID", "patient_id", "FK"), ("外部接続ID", "commerce_account_id", "FK/UK3"), ("外部契約ID", "external_subscription_id", "UK3")], True)
    write_entity_box(sheet, 15, 8, "患者注文", "patient_orders", [("内部注文ID", "id", "PK"), ("得意先コード", "customer_code", "FK"), ("患者ID", "patient_id", "FK"), ("契約ID", "subscription_id", "FK"), ("外部接続ID", "commerce_account_id", "FK/UK5"), ("外部注文ID", "external_order_id", "UK5"), ("バージョン", "version", "")], True)
    write_entity_box(sheet, 15, 15, "外部送信キュー", "commerce_outbox", [("送信キューID", "id", "PK"), ("外部接続ID", "commerce_account_id", "FK"), ("内部注文ID", "order_id", "FK"), ("冪等キー", "idempotency_key", "UK")], True)

    write_entity_box(sheet, 31, 1, "定期購入明細", "patient_subscription_items", [("契約明細ID", "id", "PK"), ("内部契約ID", "subscription_id", "FK"), ("商品ID", "product_id", "FK")], True)
    write_entity_box(sheet, 31, 7, "患者注文明細", "patient_order_items", [("注文明細ID", "id", "PK"), ("内部注文ID", "order_id", "FK"), ("商品ID", "product_id", "FK")], True)
    write_entity_box(sheet, 31, 13, "注文操作履歴", "patient_order_events", [("イベントID", "id", "PK"), ("内部注文ID", "order_id", "FK"), ("変更前状態", "from_status", ""), ("変更後状態", "to_status", "")])
    write_entity_box(sheet, 31, 19, "決済返金投影", "order_transaction_projections", [("取引投影ID", "id", "PK"), ("内部注文ID", "order_id", "FK"), ("外部取引ID", "external_transaction_id", "UK")], True)

    write_entity_box(sheet, 46, 1, "注文配送先", "order_delivery_destinations", [("内部注文ID", "order_id", "PK/FK"), ("送り先ID", "delivery_destination_id", "FK"), ("郵便番号", "postal_code", ""), ("住所1", "address_line1", "")])
    write_entity_box(sheet, 46, 7, "受取配送", "patient_fulfillments", [("受取配送ID", "id", "PK"), ("内部注文ID", "order_id", "FK"), ("区分", "fulfillment_type", ""), ("状態", "status", "")], True)
    write_entity_box(sheet, 46, 14, "受取配送明細", "patient_fulfillment_items", [("受取配送明細ID", "id", "PK"), ("受取配送ID", "fulfillment_id", "FK/UK2"), ("注文明細ID", "order_item_id", "FK/UK2")], True)

    sheet.merged_value(27, 8, 28, 19, "注文 1 ───< N 明細・履歴・決済返金・受取配送", 12)
    sheet.merged_value(43, 7, 44, 18, "受取配送 1 ───< N 受取配送明細 >─── 1 注文明細", 12)
    add_relationship_table(sheet, 60, RELATIONSHIPS_FUTURE, 23)
    return sheet


def make_migration_sheet() -> Sheet:
    sheet = Sheet("遷移計画")
    add_title(sheet, "DB遷移計画", "一度に置換せず、追加→バックフィル→アプリ切替→制約強化のExpand/Contract方式で進める。", 6)
    headers = ["段階", "状態", "対象", "作業", "注意点", "完了確認"]
    widths = [16, 18, 34, 64, 54, 48]
    sheet.widths.update({index: width for index, width in enumerate(widths, 1)})
    for index, header in enumerate(headers, 1):
        sheet.set(4, index, header, 3)
    row = 5
    for phase, status, target, work, note in MIGRATION_PLAN:
        values = [phase, status, target, work, note, "未実施" if status != "完了" else "実装・動作確認済み"]
        for index, value in enumerate(values, 1):
            sheet.set(row, index, value, 8 if status == "次に実施" else 4)
        sheet.heights[row] = 42
        row += 1
    row += 1
    sheet.merged_value(row, 1, row, 6, "共通実行ルール", 2)
    rules = [
        "本番書き込み前にバックアップと確認SQLを用意する。",
        "新規テーブルはRLS有効・ポリシーなし・service role経由のみとする。",
        "schema.sql、増分migration、TypeScript型、APIテスト、BGJマニュアルを同じ作業単位で更新する。",
        "列・テーブル削除は新構造へ切替後も最低1リリース待ち、同一リリースで追加と削除を行わない。",
        "Shopify・Salesforce仕様確定前に外部契約・決済・CRMをローカルだけで成立させない。",
    ]
    for rule in rules:
        row += 1
        sheet.merged_value(row, 1, row, 6, f"・{rule}", 4)
    sheet.freeze_row = 4
    return sheet


def styles_xml() -> str:
    return """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="7">
    <font><sz val="10"/><name val="Meiryo"/><family val="2"/></font>
    <font><b/><color rgb="FFFFFFFF"/><sz val="16"/><name val="Meiryo"/></font>
    <font><b/><color rgb="FFFFFFFF"/><sz val="10"/><name val="Meiryo"/></font>
    <font><b/><color rgb="FF1F2937"/><sz val="10"/><name val="Meiryo"/></font>
    <font><color rgb="FF1F2937"/><sz val="10"/><name val="Meiryo"/></font>
    <font><b/><color rgb="FF1F2937"/><sz val="10"/><name val="Meiryo"/></font>
    <font><b/><color rgb="FFFFFFFF"/><sz val="12"/><name val="Meiryo"/></font>
  </fonts>
  <fills count="10">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF1E3A5F"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF0F766E"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFDCEEFF"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFFFF2CC"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFE2F0D9"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFFCE4D6"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF7030A0"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFE7E6E6"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="2">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border><left style="thin"><color rgb="FFB7C3D0"/></left><right style="thin"><color rgb="FFB7C3D0"/></right><top style="thin"><color rgb="FFB7C3D0"/></top><bottom style="thin"><color rgb="FFB7C3D0"/></bottom><diagonal/></border>
  </borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="14">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="2" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>
    <xf numFmtId="0" fontId="2" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="4" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="5" fillId="5" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="5" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="5" fillId="6" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="4" fillId="5" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="6" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="6" fillId="8" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="4" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="5" fillId="9" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="3" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>
  </cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>"""


def worksheet_xml(sheet: Sheet) -> str:
    max_row = max((row for row, _ in sheet.cells), default=1)
    max_column = max((column for _, column in sheet.cells), default=1)
    parts = [
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
        '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">',
        f'<dimension ref="A1:{cell_ref(max_row, max_column)}"/>',
        '<sheetViews><sheetView workbookViewId="0" showGridLines="0">',
    ]
    if sheet.freeze_row or sheet.freeze_col:
        row_split = sheet.freeze_row or 0
        col_split = sheet.freeze_col or 0
        top_left = cell_ref(row_split + 1, col_split + 1)
        attrs = []
        if col_split:
            attrs.append(f'xSplit="{col_split}"')
        if row_split:
            attrs.append(f'ySplit="{row_split}"')
        attrs.extend([f'topLeftCell="{top_left}"', 'activePane="bottomRight"', 'state="frozen"'])
        parts.append(f'<pane {" ".join(attrs)}/>')
    parts.append('</sheetView></sheetViews><sheetFormatPr defaultRowHeight="18"/>')
    if sheet.widths:
        parts.append('<cols>')
        for column, width in sorted(sheet.widths.items()):
            parts.append(f'<col min="{column}" max="{column}" width="{width}" customWidth="1"/>')
        parts.append('</cols>')
    parts.append('<sheetData>')
    rows: dict[int, list[tuple[int, str, int]]] = {}
    for (row, column), (value, style) in sheet.cells.items():
        rows.setdefault(row, []).append((column, value, style))
    for row in sorted(rows):
        height = sheet.heights.get(row)
        height_attr = f' ht="{height}" customHeight="1"' if height else ""
        parts.append(f'<row r="{row}"{height_attr}>')
        for column, value, style in sorted(rows[row]):
            reference = cell_ref(row, column)
            text = escape(value)
            parts.append(f'<c r="{reference}" s="{style}" t="inlineStr"><is><t xml:space="preserve">{text}</t></is></c>')
        parts.append('</row>')
    parts.append('</sheetData>')
    if sheet.merges:
        parts.append(f'<mergeCells count="{len(sheet.merges)}">')
        parts.extend(f'<mergeCell ref={quoteattr(reference)}/>' for reference in sheet.merges)
        parts.append('</mergeCells>')
    if sheet.auto_filter:
        parts.append(f'<autoFilter ref={quoteattr(sheet.auto_filter)}/>')
    parts.append('<pageMargins left="0.25" right="0.25" top="0.5" bottom="0.5" header="0.2" footer="0.2"/>')
    orientation = "landscape" if sheet.landscape else "portrait"
    parts.append(f'<pageSetup orientation="{orientation}" fitToWidth="1" fitToHeight="0" paperSize="9"/>')
    parts.append('</worksheet>')
    return "".join(parts)


def workbook_xml(sheets: list[Sheet]) -> str:
    sheet_nodes = "".join(
        f'<sheet name={quoteattr(sheet.name)} sheetId="{index}" r:id="rId{index + 1}"/>'
        for index, sheet in enumerate(sheets, 1)
    )
    return f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <bookViews><workbookView xWindow="0" yWindow="0" windowWidth="24000" windowHeight="12000"/></bookViews>
  <sheets>{sheet_nodes}</sheets>
  <calcPr calcId="191029"/>
</workbook>'''


def workbook_relationships_xml(sheets: list[Sheet]) -> str:
    relationships = [
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'
    ]
    for index, _sheet in enumerate(sheets, 1):
        relationships.append(
            f'<Relationship Id="rId{index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet{index}.xml"/>'
        )
    return f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">{"".join(relationships)}</Relationships>'''


def content_types_xml(sheets: list[Sheet]) -> str:
    sheet_overrides = "".join(
        f'<Override PartName="/xl/worksheets/sheet{index}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
        for index, _sheet in enumerate(sheets, 1)
    )
    return f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
  {sheet_overrides}
</Types>'''


def build_workbook() -> None:
    validate_current_tables()
    sheets = [
        make_overview_sheet(),
        make_table_list_sheet(),
        make_definition_sheet(
            "現行DB定義",
            "現行DB定義",
            "supabase/schema.sqlの実装済み構造。clinics・patients・productsは注文に関係する主要列だけを掲載。",
            CURRENT_TABLES,
        ),
        make_definition_sheet(
            "将来DB定義",
            "将来DB定義（論理案）",
            "Shopify・Salesforce・配送方式の仕様確定前のため、未実装の目標論理モデルとして扱う。",
            FUTURE_TABLES,
        ),
        make_constraints_sheet(),
        make_current_er_sheet(),
        make_future_er_sheet(),
        make_migration_sheet(),
    ]
    timestamp = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    root_relationships = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>'''
    core = f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>医院向け患者注文管理 DB定義書・ER図</dc:title>
  <dc:creator>OpenAI Codex</dc:creator>
  <cp:lastModifiedBy>OpenAI Codex</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">{timestamp}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">{timestamp}</dcterms:modified>
</cp:coreProperties>'''
    titles = "".join(f"<vt:lpstr>{escape(sheet.name)}</vt:lpstr>" for sheet in sheets)
    app = f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>Microsoft Excel</Application>
  <DocSecurity>0</DocSecurity>
  <ScaleCrop>false</ScaleCrop>
  <HeadingPairs><vt:vector size="2" baseType="variant"><vt:variant><vt:lpstr>Worksheets</vt:lpstr></vt:variant><vt:variant><vt:i4>{len(sheets)}</vt:i4></vt:variant></vt:vector></HeadingPairs>
  <TitlesOfParts><vt:vector size="{len(sheets)}" baseType="lpstr">{titles}</vt:vector></TitlesOfParts>
  <Company>BioGaia</Company>
  <AppVersion>16.0300</AppVersion>
</Properties>'''
    with ZipFile(OUTPUT, "w", ZIP_DEFLATED) as archive:
        archive.writestr("[Content_Types].xml", content_types_xml(sheets))
        archive.writestr("_rels/.rels", root_relationships)
        archive.writestr("docProps/core.xml", core)
        archive.writestr("docProps/app.xml", app)
        archive.writestr("xl/workbook.xml", workbook_xml(sheets))
        archive.writestr("xl/_rels/workbook.xml.rels", workbook_relationships_xml(sheets))
        archive.writestr("xl/styles.xml", styles_xml())
        for index, sheet in enumerate(sheets, 1):
            archive.writestr(f"xl/worksheets/sheet{index}.xml", worksheet_xml(sheet))
    print(f"generated: {OUTPUT}")
    print(f"sheets: {len(sheets)}")
    print(f"current columns: {sum(len(table.columns) for table in CURRENT_TABLES)}")
    print(f"future columns: {sum(len(table.columns) for table in FUTURE_TABLES)}")


if __name__ == "__main__":
    build_workbook()
