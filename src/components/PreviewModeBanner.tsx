'use client';

import { useEffect, useState } from 'react';

function readDemoPatientId(): string | null {
  const match = document.cookie.match(/(?:^|; )demo-patient-id=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export default function PreviewModeBanner() {
  const [previewing, setPreviewing] = useState(false);

  useEffect(() => {
    setPreviewing(!!readDemoPatientId());
  }, []);

  if (!previewing) return null;

  const endPreview = () => {
    document.cookie = 'demo-patient-id=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
    window.location.href = '/admin/patients';
  };

  return (
    <div className="bg-amber-400 text-amber-950 text-xs sm:text-sm py-2 px-4 flex items-center justify-center gap-3 flex-wrap">
      <span className="font-semibold">
        プレビューモード：クリニック管理画面から、この患者様として一時的に表示しています
      </span>
      <button
        onClick={endPreview}
        className="underline font-semibold hover:opacity-70 transition-opacity whitespace-nowrap"
      >
        プレビューを終了
      </button>
    </div>
  );
}
