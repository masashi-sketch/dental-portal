export type Product = {
  id: number;
  category: string;
  imageType: string;
  badge?: string;
  badgeColor?: string;
  name: string;
  desc: string;
  price: number;
  unit: string;
  rating: number;
  reviews: number;
  tag?: string;
  volume: string;
  ingredients: string;
  howToUse: string;
  caution: string;
};

export const products: Product[] = [
  {
    id: 1, category: 'サプリメント', imageType: 'supplement',
    badge: '歯科医推奨', badgeColor: 'bg-indigo-100 text-indigo-600',
    name: 'オーラルプロバイオティクス 30日分',
    desc: '口腔内の善玉菌を増やし、歯周病・口臭の予防をサポートする乳酸菌サプリ。毎日1粒で手軽にケア。',
    price: 3980, unit: '本', rating: 4.8, reviews: 128, tag: '定期購入対応',
    volume: '30粒（30日分）',
    ingredients: 'L.ロイテリ菌（DSM 17938株）、結晶セルロース、ステアリン酸カルシウム、二酸化ケイ素',
    howToUse: '1日1粒を目安に、口の中で溶かすようにお召し上がりください。就寝前の使用を推奨します。',
    caution: '妊娠・授乳中の方、治療中の方は医師にご相談ください。乳アレルギーの方はご使用をお控えください。',
  },
  {
    id: 2, category: 'サプリメント', imageType: 'supplement',
    badge: '新着', badgeColor: 'bg-rose-100 text-rose-600',
    name: 'カルシウム＋ビタミンD 60粒',
    desc: '歯と骨の健康維持に欠かせないカルシウムをビタミンDと一緒に配合。吸収率を高めた処方。',
    price: 2480, unit: '本', rating: 4.5, reviews: 64, tag: '',
    volume: '60粒（30日分）',
    ingredients: '乳酸カルシウム、ビタミンD3、ビタミンK2、結晶セルロース、ヒドロキシプロピルセルロース',
    howToUse: '1日2粒を目安に、水またはぬるま湯でお召し上がりください。食後の使用を推奨します。',
    caution: '過剰摂取はしないでください。腎臓疾患のある方は医師にご相談の上ご使用ください。',
  },
  {
    id: 3, category: 'サプリメント', imageType: 'supplement',
    badge: '定番人気', badgeColor: 'bg-amber-100 text-amber-600',
    name: '歯科専用 乳酸菌タブレット 90粒',
    desc: '噛んで溶かすチュアブルタイプ。口腔内で直接作用するL.ロイテリ菌を配合。後味もさわやか。',
    price: 1980, unit: '本', rating: 4.7, reviews: 213, tag: '定期購入対応',
    volume: '90粒（30日分）',
    ingredients: 'L.ロイテリ菌、キシリトール、ミント香料、ステアリン酸マグネシウム、二酸化ケイ素',
    howToUse: '1日3粒を目安に、食後または就寝前にゆっくり噛んでお召し上がりください。',
    caution: 'キシリトールを含みます。過剰摂取するとお腹が緩くなる場合があります。',
  },
  {
    id: 4, category: 'ヨーグルト', imageType: 'yogurt',
    badge: '歯科医推奨', badgeColor: 'bg-indigo-100 text-indigo-600',
    name: 'プロデンティス ヨーグルト 100g',
    desc: '歯科専用に開発されたL.ロイテリ菌入りヨーグルト。毎日食べることで口腔フローラを整えます。',
    price: 980, unit: '個', rating: 4.6, reviews: 97, tag: '',
    volume: '100g',
    ingredients: '生乳、脱脂粉乳、L.ロイテリ菌（DSM 17938株）、L.ロイテリ菌（ATCC PTA 5289株）',
    howToUse: '1日1個を目安にお召し上がりください。歯磨き後・就寝前の摂取が効果的です。',
    caution: '乳製品です。乳アレルギーの方はご使用をお控えください。開封後はお早めにお召し上がりください。',
  },
  {
    id: 5, category: 'ヨーグルト', imageType: 'yogurt',
    badge: 'セット割', badgeColor: 'bg-emerald-100 text-emerald-600',
    name: 'オーラルケア ヨーグルト 6個セット',
    desc: '毎日続けやすいお得な6個パック。砂糖不使用・低カロリーで歯に優しい設計。まとめ買いでお得に。',
    price: 4980, unit: 'セット', rating: 4.7, reviews: 152, tag: '定期購入対応',
    volume: '100g × 6個',
    ingredients: '生乳、脱脂粉乳、L.ロイテリ菌（DSM 17938株）、L.ロイテリ菌（ATCC PTA 5289株）',
    howToUse: '1日1個を目安にお召し上がりください。歯磨き後・就寝前の摂取が効果的です。',
    caution: '乳製品です。乳アレルギーの方はご使用をお控えください。開封後はお早めにお召し上がりください。',
  },
  {
    id: 6, category: 'ヨーグルト', imageType: 'yogurt',
    badge: '新着', badgeColor: 'bg-rose-100 text-rose-600',
    name: 'L-92乳酸菌 飲むヨーグルト 200ml',
    desc: '飲むタイプで忙しい方にも続けやすい。免疫力サポートと口腔ケアを同時に叶えるドリンクタイプ。',
    price: 480, unit: '本', rating: 4.3, reviews: 41, tag: '',
    volume: '200ml',
    ingredients: '生乳、脱脂粉乳、砂糖、L-92乳酸菌（L. acidophilus L-92株）、ペクチン',
    howToUse: 'よく振ってからお飲みください。1日1本を目安に、毎日継続してお飲みいただくことで効果的です。',
    caution: '乳製品です。開封後はすぐにお召し上がりください。冷蔵保存してください。',
  },
  {
    id: 7, category: '歯ブラシ', imageType: 'toothbrush',
    badge: '定番人気', badgeColor: 'bg-amber-100 text-amber-600',
    name: 'プロフェッショナル歯ブラシ やわらかめ',
    desc: '歯科衛生士監修。極細毛で歯周ポケットまで届く設計。歯ぐきに優しい独自カット毛を採用。',
    price: 880, unit: '本', rating: 4.9, reviews: 312, tag: '定期購入対応',
    volume: '1本',
    ingredients: 'ナイロン毛（毛の直径0.02mm）、ポリプロピレン（ハンドル）',
    howToUse: '毛先を歯と歯肉の境目に45度の角度で当て、やさしく小刻みに動かしてください。1〜3ヶ月で交換を推奨します。',
    caution: '強い力で磨かないでください。毛先が広がったら交換のサインです。',
  },
  {
    id: 8, category: '歯ブラシ', imageType: 'toothbrush',
    badge: '歯科医推奨', badgeColor: 'bg-indigo-100 text-indigo-600',
    name: '超極細毛歯ブラシ 知覚過敏対応',
    desc: '0.01mmの超極細毛を採用。知覚過敏の方でも痛みなく磨けます。歯ぐき再生ケアにも最適。',
    price: 680, unit: '本', rating: 4.8, reviews: 189, tag: '',
    volume: '1本',
    ingredients: 'ナイロン毛（毛の直径0.01mm）、ポリプロピレン（ハンドル）',
    howToUse: '刺激が強い部分には毛先を軽く当てるだけでOKです。水だけでの使用も可能です。',
    caution: '毛が非常に細いため、強い力をかけると毛先が変形します。やさしくお使いください。',
  },
  {
    id: 9, category: '歯ブラシ', imageType: 'toothbrush',
    badge: 'セット割', badgeColor: 'bg-emerald-100 text-emerald-600',
    name: '電動歯ブラシ 替えブラシ 4本セット',
    desc: '主要電動歯ブラシ各社対応の替えブラシ。クリニック同品質のブラシを自宅でお使いいただけます。',
    price: 2980, unit: 'セット', rating: 4.6, reviews: 78, tag: '定期購入対応',
    volume: '4本入り',
    ingredients: 'ナイロン毛、ポリプロピレン（ブラシ部）',
    howToUse: 'ご使用の電動歯ブラシ本体に装着してご使用ください。3ヶ月を目安に交換することをお勧めします。',
    caution: '対応機種をご確認の上ご購入ください。電動歯ブラシ本体は付属しません。',
  },
  {
    id: 10, category: 'オーラルケア', imageType: 'oral',
    badge: '定番人気', badgeColor: 'bg-amber-100 text-amber-600',
    name: 'デンタルフロス ミント 50m',
    desc: 'ワックス加工で歯間に滑らかに入る。ミントフレーバーで使用後も爽やか。毎日のフロス習慣に。',
    price: 580, unit: '個', rating: 4.7, reviews: 267, tag: '定期購入対応',
    volume: '50m',
    ingredients: 'ナイロン繊維、ワックス（カルナウバろう）、ミント香料',
    howToUse: '40cmほど切り取り、中指に巻きつけて使用します。1ヶ所につき新しい部分を使い、前後に優しく動かしてください。',
    caution: '糸を歯肉に強く押し込まないでください。出血が続く場合は歯科医師にご相談ください。',
  },
  {
    id: 11, category: 'オーラルケア', imageType: 'oral',
    badge: '歯科医推奨', badgeColor: 'bg-indigo-100 text-indigo-600',
    name: '薬用歯磨き粉 フッ素高濃度 1450ppm',
    desc: '高濃度フッ素1450ppmを配合した薬用歯磨き。再石灰化を促進し、虫歯を強力予防します。',
    price: 1280, unit: '個', rating: 4.8, reviews: 445, tag: '定期購入対応',
    volume: '100g',
    ingredients: 'フッ化ナトリウム（フッ素として1450ppm）、ポリリン酸Na、グリセリン、ラウリル硫酸Na、サッカリンNa',
    howToUse: 'ブラシに適量（約1.5cm）取り、全体を丁寧に磨いてください。磨いた後は少量の水でゆすぎ、フッ素を口内に残すとより効果的です。',
    caution: '6歳未満のお子様には使用しないでください。飲み込まないようにご注意ください。',
  },
  {
    id: 12, category: 'オーラルケア', imageType: 'oral',
    badge: '新着', badgeColor: 'bg-rose-100 text-rose-600',
    name: '薬用洗口液 歯周病対応 500ml',
    desc: '歯科医院でも使用されるCPC配合の洗口液。歯周病菌・口臭を24時間ケア。ノンアルコールで低刺激。',
    price: 1580, unit: '本', rating: 4.5, reviews: 93, tag: '',
    volume: '500ml（約100回分）',
    ingredients: '塩化セチルピリジニウム（CPC）0.05%、グリセリン、ポリオキシエチレン硬化ヒマシ油、香料、サッカリンNa',
    howToUse: '20mlを口に含み、30秒ほどブクブクうがいをしてから吐き出してください。1日2〜3回、歯磨き後にご使用ください。',
    caution: '飲み込まないでください。アルコール不使用ですが、口腔粘膜に異常を感じた場合は使用を中止してください。',
  },
];
