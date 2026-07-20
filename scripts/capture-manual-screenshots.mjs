#!/usr/bin/env node
// BGJマニュアル（/bgj/manual）の画像化用スクリーンショット一括撮影スクリプト。
// 各Steps項目の右カラムに使う実画面のスクリーンショットをpublic/manual/へ出力する。
// 撮影対象はmanifest配列で管理し、同じ画面を複数のマニュアル項目から参照する
// 場合はファイル名を使い回す（撮影・保守の重複を避ける）。
//
// 実行: node --env-file=.env.local scripts/capture-manual-screenshots.mjs [バッチ名...]
// バッチ名省略時は全件撮影する。
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { mintBgjSessionCookie } from './mintTestSession.mjs';

const BASE_URL = process.env.PERF_BASE_URL ?? 'http://localhost:3000';
const AUTH_SECRET = process.env.AUTH_SECRET;
const CLINIC_LOGIN_ID = process.env.TEST_CLINIC_LOGIN_ID;
const CLINIC_LOGIN_PASSWORD = process.env.TEST_CLINIC_LOGIN_PASSWORD;
const OUT_DIR = 'public/manual';
const CLINIC_CODE = 'A000001'; // 広島中央歯科クリニック（テストアカウント、得意先コード）
const MAX_SHOT_HEIGHT = 1200; // 縦に長すぎるページは上部のみ切り取る

if (!AUTH_SECRET) {
  console.error('AUTH_SECRET が未設定です（.env.local を --env-file で読み込んでください）');
  process.exit(1);
}
if (!CLINIC_LOGIN_ID || !CLINIC_LOGIN_PASSWORD) {
  console.error('TEST_CLINIC_LOGIN_ID / TEST_CLINIC_LOGIN_PASSWORD が未設定です');
  process.exit(1);
}

mkdirSync(OUT_DIR, { recursive: true });

async function newBgjPage(browser) {
  const cookie = await mintBgjSessionCookie({
    baseUrl: BASE_URL,
    secret: AUTH_SECRET,
    email: 'manual-shot@biogaia.jp',
    name: 'マニュアル撮影用',
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addCookies([cookie, { name: 'portal-selected', value: 'true', url: BASE_URL, sameSite: 'Lax' }]);
  return context.newPage();
}

async function newClinicPage(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto(`${BASE_URL}/clinic-login`, { waitUntil: 'networkidle' });
  await page.fill('input[type="text"]', CLINIC_LOGIN_ID);
  await page.fill('input[type="password"]', CLINIC_LOGIN_PASSWORD);
  await page.getByRole('button', { name: 'ログイン' }).click();
  await page.waitForTimeout(1000);
  await page.waitForLoadState('networkidle');
  return page;
}

async function newPatientPreviewPage(browser) {
  const page = await newClinicPage(browser);
  await page.goto(`${BASE_URL}/admin/patients`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /プレビュー/ }).first().click();
  await page.waitForTimeout(500);
  await page.waitForLoadState('networkidle');
  return page;
}

async function shoot(page, { path: targetPath, tabClick, file, waitAfterNav = 600, waitAfterTab = 700 }) {
  if (targetPath) {
    await page.goto(`${BASE_URL}${targetPath}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(waitAfterNav);
  }
  if (tabClick) {
    await page.getByRole('button', { name: tabClick }).click();
    await page.waitForTimeout(waitAfterTab);
  }
  const main = page.locator('main').first();
  await main.waitFor({ state: 'visible' });
  const box = await main.boundingBox();
  const outPath = path.join(OUT_DIR, file);
  if (box && box.height > MAX_SHOT_HEIGHT) {
    await page.screenshot({ path: outPath, clip: { x: box.x, y: box.y, width: box.width, height: MAX_SHOT_HEIGHT } });
  } else {
    await main.screenshot({ path: outPath });
  }
  console.log('  saved', file);
}

// role単位でページをまとめ、同じページ内で複数タブを連続撮影する
// （ログイン・ページ遷移の重複を避ける）。
const manifest = {
  batch1: [
    {
      role: 'bgj',
      shots: [
        { path: '/bgj/customers', file: 'bgj-customers-list.png' },
        { path: `/bgj/customers/${CLINIC_CODE}`, tabClick: '基本情報', file: 'bgj-customer-basic-info.png' },
        { tabClick: 'ログイン管理', file: 'bgj-customer-login-tab.png' },
        { tabClick: 'クリニック紹介', file: 'bgj-customer-clinic-intro-tab.png' },
        { tabClick: 'お知らせ', file: 'bgj-customer-announcements-tab.png' },
        { tabClick: 'メール設定', file: 'bgj-customer-email-tab.png' },
        { path: '/bgj/master/staff', file: 'bgj-master-staff.png' },
        { path: '/bgj/master/links', file: 'bgj-master-links.png' },
        { path: '/bgj/master/statuses', file: 'bgj-master-statuses.png' },
        { path: '/bgj/system/apps', file: 'bgj-system-apps.png' },
        { path: '/bgj/system/settings', file: 'bgj-system-settings.png' },
      ],
    },
    {
      role: 'admin',
      shots: [{ path: '/admin/inquiry', file: 'admin-inquiry.png' }],
    },
  ],
};

async function run(batchNames) {
  const browser = await chromium.launch();
  const targets = batchNames.length > 0 ? batchNames : Object.keys(manifest);

  for (const batchName of targets) {
    const groups = manifest[batchName];
    if (!groups) {
      console.warn(`未知のバッチ名: ${batchName}`);
      continue;
    }
    console.log(`=== ${batchName} ===`);
    for (const group of groups) {
      console.log(` role=${group.role}`);
      const page =
        group.role === 'bgj'
          ? await newBgjPage(browser)
          : group.role === 'admin'
            ? await newClinicPage(browser)
            : await newPatientPreviewPage(browser);
      for (const shotDef of group.shots) {
        await shoot(page, shotDef);
      }
      await page.context().close();
    }
  }

  await browser.close();
  console.log('完了');
}

run(process.argv.slice(2));
