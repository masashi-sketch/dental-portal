type InventoryPageProps = {
  searchParams: Promise<{ view?: string | string[] }>;
};

const views = {
  stock: {
    title: "在庫一覧",
    description: "商品ごとの利用可能在庫を確認する画面です。",
  },
  movements: {
    title: "入出庫履歴",
    description: "入荷・出荷・調整の履歴を確認する画面です。",
  },
} as const;

export default async function InventoryPage({ searchParams }: InventoryPageProps) {
  const requestedView = (await searchParams).view;
  const viewKey = requestedView === "movements" ? "movements" : "stock";
  const view = views[viewKey];

  return (
    <div className="p-4 sm:p-6 max-w-6xl">
      <header className="mb-5">
        <p className="text-xs font-bold tracking-widest text-violet-500">在庫管理</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-800">{view.title}</h1>
        <p className="mt-1 text-sm text-slate-500">{view.description}</p>
      </header>

      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-900">
        <h2 className="font-bold">在庫の正本と運用確定後に実装します</h2>
        <p className="mt-2 text-sm leading-relaxed">
          現在は在庫引当・入出庫・倉庫連携が未実装です。架空の在庫数は表示せず、
          Shopifyまたは採用する在庫管理サービスの仕様確定後に実データを接続します。
        </p>
      </section>
    </div>
  );
}
