// @vitest-environment node

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { auditStaticBusinessData } from './audit-static-business-data.mjs';

const temporaryDirectories: string[] = [];

function createFixture(source: string, entries: unknown[]) {
  const root = mkdtempSync(join(tmpdir(), 'static-data-audit-'));
  temporaryDirectories.push(root);
  mkdirSync(join(root, 'src/app/example'), { recursive: true });
  mkdirSync(join(root, 'src/components'), { recursive: true });
  mkdirSync(join(root, 'config'), { recursive: true });
  writeFileSync(join(root, 'src/app/example/page.tsx'), source);
  writeFileSync(
    join(root, 'config/static-business-data-allowlist.json'),
    JSON.stringify({ version: 1, entries }),
  );
  return root;
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) rmSync(directory, { recursive: true });
});

describe('auditStaticBusinessData', () => {
  it('理由付きベースラインと現在件数が一致すれば成功する', () => {
    const root = createFixture('<a href="#">未接続</a>', [
      {
        ruleId: 'placeholder-link',
        file: 'src/app/example/page.tsx',
        expectedOccurrences: 1,
        classification: 'P0',
        reason: '既知の未接続リンク',
      },
    ]);

    expect(auditStaticBusinessData({ projectRoot: root }).violations).toEqual([]);
  });

  it('許可されていない新しい候補を検出する', () => {
    const root = createFixture('<a href="#">未接続</a>', []);

    expect(auditStaticBusinessData({ projectRoot: root }).violations).toContain(
      '新しい固定データ候補: placeholder-link:src/app/example/page.tsx (1件)',
    );
  });

  it('候補を削除した後に残った許可リストも検出する', () => {
    const root = createFixture('<p>実データ</p>', [
      {
        ruleId: 'placeholder-link',
        file: 'src/app/example/page.tsx',
        expectedOccurrences: 1,
        classification: 'P0',
        reason: '既知の未接続リンク',
      },
    ]);

    expect(auditStaticBusinessData({ projectRoot: root }).violations).toContain(
      '解消済み候補が許可リストに残っています: placeholder-link:src/app/example/page.tsx (許可 1件 / 現在 0件)',
    );
  });
});
