import AdminViewModeBanner from '@/components/AdminViewModeBanner';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AdminViewModeBanner />
      {children}
    </>
  );
}
