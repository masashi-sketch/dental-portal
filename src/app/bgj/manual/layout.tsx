import ManualNav from "./ManualNav";

// マニュアルページだけの専用レイアウト。BgjLayout（主サイドバー）の内側に
// ネストされ、[主サイドバー][マニュアル専用ツリー][マニュアル詳細]の
// 3カラム構成になる。
export default function ManualLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-col md:flex-row">
      <ManualNav />
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
