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

async function shoot(page, { path: targetPath, tabClick, file, waitAfterNav = 600, waitAfterTab = 700, target = 'main', cardSelector }) {
  if (targetPath) {
    await page.goto(`${BASE_URL}${targetPath}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(waitAfterNav);
  }
  if (tabClick) {
    await page.getByRole('button', { name: tabClick }).click();
    await page.waitForTimeout(waitAfterTab);
  }
  const region = cardSelector
    ? page.locator(cardSelector).last()
    : target === 'body'
      ? page.locator('body')
      : page.locator('main').first();
  await region.waitFor({ state: 'visible' });
  const box = await region.boundingBox();
  const outPath = path.join(OUT_DIR, file);
  if (box && box.height > MAX_SHOT_HEIGHT) {
    await page.screenshot({ path: outPath, clip: { x: box.x, y: box.y, width: box.width, height: MAX_SHOT_HEIGHT } });
  } else {
    await region.screenshot({ path: outPath });
  }
  console.log('  saved', file);
}

async function newPublicPage(browser) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  return context.newPage();
}

// role単位でページをまとめ、同じページ内で複数タブを連続撮影する
// （ログイン・ページ遷移の重複を避ける）。
const manifest = {
  shared: [
    {
      role: 'public',
      shots: [
        { path: '/auth/signin', file: 'portal-select.png', cardSelector: '.rounded-3xl' },
        { path: '/clinic-login', file: 'clinic-login-form.png', cardSelector: '.rounded-2xl' },
        { path: '/', file: 'patient-login-form.png', cardSelector: '.rounded-2xl' },
      ],
    },
  ],
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
  batch3: [
    {
      role: 'admin',
      shots: [
        { path: '/admin/patients', file: 'admin-patients-list.png' },
        { tabClick: '＋ 患者IDを発行', file: 'admin-patients-new-modal.png', cardSelector: '.rounded-2xl' },
        { path: '/admin/clinic-info/contract', file: 'admin-clinic-contract.png' },
        { path: '/admin/clinic-info/config', file: 'admin-clinic-config.png' },
        { path: '/admin/clinic-info/qr', file: 'admin-clinic-qr.png' },
        { path: '/admin/clinic-intro', file: 'admin-clinic-intro.png' },
        { path: '/admin/qa', file: 'admin-qa.png' },
        { path: '/admin/news', file: 'admin-news.png' },
      ],
    },
    {
      role: 'public',
      shots: [{ path: '/forgot-password', file: 'forgot-password-form.png', cardSelector: '.rounded-2xl' }],
    },
    {
      role: 'patient',
      shots: [{ path: '/medication', file: 'patient-medication.png' }],
    },
    {
      role: 'bgj',
      shots: [
        { path: `/bgj/customers/${CLINIC_CODE}`, tabClick: '接続情報', file: 'bgj-customer-connection-tab.png' },
      ],
    },
  ],
  // /join/[slug]/mobile は得意先のsignup_slug（PIN再発行のたびに変わる）に依存するため
  // 固定マニフェストに入れず、直前にbgj-customer-connection-tab等で確認した最新スラッグを
  // 都度指定して単発実行する。例:
  //   node --env-file=.env.local scripts/capture-manual-screenshots.mjs joinMobile:5nH26-WIsI1CgnGQojd0lQ
};

async function run(batchNames) {
  const browser = await chromium.launch();

  const joinMobileArg = batchNames.find((name) => name.startsWith('joinMobile:'));
  if (joinMobileArg) {
    const slug = joinMobileArg.split(':')[1];
    const page = await newPublicPage(browser);
    await shoot(page, { path: `/join/${slug}/mobile`, file: 'join-signup-mobile.png', target: 'body' });
    await browser.close();
    console.log('完了（joinMobile単発実行）');
    return;
  }

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
            : group.role === 'public'
              ? await newPublicPage(browser)
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
