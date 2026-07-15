export type NavVisibility = {
  clinicInfo: boolean;
  medication: boolean;
  subscription: boolean;
  shop: boolean;
  qa: boolean;
};

export const DEFAULT_NAV_VISIBILITY: NavVisibility = {
  clinicInfo: true,
  medication: true,
  subscription: true,
  shop: true,
  qa: true,
};

export type PatientNavKey = keyof NavVisibility;

// ホームや「予約・受診履歴」「診療情報」などのプレースホルダ項目（navKey未指定）は
// 常に表示する。トグル対象はclinicInfo/medication/subscription/shop/qaの5つのみ。
export function isPatientNavKeyVisible(
  key: PatientNavKey | undefined,
  visibility: NavVisibility,
): boolean {
  if (!key) return true;
  return visibility[key];
}
