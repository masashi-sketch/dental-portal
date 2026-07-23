#!/usr/bin/env node
// ローカルdevサーバーに対する自動シナリオ計測スクリプト（Playwright）。
// 対象: 医院ポータル（clinic-credentials）・患者ポータル（医院の「患者ポータルをプレビュー」と同じ
// demo-patient-idクッキー機構経由）・BGJポータル（Google OAuth画面は自動操作せず、AUTH_SECRETで
// 正規のセッションCookieを直接発行して注入する。mintTestSession.mjs参照、localhost限定ガード付き）。
// 実行: node --env-file=.env.local scripts/measure-performance.mjs
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';
import { summarize } from './perfStats.mjs';
import { mintBgjSessionCookie } from './mintTestSession.mjs';

const BASE_URL = process.env.PERF_BASE_URL ?? 'http://localhost:3000';
const LOGIN_ID = process.env.TEST_CLINIC_LOGIN_ID;
const LOGIN_PASSWORD = process.env.TEST_CLINIC_LOGIN_PASSWORD;
const AUTH_SECRET = process.env.AUTH_SECRET;
const WARMUP_RUNS = 2;
const MEASURED_RUNS = 10;

if (!LOGIN_ID || !LOGIN_PASSWORD) {
  console.error('TEST_CLINIC_LOGIN_ID / TEST_CLINIC_LOGIN_PASSWORD が未設定です（.env.local を --env-file で読み込んでください）');
  process.exit(1);
}
if (!AUTH_SECRET) {
  console.error('AUTH_SECRET が未設定です（.env.local を --env-file で読み込んでください）');
  process.exit(1);
}

const NAV_TIMEOUT_MS = 60000;

async function gotoWithRetry(page, url, options) {
  try {
    return await page.goto(url, { ...options, timeout: NAV_TIMEOUT_MS });
  } catch (err) {
    if (err instanceof Error && err.name === 'TimeoutError') {
      console.warn(`  (タイムアウトのため1回リトライ: ${url})`);
      return await page.goto(url, { ...options, timeout: NAV_TIMEOUT_MS });
    }
    throw err;
  }
}

async function measureNavigation(page, url) {
  const start = Date.now();
  await gotoWithRetry(page, url, { waitUntil: 'domcontentloaded' });
  // 全画面を全API完了まで隠す方式は廃止した。data-app-readyは初期HTMLに含まれ、
  // ユーザーが画面骨格を見られる時点（DOMContentLoaded直後）を計測する。
  await page.locator('[data-app-ready="true"]').waitFor({ state: 'visible', timeout: NAV_TIMEOUT_MS });
  const displayReadyMs = Date.now() - start;
  await page.waitForLoadState('networkidle', { timeout: NAV_TIMEOUT_MS });
  const wallMs = Date.now() - start;
  const timing = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0];
    if (!nav) return null;
    return {
      ttfbMs: nav.responseStart - nav.startTime,
      domContentLoadedMs: nav.domContentLoadedEventEnd - nav.startTime,
      loadEventMs: nav.loadEventEnd - nav.startTime,
    };
  });
  return { displayReadyMs, wallMs, ...timing };
}

async function runScenarioStep(page, label, url, results) {
  for (let i = 0; i < WARMUP_RUNS; i++) {
    await measureNavigation(page, url);
  }
  const samples = { displayReadyMs: [], wallMs: [], ttfbMs: [], domContentLoadedMs: [], loadEventMs: [] };
  for (let i = 0; i < MEASURED_RUNS; i++) {
    const m = await measureNavigation(page, url);
    samples.displayReadyMs.push(m.displayReadyMs);
    samples.wallMs.push(m.wallMs);
    if (m.ttfbMs != null) samples.ttfbMs.push(m.ttfbMs);
    if (m.domContentLoadedMs != null) samples.domContentLoadedMs.push(m.domContentLoadedMs);
    if (m.loadEventMs != null) samples.loadEventMs.push(m.loadEventMs);
  }
  results.push({
    label,
    url,
    displayReadyMs: summarize(samples.displayReadyMs),
    wallMs: summarize(samples.wallMs),
    ttfbMs: summarize(samples.ttfbMs),
    domContentLoadedMs: summarize(samples.domContentLoadedMs),
    loadEventMs: summarize(samples.loadEventMs),
  });
  console.log(`  ${label}: 表示完了 p50=${Math.round(summarize(samples.displayReadyMs).p50)}ms p75=${Math.round(summarize(samples.displayReadyMs).p75)}ms p95=${Math.round(summarize(samples.displayReadyMs).p95)}ms`);
}

