#!/usr/bin/env node
import { chromium } from 'playwright';
import { ensureNextTestServer } from './nextTestServer.mjs';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';
const API_DELAY_MS = 1_500;

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
    let resolveSessionRequest;
    const sessionRequestStarted = new Promise((resolve) => { resolveSessionRequest = resolve; });
    await page.route('**/api/auth/session', async (route) => {
      delayedRequestCount += 1;
      resolveSessionRequest();
      await new Promise((resolve) => setTimeout(resolve, API_DELAY_MS));
      await route.continue();
    });

    const startedAt = Date.now();
    await page.goto(`${BASE_URL}/auth/signin`, { waitUntil: 'domcontentloaded', timeout: 30_000 });

    const content = page.locator('[data-app-ready="true"]');
    await content.waitFor({ state: 'visible', timeout: 2_000 });

    const elapsedMs = Date.now() - startedAt;
    if (elapsedMs >= API_DELAY_MS) {
      throw new Error(`セッションAPI完了まで初期画面がブロックされました: ${elapsedMs}ms`);
    }
    await Promise.race([
      sessionRequestStarted,
      new Promise((_, reject) => setTimeout(() => reject(new Error('セッションAPIが開始されませんでした')), 2_000)),
    ]);
    if (delayedRequestCount === 0) {
      throw new Error('検証対象のセッションAPIが呼び出されませんでした');
    }

    await page.waitForTimeout(API_DELAY_MS);
    if (!await content.isVisible()) throw new Error('セッションAPI完了後に画面が非表示になりました');

    console.log(`✓ 低速APIを待たず初期画面を表示しました (${elapsedMs}ms、遅延API ${delayedRequestCount}件)`);
  } finally {
    await browser?.close();
    server?.kill('SIGTERM');
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
