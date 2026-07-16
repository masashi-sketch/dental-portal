// @vitest-environment node
// 未認証で公開されるエンドポイントが、住所・電話番号等の非公開情報を
// 決してレスポンスに含めないことと、クリニックが存在しない場合の
// デフォルト値フォールバックを検証する。
import { describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { DEFAULT_NAV_VISIBILITY } from '@/lib/patientNav';

type ClinicRow = Record<string, unknown> | null;
let clinicRow: ClinicRow = null;

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServerClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: clinicRow, error: null }),
        }),
      }),
    }),
  }),
}));

const { GET } = await import('./route');

const params = Promise.resolve({ code: 'A000001' });

describe('GET /api/clinics/[code]/branding（未認証・公開）', () => {
  it('クリニックが存在しない場合はデフォルト値を返す', async () => {
    clinicRow = null;
    const res = await GET(new NextRequest('http://localhost/x'), { params });
    const json = await res.json();
    expect(json).toEqual({
      displayName: null,
      backgroundUrl: null,
      nav: DEFAULT_NAV_VISIBILITY,
      showPeriodontalDiagnosis: true,
    });
  });

  it('display_nameが未設定ならnameにフォールバックする', async () => {
    clinicRow = {
      name: 'テスト歯科',
      display_name: null,
      patient_background_url: null,
      nav_show_clinic_info: true,
      nav_show_medical_record: true,
      nav_show_medication: true,
      nav_show_subscription: true,
      nav_show_shop: true,
      nav_show_qa: true,
      show_periodontal_diagnosis: true,
    };
    const res = await GET(new NextRequest('http://localhost/x'), { params });
    const json = await res.json();
    expect(json.displayName).toBe('テスト歯科');
  });

  it('住所・電話番号等の非公開情報が万一select結果に含まれていてもレスポンスには一切出ない', async () => {
    clinicRow = {
      name: 'テスト歯科',
      display_name: 'にこにこ歯科',
      patient_background_url: 'https://example.com/bg.png',
      nav_show_clinic_info: true,
      nav_show_medical_record: false,
      nav_show_medication: true,
      nav_show_subscription: true,
      nav_show_shop: false,
      nav_show_qa: true,
      show_periodontal_diagnosis: false,
      // 本来selectされないはずの列が紛れ込んだ想定
      address: '東京都中央区銀座1-1-1',
      tel: '00-0000-0000',
      contact_person: '院長 山田太郎',
    };
    const res = await GET(new NextRequest('http://localhost/x'), { params });
    const json = await res.json();
    expect(Object.keys(json).sort()).toEqual(['backgroundUrl', 'displayName', 'nav', 'showPeriodontalDiagnosis'].sort());
    expect(JSON.stringify(json)).not.toContain('銀座');
    expect(JSON.stringify(json)).not.toContain('00-0000-0000');
    expect(json).toEqual({
      displayName: 'にこにこ歯科',
      backgroundUrl: 'https://example.com/bg.png',
      nav: {
        clinicInfo: true,
        medicalRecord: false,
        medication: true,
        subscription: true,
        shop: false,
        qa: true,
      },
      showPeriodontalDiagnosis: false,
    });
  });
});
