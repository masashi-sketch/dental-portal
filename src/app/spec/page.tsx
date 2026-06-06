'use client';

export default function SpecPage() {
  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .page-break { page-break-before: always; }
        }
        @page { margin: 15mm 12mm; }
      `}</style>

      <div className="min-h-screen bg-white text-gray-900 font-sans">

        {/* 印刷ボタン */}
        <div className="no-print fixed top-4 right-4 z-50 flex gap-2">
          <button
            onClick={() => window.print()}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg transition-colors cursor-pointer"
          >
            🖨️ PDFで保存
          </button>
        </div>

        <div className="max-w-4xl mx-auto px-8 py-12">

          {/* ヘッダー */}
          <div className="border-b-2 border-indigo-600 pb-6 mb-8">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-indigo-600 text-xs font-semibold tracking-widest mb-1">SYSTEM SPECIFICATION</p>
                <h1 className="text-3xl font-bold text-gray-900">テストデンタル歯科<br />ポータルサイト 仕様書</h1>
              </div>
              <div className="text-right text-xs text-gray-400">
                <p>作成日：2026年6月5日</p>
                <p>バージョン：1.0</p>
              </div>
            </div>
          </div>

          {/* ── 1. システム概要 ── */}
          <section className="mb-10">
            <h2 className="text-lg font-bold text-indigo-600 border-b border-indigo-100 pb-2 mb-4">1. システム概要</h2>
            <div className="bg-gray-50 rounded-xl p-5 text-sm leading-relaxed space-y-2">
              <p>本システムは、テストデンタル歯科の患者様向けポータルサイトおよび医院スタッフ向け管理ポータルで構成されるウェブアプリケーションです。</p>
              <p>患者様は専用IDでログインし、クリニック情報の確認・定期購入・おすすめ商品の購入・Q&A閲覧などのサービスを利用できます。医院スタッフは管理ポータルからお知らせ・患者・注文・商品を管理できます。</p>
            </div>

            <table className="w-full text-sm mt-4 border border-gray-200 rounded-xl overflow-hidden">
              <tbody>
                {[
                  ['患者ポータルURL', 'https://dental-portal-mock.vercel.app'],
                  ['管理ポータルURL', 'https://dental-portal-mock.vercel.app/admin'],
                  ['フレームワーク', 'Next.js 16.2.7 (App Router)'],
                  ['スタイリング', 'Tailwind CSS'],
                  ['ホスティング', 'Vercel'],
                  ['フォント', 'M PLUS Rounded 1c'],
                ].map(([label, value]) => (
                  <tr key={label} className="border-b border-gray-100 last:border-0">
                    <td className="bg-gray-50 px-4 py-2.5 font-semibold text-gray-600 w-40 whitespace-nowrap">{label}</td>
                    <td className="px-4 py-2.5 text-gray-800">{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* ── 2. 患者ポータル ── */}
          <section className="mb-10">
            <h2 className="text-lg font-bold text-indigo-600 border-b border-indigo-100 pb-2 mb-4">2. 患者ポータル</h2>

            <h3 className="font-bold text-gray-800 mb-2 text-sm">2-1. ログイン情報（サンプル）</h3>
            <table className="w-full text-sm mb-6 border border-gray-200 rounded-xl overflow-hidden">
              <thead>
                <tr className="bg-indigo-50">
                  <th className="text-left px-4 py-2.5 font-semibold text-gray-600">患者番号</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-gray-600">氏名</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-gray-600">ログインID</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-gray-600">パスワード</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-gray-600">ステータス</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['T-00001', '山田 太郎', 'bgj',     'dsm17938', '有効'],
                  ['T-00002', '佐藤 花子', 'sato01',  'pass1234', '有効'],
                  ['T-00003', '鈴木 一郎', 'suzuki3', 'pass5678', '有効'],
                  ['T-00004', '高橋 美咲', 'taka04',  'pass9012', '無効'],
                  ['T-00005', '伊藤 健一', 'ito05',   'pass3456', '有効'],
                ].map((row) => (
                  <tr key={row[0]} className="border-t border-gray-100">
                    {row.map((cell, i) => (
                      <td key={i} className={`px-4 py-2.5 text-sm ${i === 4 ? (cell === '有効' ? 'text-teal-600 font-semibold' : 'text-gray-400') : 'text-gray-800'}`}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>

            <h3 className="font-bold text-gray-800 mb-3 text-sm">2-2. ページ一覧・機能</h3>
            <table className="w-full text-sm border border-gray-200 rounded-xl overflow-hidden">
              <thead>
                <tr className="bg-indigo-50">
                  <th className="text-left px-4 py-2.5 font-semibold text-gray-600 w-32">ページ</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-gray-600 w-40">URL</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-gray-600">機能・内容</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['ログイン',       '/',               'ID/パスワード認証、お知らせ表示（3件）'],
                  ['ホーム',         '/home',           '挨拶カード・次回予約・6項目メニューグリッド'],
                  ['クリニック紹介', '/clinic',         'スタッフ紹介（院長/歯科衛生士/受付）・診療時間・Googleマップ'],
                  ['おすすめ商品',   '/shop',           '12商品・4カテゴリフィルター・カートへ追加・商品詳細ページ'],
                  ['商品詳細',       '/shop/[id]',      '商品画像・評価・数量選択・カート追加・関連商品'],
                  ['定期購入',       '/subscription',   '4商品（サプリ）・各商品に定期購入ボタン・特典表示'],
                  ['購入フロー',     '/subscription/[id]', '3ステップ：期間選択(6ヶ月/3ヶ月)→お届け先(自宅/医院)→確認→完了'],
                  ['Q & A',          '/qa',             '20件・5カテゴリ・アコーディオン式・カテゴリフィルター'],
                ].map((row) => (
                  <tr key={row[0]} className="border-t border-gray-100">
                    <td className="px-4 py-2.5 font-semibold text-gray-700">{row[0]}</td>
                    <td className="px-4 py-2.5 text-gray-500 font-mono text-xs">{row[1]}</td>
                    <td className="px-4 py-2.5 text-gray-700">{row[2]}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <h3 className="font-bold text-gray-800 mb-3 mt-5 text-sm">2-3. ナビゲーション</h3>
            <div className="bg-gray-50 rounded-xl p-4 text-sm space-y-1.5">
              <p><span className="font-semibold">デスクトップ：</span>左サイドバー（6項目固定ナビ）＋上部ヘッダー</p>
              <p><span className="font-semibold">スマートフォン：</span>画面下部ボトムナビゲーション（ホーム・クリニック・予約・商品・Q&A）</p>
              <p><span className="font-semibold">iPhone対応：</span>safe-area-inset-bottom によるノッチ対応済み</p>
            </div>
          </section>

          <div className="page-break" />

          {/* ── 3. 医院管理ポータル ── */}
          <section className="mb-10">
            <h2 className="text-lg font-bold text-indigo-600 border-b border-indigo-100 pb-2 mb-4">3. 医院管理ポータル</h2>

            <h3 className="font-bold text-gray-800 mb-2 text-sm">3-1. 管理者ログイン情報</h3>
            <table className="w-full text-sm mb-6 border border-gray-200 rounded-xl overflow-hidden">
              <tbody>
                {[
                  ['管理者ID', 'clinic'],
                  ['パスワード', 'admin2026'],
                  ['ログインURL', 'https://dental-portal-mock.vercel.app/admin'],
                ].map(([label, value]) => (
                  <tr key={label} className="border-b border-gray-100 last:border-0">
                    <td className="bg-gray-50 px-4 py-2.5 font-semibold text-gray-600 w-36">{label}</td>
                    <td className="px-4 py-2.5 font-mono text-gray-800">{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <h3 className="font-bold text-gray-800 mb-3 text-sm">3-2. 管理機能一覧</h3>
            <table className="w-full text-sm border border-gray-200 rounded-xl overflow-hidden">
              <thead>
                <tr className="bg-teal-50">
                  <th className="text-left px-4 py-2.5 font-semibold text-gray-600 w-36">機能</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-gray-600 w-40">URL</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-gray-600">できること</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['ダッシュボード',   '/admin/dashboard', '統計カード（患者数・お知らせ・注文・商品）・最近の注文・お知らせを一覧表示'],
                  ['お知らせ管理',     '/admin/news',      'お知らせの追加・編集・削除・タグ設定（重要/お知らせ/キャンペーン）・公開/下書き切り替え'],
                  ['患者管理',         '/admin/patients',  '患者ID/パスワード発行・患者番号自動採番・編集・削除・有効/無効切り替え・パスワード表示'],
                  ['定期購入管理',     '/admin/orders',    '注文一覧・ステータス変更（確認中→配送中→完了→キャンセル）・フィルター機能'],
                  ['商品管理',         '/admin/products',  '商品追加・編集・削除・カテゴリ分類（定期購入/おすすめ商品）・公開/非公開切り替え'],
                ].map((row) => (
                  <tr key={row[0]} className="border-t border-gray-100">
                    <td className="px-4 py-2.5 font-semibold text-gray-700">{row[0]}</td>
                    <td className="px-4 py-2.5 text-gray-500 font-mono text-xs">{row[1]}</td>
                    <td className="px-4 py-2.5 text-gray-700">{row[2]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* ── 4. 定期購入サービス ── */}
          <section className="mb-10">
            <h2 className="text-lg font-bold text-indigo-600 border-b border-indigo-100 pb-2 mb-4">4. 定期購入サービス仕様</h2>

            <h3 className="font-bold text-gray-800 mb-3 text-sm">4-1. 取扱商品</h3>
            <table className="w-full text-sm mb-5 border border-gray-200 rounded-xl overflow-hidden">
              <thead>
                <tr className="bg-indigo-50">
                  <th className="text-left px-4 py-2.5 font-semibold text-gray-600">商品名</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-gray-600">通常月額</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-gray-600">内容量</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['オーラルプロバイオティクス', '¥3,980/月', '30粒（30日分）'],
                  ['カルシウム＋ビタミンD',       '¥2,480/月', '60粒（30日分）'],
                  ['歯科専用 乳酸菌タブレット',   '¥1,980/月', '90粒（30日分）'],
                  ['マルチビタミン＆ミネラル',     '¥2,980/月', '30粒（30日分）'],
                ].map((row) => (
                  <tr key={row[0]} className="border-t border-gray-100">
                    {row.map((cell, i) => (
                      <td key={i} className="px-4 py-2.5 text-gray-700">{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>

            <h3 className="font-bold text-gray-800 mb-3 text-sm">4-2. コース・割引</h3>
            <table className="w-full text-sm border border-gray-200 rounded-xl overflow-hidden">
              <thead>
                <tr className="bg-indigo-50">
                  <th className="text-left px-4 py-2.5 font-semibold text-gray-600">コース</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-gray-600">割引率</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-gray-600">お届け先</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['6ヶ月コース', '10% OFF', '自宅（登録住所）または医院'],
                  ['3ヶ月コース', '5% OFF',  '自宅（登録住所）または医院'],
                ].map((row) => (
                  <tr key={row[0]} className="border-t border-gray-100">
                    {row.map((cell, i) => (
                      <td key={i} className="px-4 py-2.5 text-gray-700">{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* ── 5. おすすめ商品（EC） ── */}
          <section className="mb-10">
            <h2 className="text-lg font-bold text-indigo-600 border-b border-indigo-100 pb-2 mb-4">5. おすすめ商品（ECモール）仕様</h2>
            <table className="w-full text-sm border border-gray-200 rounded-xl overflow-hidden">
              <thead>
                <tr className="bg-indigo-50">
                  <th className="text-left px-4 py-2.5 font-semibold text-gray-600">カテゴリ</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-gray-600">商品数</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-gray-600">主な商品</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['サプリメント',   '3商品', 'L.ロイテリ プロバイオティクス 等'],
                  ['ヨーグルト',     '3商品', 'L.ロイテリ ヨーグルト 等'],
                  ['歯ブラシ',       '3商品', '電動歯ブラシ スタンダード 等'],
                  ['オーラルケア',   '3商品', '薬用洗口液 500ml 等'],
                ].map((row) => (
                  <tr key={row[0]} className="border-t border-gray-100">
                    {row.map((cell, i) => (
                      <td key={i} className="px-4 py-2.5 text-gray-700">{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* ── 6. Q&A ── */}
          <section className="mb-10">
            <h2 className="text-lg font-bold text-indigo-600 border-b border-indigo-100 pb-2 mb-4">6. Q&A仕様</h2>
            <table className="w-full text-sm border border-gray-200 rounded-xl overflow-hidden">
              <thead>
                <tr className="bg-indigo-50">
                  <th className="text-left px-4 py-2.5 font-semibold text-gray-600">カテゴリ</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-gray-600">件数</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['予約・診療について', '4件'],
                  ['費用・保険について', '4件'],
                  ['予防・メンテナンスについて', '4件'],
                  ['子どもの歯科について', '4件'],
                  ['サービスについて', '4件'],
                ].map((row) => (
                  <tr key={row[0]} className="border-t border-gray-100">
                    <td className="px-4 py-2.5 text-gray-700">{row[0]}</td>
                    <td className="px-4 py-2.5 text-gray-700">{row[1]}</td>
                  </tr>
                ))}
                <tr className="border-t-2 border-gray-300 bg-gray-50">
                  <td className="px-4 py-2.5 font-bold text-gray-800">合計</td>
                  <td className="px-4 py-2.5 font-bold text-gray-800">20件</td>
                </tr>
              </tbody>
            </table>
          </section>

          {/* ── フッター ── */}
          <div className="border-t border-gray-200 pt-6 text-center text-xs text-gray-400">
            <p>テストデンタル歯科 ポータルサイト仕様書 v1.0 　© 2026 テストデンタル歯科</p>
          </div>

        </div>
      </div>
    </>
  );
}
