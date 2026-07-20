#!/usr/bin/env node
// BGJポータル稼働確認スクリプト（Playwright）。
// scripts/mintTestSession.mjsでBGJロールのテストセッションを直接発行して注入し
// （Google OAuth画面は自動操作しない、localhost限定ガード付き）、全BGJページを巡回する。
// 各ページについてHTTPステータス・予期しないリダイレクト・コンソールエラー・
// ページ内エラー・失敗したAPI呼び出し・エラー文言の有無を確認し、スクリーンショットを保存する。
// 実行: node --env-file=.env.local scripts/smoke-test-bgj.mjs
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { mintBgjSessionCookie } from './mintTestSession.mjs';

const BASE_URL = process.env.PERF_BASE_URL ?? 'http://localhost:3000';
const AUTH_SECRET = process.env.AUTH_SECRET;
const SCREENSHOT_DIR = process.env.SMOKE_SCREENSHOT_DIR ?? 'scripts/.smoke-screenshots';
const NAV_TIMEOUT_MS = 60000;

if (!AUTH_SECRET) {
  console.error('AUTH_SECRET が未設定です（.env.local を --env-file で読み込んでください）');
  process.exit(1);
}

mkdirSync(SCREENSHOT_DIR, { recursive: true });

const STATIC_PAGES = [
  { label: 'BGJトップ', path: '/bgj' },
  { label: 'ダッシュボード', path: '/bgj/dashboard' },
  { label: '得意先一覧', path: '/bgj/customers' },
  { label: '患者一覧', path: '/bgj/patients' },
  { label: 'レポート', path: '/bgj/reports' },
  { label: 'マニュアル', path: '/bgj/manual' },
  { label: 'マスタ: 得意先ステータス', path: '/bgj/master/statuses' },
  { label: 'マスタ: 役職', path: '/bgj/master/roles' },
  { label: 'マスタ: 担当エリア', path: '/bgj/master/areas' },
  { label: 'マスタ: LINKマスタ', path: '/bgj/master/links' },
  { label: 'マスタ: 商品', path: '/bgj/master/products' },
  { label: 'マスタ: 営業担当', path: '/bgj/master/staff' },
  { label: 'システム管理: DB', path: '/bgj/system/db' },
  { label: 'システム管理: アプリ', path: '/bgj/system/apps' },
  { label: 'システム管理: ダッシュボード', path: '/bgj/system/dashboard' },
  { label: 'システム管理: 共通マスタ', path: '/bgj/system/settings' },
];

