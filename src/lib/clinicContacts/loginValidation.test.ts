import { describe, expect, it } from 'vitest';
import { parseClinicLoginInput } from './loginValidation';

describe('parseClinicLoginInput', () => {
  it('新規登録ではログインIDと初期パスワードを入力させない', () => {
    expect(parseClinicLoginInput({ roleKey: 'staff' }, true).value)
      .toMatchObject({ password: '', roleKey: 'staff', status: '有効' });
  });

  it('更新ではパスワードを省略できる', () => {
    expect(parseClinicLoginInput({ roleKey: 'viewer' }, false).value)
      .toMatchObject({ roleKey: 'viewer', status: '有効' });
  });

  it('未定義の権限値を受け付けない', () => {
    expect(parseClinicLoginInput({ roleKey: 'root' }, true).error)
      .toBe('権限の指定が不正です。');
  });
});
