#!/usr/bin/env node
// 過去6ヶ月分のダミー活動データ（clinic_orders/clinic_visits/clinic_inquiries(+replies)）を
// 投入するシードスクリプト。BGJダッシュボード（/bgj/dashboard）・レポート（/bgj/reports）の
// アラート閾値（dashboard_followup_days/dormant_days/include_never_ordered）・
// レポート集計期間（report_period_months）がapp_settingsの設定どおりに反映されるかを
// 実データで検証する目的で作成。得意先ごとに「アクティブ／要フォロー／休眠・解約リスク／
// 未注文」の4パターンを意図的に作り分ける。
//
// clinic_inquiriesはAPIルート（/api/admin/clinic-inquiries）を経由せず直接DBへ挿入するため、
// Slack Webhookへの実通知は発生しない（slack_notified_atはnullのまま）。
//
// 実行: node --env-file=.env.local scripts/seed-dummy-activity-data.mjs [orders] [visits] [inquiries]
// 引数省略時は3種すべて投入する。再実行するとその都度追加投入される点に注意（重複投入防止は行わない）。
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY が未設定です（.env.local を --env-file で読み込んでください）');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const TODAY = new Date();
const MONTHS_BACK = 6;
const RANGE_START = new Date(TODAY);
RANGE_START.setMonth(RANGE_START.getMonth() - MONTHS_BACK);

function fmt(d) {
  return d.toISOString().slice(0, 10);
}
function addDays(d, days) {
  const r = new Date(d);
  r.setDate(r.getDate() + days);
  return r;
}
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function randomDateBetween(start, end) {
  const t = start.getTime() + Math.random() * (end.getTime() - start.getTime());
  return new Date(t);
}
function pick(arr) {
  return arr[randomInt(0, arr.length - 1)];
}

// 得意先プロフィール（受注パターン）。BGJダッシュボードのアラート判定
// （followup_days=60, dormant_days=90が既定値）を狙って作り分ける。
const CLINIC_PROFILES = {
  A000001: 'healthy',
  A000004: 'healthy',
  A000005: 'healthy',
  A000006: 'healthy',
  A000008: 'healthy',
  A000009: 'healthy', // 担当未割当（staff_id null）と受注は独立に検証する
  A000010: 'followup', // 最終受注が60〜90日前 → 「要フォロー」想定
  A000011: 'followup',
  A000002: 'dormant', // 最終受注が90日超前 → 「休眠・解約リスク」想定
  A000003: 'dormant',
  A000007: 'dormant',
  A000012: 'never', // 受注ゼロ（contract_since起点でのアラートを検証）
};

const VISIT_PURPOSES = ['定期訪問', '新商品提案', '契約更新相談', '導入トレーニング', 'クレーム対応', '棚卸し・在庫確認'];
const INQUIRY_TEMPLATES = [
  { subject: '商品の在庫について', body: '定期便で注文している商品の在庫状況を確認したいです。' },
  { subject: '新商品のサンプルが欲しい', body: '新しく発売された商品のサンプルをいただくことは可能でしょうか。' },
  { subject: '定期便の数量変更について', body: '来月から定期便の数量を増やしたいのですが、手続き方法を教えてください。' },
  { subject: '請求書の再発行依頼', body: '先月分の請求書を紛失してしまったため、再発行をお願いできますでしょうか。' },
  { subject: '商品の使用方法について', body: '患者様への説明用に、商品の正しい使用方法をまとめた資料はありますか。' },
  { subject: 'キャンペーンについて', body: '現在実施中のキャンペーンの詳細を教えてください。' },
  { subject: '配送遅延の確認', body: '注文した商品がまだ届いていないようです。配送状況を確認していただけますか。' },
  { subject: '患者様向けパンフレットの追加依頼', body: '待合室に置くパンフレットが不足してきたので、追加で送っていただけますか。' },
];

async function seedOrders() {
  const { data: products, error: productsError } = await supabase.from('products').select('name, price');
  if (productsError) throw productsError;

  const rows = [];
  for (const [customerCode, profile] of Object.entries(CLINIC_PROFILES)) {
    if (profile === 'never') continue;

    let lastOrderDate;
    if (profile === 'healthy') lastOrderDate = addDays(TODAY, -randomInt(3, 25));
    if (profile === 'followup') lastOrderDate = addDays(TODAY, -randomInt(65, 85));
    if (profile === 'dormant') lastOrderDate = addDays(TODAY, -randomInt(100, 160));

    // 最終注文日を含め、そこから遡って月1〜3件のペースで過去の注文履歴も作る
    // （レポートの月次推移グラフに厚みを持たせるため）。
    let cursor = lastOrderDate;
    const earliestAllowed = RANGE_START;
    rows.push(makeOrderRow(customerCode, lastOrderDate, products));
    while (true) {
      const stepBack = randomInt(10, 35);
      cursor = addDays(cursor, -stepBack);
      if (cursor < earliestAllowed) break;
      rows.push(makeOrderRow(customerCode, cursor, products));
    }
  }

  const { error } = await supabase.from('clinic_orders').insert(rows);
  if (error) throw error;
  console.log(`clinic_orders: ${rows.length}件 投入`);
}

