'use client';

import { use } from 'react';
import AdminSidebar from '../../components/AdminSidebar';
import PatientDetailPanel from '@/components/PatientDetailPanel';

export default function AdminPatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  return (
    <div className="min-h-screen flex bg-sky-50">
      <AdminSidebar active="patients" />

      <div className="flex-1 flex flex-col min-w-0 pt-14 md:pt-0">
        <main className="flex-1 p-5 sm:p-6">
          <PatientDetailPanel id={id} backHref="/admin/patients" theme="sky" />
        </main>
      </div>
    </div>
  );
}
