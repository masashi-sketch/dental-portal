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
    await page.route('**/api/auth/session', async (route) => {
      delayedRequestCount += 1;
      await new Promise((resolve) => setTimeout(resolve, API_DELAY_MS));
      await route.continue();
    });

    const startedAt = Date.now();
    await page.goto(`${BASE_URL}/auth/signin`, { waitUntil: 'domcontentloaded', timeout: 30_000 });

    const loading = page.getByTestId('app-loading');
    const content = page.locator('[data-app-ready]');
    await loading.waitFor({ state: 'visible' });
    const contentCountBeforeApi = await content.count();
    if (contentCountBeforeApi > 0 && await content.getAttribute('data-app-ready') !== 'false') {
      throw new Error('低速APIの応答前に画面内容が表示可能になりました');
    }

    await loading.waitFor({ state: 'detached', timeout: 10_000 });
    if (await content.getAttribute('data-app-ready') !== 'true') {
      throw new Error('API完了後も画面内容が表示可能になりませんでした');
    }

    const elapsedMs = Date.now() - startedAt;
    if (elapsedMs < API_DELAY_MS) {
      throw new Error(`待機時間が短すぎます: ${elapsedMs}ms`);
    }
    if (elapsedMs >= 15_000) {
      throw new Error(`通常完了ではなく15秒のフェイルセーフで表示されました: ${elapsedMs}ms`);
    }
    if (delayedRequestCount === 0) {
      throw new Error('検証対象のセッションAPIが呼び出されませんでした');
    }

    console.log(`✓ 低速API中は全画面待機を維持し、完了後に一括表示しました (${elapsedMs}ms、遅延API ${delayedRequestCount}件)`);
  } finally {
    await browser?.close();
    server?.kill('SIGTERM');
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
