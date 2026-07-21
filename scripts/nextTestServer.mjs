import { spawn } from 'node:child_process';

async function isServerReady(baseUrl) {
  try {
    const response = await fetch(`${baseUrl}/auth/signin`);
    return response.ok;
  } catch {
    return false;
  }
}

export async function ensureNextTestServer(baseUrl) {
  if (await isServerReady(baseUrl)) return null;

  const url = new URL(baseUrl);
  if (url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
    throw new Error(`${baseUrl} に接続できません`);
  }

  const server = spawn(
    process.execPath,
    ['node_modules/next/dist/bin/next', 'dev', '--webpack', '--hostname', url.hostname, '--port', url.port || '3000'],
    { stdio: 'inherit' },
  );

  for (let attempt = 0; attempt < 60; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 1_000));
    if (await isServerReady(baseUrl)) return server;
    if (server.exitCode !== null) throw new Error(`開発サーバーが終了しました (${server.exitCode})`);
  }

  server.kill('SIGTERM');
  throw new Error('開発サーバーが60秒以内に起動しませんでした');
}