async function loginAsClinic(page) {
  const loginStart = Date.now();
  await gotoWithRetry(page, `${BASE_URL}/clinic-login`, { waitUntil: 'networkidle' });
  // clinic-login のinputにはlabel/id紐付けが無いため、type属性で特定する
  await page.locator('input[type="text"]').fill(LOGIN_ID);
  await page.locator('input[type="password"]').fill(LOGIN_PASSWORD);
  await page.getByRole('button', { name: 'ログイン' }).click();
  await page.waitForURL(`${BASE_URL}/admin`, { waitUntil: 'networkidle', timeout: NAV_TIMEOUT_MS });
  return Date.now() - loginStart;
}

async function captureApiTimings(page, url) {
  await gotoWithRetry(page, url, { waitUntil: 'networkidle' });
  return page.evaluate(() => {
    return performance
      .getEntriesByType('resource')
      .filter((e) => {
        const resourceUrl = new URL(e.name);
        return resourceUrl.origin === location.origin && resourceUrl.pathname.startsWith('/api/');
      })
      .map((e) => ({
        path: e.name.replace(location.origin, ''),
        startMs: e.startTime,
        durationMs: e.duration,
      }));
  });
}

async function getFirstPatientId(page) {
  await gotoWithRetry(page, `${BASE_URL}/admin/patients`, { waitUntil: 'networkidle' });
  const href = await page.locator('a[href^="/admin/patients/"]').first().getAttribute('href');
  if (!href) throw new Error('患者様が1件も登録されていないため /admin/patients/[id] を計測できません');
  return href.replace('/admin/patients/', '');
}

