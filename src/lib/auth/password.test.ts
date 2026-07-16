// @vitest-environment node
// password.tsは`import 'server-only'`を含むため、windowが存在しないnode環境で実行する。
import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from './password';

describe('hashPassword / verifyPassword', () => {
  it('正しいパスワードならverifyPasswordがtrueを返す', () => {
    const stored = hashPassword('correct-horse-battery-staple');
    expect(verifyPassword('correct-horse-battery-staple', stored)).toBe(true);
  });

  it('誤ったパスワードならfalseを返す', () => {
    const stored = hashPassword('correct-horse-battery-staple');
    expect(verifyPassword('wrong-password', stored)).toBe(false);
  });

  it('同じパスワードでも毎回異なるsalt・ハッシュ値を生成する', () => {
    const first = hashPassword('same-password');
    const second = hashPassword('same-password');
    expect(first).not.toBe(second);
    // どちらのハッシュに対しても元のパスワードで検証できる
    expect(verifyPassword('same-password', first)).toBe(true);
    expect(verifyPassword('same-password', second)).toBe(true);
  });

  it('salt:hash形式で保存される', () => {
    const stored = hashPassword('example');
    const parts = stored.split(':');
    expect(parts).toHaveLength(2);
    expect(parts[0]).toMatch(/^[0-9a-f]+$/);
    expect(parts[1]).toMatch(/^[0-9a-f]+$/);
  });

  it('壊れた形式（コロンなし）の場合はfalseを返す', () => {
    expect(verifyPassword('anything', 'not-a-valid-hash')).toBe(false);
  });

  it('空文字列の場合はfalseを返す', () => {
    expect(verifyPassword('anything', '')).toBe(false);
  });
});
