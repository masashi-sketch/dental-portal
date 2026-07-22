import { describe, expect, it } from 'vitest';
import { formatShippingAddress, normalizeShippingAddress, readShippingAddress, validateShippingAddress } from './shippingAddress';

const valid = {
  postalCode: '1000001', prefecture: '東京都', city: '千代田区', addressLine1: '千代田1-1',
  addressLine2: 'テストビル101', recipientName: '患者 花子', phone: '090-1234-5678',
};

describe('shippingAddress', () => {
  it('郵便番号と文字列を正規化する', () => {
    expect(normalizeShippingAddress({ ...valid, recipientName: ' 患者 花子 ' })).toMatchObject({
      postalCode: '100-0001', recipientName: '患者 花子',
    });
  });

  it('必須項目と都道府県を検証する', () => {
    expect(validateShippingAddress(valid)).toBeNull();
    expect(validateShippingAddress({ ...valid, prefecture: '' })).toBe('都道府県を選択してください。');
    expect(validateShippingAddress({ ...valid, phone: 'abc' })).toBe('電話番号を正しく入力してください。');
  });

  it('配送先を表示用に整形する', () => {
    expect(formatShippingAddress(valid)).toBe('〒100-0001 東京都千代田区千代田1-1 テストビル101');
  });

  it('API入力は正しい文字列項目だけを受け入れる', () => {
    expect(readShippingAddress(valid)?.postalCode).toBe('100-0001');
    expect(readShippingAddress({ ...valid, city: 123 })).toBeNull();
  });
});
