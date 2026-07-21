import AdminViewModeBanner from '@/components/AdminViewModeBanner';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-desktop-density">
      <AdminViewModeBanner />
      {children}
    </div>
  );
}
