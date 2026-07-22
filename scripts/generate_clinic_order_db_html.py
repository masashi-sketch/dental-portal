#!/usr/bin/env python3

from __future__ import annotations

import html
import importlib.util
import json
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "scripts" / "generate_clinic_order_db_excel.py"
OUTPUT = ROOT / "project_clinic_order_management_db_definition.html"
PUBLIC_OUTPUT = ROOT / "public" / "manuals" / "clinic-order-db-definition.html"


def load_source():
    spec = importlib.util.spec_from_file_location("clinic_order_db_source", SOURCE)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"定義ファイルを読み込めません: {SOURCE}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def e(value: object) -> str:
    return html.escape("" if value is None else str(value), quote=True)


def key_badges(key: str) -> str:
    if not key:
        return '<span class="muted">—</span>'
    badges = []
    for token in key.replace("構成", "").replace(" / ", "/").split("/"):
        token = token.strip()
        css = "pk" if token == "PK" else "fk" if token == "FK" else "uk" if token.startswith("UK") else "key"
        badges.append(f'<span class="badge {css}">{e(token)}</span>')
    return " ".join(badges)


def definition_cards(tables, section_id: str) -> str:
    cards = []
    for index, table in enumerate(tables):
        rows = []
        for column in table.columns:
            searchable = " ".join([
                table.japanese_name, table.physical_name, column.japanese_name,
                column.physical_name, column.data_type, column.key,
                column.reference_or_constraint, column.description,
            ]).lower()
            rows.append(
                f'<tr data-search="{e(searchable)}">'
                f'<td><strong>{e(column.japanese_name)}</strong><code>{e(column.physical_name)}</code></td>'
                f'<td><code>{e(column.data_type)}</code></td>'
                f'<td>{key_badges(column.key)}</td>'
                f'<td>{e(column.nullable)}</td>'
                f'<td>{e(column.default) or "—"}</td>'
                f'<td>{e(column.reference_or_constraint) or "—"}</td>'
                f'<td>{e(column.description) or "—"}</td>'
                '<td><span class="defined-label">定義済み</span></td>'
                '</tr>'
            )
        opened = ""
        search = f"{table.japanese_name} {table.physical_name} {table.purpose}".lower()
        cards.append(
            f'<details class="table-card" data-table-id="{e(section_id)}:{e(table.physical_name)}" '
            f'data-japanese="{e(table.japanese_name)}" data-physical="{e(table.physical_name)}" data-search="{e(search)}"{opened}>'
            '<summary>'
            f'<span><span class="phase">{e(table.phase)}</span><strong>{e(table.japanese_name)}</strong>'
            f'<code>{e(table.physical_name)}</code></span>'
            f'<span class="summary-actions"><span class="column-count" data-base-count="{len(table.columns)}">{len(table.columns)} 項目</span>'
            '<button type="button" class="add-column-button">＋ 項目追加</button></span>'
            '</summary>'
            f'<p class="purpose">{e(table.purpose)}</p>'
            '<div class="table-scroll"><table class="definition-table">'
            '<thead><tr><th>項目名／物理名</th><th>型</th><th>KEY</th><th>NULL</th><th>DEFAULT</th><th>参照・制約</th><th>説明</th><th>操作</th></tr></thead>'
            f'<tbody>{"".join(rows)}</tbody></table></div></details>'
        )
    return "".join(cards)


def merged_tables(current, future):
    result = {}
    for table in current + future:
        if table.physical_name not in result:
            result[table.physical_name] = {
                "japanese_name": table.japanese_name.replace("拡張", ""),
                "physical_name": table.physical_name,
                "columns": [],
                "current_fields": set(),
            }
        known = {column.physical_name for column in result[table.physical_name]["columns"]}
        result[table.physical_name]["columns"].extend(
            column for column in table.columns if column.physical_name not in known
        )
        if table in current:
            result[table.physical_name]["current_fields"].update(
                column.physical_name for column in table.columns
            )
    return result


IMPORTANT_FIELDS = {
    "clinics": ["customer_code", "name"],
    "patients": ["id", "customer_code", "patient_no", "name"],
    "products": ["id", "name", "price", "status"],
    "patient_orders": ["id", "customer_code", "patient_id", "subscription_id", "commerce_account_id", "status", "financial_status", "external_order_id", "idempotency_key", "version"],
    "patient_order_items": ["id", "order_id", "product_id", "product_name", "quantity", "external_line_item_id"],
    "order_shipping_addresses": ["order_id", "postal_code", "prefecture", "city", "address_line1", "recipient_name", "phone"],
    "patient_order_events": ["id", "order_id", "event_type", "actor_type", "created_at"],
    "commerce_accounts": ["id", "provider", "external_account_id", "status"],
    "order_transaction_projections": ["id", "order_id", "external_transaction_id", "transaction_type", "status", "amount"],
    "patient_fulfillments": ["id", "order_id", "fulfillment_type", "status", "tracking_number"],
    "patient_fulfillment_items": ["id", "fulfillment_id", "order_item_id", "quantity"],
    "patient_subscriptions": ["id", "patient_id", "commerce_account_id", "external_subscription_id", "status", "next_billing_date"],
    "patient_subscription_items": ["id", "subscription_id", "product_id", "quantity"],
    "commerce_webhook_events": ["id", "commerce_account_id", "external_event_id", "topic", "status"],
    "commerce_outbox": ["id", "commerce_account_id", "order_id", "command_type", "idempotency_key", "status"],
}


def entity(table, x: int, y: int, future: bool = False) -> str:
    selected = IMPORTANT_FIELDS.get(table["physical_name"], [])
    columns = [c for c in table["columns"] if c.physical_name in selected]
    order = {name: i for i, name in enumerate(selected)}
    columns.sort(key=lambda c: order.get(c.physical_name, 999))
    rows = []
    for column in columns:
        key = column.key.replace("構成", "")
        future_field = not future and column.physical_name not in table.get("current_fields", set())
        row_class = ' class="future-field"' if future_field else ""
        field_note = '<em>追加予定</em>' if future_field else ""
        rows.append(
            f'<tr{row_class}>'
            f'<td class="mini-key">{key_badges(key)}</td>'
            f'<td><span>{e(column.japanese_name)}{field_note}</span><code>{e(column.physical_name)}</code></td>'
            f'<td><code>{e(column.data_type)}</code></td>'
            '</tr>'
        )
    mode = "future" if future else "current"
    return (
        f'<article class="entity {mode}" id="entity-{e(table["physical_name"])}" '
        f'data-default-x="{x}" data-default-y="{y}" style="left:{x}px;top:{y}px">'
        f'<header title="ドラッグして移動"><span>{e(table["japanese_name"])}</span><code>{e(table["physical_name"])}</code><i>⋮⋮</i></header>'
        f'<table>{"".join(rows)}</table></article>'
    )


