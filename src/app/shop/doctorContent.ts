// おすすめ商品ページ（/shop）の「先生の一言コメント」「先生のおすすめ一覧表」で使う静的データ。
// Phase 1では全医院共通の定型文（DB化・医院ごとの編集はPhase 2）。
// 商品カードの吹き出しコメントと一覧表の行データを同じ配列で共有する。

export type DoctorRecommendation = {
  productId: number;
  workingPoint: string; // 主な働き
  dailyAmount: string; // 1日の目安
  recommendationLevel: '◎' | '○';
  comment: string; // 先生の一言コメント（一人称）
};

export const DOCTOR_RECOMMENDATIONS: DoctorRecommendation[] = [
  {
    productId: 1,
    workingPoint: '口腔内フローラを整え、歯周病菌の増殖をおさえる',
    dailyAmount: '1日1粒、水またはぬるま湯で',
    recommendationLevel: '◎',
    comment: '歯周病リスクが気になる患者様に、まず最初にご案内しているサプリです。続けやすい1日1粒なのも気に入っています。',
  },
  {
    productId: 2,
    workingPoint: '歯・骨の土台となるカルシウムの吸収をビタミンDで高める',
    dailyAmount: '1日2粒、食後に',
    recommendationLevel: '○',
    comment: '特にお子様や更年期以降の方の骨・歯の健康維持に、食事と合わせて取り入れていただきたい一品です。',
  },
  {
    productId: 3,
    workingPoint: 'L.ロイテリ菌が口腔内で直接はたらき、菌のバランスを整える',
    dailyAmount: '1日1〜2粒、噛んで溶かす',
    recommendationLevel: '◎',
    comment: 'チュアブルタイプで続けやすく、定期検診にいらした患者様によくご案内しています。',
  },
  {
    productId: 4,
    workingPoint: '食生活の中で無理なくL.ロイテリ菌を取り入れられる',
    dailyAmount: '1日1個を目安に',
    recommendationLevel: '○',
    comment: 'サプリが苦手な方には、食事の一部として取り入れられるこちらをおすすめすることが多いです。',
  },
  {
    productId: 5,
    workingPoint: '毎日続けることを前提に設計された低糖・低カロリー処方',
    dailyAmount: '1日1個、まとめ買いで続けやすく',
    recommendationLevel: '○',
    comment: '『続けること』が何より大切なので、ご家族分もまとめて備えられるこちらは続けやすいと好評です。',
  },
  {
    productId: 6,
    workingPoint: '免疫バランスと口腔内環境の両方をサポート',
    dailyAmount: '1日1本を目安に',
    recommendationLevel: '○',
    comment: '忙しくて食事の時間が不規則な方には、飲むタイプのこちらを提案することがあります。',
  },
  {
    productId: 7,
    workingPoint: '歯周ポケットの汚れをやさしくかき出す',
    dailyAmount: '1日2回、毎食後の歯みがきに',
    recommendationLevel: '◎',
    comment: '歯ぐきの状態を診てから、多くの方にまずこのやわらかめをお渡ししています。力を入れすぎる方にも安心です。',
  },
  {
    productId: 8,
    workingPoint: '極細毛が歯ぐきの下がった部分にもやさしく届く',
    dailyAmount: '1日2回、優しい力で',
    recommendationLevel: '○',
    comment: '知覚過敏でお悩みの患者様から「痛みなく磨けるようになった」とよくお声をいただく一本です。',
  },
  {
    productId: 9,
    workingPoint: '電動歯ブラシの効果を保つための定期的な交換をサポート',
    dailyAmount: '目安として1〜2ヶ月に1本交換',
    recommendationLevel: '○',
    comment: '電動歯ブラシをお使いの方には、ブラシの交換時期も診療のたびに確認するようにしています。',
  },
  {
    productId: 10,
    workingPoint: '歯ブラシだけでは届かない歯と歯の間の汚れを除去',
    dailyAmount: '1日1回、就寝前に',
    recommendationLevel: '◎',
    comment: '歯ブラシだけでは汚れの6割ほどしか取れません。フロスは私が一番お伝えしている習慣です。',
  },
  {
    productId: 11,
    workingPoint: '高濃度フッ素が歯の再石灰化を促進し、虫歯を予防',
    dailyAmount: '1日2回、毎食後の仕上げに',
    recommendationLevel: '◎',
    comment: '特にむし歯になりやすい方には、市販の低濃度タイプよりこちらをおすすめしています。',
  },
  {
    productId: 12,
    workingPoint: 'CPC配合で歯周病菌・口臭を長時間ケア',
    dailyAmount: '1日1〜2回、歯みがき後に',
    recommendationLevel: '○',
    comment: '仕上げの一手間として、歯みがきの後に取り入れると口の中がすっきり保てると好評です。',
  },
];
