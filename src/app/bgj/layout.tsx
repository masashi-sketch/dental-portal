import BgjSidebar from "./components/BgjSidebar";

export default function BgjLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <BgjSidebar />
      <main className="flex-1 pt-14 md:pt-0 min-w-0">
        {children}
      </main>
    </div>
  );
}
