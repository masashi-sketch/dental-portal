import { describe, expect, it } from 'vitest';
import { parseClinicLoginInput } from './loginValidation';

describe('parseClinicLoginInput', () => {
  it('新規登録では初期パスワードを必須にする', () => {
    expect(parseClinicLoginInput({ loginId: 'staff01', roleKey: 'staff' }, true).error)
      .toBe('初期パスワードは必須です。');
  });

  it('更新ではパスワードを省略できる', () => {
    expect(parseClinicLoginInput({ loginId: 'staff01', roleKey: 'viewer' }, false).value)
      .toMatchObject({ loginId: 'staff01', roleKey: 'viewer', status: '有効' });
  });

  it('未定義の権限値を受け付けない', () => {
    expect(parseClinicLoginInput({ loginId: 'staff01', password: 'password123', roleKey: 'root' }, true).error)
      .toBe('権限の指定が不正です。');
  });
});