async function getFirstClinicCode(page) {
  await gotoWithRetry(page, `${BASE_URL}/bgj/customers`, { waitUntil: 'networkidle' });
  const href = await page.locator('a[href^="/bgj/customers/"]').first().getAttribute('href');
  if (!href) throw new Error('得意先が1件も登録されていないため /bgj/customers/[code] を計測できません');
  return href.replace('/bgj/customers/', '');
}

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log(`計測対象: ${BASE_URL}（ローカルdevサーバー）`);
  console.log(`ウォームアップ ${WARMUP_RUNS}回 + 計測 ${MEASURED_RUNS}回 / ステップ\n`);

  const loginMs = await loginAsClinic(page);
  console.log(`医院ログイン（1回、計測対象外の参考値）: ${loginMs}ms\n`);

  const patientId = await getFirstPatientId(page);

  console.log('[医院シナリオ] ログイン→ダッシュボード→注文→患者詳細');
  const clinicResults = [];
  await runScenarioStep(page, 'ダッシュボード (/admin/dashboard)', `${BASE_URL}/admin/dashboard`, clinicResults);
  await runScenarioStep(page, '注文 (/admin/orders)', `${BASE_URL}/admin/orders`, clinicResults);
  await runScenarioStep(page, `患者詳細 (/admin/patients/${patientId})`, `${BASE_URL}/admin/patients/${patientId}`, clinicResults);

  await context.addCookies([
    { name: 'demo-patient-id', value: patientId, url: BASE_URL, sameSite: 'Lax' },
  ]);

  console.log('\n[患者シナリオ] プレビュー→ホーム→受け取り→定期購入（医院スタッフの患者プレビュー機構を使用）');
  const patientResults = [];
  await runScenarioStep(page, 'ホーム (/home)', `${BASE_URL}/home`, patientResults);
  await runScenarioStep(page, '受け取り (/medication)', `${BASE_URL}/medication`, patientResults);
  await runScenarioStep(page, '定期購入 (/subscription)', `${BASE_URL}/subscription`, patientResults);

  console.log('\n[BGJシナリオ] ダッシュボード→得意先一覧→得意先詳細→レポート（AUTH_SECRETによるテストセッション注入、Google OAuth画面は不使用）');
  const bgjCookie = await mintBgjSessionCookie({
    baseUrl: BASE_URL,
    secret: AUTH_SECRET,
    email: 'e2e-playwright-test@biogaia.jp',
    name: 'E2Eテストユーザー（自動計測）',
  });
  const bgjContext = await browser.newContext();
  await bgjContext.addCookies([
    bgjCookie,
    // proxy.tsは認証済みでも portal-selected クッキーが無いと /auth/signin へ戻すため必要
    { name: 'portal-selected', value: 'true', url: BASE_URL, sameSite: 'Lax' },
  ]);
  const bgjPage = await bgjContext.newPage();
  const clinicCode = await getFirstClinicCode(bgjPage);

  const bgjResults = [];
  await runScenarioStep(bgjPage, 'ダッシュボード (/bgj/dashboard)', `${BASE_URL}/bgj/dashboard`, bgjResults);
  await runScenarioStep(bgjPage, '得意先一覧 (/bgj/customers)', `${BASE_URL}/bgj/customers`, bgjResults);
  await runScenarioStep(bgjPage, `得意先詳細 (/bgj/customers/${clinicCode})`, `${BASE_URL}/bgj/customers/${clinicCode}`, bgjResults);
  await runScenarioStep(bgjPage, 'レポート (/bgj/reports)', `${BASE_URL}/bgj/reports`, bgjResults);
  await bgjContext.close();

  console.log('\n[API内訳] 各ページ1回ずつ、マウント後に発生したAPI呼び出しの所要時間');
  const apiBreakdown = {};
  for (const url of [
    `${BASE_URL}/admin/dashboard`,
    `${BASE_URL}/admin/orders`,
    `${BASE_URL}/admin/patients/${patientId}`,
    `${BASE_URL}/home`,
    `${BASE_URL}/medication`,
    `${BASE_URL}/subscription`,
  ]) {
    const calls = await captureApiTimings(page, url);
    apiBreakdown[url.replace(BASE_URL, '')] = calls;
    for (const c of calls) {
      console.log(`  ${url.replace(BASE_URL, '')} -> ${c.path} ${Math.round(c.durationMs)}ms`);
    }
  }
  const bgjApiContext = await browser.newContext();
  await bgjApiContext.addCookies([
    bgjCookie,
    { name: 'portal-selected', value: 'true', url: BASE_URL, sameSite: 'Lax' },
  ]);
  const bgjApiPage = await bgjApiContext.newPage();
  for (const url of [
    `${BASE_URL}/bgj/dashboard`,
    `${BASE_URL}/bgj/customers/${clinicCode}`,
    `${BASE_URL}/bgj/reports`,
  ]) {
    const calls = await captureApiTimings(bgjApiPage, url);
    apiBreakdown[url.replace(BASE_URL, '')] = calls;
    for (const c of calls) {
      console.log(`  ${url.replace(BASE_URL, '')} -> ${c.path} ${Math.round(c.durationMs)}ms`);
    }
  }
  await bgjApiContext.close();

  await browser.close();

  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    loginMs,
    clinicResults,
    patientResults,
    bgjResults,
    apiBreakdown,
  };
  writeFileSync('scripts/.perf-last-run.json', JSON.stringify(report, null, 2));
  console.log('\n生データを scripts/.perf-last-run.json に保存しました。docs/performance-baseline.md へは手動で反映してください。');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
