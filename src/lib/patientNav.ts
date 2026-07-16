export type NavVisibility = {
  clinicInfo: boolean;
  medicalRecord: boolean;
  medication: boolean;
  subscription: boolean;
  shop: boolean;
  qa: boolean;
};

export const DEFAULT_NAV_VISIBILITY: NavVisibility = {
  clinicInfo: true,
  medicalRecord: true,
  medication: true,
  subscription: true,
  shop: true,
  qa: true,
};

export type PatientNavKey = keyof NavVisibility;

// ホームはnavKey未指定（常に表示）。それ以外のサイドバー・ボトムナビ項目はnavKeyを持ち、トグル対象になる。
export function isPatientNavKeyVisible(
  key: PatientNavKey | undefined,
  visibility: NavVisibility,
): boolean {
  if (!key) return true;
  return visibility[key];
}