def er_diagram(diagram_id: str, tables_by_name, positions, edges, future=False, height=1000, future_names=None, width=1420) -> str:
    nodes = []
    for name, (x, y) in positions.items():
        is_future = name in future_names if future_names is not None else future
        nodes.append(entity(tables_by_name[name], x, y, is_future))
    edge_elements = []
    relationship_rows = []
    for from_name, to_name, label in edges:
        edge_elements.append(
            f'<span class="edge-data" data-from="entity-{e(from_name)}" data-to="entity-{e(to_name)}" data-label="{e(label)}"></span>'
        )
        relationship_rows.append(
            f'<tr><td><code>{e(from_name)}</code></td><td><strong>1</strong></td><td>→</td><td><strong>N</strong></td><td><code>{e(to_name)}</code></td><td>{e(label)}</td></tr>'
        )
    return (
        '<div class="diagram-note">カードには主要項目を表示しています。カードの見出しをドラッグして移動できます。配置はこのブラウザに保存されます。</div>'
        f'<div class="diagram-toolbar" data-target="{e(diagram_id)}">'
        '<button type="button" data-action="minus">− 縮小</button><button type="button" data-action="plus">＋ 拡大</button>'
        '<button type="button" data-action="fit">画面幅に合わせる</button><button type="button" data-action="arrange">自動整列</button>'
        '<span class="zoom-label">100%</span></div>'
        '<div class="diagram-scroll">'
        f'<div class="er-canvas" id="{e(diagram_id)}" style="width:{width}px;height:{height}px">'
        '<svg class="connections" aria-hidden="true"><defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z"></path></marker></defs></svg>'
        f'{"".join(nodes)}{"".join(edge_elements)}</div></div>'
        '<div class="relationship-table"><table><thead><tr><th>親テーブル</th><th colspan="3">多重度</th><th>子テーブル</th><th>関係</th></tr></thead>'
        f'<tbody>{"".join(relationship_rows)}</tbody></table></div>'
    )


def constraint_table(constraints) -> str:
    rows = []
    for phase, key_name, table, columns, kind, purpose in constraints:
        rows.append(
            f'<tr><td><span class="phase">{e(phase)}</span></td><td>{key_badges(key_name)}</td>'
            f'<td><code>{e(table)}</code></td><td><code>{e(columns)}</code></td><td>{e(kind)}</td><td>{e(purpose)}</td></tr>'
        )
    return "".join(rows)


def migration_timeline(plan) -> str:
    items = []
    for phase, status, target, action, note in plan:
        items.append(
            '<li><div class="timeline-dot"></div><div class="timeline-card">'
            f'<div><span class="phase">{e(phase)}</span><span class="status">{e(status)}</span></div>'
            f'<h3>{e(target)}</h3><p>{e(action)}</p><small>{e(note)}</small></div></li>'
        )
    return "".join(items)


