import BgjSidebar from "./components/BgjSidebar";
import BgjHeader from "./components/BgjHeader";

export default function BgjLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <BgjSidebar />
      <div className="flex-1 min-w-0 flex flex-col pt-14 md:pt-0">
        <BgjHeader />
        <main className="flex-1 min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}
