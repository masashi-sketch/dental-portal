export default function FullScreenLoading() {
  return (
    <div
      className="fixed inset-0 z-[9999] flex min-h-dvh items-center justify-center bg-white"
      role="status"
      aria-live="polite"
      aria-label="画面を読み込んでいます"
      data-testid="app-loading"
    >
      <div className="flex flex-col items-center gap-4 text-slate-500">
        <span
          className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-sky-500"
          aria-hidden="true"
        />
        <p className="text-sm font-bold tracking-wide">読み込み中...</p>
      </div>
    </div>
  );
}
