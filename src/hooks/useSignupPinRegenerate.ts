'use client';

import { useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { ClinicWithStaff } from './useClinicInfo';

// クリニック自身（/admin/patients・/admin/clinic-info/qr）がQR + 受付PINを
// (再)発行するための共通フック。BGJポータル側は別エンドポイント
// （/api/bgj/clinics/[code]）を使うため対象外。
export function useSignupPinRegenerate(
  setClinic: Dispatch<SetStateAction<ClinicWithStaff | null>>,
  showToast: (message: string) => void,
) {
  const [regenerating, setRegenerating] = useState(false);

  const regenerate = async () => {
    setRegenerating(true);
    try {
      const res = await fetch('/api/admin/clinic-info', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ regenerateSignupPin: true }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? 'PINの発行に失敗しました');
      }
      const { clinic: updated } = await res.json();
      setClinic((prev) => (prev ? { ...prev, ...updated } : prev));
      showToast('受付PINを発行しました');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'エラーが発生しました');
    } finally {
      setRegenerating(false);
    }
  };

  return { regenerate, regenerating };
}