async function checkPage(page, label, path) {
  const consoleErrors = [];
  const pageErrors = [];
  const failedApiCalls = [];

  const onConsole = (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  };
  const onPageError = (err) => pageErrors.push(err.message);
  const onResponse = (res) => {
    if (res.url().includes('/api/') && res.status() >= 400) {
      failedApiCalls.push(`${res.status()} ${res.url().replace(BASE_URL, '')}`);
    }
  };

  page.on('console', onConsole);
  page.on('pageerror', onPageError);
  page.on('response', onResponse);

  const result = { label, path, ok: true, notes: [] };
  try {
    const res = await page.goto(`${BASE_URL}${path}`, { waitUntil: 'networkidle', timeout: NAV_TIMEOUT_MS });
    result.status = res?.status() ?? null;
    result.finalUrl = page.url().replace(BASE_URL, '');
    if (result.finalUrl !== path && !result.finalUrl.startsWith(path)) {
      result.notes.push(`予期しないリダイレクト: ${path} -> ${result.finalUrl}`);
    }

    // 本文の"500"等での判定は価格・件数表示（例: ¥500）を誤検知するため使わない。
    // Next.js devの<nextjs-portal>は常時マウントされるコンテナのため存在自体は判定に使わず、
    // 実際のエラーダイアログ文言のみを見る。
    const hasNextErrorOverlay = await page
      .getByText(/Unhandled Runtime Error|Server Error|Application error/i)
      .count()
      .catch(() => 0);
    if (hasNextErrorOverlay > 0) {
      result.notes.push('Next.jsエラーオーバーレイを検出');
    }

    const shotPath = `${SCREENSHOT_DIR}/${path.replace(/\//g, '_') || '_root'}.png`;
    await page.screenshot({ path: shotPath, fullPage: true }).catch(() => {});
    result.screenshot = shotPath;
  } catch (err) {
    result.ok = false;
    result.notes.push(`ナビゲーション失敗: ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    page.off('console', onConsole);
    page.off('pageerror', onPageError);
    page.off('response', onResponse);
  }

  if (consoleErrors.length) result.notes.push(`コンソールエラー${consoleErrors.length}件: ${consoleErrors.slice(0, 3).join(' | ')}`);
  if (pageErrors.length) result.notes.push(`ページ内例外${pageErrors.length}件: ${pageErrors.slice(0, 3).join(' | ')}`);
  if (failedApiCalls.length) result.notes.push(`失敗したAPI呼び出し: ${failedApiCalls.join(', ')}`);
  if (result.notes.length > 0) result.ok = false;

  return result;
}

async function findFirstInquiryId(page, clinicCode) {
  return page.evaluate(async ({ base, code }) => {
    const res = await fetch(`${base}/api/bgj/clinics/${code}/inquiries`, { credentials: 'include' });
    if (!res.ok) return null;
    const data = await res.json();
    const list = Array.isArray(data) ? data : (data.inquiries ?? []);
    return list[0]?.id ?? null;
  }, { base: BASE_URL, code: clinicCode });
}

async function main() {
  const cookie = await mintBgjSessionCookie({
    baseUrl: BASE_URL,
    secret: AUTH_SECRET,
    email: 'e2e-playwright-test@biogaia.jp',
    name: 'E2Eテストユーザー（稼働確認）',
  });

  const browser = await chromium.launch();
  const context = await browser.newContext();
  await context.addCookies([
    cookie,
    { name: 'portal-selected', value: 'true', url: BASE_URL, sameSite: 'Lax' },
  ]);
  const page = await context.newPage();
  page.setDefaultTimeout(NAV_TIMEOUT_MS);

  console.log(`計測対象: ${BASE_URL}（ローカルdevサーバー、BGJテストセッション）\n`);

  const results = [];
  for (const { label, path } of STATIC_PAGES) {
    const r = await checkPage(page, label, path);
    results.push(r);
    console.log(`${r.ok ? '✅' : '⚠️ '} ${label} (${path})${r.notes.length ? '\n     ' + r.notes.join('\n     ') : ''}`);
  }

  // 動的ページ: 得意先詳細（直前のループで別ページに遷移済みのため一覧へ戻ってから抽出する）
  let clinicCode = null;
  try {
    await page.goto(`${BASE_URL}/bgj/customers`, { waitUntil: 'networkidle', timeout: NAV_TIMEOUT_MS });
    const href = await page.locator('a[href^="/bgj/customers/"]').first().getAttribute('href');
    clinicCode = href ? href.replace('/bgj/customers/', '') : null;
  } catch {
    // /bgj/customers 自体が失敗していれば取得できない
  }
  if (clinicCode) {
    const r = await checkPage(page, `得意先詳細 (${clinicCode})`, `/bgj/customers/${clinicCode}`);
    results.push(r);
    console.log(`${r.ok ? '✅' : '⚠️ '} ${r.label} (${r.path})${r.notes.length ? '\n     ' + r.notes.join('\n     ') : ''}`);

    const inquiryId = await findFirstInquiryId(page, clinicCode).catch(() => null);
    if (inquiryId) {
      const ri = await checkPage(page, `問い合わせ返信 (${inquiryId})`, `/bgj/inquiries/${inquiryId}`);
      results.push(ri);
      console.log(`${ri.ok ? '✅' : '⚠️ '} ${ri.label} (${ri.path})${ri.notes.length ? '\n     ' + ri.notes.join('\n     ') : ''}`);
    } else {
      console.log('⏭️  /bgj/inquiries/[id]: 対象データ（問い合わせ）が無いためスキップ');
    }
  } else {
    console.log('⏭️  /bgj/customers/[code]: 得意先データが取得できずスキップ');
  }

  await browser.close();

  const failed = results.filter((r) => !r.ok);
  console.log(`\n合計 ${results.length}ページ中、${failed.length}件で異常の兆候あり。`);
  console.log(`スクリーンショット保存先: ${SCREENSHOT_DIR}/`);
  if (failed.length > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
