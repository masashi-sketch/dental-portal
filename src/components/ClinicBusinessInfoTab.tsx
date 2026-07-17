'use client';

import Card from '@/components/ui/Card';
import type { ClinicFormState, ClinicWithStaff } from '@/lib/clinicForm';

// BGJポータル（/bgj/customers/[code]、経営情報タブ）専用の表示専用コンポーネント。
// 編集状態（clinicForm/editingClinic）は基本情報タブと共有するため親ページが保持する
// （基本情報タブで「編集する」を押すと、このタブも同時に編集モードになる仕様）。
export default function ClinicBusinessInfoTab({
  clinic,
  clinicForm,
  editingClinic,
  savingClinic,
  onEdit,
  onCancel,
  onSave,
  onFormChange,
}: {
  clinic: ClinicWithStaff;
  clinicForm: ClinicFormState;
  editingClinic: boolean;
  savingClinic: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
  onFormChange: (form: ClinicFormState) => void;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold text-slate-700">経営情報</h2>
        {!editingClinic ? (
          <button onClick={onEdit}
            className="text-xs text-violet-600 hover:text-violet-800 font-semibold">編集する</button>
        ) : (
          <div className="flex gap-2">
            <button onClick={onCancel}
              className="text-xs text-slate-500 hover:text-slate-700 font-semibold">キャンセル</button>
            <button onClick={onSave} disabled={savingClinic}
              className="text-xs text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-50 font-semibold px-3 py-1.5 rounded-lg">
              {savingClinic ? '保存中...' : '保存する'}
            </button>
          </div>
        )}
      </div>
      {!editingClinic ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-4 gap-x-8">
          {[
            ['患者層分類', clinic.patient_type || '—'],
            ['診療区分', clinic.clinic_type || '—'],
            ['チェア数', `${clinic.chairs}台`],
            ['待合室規模', clinic.waiting_room || '—'],
            ['カウンセリングルーム', clinic.counseling_room ? 'あり' : 'なし'],
            ['休診日', clinic.closed_day || '—'],
            ['常勤医師数', `${clinic.full_time_dr}名`],
            ['非常勤医師数', `${clinic.part_time_dr}名`],
            ['歯科衛生士数', `${clinic.hygienist}名`],
            ['受付・TC数', `${clinic.receptionist}名`],
            ['歯科助手数', `${clinic.assistant}名`],
            ['歯科技工士数', `${clinic.technician}名`],
            ['看護師数', `${clinic.nurse}名`],
            ['管理栄養士数', `${clinic.nutritionist}名`],
            ['保育士数', `${clinic.childcare}名`],
            ['主な紹介者', clinic.main_referrer || '—'],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-xs text-slate-400 mb-0.5">{label}</p>
              <p className="text-sm text-slate-800 font-semibold">{value}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {([
            ['患者層分類', 'patientType'], ['診療区分', 'clinicType'], ['チェア数', 'chairs'],
            ['待合室規模', 'waitingRoom'], ['休診日', 'closedDay'],
            ['常勤医師数', 'fullTimeDr'], ['非常勤医師数', 'partTimeDr'], ['歯科衛生士数', 'hygienist'],
            ['受付・TC数', 'receptionist'], ['歯科助手数', 'assistant'], ['歯科技工士数', 'technician'],
            ['看護師数', 'nurse'], ['管理栄養士数', 'nutritionist'], ['保育士数', 'childcare'],
            ['主な紹介者', 'mainReferrer'],
          ] as [string, keyof ClinicFormState][]).map(([label, key]) => (
            <div key={key}>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">{label}</label>
              <input value={clinicForm[key] as string} onChange={(e) => onFormChange({ ...clinicForm, [key]: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
            </div>
          ))}
          <div className="flex items-center gap-2 pt-6">
            <input type="checkbox" checked={clinicForm.counselingRoom}
              onChange={(e) => onFormChange({ ...clinicForm, counselingRoom: e.target.checked })}
              className="w-4 h-4" />
            <label className="text-sm text-slate-600">カウンセリングルームあり</label>
          </div>
        </div>
      )}
    </Card>
  );
}
