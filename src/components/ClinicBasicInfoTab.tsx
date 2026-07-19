'use client';

import SalesRepAvatar from '@/components/SalesRepAvatar';
import Card from '@/components/ui/Card';
import type { ClinicStatusMaster, SalesRepWithMaster } from '@/lib/supabase/types';
import type { ClinicFormState, ClinicWithStaff } from '@/lib/clinicForm';

// BGJポータル（/bgj/customers/[code]、基本情報タブ）専用の表示専用コンポーネント。
// 編集状態（clinicForm/editingClinic）は経営情報タブと共有するため親ページが保持し、
// このコンポーネントはpropsで受け取るだけの薄いプレゼンテーション層とする。
export default function ClinicBasicInfoTab({
  clinic,
  clinicForm,
  editingClinic,
  savingClinic,
  salesReps,
  statuses,
  onEdit,
  onCancel,
  onSave,
  onFormChange,
}: {
  clinic: ClinicWithStaff;
  clinicForm: ClinicFormState;
  editingClinic: boolean;
  savingClinic: boolean;
  salesReps: SalesRepWithMaster[];
  statuses: ClinicStatusMaster[];
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
  onFormChange: (form: ClinicFormState) => void;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold text-slate-700">基本情報</h2>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8">
          {[
            ['医院名', clinic.name],
            ['得意先コード', clinic.customer_code],
            ['エリア', clinic.area],
            ['住所', clinic.address || '—'],
            ['電話番号', clinic.tel || '—'],
            ['担当者', clinic.contact_person || '—'],
            ['取引開始日', clinic.contract_since || '—'],
            ['ポータル表示名', clinic.display_name || '（未設定・医院名を表示）'],
            ['患者ポータル背景画像URL', clinic.patient_background_url || '（未設定・標準画像を使用）'],
            ['患者様向け・平日診療時間', clinic.clinic_hours_weekday || '（未設定）'],
            ['患者様向け・土曜診療時間', clinic.clinic_hours_saturday || '（未設定）'],
            ['患者様向け・休診日', clinic.clinic_closed_day || '（未設定）'],
            ['患者様向け・電話番号', clinic.clinic_phone || '（未設定）'],
            ['患者様向け・住所', clinic.clinic_address || '（未設定）'],
            ['患者様向け・最寄駅', clinic.clinic_nearest_station || '（未設定）'],
            ['患者様向け・駐車場', clinic.clinic_parking || '（未設定）'],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-xs text-slate-400 mb-0.5">{label}</p>
              <p className="text-sm text-slate-800 font-semibold break-all">{value}</p>
            </div>
          ))}
          <div>
            <p className="text-xs text-slate-400 mb-0.5">担当営業</p>
            {clinic.staff ? (
              <div className="flex items-center gap-2 mt-0.5">
                <SalesRepAvatar name={clinic.staff.name} photoUrl={clinic.staff.photo_url} size={28} className="text-xs" />
                <p className="text-sm text-slate-800 font-semibold">{clinic.staff.name}</p>
              </div>
            ) : (
              <p className="text-sm text-slate-800 font-semibold">未割当</p>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">医院名</label>
            <input value={clinicForm.name} onChange={(e) => onFormChange({ ...clinicForm, name: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">エリア</label>
            <input value={clinicForm.area} onChange={(e) => onFormChange({ ...clinicForm, area: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">住所</label>
            <input value={clinicForm.address} onChange={(e) => onFormChange({ ...clinicForm, address: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">電話番号</label>
            <input value={clinicForm.tel} onChange={(e) => onFormChange({ ...clinicForm, tel: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">担当者</label>
            <input value={clinicForm.contactPerson} onChange={(e) => onFormChange({ ...clinicForm, contactPerson: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">担当営業</label>
            <select value={clinicForm.staffId} onChange={(e) => onFormChange({ ...clinicForm, staffId: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white">
              <option value="">未割当</option>
              {salesReps.map((r) => (
                <option key={r.id} value={r.id}>{r.name}（{r.role?.name || '—'}）</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">取引開始日</label>
            <input type="date" value={clinicForm.contractSince} onChange={(e) => onFormChange({ ...clinicForm, contractSince: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">ステータス</label>
            <select value={clinicForm.statusId} onChange={(e) => onFormChange({ ...clinicForm, statusId: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white">
              <option value="">未設定</option>
              {statuses.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">ポータル表示名（医院自身も設定可）</label>
            <input value={clinicForm.displayName} onChange={(e) => onFormChange({ ...clinicForm, displayName: e.target.value })}
              placeholder={clinic.name}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">患者ポータル背景画像URL（医院自身も設定可）</label>
            <input value={clinicForm.patientBackgroundUrl} onChange={(e) => onFormChange({ ...clinicForm, patientBackgroundUrl: e.target.value })}
              placeholder="https://..."
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">患者様向け・平日診療時間（医院自身も設定可）</label>
            <input value={clinicForm.clinicHoursWeekday} onChange={(e) => onFormChange({ ...clinicForm, clinicHoursWeekday: e.target.value })}
              placeholder="例）9:00〜18:00"
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">患者様向け・土曜診療時間（医院自身も設定可）</label>
            <input value={clinicForm.clinicHoursSaturday} onChange={(e) => onFormChange({ ...clinicForm, clinicHoursSaturday: e.target.value })}
              placeholder="例）9:00〜13:00"
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">患者様向け・休診日（医院自身も設定可）</label>
            <input value={clinicForm.clinicClosedDay} onChange={(e) => onFormChange({ ...clinicForm, clinicClosedDay: e.target.value })}
              placeholder="例）水・日・祝日"
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">患者様向け・電話番号（医院自身も設定可）</label>
            <input value={clinicForm.clinicPhone} onChange={(e) => onFormChange({ ...clinicForm, clinicPhone: e.target.value })}
              placeholder="例）00-0000-0000"
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">患者様向け・住所（医院自身も設定可）</label>
            <input value={clinicForm.clinicAddress} onChange={(e) => onFormChange({ ...clinicForm, clinicAddress: e.target.value })}
              placeholder="例）〒000-0000 ◯◯県◯◯市◯◯"
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">患者様向け・最寄駅（医院自身も設定可）</label>
            <input value={clinicForm.clinicNearestStation} onChange={(e) => onFormChange({ ...clinicForm, clinicNearestStation: e.target.value })}
              placeholder="例）◯◯線「◯◯駅」徒歩◯分"
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">患者様向け・駐車場（医院自身も設定可）</label>
            <input value={clinicForm.clinicParking} onChange={(e) => onFormChange({ ...clinicForm, clinicParking: e.target.value })}
              placeholder="例）専用駐車場3台あり"
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
          </div>
        </div>
      )}
    </Card>
  );
}
