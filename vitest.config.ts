import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// デフォルトはjsdom（コンポーネントテスト向け）。src/lib配下などサーバー専用
// コード（`import 'server-only'`を含むファイル）をテストする場合は、対象の
// テストファイル先頭に `// @vitest-environment node` を書いて上書きする。
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // 'server-only'はNext.jsのバンドラーが解釈するマーカーパッケージで、
      // 通常の環境では常にthrowする。テスト実行時は無害なempty.jsに差し替える。
      'server-only': path.resolve(__dirname, './node_modules/server-only/empty.js'),
    },
  },
});
