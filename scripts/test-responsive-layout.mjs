#!/usr/bin/env node
import { chromium } from 'playwright';
import { mintBgjSessionCookie } from './mintTestSession.mjs';
import { ensureNextTestServer } from './nextTestServer.mjs';

const BASE_URL = process.env.RESPONSIVE_BASE_URL ?? 'http://localhost:3000';
const AUTH_SECRET = process.env.AUTH_SECRET;
const VIEWPORTS = [
  { name: 'mobile-small', width: 375, height: 667, columns: 1 },
  { name: 'mobile-large', width: 390, height: 844, columns: 1 },
  { name: 'tablet', width: 768, height: 1024, columns: 2 },
  { name: 'small-laptop', width: 1024, height: 768, columns: 2 },
  { name: 'laptop', width: 1280, height: 720, columns: 4 },
  { name: 'desktop-small', width: 1366, height: 768, columns: 4 },
  { name: 'desktop', width: 1440, height: 900, columns: 4 },
  { name: 'desktop-wide', width: 1920, height: 1080, columns: 4 },
];

if (!AUTH_SECRET) {
  console.error('AUTH_SECRET が未設定です');
  process.exit(1);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function verifyViewport(browser, sessionCookie, viewport) {
  const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
  await context.addCookies([
    sessionCookie,
    { name: 'portal-selected', value: 'true', url: BASE_URL, sameSite: 'Lax' },
    { name: 'bgj-viewing-customer-code', value: 'A000001', url: BASE_URL, sameSite: 'Lax' },
  ]);
  const page = await context.newPage();

  try {
    await page.goto(`${BASE_URL}/admin/dashboard`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.locator('[data-app-ready="true"]').waitFor({ state: 'visible', timeout: 20_000 });
    await page.getByTestId('admin-dashboard-content').waitFor({ state: 'visible' });

    const layout = await page.evaluate(() => {
      const desktopSidebar = document.querySelector('[data-testid="admin-desktop-sidebar"]');
      const compactHeader = document.querySelector('[data-testid="admin-compact-header"]');
      const content = document.querySelector('[data-testid="admin-dashboard-content"]');
      const statGrid = document.querySelector('[data-testid="admin-stat-grid"]');
      const contactTrigger = document.querySelector('[data-testid="sales-rep-contact-trigger"]');
      if (!desktopSidebar || !compactHeader || !content || !statGrid || !contactTrigger) {
        throw new Error('レスポンシブ検証用の要素が見つかりません');
      }

      const sidebarRect = desktopSidebar.getBoundingClientRect();
      const headerRect = compactHeader.getBoundingClientRect();
      const contentRect = content.getBoundingClientRect();
      const triggerRect = contactTrigger.getBoundingClientRect();
      return {
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
        scrollWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
        sidebarVisible: getComputedStyle(desktopSidebar).display !== 'none',
        sidebarBottom: sidebarRect.bottom,
        compactHeaderVisible: getComputedStyle(compactHeader).display !== 'none',
        compactHeaderBottom: headerRect.bottom,
        content: { left: contentRect.left, top: contentRect.top, right: contentRect.right, width: contentRect.width },
        columns: getComputedStyle(statGrid).gridTemplateColumns.split(' ').filter(Boolean).length,
        trigger: { left: triggerRect.left, top: triggerRect.top, right: triggerRect.right, bottom: triggerRect.bottom },
      };
    });

    const label = `${viewport.name} (${viewport.width}x${viewport.height})`;
    assert(layout.scrollWidth <= layout.innerWidth + 1, `${label}: 横スクロールが発生しています (${layout.scrollWidth}px)`);
    assert(layout.content.left >= -1 && layout.content.right <= layout.innerWidth + 1, `${label}: 本文が画面外へはみ出しています`);
    assert(layout.columns === viewport.columns, `${label}: KPI列数が${layout.columns}列です（期待値${viewport.columns}列）`);
    assert(layout.trigger.left >= 0 && layout.trigger.right <= layout.innerWidth, `${label}: 営業担当ボタンが横にはみ出しています`);
    assert(layout.trigger.top >= 0 && layout.trigger.bottom <= layout.innerHeight, `${label}: 営業担当ボタンが縦にはみ出しています`);

    if (viewport.width < 1024) {
      assert(!layout.sidebarVisible && layout.compactHeaderVisible, `${label}: コンパクトヘッダーへ切り替わっていません`);
      assert(layout.content.top >= layout.compactHeaderBottom, `${label}: 固定ヘッダーが本文に重なっています`);
    } else {
      assert(layout.sidebarVisible && !layout.compactHeaderVisible, `${label}: デスクトップサイドバーへ切り替わっていません`);
      assert(layout.sidebarBottom >= layout.innerHeight - 1, `${label}: サイドバーが画面下端まで届いていません`);
    }

    if (viewport.width >= 1920) {
      assert(layout.content.width <= 1721, `${label}: 本文の最大幅が効いていません (${layout.content.width}px)`);
    }

    console.log(`✓ ${label}: ${layout.columns}列、横はみ出しなし`);
  } finally {
    await context.close();
  }
}

async function verifyBgjOrdersViewport(browser, sessionCookie, viewport) {
  const context = await browser.newContext({ viewport });
  await context.addCookies([
    sessionCookie,
    { name: 'portal-selected', value: 'true', url: BASE_URL, sameSite: 'Lax' },
  ]);
  const page = await context.newPage();

  try {
    await page.goto(`${BASE_URL}/bgj/orders?view=received`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.locator('[data-app-ready="true"]').waitFor({ state: 'visible', timeout: 20_000 });
    await page.getByRole('heading', { name: '受注一覧' }).waitFor({ state: 'visible' });
    const layout = await page.evaluate(() => {
      const table = document.querySelector('[data-testid="bgj-orders-table"]');
      const cards = document.querySelector('[data-testid="bgj-orders-cards"]');
      if (!table || !cards) throw new Error('BGJ受注一覧のレスポンシブ要素が見つかりません');
      return {
        innerWidth: window.innerWidth,
        scrollWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
        tableVisible: getComputedStyle(table).display !== 'none',
        cardsVisible: getComputedStyle(cards).display !== 'none',
      };
    });

    const isDesktop = viewport.width >= 1024;
    assert(layout.scrollWidth <= layout.innerWidth + 1, `BGJ受注一覧 (${viewport.width}x${viewport.height}): 横スクロールが発生しています`);
    assert(layout.tableVisible === isDesktop, `BGJ受注一覧 (${viewport.width}x${viewport.height}): 表示形式が不正です`);
    assert(layout.cardsVisible !== isDesktop, `BGJ受注一覧 (${viewport.width}x${viewport.height}): カード表示の切替が不正です`);
    console.log(`✓ BGJ受注一覧 (${viewport.width}x${viewport.height}): ${isDesktop ? '表' : 'カード'}表示、横はみ出しなし`);
  } finally {
    await context.close();
  }
}

async function main() {
  const server = await ensureNextTestServer(BASE_URL);
  let browser;

  try {
    browser = await chromium.launch();
    const sessionCookie = await mintBgjSessionCookie({
      baseUrl: BASE_URL,
      secret: AUTH_SECRET,
      email: 'e2e-responsive-test@biogaia.jp',
      name: 'レスポンシブE2Eテスト',
    });

    for (const viewport of VIEWPORTS) {
      await verifyViewport(browser, sessionCookie, viewport);
    }
    await verifyBgjOrdersViewport(browser, sessionCookie, { width: 390, height: 844 });
    await verifyBgjOrdersViewport(browser, sessionCookie, { width: 1280, height: 720 });
  } finally {
    await browser?.close();
    server?.kill('SIGTERM');
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
