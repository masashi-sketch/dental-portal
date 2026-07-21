'use client';

import { use } from 'react';
import PatientDetailPanel from '@/components/PatientDetailPanel';

export default function BgjPatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  return (
    <div className="p-4 sm:p-6 max-w-5xl">
      <PatientDetailPanel
        id={id}
        backHref="/bgj/patients"
        theme="violet"
        previewButtonLabel="患者ポータルを開く（ビュー）"
      />
    </div>
  );
}
