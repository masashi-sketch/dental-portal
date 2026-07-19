import { afterEach, describe, expect, it, vi } from 'vitest';
import { safeGetItem, safeSetItem } from './safeLocalStorage';

describe('safeLocalStorage', () => {
  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('通常時はlocalStorageに書き込み・読み取りできる', () => {
    safeSetItem('key1', 'value1');
    expect(safeGetItem('key1')).toBe('value1');
  });

  it('未設定のキーはnullを返す', () => {
    expect(safeGetItem('not-set')).toBeNull();
  });

  it('getItemが例外を投げても（プライベートブラウジング等）nullを返し、呼び出し元にエラーを伝播しない', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('access denied', 'SecurityError');
    });
    expect(() => safeGetItem('key1')).not.toThrow();
    expect(safeGetItem('key1')).toBeNull();
  });

  it('setItemが例外を投げても（容量超過等）呼び出し元にエラーを伝播しない', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota exceeded', 'QuotaExceededError');
    });
    expect(() => safeSetItem('key1', 'value1')).not.toThrow();
  });
});
