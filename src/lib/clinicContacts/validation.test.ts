import { describe, expect, it } from 'vitest';
import { parseClinicContactInput } from './validation';

const valid = {
  name: '受付 太郎',
  roleKey: 'receptionist',
  email: 'TARO@EXAMPLE.COM',
  phone: '03-1234-5678',
  status: 'active',
  emailTopics: ['webinar', 'orders'],
  phoneTopics: ['sales'],
};

describe('parseClinicContactInput', () => {
  it('担当者情報を正規化する', () => {
    const result = parseClinicContactInput(valid);
    expect(result.error).toBeUndefined();
    expect(result.value).toMatchObject({
      name: '受付 太郎',
      roleKey: 'receptionist',
      email: 'taro@example.com',
      isPrimary: false,
      version: 1,
      emailTopics: ['webinar', 'orders'],
    });
  });

  it('メールと電話が両方なければ拒否する', () => {
    expect(parseClinicContactInput({ ...valid, email: '', phone: '', emailTopics: [], phoneTopics: [] }).error)
      .toBe('メールアドレスまたは電話番号を入力してください。');
  });

  it('マスタにない役職を拒否する', () => {
    expect(parseClinicContactInput({ ...valid, roleKey: 'director' }).error).toBe('役職を選択してください。');
  });

  it('連絡先がないチャネルの通知指定を拒否する', () => {
    expect(parseClinicContactInput({ ...valid, email: '', emailTopics: ['webinar'] }).error)
      .toBe('メール通知を選ぶ場合はメールアドレスが必要です。');
  });

  it('未知の通知種別を黙って破棄せず拒否する', () => {
    expect(parseClinicContactInput({ ...valid, emailTopics: ['webinar', 'unknown'] }).error)
      .toBe('通知種別が不正です。');
  });

  it('無効な担当者を主担当にはしない', () => {
    expect(parseClinicContactInput({ ...valid, status: 'inactive', isPrimary: true }).value?.isPrimary).toBe(false);
  });
});
