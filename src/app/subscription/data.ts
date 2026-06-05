export type SubProduct = {
  id: number;
  name: string;
  shortDesc: string;
  longDesc: string;
  priceMonthly: number;
  imageType: 'capsule' | 'tablet' | 'chewable' | 'multi';
  badge: string;
  badgeColor: string;
  features: string[];
  volume: string;
  howToUse: string;
};

export const subProducts: SubProduct[] = [
  {
    id: 1,
    name: 'オーラルプロバイオティクス',
    shortDesc: '口腔内善玉菌を増やす乳酸菌サプリ',
    longDesc: '口腔内の善玉菌を増やし、歯周病・口臭の予防をサポートする乳酸菌サプリです。L.ロイテリ菌（DSM 17938株）を高濃度で配合。毎日1粒の習慣で、クリニック品質のオーラルケアをご自宅でも続けられます。',
    priceMonthly: 3980,
    imageType: 'capsule',
    badge: '歯科医推奨 No.1',
    badgeColor: 'bg-blue-100 text-blue-700',
    features: ['L.ロイテリ菌（DSM 17938株）高濃度配合', '歯科医師・歯科衛生士監修', '1日1粒・就寝前推奨'],
    volume: '30粒（30日分）',
    howToUse: '就寝前に1粒を口の中でゆっくり溶かしてください。',
  },
  {
    id: 2,
    name: 'カルシウム＋ビタミンD',
    shortDesc: '歯と骨の健康を内側からサポート',
    longDesc: '歯と骨の健康維持に欠かせないカルシウムとビタミンD3を同時配合。ビタミンD3がカルシウムの吸収を高め、効率的に歯と骨をサポートします。継続しやすい小粒タイプ。',
    priceMonthly: 2480,
    imageType: 'tablet',
    badge: '定番人気',
    badgeColor: 'bg-amber-100 text-amber-700',
    features: ['高吸収型カルシウム（乳酸カルシウム）', 'ビタミンD3・K2 同時配合', '1日2粒・食後推奨'],
    volume: '60粒（30日分）',
    howToUse: '1日2粒を食後に水またはぬるま湯でお召し上がりください。',
  },
  {
    id: 3,
    name: '歯科専用 乳酸菌タブレット',
    shortDesc: '口の中で溶かすチュアブルタイプ',
    longDesc: '噛んで溶かすことで、口腔内で直接作用するチュアブルタイプの乳酸菌サプリ。ミント風味で食後もさわやか。飲み込む必要がないので、お子様から高齢の方まで使いやすい設計です。',
    priceMonthly: 1980,
    imageType: 'chewable',
    badge: '飲みやすい',
    badgeColor: 'bg-emerald-100 text-emerald-700',
    features: ['チュアブルタイプ（噛んで溶かす）', 'ミント風味・後味さわやか', '1日3粒・食後または就寝前'],
    volume: '90粒（30日分）',
    howToUse: '1日3粒を食後または就寝前に、口の中でゆっくり噛んでお召し上がりください。',
  },
  {
    id: 4,
    name: 'マルチビタミン＆ミネラル',
    shortDesc: '歯ぐき・粘膜をトータルサポート',
    longDesc: 'ビタミンC・E・亜鉛・マグネシウムなど、歯ぐきや口腔粘膜の健康に関わる13種のビタミンと7種のミネラルを1粒に凝縮。毎日の食事だけでは不足しがちな栄養素をまとめて補給できます。',
    priceMonthly: 2980,
    imageType: 'multi',
    badge: '新登場',
    badgeColor: 'bg-violet-100 text-violet-700',
    features: ['13種ビタミン＋7種ミネラル配合', '亜鉛・マグネシウム・ビタミンC 高配合', '1日1粒・いつでもOK'],
    volume: '30粒（30日分）',
    howToUse: '1日1粒を水またはぬるま湯でお召し上がりください。',
  },
];