def build_html(source) -> str:
    current = source.CURRENT_TABLES
    future = source.FUTURE_TABLES
    all_tables = merged_tables(current, future)

    unified_positions = {
        "clinics": (40, 60), "patients": (40, 430), "products": (40, 800),
        "patient_subscriptions": (500, 170), "patient_subscription_items": (500, 650),
        "patient_orders": (960, 100), "patient_order_items": (960, 720),
        "order_shipping_addresses": (960, 1250),
        "patient_order_events": (1420, 40), "order_transaction_projections": (1420, 430),
        "patient_fulfillments": (1420, 850), "patient_fulfillment_items": (1420, 1300),
        "commerce_accounts": (1880, 80), "commerce_webhook_events": (1880, 530),
        "commerce_outbox": (1880, 1030),
    }
    current_edges = [
        ("clinics", "patient_orders", "医院ごとの注文"),
        ("patients", "patient_orders", "患者の注文"),
        ("patient_orders", "patient_order_items", "注文の明細"),
        ("patient_orders", "order_shipping_addresses", "自宅配送時の配送先"),
        ("patient_orders", "patient_order_events", "操作履歴"),
        ("products", "patient_order_items", "商品スナップショット元"),
    ]
    future_edges = [
        ("commerce_accounts", "patient_orders", "接続先"),
        ("commerce_accounts", "commerce_webhook_events", "受信イベント"),
        ("commerce_accounts", "commerce_outbox", "送信キュー"),
        ("patients", "patient_subscriptions", "患者の契約"),
        ("patient_subscriptions", "patient_subscription_items", "契約明細"),
        ("patient_subscriptions", "patient_orders", "契約から生成"),
        ("patient_orders", "order_transaction_projections", "決済・返金"),
        ("patient_orders", "patient_order_items", "注文明細"),
        ("patient_orders", "patient_fulfillments", "受取・配送"),
        ("patient_fulfillments", "patient_fulfillment_items", "対象明細"),
        ("patient_order_items", "patient_fulfillment_items", "出荷対象"),
    ]

    future_only_names = {
        "patient_subscriptions", "patient_subscription_items",
        "order_transaction_projections", "patient_fulfillments", "patient_fulfillment_items",
        "commerce_accounts", "commerce_webhook_events", "commerce_outbox",
    }
    unified_er_detail = er_diagram(
        "unified-er", all_tables, unified_positions, current_edges + future_edges,
        height=1800, width=2400, future_names=future_only_names,
    )
    unified_er = f'''
<div class="meaning-box"><strong>この図が表すこと</strong><p>現在動いている注文管理に、Shopify連携後の定期購入・決済・配送を段階的に追加します。患者が単発で注文する場合は「定期購入」を通りません。</p></div>
<div class="implementation-legend"><span class="legend-current"><i></i><strong>現行実装</strong> 現在DBに存在</span><span class="legend-future"><i></i><strong>将来追加</strong> Shopify等の仕様確定後</span></div>
<div class="business-flow" aria-label="現行と将来を統合した注文業務フロー">
  <div class="flow-stage current-stage"><span class="step-number">1</span><small>誰が</small><strong>患者</strong><code>patients</code><p>注文する本人</p><b class="implementation-tag">現行</b></div>
  <div class="flow-arrow">→<small>定期購入の場合のみ</small></div>
  <div class="flow-stage future-stage optional"><span class="step-number">2</span><small>どんな契約で</small><strong>定期購入契約</strong><code>patient_subscriptions</code><p>次回課金日・契約状態</p><b class="implementation-tag">将来</b></div>
  <div class="flow-arrow">→</div>
  <div class="flow-stage current-stage primary"><span class="step-number">3</span><small>何を注文したか</small><strong>患者注文・明細</strong><code>patient_orders / items</code><p>商品・数量・医院業務状態</p><b class="implementation-tag">現行</b></div>
  <div class="flow-arrow branch">↗<small>注文後に分岐</small>↘</div>
  <div class="flow-results"><div class="flow-stage future-stage"><span class="step-number">4A</span><small>お金</small><strong>決済・返金</strong><code>order_transaction_projections</code><b class="implementation-tag">将来</b></div><div class="flow-stage current-stage"><span class="step-number">4B</span><small>届け先</small><strong>受け取り方法・配送先</strong><code>patient_orders / order_shipping_addresses</code><b class="implementation-tag">現行</b></div><div class="flow-stage future-stage"><span class="step-number">4C</span><small>配送進捗</small><strong>分割配送・追跡</strong><code>patient_fulfillments</code><b class="implementation-tag">将来</b></div></div>
</div>
<div class="integration-flow"><strong>将来追加：Shopifyとの連携部分</strong><span>Shopify</span><b>⇄</b><span>受信イベント／送信キュー</span><b>⇄</b><span class="current-chip">現行の患者注文</span><p>Webhook受信と外部送信を一度保存するため、通信障害や二重通知があっても再処理できます。</p></div>
<div class="key-legend"><span>{key_badges("PK")} レコードを識別する主キー</span><span>{key_badges("FK")} 別テーブルを参照する外部キー</span><span>{key_badges("UK")} 重複を防ぐ一意キー</span></div>
<details class="technical-er"><summary>現行＋将来の詳細ER図を開く</summary><p>青いカードは現行、金色のカードは将来追加です。青いカード内の金色行は、その既存テーブルへ将来追加する項目です。</p>{unified_er_detail}</details>
'''

    template = r'''<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>医院向け患者注文管理 DB定義書・ER図</title>
<script>if(new URLSearchParams(location.search).get('embed')==='1')document.documentElement.classList.add('embedded')</script>
<style>
:root{--ink:#14213d;--muted:#64748b;--line:#dbe3ec;--paper:#fff;--bg:#f3f6f9;--blue:#0b6bcb;--blue2:#e8f3ff;--gold:#b87503;--gold2:#fff7dc;--green:#147d64;--red:#b42318;--shadow:0 10px 30px rgba(20,33,61,.09)}
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;color:var(--ink);background:var(--bg);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans JP",sans-serif;line-height:1.55}code{font-family:"SFMono-Regular",Consolas,monospace;font-size:.88em;color:#23405e}button,input{font:inherit}
.embedded .topbar{display:block;position:sticky;top:0}.embedded .top-inner{max-width:none;padding:8px 12px}.embedded .brand{display:none}.embedded nav{width:100%;justify-content:flex-start}.embedded .tab-button{padding:7px 10px;font-size:13px}.embedded main{max-width:none;padding:16px}.embedded .hero{padding:24px 28px}.embedded .hero h1{font-size:30px}.embedded .summary-grid{margin-top:14px}.embedded .section-title{margin-top:8px}
.topbar{position:sticky;top:0;z-index:50;background:rgba(255,255,255,.94);backdrop-filter:blur(14px);border-bottom:1px solid var(--line)}.top-inner{max-width:1900px;margin:auto;padding:14px 24px;display:flex;gap:20px;align-items:center}.brand{min-width:280px}.brand strong{display:block;font-size:15px}.brand small{color:var(--muted)}nav{display:flex;gap:6px;overflow:auto}.tab-button{border:0;background:transparent;color:#46566a;padding:9px 13px;border-radius:9px;white-space:nowrap;cursor:pointer}.tab-button:hover{background:#edf3f8}.tab-button.active{background:var(--ink);color:#fff}
main{max-width:1900px;margin:auto;padding:30px 24px 70px}.panel{display:none}.panel.active{display:block}.hero{background:linear-gradient(130deg,#0d2341,#134f82);color:white;border-radius:18px;padding:35px 38px;box-shadow:var(--shadow)}.eyebrow{color:#94d1ff;text-transform:uppercase;letter-spacing:.12em;font-size:12px;font-weight:700}.hero h1{font-size:clamp(27px,4vw,46px);line-height:1.15;margin:8px 0 14px}.hero p{max-width:900px;color:#dcecff;margin:0}.meta{display:flex;gap:18px;margin-top:22px;flex-wrap:wrap}.meta span{background:rgba(255,255,255,.1);padding:7px 11px;border-radius:8px;font-size:13px}
.summary-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:15px;margin:22px 0}.summary-card{background:white;border:1px solid var(--line);border-radius:14px;padding:20px;box-shadow:0 3px 13px rgba(20,33,61,.04)}.summary-card strong{font-size:28px;display:block}.summary-card span{color:var(--muted);font-size:13px}.section-title{display:flex;align-items:end;justify-content:space-between;gap:15px;margin:28px 0 14px}.section-title h2{margin:0;font-size:24px}.section-title p{margin:0;color:var(--muted)}
.notice-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:15px}.notice{background:white;border:1px solid var(--line);border-top:4px solid var(--gold);border-radius:13px;padding:19px}.notice b{display:block;margin-bottom:6px}.notice p{margin:0;color:#526174;font-size:14px}.principles{background:white;border:1px solid var(--line);border-radius:14px;padding:24px}.principles ul{columns:2;margin:0;padding-left:21px}.principles li{margin:7px 0}
.meaning-box{background:white;border:1px solid var(--line);border-left:5px solid var(--blue);border-radius:12px;padding:17px 20px;margin-bottom:14px}.meaning-box strong{font-size:18px}.meaning-box p{margin:5px 0 0;color:#526174}.implementation-legend{display:flex;gap:12px;flex-wrap:wrap;margin:0 0 14px}.implementation-legend span{display:flex;align-items:center;gap:7px;background:white;border:1px solid var(--line);border-radius:9px;padding:8px 11px}.implementation-legend i{width:14px;height:14px;border-radius:3px;background:#173d66}.implementation-legend .legend-future i{background:#795714}.business-flow{display:flex;align-items:center;justify-content:center;gap:14px;overflow:auto;padding:28px;background:#eaf0f5;border:1px solid var(--line);border-radius:16px}.flow-stage{position:relative;flex:0 0 285px;min-height:210px;background:white;border:2px solid #173d66;border-radius:13px;padding:28px 18px 17px;box-shadow:0 5px 15px rgba(20,33,61,.06)}.flow-stage.future-stage{border-color:#b78a28;background:#fffdf7}.flow-stage.optional{border-style:dashed}.flow-stage.primary{border-color:var(--blue)}.flow-stage small,.flow-stage strong,.flow-stage code{display:block}.flow-stage small{color:var(--muted);margin-bottom:7px}.flow-stage strong{font-size:20px}.flow-stage code{margin-top:5px;color:#43617d}.flow-stage p{margin:16px 0 0;color:var(--muted);font-size:14px}.implementation-tag{position:absolute;left:16px;bottom:12px;font-size:10px;color:#173d66;background:#e4effa;border-radius:999px;padding:2px 7px}.future-stage .implementation-tag{color:#785710;background:#fff0c7}.step-number{position:absolute;right:12px;top:12px;background:var(--ink);color:white;border-radius:999px;padding:2px 8px;font-size:11px;font-weight:750}.flow-arrow{flex:0 0 76px;text-align:center;color:var(--blue);font-size:38px;font-weight:700}.flow-arrow small{display:block;color:var(--muted);font-size:10px;font-weight:500}.flow-arrow.branch{line-height:1.1}.flow-results{display:grid;gap:12px;flex:0 0 285px}.flow-results .flow-stage{min-height:128px;padding-top:20px}.flow-results .flow-stage strong{font-size:17px}.integration-flow{display:flex;align-items:center;gap:12px;flex-wrap:wrap;background:#fff8e6;border:1px solid #e6ce91;border-radius:13px;padding:15px 18px;margin-top:14px}.integration-flow>strong{width:100%}.integration-flow span{background:white;border:1px solid #d9c285;border-radius:8px;padding:8px 11px}.integration-flow span.current-chip{border-color:#9bbbd8;background:#f2f8ff}.integration-flow b{color:#8d6410}.integration-flow p{width:100%;margin:0;color:#6d5a2d;font-size:13px}.key-legend{display:flex;gap:14px;flex-wrap:wrap;margin:14px 0}.key-legend>span{background:white;border:1px solid var(--line);border-radius:8px;padding:8px 10px;font-size:13px}.technical-er{background:white;border:1px solid var(--line);border-radius:13px;margin-top:16px;padding:0 16px 16px}.technical-er>summary{cursor:pointer;font-weight:750;padding:16px 2px}.technical-er>p{color:var(--muted);margin:0 0 12px}
.diagram-note{background:var(--blue2);color:#24547e;border:1px solid #c9e2fa;border-radius:10px;padding:11px 14px;margin:0 0 10px}.diagram-toolbar{display:flex;align-items:center;gap:7px;margin:0 0 10px;flex-wrap:wrap}.diagram-toolbar button,.add-column-button,.secondary-button{border:1px solid #b8c7d6;background:white;color:#29435d;border-radius:8px;padding:7px 10px;cursor:pointer}.diagram-toolbar button:hover,.add-column-button:hover,.secondary-button:hover{border-color:var(--blue);background:var(--blue2)}.zoom-label{font-size:13px;color:var(--muted);min-width:48px;text-align:right}.diagram-scroll{overflow:auto;background:#eef3f7;border:1px solid var(--line);border-radius:16px;box-shadow:inset 0 0 40px rgba(20,33,61,.04);min-height:440px}.er-canvas{position:relative;background-image:radial-gradient(#cbd6e2 1px,transparent 1px);background-size:20px 20px;transform-origin:top left}.connections{position:absolute;inset:0;width:100%;height:100%;overflow:visible;pointer-events:none}.connections path.connection{fill:none;stroke:#7690a8;stroke-width:2;marker-end:url(#arrow)}.connections path.connection.future-line{stroke:#b28a35}.connections text{font-size:12px;fill:#536579;font-weight:600;paint-order:stroke;stroke:#eef3f7;stroke-width:5px;stroke-linejoin:round}.connections marker path{fill:#7690a8}
.entity{position:absolute;width:290px;background:white;border:1px solid #b9c9d9;border-radius:11px;overflow:hidden;box-shadow:0 7px 20px rgba(20,33,61,.1);z-index:2}.entity.future{border-color:#d7bd7f}.entity header{position:relative;padding:10px 32px 10px 12px;background:#173d66;color:white;cursor:grab;touch-action:none;user-select:none}.entity header:active{cursor:grabbing}.entity.dragging{z-index:10;box-shadow:0 14px 34px rgba(20,33,61,.24)}.entity.future header{background:#795714}.entity header span{display:block;font-weight:750;font-size:13px}.entity header code{color:#cce5ff;font-size:11px}.entity.future header code{color:#fff1c8}.entity header i{position:absolute;right:11px;top:16px;font-style:normal;opacity:.7;letter-spacing:-2px}.entity table{width:100%;border-collapse:collapse;font-size:11px}.entity td{padding:5px 7px;border-top:1px solid #e6edf3;vertical-align:top}.entity td:nth-child(2){width:55%}.entity td:last-child{text-align:right;color:var(--muted)}.entity td span{display:block;font-weight:650}.entity td code{display:block;color:#617286;font-size:10px}.entity tr.future-field td{background:#fff8df}.entity tr.future-field em{display:inline-block;margin-left:5px;color:#815900;font-size:8px;font-style:normal;background:#ffe9aa;border-radius:4px;padding:1px 3px}.mini-key{width:40px}.mini-key .muted{display:none}
.relationship-table{margin-top:16px;overflow:auto;background:white;border:1px solid var(--line);border-radius:13px}.relationship-table table{width:100%;border-collapse:collapse}.relationship-table th,.relationship-table td{padding:10px 13px;border-bottom:1px solid var(--line);text-align:left}.relationship-table th{background:#e9eff5;font-size:13px}.relationship-table tbody tr:last-child td{border-bottom:0}
.definition-tools{position:sticky;top:75px;z-index:20;background:var(--bg);padding:6px 0 12px;display:flex;gap:8px;align-items:center;flex-wrap:wrap}.search{width:min(600px,100%);background:white;border:1px solid #b8c7d6;border-radius:11px;padding:11px 15px;outline:none}.search:focus{border-color:var(--blue);box-shadow:0 0 0 3px rgba(11,107,203,.12)}.table-card{background:white;border:1px solid var(--line);border-radius:13px;margin:12px 0;overflow:hidden}.table-card[open]{box-shadow:0 5px 18px rgba(20,33,61,.06)}.table-card summary{display:flex;justify-content:space-between;align-items:center;gap:12px;cursor:pointer;padding:15px 18px;list-style:none}.table-card summary::-webkit-details-marker{display:none}.table-card summary>span:first-child{display:flex;gap:10px;align-items:center;flex-wrap:wrap}.summary-actions{display:flex;align-items:center;gap:10px}.table-card summary code{background:#eff4f8;padding:3px 7px;border-radius:5px}.column-count{color:var(--muted);font-size:13px}.add-column-button{padding:5px 9px;font-size:12px}.phase,.status{display:inline-block;border-radius:999px;padding:3px 8px;font-size:11px;font-weight:700;background:var(--blue2);color:#1b65a4}.status{background:var(--gold2);color:#855b00;margin-left:7px}.purpose{padding:0 18px 13px;margin:0;color:var(--muted)}.table-scroll{overflow:auto;border-top:1px solid var(--line)}.definition-table{width:100%;min-width:1320px;border-collapse:collapse;font-size:13px}.definition-table th{position:sticky;top:0;background:#e9eff5;text-align:left;padding:10px;border-bottom:1px solid #cad5e0}.definition-table td{padding:9px 10px;border-bottom:1px solid #e5ebf1;vertical-align:top}.definition-table tr:hover td{background:#f7faff}.definition-table td:first-child strong,.definition-table td:first-child code{display:block}.definition-table tbody tr:last-child td{border-bottom:0}.badge{display:inline-block;font-weight:750;font-size:10px;border-radius:5px;padding:2px 5px;background:#edf1f5;color:#536273;white-space:nowrap}.badge.pk{background:#ffe3df;color:var(--red)}.badge.fk{background:#e0efff;color:#075b9f}.badge.uk{background:#fff0c7;color:#815900}.muted{color:#94a3b8}.defined-label{font-size:11px;color:var(--muted)}.custom-row td{background:#fffdf4}.delete-column{border:0;background:#fff0ed;color:var(--red);padding:5px 8px;border-radius:6px;cursor:pointer}
.key-table{overflow:auto;background:white;border:1px solid var(--line);border-radius:13px}.key-table table{width:100%;min-width:1000px;border-collapse:collapse}.key-table th,.key-table td{padding:11px 12px;border-bottom:1px solid var(--line);text-align:left}.key-table th{background:#e9eff5}.timeline{list-style:none;margin:0;padding:0 0 0 21px;border-left:2px solid #cbd8e5}.timeline li{position:relative;padding:0 0 19px 24px}.timeline-dot{position:absolute;left:-31px;top:18px;width:16px;height:16px;border:4px solid var(--bg);border-radius:50%;background:var(--blue)}.timeline-card{background:white;border:1px solid var(--line);border-radius:13px;padding:17px 19px}.timeline-card h3{margin:7px 0 3px}.timeline-card p{margin:0 0 5px}.timeline-card small{color:var(--muted)}.domain-note{padding:18px;border:1px dashed #c69228;background:var(--gold2);border-radius:12px;margin-top:20px}
.column-dialog{width:min(680px,calc(100% - 24px));border:0;border-radius:16px;padding:0;box-shadow:0 24px 80px rgba(20,33,61,.3)}.column-dialog::backdrop{background:rgba(10,23,40,.55);backdrop-filter:blur(3px)}.dialog-head{display:flex;justify-content:space-between;gap:20px;align-items:start;padding:20px 22px;border-bottom:1px solid var(--line)}.dialog-head h2{margin:0;font-size:20px}.dialog-head p{margin:3px 0 0;color:var(--muted);font-size:13px}.icon-button{border:0;background:#edf2f6;border-radius:50%;width:34px;height:34px;cursor:pointer}.column-form{padding:20px 22px}.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.form-grid label{font-size:13px;font-weight:650}.form-grid label.full{grid-column:1/-1}.form-grid input,.form-grid select,.form-grid textarea{display:block;width:100%;margin-top:5px;border:1px solid #b8c7d6;border-radius:8px;padding:9px 10px;font:inherit;background:white}.form-grid textarea{min-height:72px;resize:vertical}.dialog-actions{display:flex;justify-content:space-between;gap:10px;align-items:center;margin-top:18px}.dialog-actions small{color:var(--muted)}.primary-button{border:0;background:var(--blue);color:white;border-radius:8px;padding:9px 14px;cursor:pointer}.storage-note{background:var(--gold2);color:#72540d;border:1px solid #ead296;border-radius:9px;padding:9px 12px;font-size:13px;margin-bottom:14px}
.empty{display:none;padding:30px;text-align:center;color:var(--muted)}
@media(max-width:1500px){.business-flow{justify-content:flex-start;gap:8px;padding:14px}.flow-stage{flex-basis:175px;min-height:160px;padding:20px 12px 14px}.flow-stage strong{font-size:16px}.flow-stage p{font-size:12px;margin-top:10px}.flow-stage code{font-size:11px}.flow-arrow{flex-basis:45px;font-size:29px}.flow-arrow small{font-size:8px}.flow-results{flex-basis:185px;gap:8px}.flow-results .flow-stage{min-height:98px;padding-top:15px}.flow-results .flow-stage strong{font-size:14px}.step-number{right:8px;top:8px}.implementation-tag{left:10px;bottom:8px}}
@media(max-width:900px){.top-inner{align-items:flex-start;flex-direction:column}.brand{min-width:0}.summary-grid,.notice-grid{grid-template-columns:1fr 1fr}.principles ul{columns:1}.definition-tools{top:118px}.business-flow{padding:10px;gap:6px}.flow-stage{flex-basis:155px}.flow-arrow{flex-basis:38px}.flow-results{flex-basis:165px}}@media(max-width:580px){main{padding:20px 12px 50px}.hero{padding:26px 21px}.summary-grid,.notice-grid{grid-template-columns:1fr}.top-inner{padding:10px 12px}.section-title{align-items:start;flex-direction:column}.form-grid{grid-template-columns:1fr}.form-grid label.full{grid-column:auto}.table-card summary{align-items:flex-start}.summary-actions{align-items:flex-end;flex-direction:column}}
@media print{.topbar,.definition-tools{display:none}.panel{display:block!important;break-before:page}.diagram-scroll{overflow:visible;transform:scale(.72);transform-origin:top left;width:138%}.table-card{break-inside:avoid}.table-card:not([open])>*:not(summary){display:block}}
</style>
</head>
<body>
<header class="topbar"><div class="top-inner"><div class="brand"><strong>医院向け患者注文管理</strong><small>DB定義書・ER図</small></div><nav aria-label="表示切替">
<button class="tab-button active" data-tab="overview">概要</button><button class="tab-button" data-tab="er-panel">ER図（現行＋将来）</button><button class="tab-button" data-tab="definitions">DB一覧・定義</button><button class="tab-button" data-tab="keys">KEY・制約</button><button class="tab-button" data-tab="migration">遷移計画</button>
</nav></div></header>
<main>
<section class="panel active" id="overview">
<div class="hero"><div class="eyebrow">Database design / 2026-07-22</div><h1>患者注文を、外部連携後も<br>壊さず育てるDB設計</h1><p>現在のSupabase実装と、Shopify・Salesforce連携後の目標論理モデルを分離して記載しています。外部仕様が未確定の領域は「将来案」であり、現時点の実DBではありません。</p><div class="meta"><span>Version 0.2 Draft</span><span>対象：patient_orders 系列</span><span>内部注文IDを維持</span></div></div>
<div class="summary-grid"><div class="summary-card"><strong>__CURRENT_TABLE_COUNT__</strong><span>現行関連テーブル</span></div><div class="summary-card"><strong>__CURRENT_COLUMN_COUNT__</strong><span>現行掲載カラム</span></div><div class="summary-card"><strong>__FUTURE_TABLE_COUNT__</strong><span>将来テーブル／拡張案</span></div><div class="summary-card"><strong>__FUTURE_CONSTRAINT_COUNT__</strong><span>将来一意制約案</span></div></div>
<div class="section-title"><div><h2>現在の重点事項</h2><p>実装済みと残課題を区別します。</p></div></div><div class="notice-grid"><div class="notice"><b>注文履歴を消さない</b><p>患者の物理削除で注文が連鎖削除される現状を、無効化・匿名化とFK見直しへ変更します。</p></div><div class="notice"><b>操作履歴は実装済み</b><p>状態変更、操作者、変更前後を patient_order_events に保存します。変更理由は今後の拡張対象です。</p></div><div class="notice"><b>注文時の配送先を保存</b><p>自宅配送では order_shipping_addresses に住所・受取人・電話番号を保存し、住所なしの登録を拒否します。</p></div></div>
<div class="section-title"><div><h2>設計原則</h2><p>正本とポータル投影を混在させません。</p></div></div><div class="principles"><ul><li>商品・注文・決済・返金・定期購入の将来正本はShopify</li><li>医院・患者・活動情報の将来CRM正本はSalesforce</li><li>医院内の受け取り準備状態はポータルが管理</li><li>外部受信はWebhook Inboxへ先に永続化</li><li>外部送信はOutboxで再試行可能にする</li><li>決済状態と医院業務状態を別軸で保持</li><li>架空データや保存されていない成功表示をしない</li><li>患者注文と医院仕入注文を統合しない</li></ul></div>
<div class="domain-note"><strong>別ドメイン：</strong> <code>clinic_orders</code> はBGJから医院へのB2B仕入・売上履歴です。患者注文の <code>patient_orders</code> 系列には統合しません。</div>
</section>
<section class="panel" id="er-panel"><div class="section-title"><div><h2>注文データ構成（現行＋将来）</h2><p>青が現行、金色が将来追加です。1つの流れとして表示します。</p></div></div>__UNIFIED_ER__</section>
<section class="panel" id="definitions"><div class="section-title"><div><h2>DB一覧・定義</h2><p>日本語名、物理名、データ型、PK・FK・UKを表示</p></div></div><div class="storage-note">「項目追加」はこの設計書だけに保存され、実際のSupabase DBは変更しません。追加内容は同じブラウザで保持されます。</div><div class="definition-tools"><input id="definition-search" class="search" type="search" placeholder="テーブル名・カラム名・KEY・説明を検索…"><button type="button" id="export-columns" class="secondary-button">追加項目をJSON保存</button></div><h3>現行DB一覧</h3><div id="current-definitions">__CURRENT_DEFINITIONS__</div><h3>将来DB一覧（論理案）</h3><div id="future-definitions">__FUTURE_DEFINITIONS__</div><div id="definition-empty" class="empty">一致する項目がありません。</div></section>
<section class="panel" id="keys"><div class="section-title"><div><h2>KEY・制約</h2><p>複合UKは構成カラムの組み合わせで一意になります。</p></div></div><div class="key-table"><table><thead><tr><th>区分</th><th>KEY</th><th>テーブル</th><th>構成カラム</th><th>種別</th><th>目的・条件</th></tr></thead><tbody>__CONSTRAINTS__</tbody></table></div></section>
<section class="panel" id="migration"><div class="section-title"><div><h2>DB遷移計画</h2><p>現在の内部注文IDを維持したまま段階移行します。</p></div></div><ol class="timeline">__MIGRATION__</ol></section>
</main>
<dialog id="column-dialog" class="column-dialog"><div class="dialog-head"><div><h2>DB項目を追加</h2><p id="dialog-table-name"></p></div><button type="button" class="icon-button" id="close-dialog" aria-label="閉じる">×</button></div><form id="column-form" class="column-form"><div class="storage-note">設計検討用の追記です。DBへ反映するには、別途マイグレーションSQLの作成とレビューが必要です。</div><input type="hidden" name="tableId"><div class="form-grid"><label>項目日本語名 *<input name="japaneseName" required placeholder="例：請求状態"></label><label>物理カラム名 *<input name="physicalName" required pattern="[a-z][a-z0-9_]*" placeholder="例：billing_status"></label><label>データ型 *<input name="dataType" required placeholder="例：text / uuid / timestamptz"></label><label>KEY<select name="key"><option value="">なし</option><option>PK</option><option>FK</option><option>UK</option><option>FK / UK構成</option></select></label><label>NULL可<select name="nullable"><option>NO</option><option>YES</option></select></label><label>DEFAULT<input name="defaultValue" placeholder="例：pending"></label><label class="full">参照先・制約<input name="constraint" placeholder="例：patients.id / pending, paid, refunded"></label><label class="full">説明<textarea name="description" placeholder="この項目の目的や注意点"></textarea></label></div><div class="dialog-actions"><small>* は必須項目です</small><div><button type="button" class="secondary-button" id="cancel-dialog">キャンセル</button> <button type="submit" class="primary-button">追加して保存</button></div></div></form></dialog>
<script>
const buttons=[...document.querySelectorAll('.tab-button')];const panels=[...document.querySelectorAll('.panel')];
function showTab(id){buttons.forEach(b=>b.classList.toggle('active',b.dataset.tab===id));panels.forEach(p=>p.classList.toggle('active',p.id===id));history.replaceState(null,'','#'+id);requestAnimationFrame(drawAllConnections);window.scrollTo({top:0,behavior:'smooth'});}
buttons.forEach(b=>b.addEventListener('click',()=>showTab(b.dataset.tab)));
const positionKey='clinicOrderErPositionsV3';const columnKey='clinicOrderCustomColumnsV1';
function loadJson(key,fallback){try{return JSON.parse(localStorage.getItem(key))||fallback}catch(_){return fallback}}
function saveJson(key,value){try{localStorage.setItem(key,JSON.stringify(value))}catch(_){}}
function drawConnections(canvas){const svg=canvas.querySelector('.connections');svg.querySelectorAll('.connection,.edge-label').forEach(n=>n.remove());if(!canvas.offsetParent)return;const scale=Number(canvas.dataset.zoom||1),cb=canvas.getBoundingClientRect();canvas.querySelectorAll('.edge-data').forEach(edge=>{const a=document.getElementById(edge.dataset.from),b=document.getElementById(edge.dataset.to);if(!a||!b)return;const ar=a.getBoundingClientRect(),br=b.getBoundingClientRect();let x1=(ar.right-cb.left)/scale,y1=(ar.top+ar.height/2-cb.top)/scale,x2=(br.left-cb.left)/scale,y2=(br.top+br.height/2-cb.top)/scale;if(br.left<ar.left){x1=(ar.left-cb.left)/scale;x2=(br.right-cb.left)/scale}const bend=Math.max(45,Math.abs(x2-x1)*.42),sign=x2>=x1?1:-1;const path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d',`M${x1},${y1} C${x1+sign*bend},${y1} ${x2-sign*bend},${y2} ${x2},${y2}`);path.setAttribute('class','connection'+(canvas.id==='future-er'?' future-line':''));svg.appendChild(path);const text=document.createElementNS('http://www.w3.org/2000/svg','text');text.setAttribute('x',(x1+x2)/2);text.setAttribute('y',(y1+y2)/2-6);text.setAttribute('text-anchor','middle');text.setAttribute('class','edge-label');text.textContent=edge.dataset.label;svg.appendChild(text);});}
function drawAllConnections(){document.querySelectorAll('.er-canvas').forEach(drawConnections)}window.addEventListener('resize',drawAllConnections);
function setZoom(canvas,value){const zoom=Math.max(.45,Math.min(1.35,value));canvas.dataset.zoom=String(zoom);canvas.style.zoom=String(zoom);const toolbar=document.querySelector(`.diagram-toolbar[data-target="${canvas.id}"]`);if(toolbar)toolbar.querySelector('.zoom-label').textContent=Math.round(zoom*100)+'%';requestAnimationFrame(()=>drawConnections(canvas));}
function restorePositions(){const saved=loadJson(positionKey,{});document.querySelectorAll('.er-canvas').forEach(canvas=>{canvas.querySelectorAll('.entity').forEach(card=>{const pos=saved[canvas.id]?.[card.id];card.style.left=(pos?.x??Number(card.dataset.defaultX))+'px';card.style.top=(pos?.y??Number(card.dataset.defaultY))+'px';});setZoom(canvas,1);});}
function savePosition(canvas,card){const saved=loadJson(positionKey,{});saved[canvas.id]??={};saved[canvas.id][card.id]={x:parseFloat(card.style.left),y:parseFloat(card.style.top)};saveJson(positionKey,saved)}
document.querySelectorAll('.entity header').forEach(handle=>{handle.addEventListener('pointerdown',event=>{const card=handle.closest('.entity'),canvas=card.closest('.er-canvas'),scale=Number(canvas.dataset.zoom||1),startX=event.clientX,startY=event.clientY,startLeft=parseFloat(card.style.left),startTop=parseFloat(card.style.top);card.classList.add('dragging');handle.setPointerCapture(event.pointerId);const move=ev=>{const left=Math.max(0,Math.min(canvas.offsetWidth-card.offsetWidth,startLeft+(ev.clientX-startX)/scale)),top=Math.max(0,Math.min(canvas.offsetHeight-card.offsetHeight,startTop+(ev.clientY-startY)/scale));card.style.left=left+'px';card.style.top=top+'px';drawConnections(canvas)};const up=ev=>{handle.releasePointerCapture(ev.pointerId);handle.removeEventListener('pointermove',move);handle.removeEventListener('pointerup',up);handle.removeEventListener('pointercancel',up);card.classList.remove('dragging');savePosition(canvas,card)};handle.addEventListener('pointermove',move);handle.addEventListener('pointerup',up);handle.addEventListener('pointercancel',up);});});
document.querySelectorAll('.diagram-toolbar').forEach(toolbar=>toolbar.addEventListener('click',event=>{const action=event.target.dataset.action;if(!action)return;const canvas=document.getElementById(toolbar.dataset.target),current=Number(canvas.dataset.zoom||1);if(action==='minus')setZoom(canvas,current-.1);if(action==='plus')setZoom(canvas,current+.1);if(action==='fit'){const available=canvas.parentElement.clientWidth-24;setZoom(canvas,Math.min(1,available/canvas.offsetWidth));}if(action==='arrange'){const saved=loadJson(positionKey,{});delete saved[canvas.id];saveJson(positionKey,saved);canvas.querySelectorAll('.entity').forEach(card=>{card.style.left=card.dataset.defaultX+'px';card.style.top=card.dataset.defaultY+'px'});drawConnections(canvas);}}));
document.querySelectorAll('.technical-er').forEach(details=>details.addEventListener('toggle',()=>{if(!details.open)return;requestAnimationFrame(()=>{const canvas=details.querySelector('.er-canvas'),available=canvas.parentElement.clientWidth-24;setZoom(canvas,Math.min(1,available/canvas.offsetWidth));});}));
const search=document.getElementById('definition-search');search.addEventListener('input',()=>{const q=search.value.trim().toLowerCase();let visible=0;document.querySelectorAll('.table-card').forEach(card=>{let rows=0;card.querySelectorAll('tbody tr').forEach(row=>{const match=!q||row.dataset.search.includes(q)||card.dataset.search.includes(q);row.hidden=!match;if(match)rows++;});card.hidden=rows===0;if(rows){visible++;if(q)card.open=true;}});document.getElementById('definition-empty').style.display=visible?'none':'block';});
const dialog=document.getElementById('column-dialog'),form=document.getElementById('column-form');let customColumns=loadJson(columnKey,[]);
function esc(value){return String(value??'').replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]))}
function keyHtml(key){if(!key)return '<span class="muted">—</span>';return key.split('/').map(raw=>{const token=raw.trim(),css=token==='PK'?'pk':token==='FK'?'fk':token.startsWith('UK')?'uk':'key';return `<span class="badge ${css}">${esc(token)}</span>`}).join(' ')}
function customRow(item){const searchText=[item.japaneseName,item.physicalName,item.dataType,item.key,item.constraint,item.description].join(' ').toLowerCase();return `<tr class="custom-row" data-custom-id="${esc(item.id)}" data-search="${esc(searchText)}"><td><strong>${esc(item.japaneseName)}</strong><code>${esc(item.physicalName)}</code></td><td><code>${esc(item.dataType)}</code></td><td>${keyHtml(item.key)}</td><td>${esc(item.nullable)}</td><td>${esc(item.defaultValue)||'—'}</td><td>${esc(item.constraint)||'—'}</td><td>${esc(item.description)||'—'}</td><td><button type="button" class="delete-column" data-id="${esc(item.id)}">削除</button></td></tr>`}
function renderCustomColumns(){document.querySelectorAll('.custom-row').forEach(row=>row.remove());document.querySelectorAll('.table-card').forEach(card=>{const items=customColumns.filter(item=>item.tableId===card.dataset.tableId);card.querySelector('tbody').insertAdjacentHTML('beforeend',items.map(customRow).join(''));const base=Number(card.querySelector('.column-count').dataset.baseCount);card.querySelector('.column-count').textContent=`${base+items.length} 項目${items.length?`（追加 ${items.length}）`:''}`;});}
document.querySelectorAll('.add-column-button').forEach(button=>button.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();const card=button.closest('.table-card');form.reset();form.elements.tableId.value=card.dataset.tableId;document.getElementById('dialog-table-name').textContent=`${card.dataset.japanese} / ${card.dataset.physical}`;dialog.showModal();}));
document.getElementById('close-dialog').addEventListener('click',()=>dialog.close());document.getElementById('cancel-dialog').addEventListener('click',()=>dialog.close());
form.addEventListener('submit',event=>{event.preventDefault();const data=Object.fromEntries(new FormData(form).entries());customColumns.push({...data,id:`custom-${Date.now()}-${Math.random().toString(16).slice(2)}`});saveJson(columnKey,customColumns);renderCustomColumns();dialog.close();document.querySelector(`[data-table-id="${CSS.escape(data.tableId)}"]`).open=true;});
document.getElementById('definitions').addEventListener('click',event=>{const button=event.target.closest('.delete-column');if(!button)return;customColumns=customColumns.filter(item=>item.id!==button.dataset.id);saveJson(columnKey,customColumns);renderCustomColumns();});
document.getElementById('export-columns').addEventListener('click',()=>{const blob=new Blob([JSON.stringify({exportedAt:new Date().toISOString(),columns:customColumns},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='clinic_order_db_custom_columns.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
restorePositions();renderCustomColumns();
const initial=location.hash.slice(1);if(initial&&document.getElementById(initial))showTab(initial);else drawAllConnections();
</script>
</body></html>'''
    replacements = {
        "__UNIFIED_ER__": unified_er,
        "__CURRENT_DEFINITIONS__": definition_cards(current, "current"),
        "__FUTURE_DEFINITIONS__": definition_cards(future, "future"),
        "__CONSTRAINTS__": constraint_table(source.CONSTRAINTS),
        "__MIGRATION__": migration_timeline(source.MIGRATION_PLAN),
        "__CURRENT_TABLE_COUNT__": str(len(current)),
        "__CURRENT_COLUMN_COUNT__": str(sum(len(table.columns) for table in current)),
        "__FUTURE_TABLE_COUNT__": str(len(future)),
        "__FUTURE_CONSTRAINT_COUNT__": str(sum(1 for row in source.CONSTRAINTS if row[0] == "将来案")),
    }
    for placeholder, value in replacements.items():
        template = template.replace(placeholder, value)
    return template


def main() -> None:
    source = load_source()
    source.validate_current_tables()
    content = build_html(source)
    for output in (OUTPUT, PUBLIC_OUTPUT):
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(content, encoding="utf-8")
        print(f"generated: {output}")
    print(f"bytes: {OUTPUT.stat().st_size}")
    print("tabs: 5")


if __name__ == "__main__":
    main()
