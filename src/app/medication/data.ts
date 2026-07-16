export type Medication = {
  id: number;
  name: string;
  dosage: string;
  quantity: string;
  imageType: 'capsule' | 'tablet' | 'powder' | 'ointment';
  badge: string;
  badgeColor: string;
  remainingDays?: number;
  totalDays?: number;
  note: string;
};

export const medications: Medication[] = [
  {
    id: 1,
    name: 'サプリメント A',
    dosage: '1日3回　毎食後に1粒',
    quantity: '21粒（7日分）',
    imageType: 'tablet',
    badge: '継続注文',
    badgeColor: 'bg-emerald-100 text-emerald-700',
    remainingDays: 3,
    totalDays: 7,
    note: '自己判断で摂取を中止せず、飲みきってください。',
  },
  {
    id: 2,
    name: 'サプリメント B',
    dosage: '1日2回　朝夕食後に2カプセル',
    quantity: '28カプセル（14日分）',
    imageType: 'capsule',
    badge: '新規注文',
    badgeColor: 'bg-blue-100 text-blue-700',
    note: '他のサプリメントとの飲み合わせが気になる場合は担当スタッフにご相談ください。',
  },
  {
    id: 3,
    name: 'オーラルケアジェル C',
    dosage: '1日1回　就寝前に患部へ適量を塗布',
    quantity: '1本（外用）',
    imageType: 'ointment',
    badge: '継続注文',
    badgeColor: 'bg-emerald-100 text-emerald-700',
    remainingDays: 10,
    totalDays: 30,
    note: '目や粘膜に触れないようご注意ください。',
  },
  {
    id: 4,
    name: 'サプリメント D',
    dosage: '1日3回　食後に1包',
    quantity: '21包（7日分）',
    imageType: 'powder',
    badge: '新規注文',
    badgeColor: 'bg-blue-100 text-blue-700',
    note: '水またはぬるま湯に溶かしてお飲みください。',
  },
];
