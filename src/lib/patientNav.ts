export type NavVisibility = {
  home: boolean;
  clinicInfo: boolean;
  reservation: boolean;
  medicalRecord: boolean;
  medication: boolean;
  subscription: boolean;
  shop: boolean;
  qa: boolean;
};

export const DEFAULT_NAV_VISIBILITY: NavVisibility = {
  home: true,
  clinicInfo: true,
  reservation: true,
  medicalRecord: true,
  medication: true,
  subscription: true,
  shop: true,
  qa: true,
};

export type PatientNavKey = keyof NavVisibility;

// サイドバー・ボトムナビの項目はすべてnavKeyを持ち、トグル対象になる。
export function isPatientNavKeyVisible(
  key: PatientNavKey | undefined,
  visibility: NavVisibility,
): boolean {
  if (!key) return true;
  return visibility[key];
}
