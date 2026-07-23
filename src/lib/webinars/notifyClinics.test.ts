// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Webinar } from '@/lib/supabase/types';

const rpc = vi.fn();
const sendPatientEmail = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServerClient: () => ({ rpc }),
}));
vi.mock('@/lib/email/sendEmail', () => ({ sendPatientEmail }));

const { notifyClinicsAboutWebinar } = await import('./notifyClinics');

const webinar = {
  id: 'webinar-1', title: '新商品説明会', description: '医院向け説明です', status: 'published', version: 1,
  organizer_email: 'bgj@example.com', created_at: '', updated_at: '', published_at: '', canceled_at: null,
  sessions: [{ id: 'session-1', webinar_id: 'webinar-1', provider: 'zoom', join_url: 'https://zoom.us/j/1', starts_at: '2026-08-01T01:00:00Z', ends_at: '2026-08-01T02:00:00Z', timezone: 'Asia/Tokyo', external_space_id: null, created_at: '', updated_at: '' }],
  target_clinics: [{ webinar_id: 'webinar-1', customer_code: 'A000001', created_at: '' }],
  target_contacts: [],
} as Webinar;

describe('notifyClinicsAboutWebinar', () => {
  beforeEach(() => {
    rpc.mockReset(); sendPatientEmail.mockReset();
    rpc.mockResolvedValue({ data: [
      { contact_id: 'contact-1', contact_name: '山田', email: 'staff@example.com' },
      { contact_id: 'contact-2', contact_name: '佐藤', email: 'staff@example.com' },
    ], error: null });
    sendPatientEmail.mockResolvedValue(undefined);
  });

  it('同じメールアドレスでも選択した担当者ごとに個別通知する', async () => {
    await notifyClinicsAboutWebinar(webinar);
    expect(rpc).toHaveBeenCalledWith('get_webinar_selected_recipients', { p_webinar_id: 'webinar-1' });
    expect(sendPatientEmail).toHaveBeenCalledTimes(2);
    expect(sendPatientEmail).toHaveBeenCalledWith(expect.objectContaining({
      to: 'staff@example.com', subject: '【ウェビナー】新商品説明会', text: expect.stringContaining('山田 様'),
    }));
  });

  it('宛先取得に失敗した場合は呼出元が検知できるよう失敗させる', async () => {
    rpc.mockResolvedValue({ data: null, error: new Error('database error') });
    await expect(notifyClinicsAboutWebinar(webinar)).rejects.toThrow('database error');
    expect(sendPatientEmail).not.toHaveBeenCalled();
  });
});
