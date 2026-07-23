'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ClinicContactRoleKey } from '@/lib/supabase/types';

export type WebinarClinicOption = { customer_code: string; name: string };
export type WebinarContactOption = {
  id: string;
  customer_code: string;
  name: string;
  email: string | null;
  role_key: ClinicContactRoleKey;
  status: 'active' | 'inactive';
  deleted_at: string | null;
};

function ParentCheckbox({ checked, indeterminate, disabled, onChange }: {
  checked: boolean; indeterminate: boolean; disabled: boolean; onChange: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { if (ref.current) ref.current.indeterminate = indeterminate; }, [indeterminate]);
  return <input ref={ref} type="checkbox" checked={checked} disabled={disabled} onChange={onChange} className="size-4 accent-violet-600" />;
}

export default function WebinarRecipientSelector({
  clinics, contacts, roleLabels, selectedContactIds, onChange,
}: {
  clinics: WebinarClinicOption[];
  contacts: WebinarContactOption[];
  roleLabels: Map<ClinicContactRoleKey, string>;
  selectedContactIds: string[];
  onChange: (customerCodes: string[], contactIds: string[]) => void;
}) {
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<string[]>([]);
  const selected = useMemo(() => new Set(selectedContactIds), [selectedContactIds]);
  const selectable = useMemo(() => contacts.filter((contact) => contact.status === 'active' && !contact.deleted_at && !!contact.email), [contacts]);
  const selectableByClinic = useMemo(() => {
    const grouped = new Map<string, WebinarContactOption[]>();
    selectable.forEach((contact) => grouped.set(contact.customer_code, [...(grouped.get(contact.customer_code) ?? []), contact]));
    return grouped;
  }, [selectable]);
  const allByClinic = useMemo(() => {
    const grouped = new Map<string, WebinarContactOption[]>();
    contacts.forEach((contact) => grouped.set(contact.customer_code, [...(grouped.get(contact.customer_code) ?? []), contact]));
    return grouped;
  }, [contacts]);
  const visibleClinics = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return clinics.filter((clinic) => {
      const clinicContacts = allByClinic.get(clinic.customer_code) ?? [];
      return !normalized || `${clinic.customer_code} ${clinic.name} ${clinicContacts.map((contact) => `${contact.name} ${contact.email ?? ''}`).join(' ')}`.toLowerCase().includes(normalized);
    });
  }, [allByClinic, clinics, query]);

  const emit = (ids: string[]) => {
    const uniqueIds = [...new Set(ids)];
    const idSet = new Set(uniqueIds);
    const codes = [...new Set(selectable.filter((contact) => idSet.has(contact.id)).map((contact) => contact.customer_code))];
    onChange(codes, uniqueIds);
  };
  const toggleClinic = (code: string) => {
    const candidates = selectableByClinic.get(code) ?? [];
    const allSelected = candidates.length > 0 && candidates.every((contact) => selected.has(contact.id));
    emit(allSelected
      ? selectedContactIds.filter((id) => !candidates.some((contact) => contact.id === id))
      : [...selectedContactIds, ...candidates.map((contact) => contact.id)]);
    setExpanded((current) => current.includes(code) ? current : [...current, code]);
  };
  const allSelected = selectable.length > 0 && selectable.every((contact) => selected.has(contact.id));
  const selectedClinicCount = new Set(selectable.filter((contact) => selected.has(contact.id)).map((contact) => contact.customer_code)).size;

  return <section>
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div><span className="text-sm font-bold text-slate-700">対象医院・メール送付先</span><p className="mt-0.5 text-xs text-slate-500">対象医院 {selectedClinicCount}件・送付先 {selectedContactIds.length}名</p></div>
      <div className="flex gap-2"><button type="button" onClick={() => emit(selectable.map((contact) => contact.id))} className="text-xs font-bold text-violet-700">全医院・全担当者を選択</button><span className="text-slate-300">/</span><button type="button" onClick={() => emit([])} className="text-xs font-bold text-slate-500">全解除</button></div>
    </div>
    <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="医院名・得意先コード・担当者名で検索" className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
    <div className="mt-2 max-h-80 overflow-y-auto rounded-xl border border-slate-200">
      <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">
        <ParentCheckbox checked={allSelected} indeterminate={!allSelected && selectedContactIds.length > 0} disabled={selectable.length === 0} onChange={() => emit(allSelected ? [] : selectable.map((contact) => contact.id))} />
        <span>一括選択</span>
      </div>
      {visibleClinics.map((clinic) => {
        const candidates = selectableByClinic.get(clinic.customer_code) ?? [];
        const clinicContacts = allByClinic.get(clinic.customer_code) ?? [];
        const selectedCount = candidates.filter((contact) => selected.has(contact.id)).length;
        const isExpanded = expanded.includes(clinic.customer_code);
        return <div key={clinic.customer_code} className="border-b border-slate-100 last:border-b-0">
          <div className={`flex items-center gap-3 px-3 py-3 ${selectedCount ? 'bg-violet-50/60' : 'bg-white'}`}>
            <ParentCheckbox checked={candidates.length > 0 && selectedCount === candidates.length} indeterminate={selectedCount > 0 && selectedCount < candidates.length} disabled={candidates.length === 0} onChange={() => toggleClinic(clinic.customer_code)} />
            <button type="button" onClick={() => setExpanded((current) => current.includes(clinic.customer_code) ? current.filter((code) => code !== clinic.customer_code) : [...current, clinic.customer_code])} className="flex min-w-0 flex-1 items-center gap-2 text-left">
              <span className="text-xs text-slate-400">{isExpanded ? '▼' : '▶'}</span><span className="truncate text-sm font-semibold text-slate-700">{clinic.name}</span><span className="font-mono text-xs text-slate-400">{clinic.customer_code}</span>
            </button>
            <span className={`text-xs font-bold ${candidates.length ? 'text-violet-700' : 'text-amber-600'}`}>{candidates.length ? `${selectedCount}/${candidates.length}名` : '送付可能者なし'}</span>
          </div>
          {isExpanded && <div className="space-y-1 bg-white px-4 py-2 pl-10">
            {clinicContacts.map((contact) => {
              const disabled = contact.status !== 'active' || !!contact.deleted_at || !contact.email;
              return <label key={contact.id} className={`flex items-start gap-3 rounded-lg px-2 py-2 ${disabled ? 'cursor-not-allowed bg-slate-50 opacity-60' : 'cursor-pointer hover:bg-violet-50'}`}>
                <input type="checkbox" checked={selected.has(contact.id)} disabled={disabled} onChange={(event) => emit(event.target.checked ? [...selectedContactIds, contact.id] : selectedContactIds.filter((id) => id !== contact.id))} className="mt-0.5 size-4 accent-violet-600" />
                <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-slate-700">{contact.name} <span className="text-xs font-normal text-slate-400">{roleLabels.get(contact.role_key) ?? contact.role_key}</span></span><span className="block truncate text-xs text-slate-500">{contact.email ?? 'メール未登録'}</span></span>
                {disabled && <span className="text-xs font-semibold text-amber-600">{contact.status !== 'active' ? '無効' : 'メールなし'}</span>}
              </label>;
            })}
            {clinicContacts.length === 0 && <p className="px-2 py-2 text-xs text-amber-600">担当者が登録されていません。</p>}
          </div>}
        </div>;
      })}
      {visibleClinics.length === 0 && <p className="px-4 py-8 text-center text-sm text-slate-400">一致する医院・担当者がありません</p>}
    </div>
  </section>;
}
