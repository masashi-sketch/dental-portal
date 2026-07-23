import { describe, expect, it } from 'vitest';
import { parseWebinarDraftInput } from './validation';

const valid = {
  title: '医院向けウェビナー', description: '説明', provider: 'google_meet',
  startsAt: '2026-08-01T10:00:00+09:00', endsAt: '2026-08-01T11:00:00+09:00',
  timezone: 'Asia/Tokyo', joinUrl: 'https://meet.google.com/abc-defg-hij',
  customerCodes: ['A000001', 'A000001', 'A000002'],
  contactIds: ['contact-1', 'contact-1', 'contact-2'],
};

describe('parseWebinarDraftInput', () => {
  it('正しいGoogle Meet入力をUTCへ変換し対象医院を重複排除する', () => {
    const result = parseWebinarDraftInput(valid);
    expect(result.error).toBeUndefined();
    expect(result.value?.startsAt).toBe('2026-08-01T01:00:00.000Z');
    expect(result.value?.customerCodes).toEqual(['A000001', 'A000002']);
    expect(result.value?.contactIds).toEqual(['contact-1', 'contact-2']);
  });

  it('配信サービスと異なるホストやHTTP URLを拒否する', () => {
    expect(parseWebinarDraftInput({ ...valid, joinUrl: 'https://evil.example/meet' }).error).toContain('meet.google.com');
    expect(parseWebinarDraftInput({ ...valid, provider: 'zoom', joinUrl: 'http://zoom.us/j/1' }).error).toContain('zoom.us');
  });

  it('終了が開始以前、12時間超、対象医院なしを拒否する', () => {
    expect(parseWebinarDraftInput({ ...valid, endsAt: valid.startsAt }).error).toContain('終了日時');
    expect(parseWebinarDraftInput({ ...valid, endsAt: '2026-08-02T12:00:00+09:00' }).error).toContain('12時間');
    expect(parseWebinarDraftInput({ ...valid, customerCodes: [] }).error).toContain('対象医院');
    expect(parseWebinarDraftInput({ ...valid, contactIds: [] }).error).toContain('担当者');
  });
});
