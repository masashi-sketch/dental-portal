import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  // ホームディレクトリ直下に別プロジェクトのpackage-lock.jsonが存在するため、
  // Next.jsがワークスペースルートをホームディレクトリ全体と誤検出することがある
  // （その場合、初回リクエストの応答が極端に遅くなる/固まる）。明示的にこの
  // プロジェクトのディレクトリをルートに固定する。
  outputFileTracingRoot: fileURLToPath(new URL(".", import.meta.url)),
};

// SENTRY_AUTH_TOKENが無い場合はソースマップアップロードをスキップする
// （未設定でもビルド自体は失敗しない。無料開発時は未設定のままでよい）。
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: true,
  widenClientFileUpload: true,
  webpack: {
    treeshake: { removeDebugLogging: true },
    automaticVercelMonitors: false,
  },
});
