import { describe, expect, it } from 'vitest';
import { DEFAULT_NAV_VISIBILITY, isPatientNavKeyVisible, type NavVisibility } from './patientNav';

describe('isPatientNavKeyVisible', () => {
  it('navKeyが未指定なら常にtrue（ホーム等のトグル対象外項目）', () => {
    expect(isPatientNavKeyVisible(undefined, DEFAULT_NAV_VISIBILITY)).toBe(true);
  });

  it('navKeyが指定されていればvisibilityの値をそのまま返す（true）', () => {
    expect(isPatientNavKeyVisible('shop', DEFAULT_NAV_VISIBILITY)).toBe(true);
  });

  it('navKeyが指定されていればvisibilityの値をそのまま返す（false）', () => {
    const visibility: NavVisibility = { ...DEFAULT_NAV_VISIBILITY, shop: false };
    expect(isPatientNavKeyVisible('shop', visibility)).toBe(false);
  });

  it('他のnavKeyの値には影響されない', () => {
    const visibility: NavVisibility = { ...DEFAULT_NAV_VISIBILITY, shop: false, qa: false };
    expect(isPatientNavKeyVisible('clinicInfo', visibility)).toBe(true);
    expect(isPatientNavKeyVisible('medication', visibility)).toBe(true);
  });
});
