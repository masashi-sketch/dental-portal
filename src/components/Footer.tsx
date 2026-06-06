export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400 mt-auto hidden md:block">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col items-center gap-4 text-xs sm:text-sm md:flex-row md:justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-[#2563EB] rounded-md flex items-center justify-center">
            <svg width="13" height="13" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </div>
          <span className="text-white font-semibold">テストデンタル歯科</span>
        </div>
        <div className="text-gray-500 text-xs">© 2026 テストデンタル歯科. All Rights Reserved.</div>
        <div className="flex items-center gap-5 flex-wrap justify-center">
          <a href="#" className="hover:text-white transition-colors">プライバシーポリシー</a>
          <a href="#" className="hover:text-white transition-colors">特定商取引法</a>
          <a href="#" className="hover:text-white transition-colors">お問い合わせ</a>
        </div>
      </div>
    </footer>
  );
}