function makeOrderRow(customerCode, date, products) {
  const product = pick(products);
  const quantity = randomInt(1, 6);
  return {
    customer_code: customerCode,
    order_date: fmt(date),
    product_name: product.name,
    quantity,
    amount: product.price * quantity,
    status: '出荷済',
  };
}

async function seedVisits() {
  const { data: clinics, error: clinicsError } = await supabase
    .from('clinics')
    .select('customer_code, staff_id');
  if (clinicsError) throw clinicsError;
  const { data: reps, error: repsError } = await supabase.from('sales_reps').select('id, name');
  if (repsError) throw repsError;
  const repById = new Map(reps.map((r) => [r.id, r.name]));

  const rows = [];
  for (const clinic of clinics) {
    const repName = repById.get(clinic.staff_id) ?? pick(reps).name;
    const visitCount = randomInt(3, 7);
    for (let i = 0; i < visitCount; i++) {
      const visitDate = randomDateBetween(RANGE_START, TODAY);
      const hasNextVisit = Math.random() < 0.6;
      rows.push({
        customer_code: clinic.customer_code,
        visit_date: fmt(visitDate),
        purpose: pick(VISIT_PURPOSES),
        memo: Math.random() < 0.7 ? '院長先生と面談。特に大きな問題はなし。' : null,
        next_visit_date: hasNextVisit ? fmt(addDays(visitDate, randomInt(14, 45))) : null,
        created_by: repName,
      });
    }
  }

  const { error } = await supabase.from('clinic_visits').insert(rows);
  if (error) throw error;
  console.log(`clinic_visits: ${rows.length}件 投入`);
}

async function seedInquiries() {
  const { data: clinics, error: clinicsError } = await supabase
    .from('clinics')
    .select('customer_code, staff_id');
  if (clinicsError) throw clinicsError;
  const { data: reps, error: repsError } = await supabase.from('sales_reps').select('id, name');
  if (repsError) throw repsError;
  const repById = new Map(reps.map((r) => [r.id, r.name]));

  const inquiryRows = [];
  const meta = [];
  for (const clinic of clinics) {
    const count = randomInt(2, 4);
    for (let i = 0; i < count; i++) {
      const template = pick(INQUIRY_TEMPLATES);
      const createdAt = randomDateBetween(RANGE_START, TODAY);
      const statusRoll = Math.random();
      const status = statusRoll < 0.5 ? '完了' : statusRoll < 0.8 ? '対応中' : '未対応';
      inquiryRows.push({
        customer_code: clinic.customer_code,
        subject: template.subject,
        body: template.body,
        status,
        created_by: 'クリニックスタッフ（ダミー）',
        slack_notified_at: null,
        created_at: createdAt.toISOString(),
      });
      meta.push({ status, createdAt, staffId: clinic.staff_id });
    }
  }

  const { data: insertedInquiries, error: inquiryError } = await supabase
    .from('clinic_inquiries')
    .insert(inquiryRows)
    .select('id');
  if (inquiryError) throw inquiryError;

  const replyRows = [];
  insertedInquiries.forEach((row, i) => {
    const info = meta[i];
    if (info.status === '未対応') return;
    const repName = repById.get(info.staffId) ?? pick(reps).name;
    replyRows.push({
      inquiry_id: row.id,
      author_name: repName,
      author_email: null,
      body: 'ご連絡ありがとうございます。担当より追ってご案内いたします。',
      created_at: addDays(info.createdAt, randomInt(1, 3)).toISOString(),
    });
  });

  if (replyRows.length > 0) {
    const { error: replyError } = await supabase.from('clinic_inquiry_replies').insert(replyRows);
    if (replyError) throw replyError;
  }

  console.log(`clinic_inquiries: ${inquiryRows.length}件 投入（うち返信 ${replyRows.length}件）`);
}

async function main() {
  const args = process.argv.slice(2);
  const steps = args.length > 0 ? args : ['orders', 'visits', 'inquiries'];
  console.log(`対象期間: ${fmt(RANGE_START)} 〜 ${fmt(TODAY)} / 実行対象: ${steps.join(', ')}`);
  if (steps.includes('orders')) await seedOrders();
  if (steps.includes('visits')) await seedVisits();
  if (steps.includes('inquiries')) await seedInquiries();
  console.log('完了');
}

main().catch((err) => {
  console.error('シード投入に失敗しました:', err);
  process.exit(1);
});
