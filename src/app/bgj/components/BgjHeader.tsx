import Link from "next/link";

export default function BgjHeader() {
  return (
    <header className="bg-white border-b border-violet-100 px-4 sm:px-6 py-2.5 flex items-center justify-end gap-2">
      <Link
        href="/"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm text-violet-700 hover:bg-violet-50 transition-colors"
      >
        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
        患者様ポータル
      </Link>
      <Link
        href="/admin"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm text-violet-700 hover:bg-violet-50 transition-colors"
      >
        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
          />
        </svg>
        医院用ポータル
      </Link>
    </header>
  );
}
