export default function BillingPage() {
  return (
    <div className="p-4 sm:p-6 max-w-6xl">
      <header className="mb-5">
        <p className="text-xs font-bold tracking-widest text-violet-500">請求管理</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-800">請求一覧</h1>
        <p className="mt-1 text-sm text-slate-500">医院への請求状況を確認する画面です。</p>
      </header>

      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-900">
        <h2 className="font-bold">会計・請求フローの確定後に実装します</h2>
        <p className="mt-2 text-sm leading-relaxed">
          現在は請求書発行・入金管理の仕様が未確定です。架空の請求データは表示せず、
          会計処理・請求書発行フローの確定後に一覧・状態管理を追加します。
        </p>
      </section>
    </div>
  );
}
