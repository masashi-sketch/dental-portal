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
} as Webinar;

describe('notifyClinicsAboutWebinar', () => {
  beforeEach(() => {
    rpc.mockReset(); sendPatientEmail.mockReset();
    rpc.mockResolvedValue({ data: [{ email: 'staff@example.com' }, { email: 'staff@example.com' }], error: null });
    sendPatientEmail.mockResolvedValue(undefined);
  });

  it('DBで選ばれた医院担当者へ重複なく通知する', async () => {
    await notifyClinicsAboutWebinar(webinar);
    expect(rpc).toHaveBeenCalledWith('get_webinar_notification_recipients', { p_customer_codes: ['A000001'] });
    expect(sendPatientEmail).toHaveBeenCalledTimes(1);
    expect(sendPatientEmail).toHaveBeenCalledWith(expect.objectContaining({
      to: 'staff@example.com', subject: '【ウェビナー】新商品説明会',
    }));
  });

  it('宛先取得に失敗した場合は呼出元が検知できるよう失敗させる', async () => {
    rpc.mockResolvedValue({ data: null, error: new Error('database error') });
    await expect(notifyClinicsAboutWebinar(webinar)).rejects.toThrow('database error');
    expect(sendPatientEmail).not.toHaveBeenCalled();
  });
});
