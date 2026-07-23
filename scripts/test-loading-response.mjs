#!/usr/bin/env node
import { chromium } from 'playwright';
import { ensureNextTestServer } from './nextTestServer.mjs';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';
async function main() {
  const server = await ensureNextTestServer(BASE_URL);
  let browser;

  try {
    browser = await chromium.launch();
    // devサーバーの初回コンパイル時間をテスト結果から除外する。
    const warmupPage = await browser.newPage();
    await warmupPage.goto(`${BASE_URL}/auth/signin`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await warmupPage.locator('[data-app-ready="true"]').waitFor({ state: 'visible', timeout: 20_000 });
    await warmupPage.close();

    const context = await browser.newContext();
    const page = await context.newPage();
    let delayedRequestCount = 0;
    await page.route('**/api/auth/session', async (route) => {
      delayedRequestCount += 1;
      await route.continue();
    });

    const startedAt = Date.now();
    await page.goto(`${BASE_URL}/auth/signin`, { waitUntil: 'domcontentloaded', timeout: 30_000 });

    const content = page.locator('[data-app-ready="true"]');
    await content.waitFor({ state: 'visible', timeout: 2_000 });

    const elapsedMs = Date.now() - startedAt;
    await page.waitForTimeout(500);
    if (delayedRequestCount !== 0) {
      throw new Error(`初期セッションを注入済みなのにセッションAPIが${delayedRequestCount}件呼ばれました`);
    }
    if (!await content.isVisible()) throw new Error('初期画面が非表示になりました');

    console.log(`✓ 初期画面を表示し、クライアントのセッションAPI呼び出しは0件でした (${elapsedMs}ms)`);
  } finally {
    await browser?.close();
    server?.kill('SIGTERM');
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
