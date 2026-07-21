type OrdersPageProps = {
  searchParams: Promise<{ view?: string | string[] }>;
};

const views = {
  received: {
    title: "受注一覧",
    description: "患者注文・医院注文を確認する画面です。",
  },
  purchase: {
    title: "発注一覧",
    description: "仕入先への発注状況を確認する画面です。",
  },
} as const;

export default async function OrdersPage({ searchParams }: OrdersPageProps) {
  const requestedView = (await searchParams).view;
  const viewKey = requestedView === "purchase" ? "purchase" : "received";
  const view = views[viewKey];

  return (
    <div className="p-4 sm:p-6 max-w-6xl">
      <header className="mb-5">
        <p className="text-xs font-bold tracking-widest text-violet-500">受発注管理</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-800">{view.title}</h1>
        <p className="mt-1 text-sm text-slate-500">{view.description}</p>
      </header>

      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-900">
        <h2 className="font-bold">外部連携仕様の確定後に実装します</h2>
        <p className="mt-2 text-sm leading-relaxed">
          現在はShopify・Salesforce・仕入先との連携前です。架空の受注・発注データは表示せず、
          正式なデータソースと業務フローの確定後に一覧・検索・状態更新を追加します。
        </p>
      </section>
    </div>
  );
}
