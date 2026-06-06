'use client';

import { useState } from 'react';
import AdminSidebar from '../components/AdminSidebar';

type Patient = {
  id: number;
  patientNo: string;
  name: string;
  loginId: string;
  password: string;
  registeredAt: string;
  status: '有効' | '無効';
};

const initialPatients: Patient[] = [
  { id: 1, patientNo: 'T-00001', name: '患者 A', loginId: '◯◯◯◯◯', password: '◯◯◯◯◯◯◯◯', registeredAt: '2025-01-15', status: '有効' },
  { id: 2, patientNo: 'T-00002', name: '患者 B', loginId: '◯◯◯◯◯', password: '◯◯◯◯◯◯◯◯', registeredAt: '2025-03-20', status: '有効' },
  { id: 3, patientNo: 'T-00003', name: '患者 C', loginId: '◯◯◯◯◯', password: '◯◯◯◯◯◯◯◯', registeredAt: '2025-05-10', status: '有効' },
  { id: 4, patientNo: 'T-00004', name: '患者 D', loginId: '◯◯◯◯◯', password: '◯◯◯◯◯◯◯◯', registeredAt: '2025-06-01', status: '無効' },
  { id: 5, patientNo: 'T-00005', name: '患者 E', loginId: '◯◯◯◯◯', password: '◯◯◯◯◯◯◯◯', registeredAt: '2026-02-28', status: '有効' },
];

export default function AdminPatientsPage() {
  const [patients, setPatients] = useState<Patient[]>(initialPatients);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<Patient | null>(null);
  const [showPw, setShowPw] = useState<number | null>(null);
  const [form, setForm] = useState({ name: '', loginId: '', password: '', status: '有効' as Patient['status'] });
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  const nextPatientNo = () => {
    const nums = patients.map((p) => Number(p.patientNo.replace('T-', '')));
    return `T-${String(Math.max(...nums) + 1).padStart(5, '0')}`;
  };

  const openNew = () => {
    setEditItem(null);
    setForm({ name: '', loginId: '', password: '', status: '有効' });
    setShowForm(true);
  };

  const openEdit = (p: Patient) => {
    setEditItem(p);
    setForm({ name: p.name, loginId: p.loginId, password: p.password, status: p.status });
    setShowForm(true);
  };

  const handleSave = () => {
    if (!form.name.trim() || !form.loginId.trim() || !form.password.trim()) return;
    if (editItem) {
      setPatients(patients.map((p) => p.id === editItem.id ? { ...p, ...form } : p));
      showToast('患者情報を更新しました');
    } else {
      const newPatient: Patient = {
        id: Date.now(),
        patientNo: nextPatientNo(),
        name: form.name,
        loginId: form.loginId,
        password: form.password,
        registeredAt: new Date().toISOString().slice(0, 10),
        status: form.status,
      };
      setPatients([newPatient, ...patients]);
      showToast('患者IDを発行しました');
    }
    setShowForm(false);
  };

  const handleDelete = (id: number) => {
    setPatients(patients.filter((p) => p.id !== id));
    setDeleteId(null);
    showToast('患者情報を削除しました');
  };

  const toggleStatus = (id: number) => {
    setPatients(patients.map((p) =>
      p.id === id ? { ...p, status: p.status === '有効' ? '無効' : '有効' } : p
    ));
  };

  return (
    <div className="min-h-screen flex bg-sky-50">
      <AdminSidebar active="patients" />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-sky-100 px-6 py-4 flex items-center justify-between shadow-sm">
          <div>
            <h1 className="text-slate-800 font-bold text-xl">患者管理</h1>
            <p className="text-slate-600 text-sm mt-0.5">患者のID・パスワードを発行・管理します</p>
          </div>
          <button onClick={openNew}
            className="bg-sky-500 hover:bg-sky-400 text-white text-base font-bold px-5 py-3 rounded-xl transition-colors cursor-pointer">
            ＋ 患者IDを発行
          </button>
        </header>

        <main className="flex-1 p-5 sm:p-6 bg-sky-50">
          {toast && (
            <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-sky-600 text-white text-base px-5 py-3 rounded-2xl shadow-xl">{toast}</div>
          )}

          <div className="bg-white border border-sky-100 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-base">
                <thead>
                  <tr className="border-b border-slate-100">
                    {['患者番号', '氏名', 'ログインID', 'パスワード', '登録日', 'ステータス', '操作'].map((h) => (
                      <th key={h} className="text-left text-slate-600 font-semibold px-5 py-4 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {patients.map((p) => (
                    <tr key={p.id} className="border-b border-slate-100 last:border-0 hover:bg-sky-50/80 transition-colors">
                      <td className="px-5 py-4 text-slate-600 font-mono text-sm whitespace-nowrap">{p.patientNo}</td>
                      <td className="px-5 py-4 text-slate-800 font-semibold whitespace-nowrap">{p.name}</td>
                      <td className="px-5 py-4 text-slate-700 font-mono whitespace-nowrap">{p.loginId}</td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-700 font-mono text-sm">
                            {showPw === p.id ? p.password : '••••••••'}
                          </span>
                          <button onClick={() => setShowPw(showPw === p.id ? null : p.id)}
                            className="text-sky-600 hover:text-sky-500 text-sm underline cursor-pointer">
                            {showPw === p.id ? '隠す' : '表示'}
                          </button>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-slate-600 whitespace-nowrap">{p.registeredAt}</td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <button onClick={() => toggleStatus(p.id)} className={`text-sm font-semibold px-3 py-1.5 rounded-full cursor-pointer transition-opacity hover:opacity-70 ${
                          p.status === '有効' ? 'text-teal-700 bg-teal-50' : 'text-slate-600 bg-slate-100'
                        }`}>
                          {p.status}
                        </button>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <button onClick={() => openEdit(p)}
                            className="text-sm text-blue-700 hover:text-blue-600 bg-blue-50 px-4 py-2 rounded-lg transition-colors cursor-pointer font-medium">
                            編集
                          </button>
                          <button onClick={() => setDeleteId(p.id)}
                            className="text-sm text-red-600 hover:text-red-500 bg-red-50 px-4 py-2 rounded-lg transition-colors cursor-pointer font-medium">
                            削除
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      {/* 追加・編集モーダル */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-sky-100 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-slate-800 font-bold text-xl mb-5">{editItem ? '患者情報を編集' : '新規患者IDを発行'}</h2>
            {!editItem && (
              <div className="bg-sky-50 border border-sky-200 rounded-xl px-4 py-3 mb-5">
                <p className="text-sky-700 text-sm">発行予定の患者番号：<span className="font-bold">{nextPatientNo()}</span></p>
              </div>
            )}
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-slate-700 text-base mb-1.5 block font-medium">氏名</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="例）山田 太郎"
                  className="w-full bg-sky-50 border border-sky-200 text-slate-800 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-sky-500/40 placeholder-slate-400" />
              </div>
              <div>
                <label className="text-slate-700 text-base mb-1.5 block font-medium">ログインID</label>
                <input type="text" value={form.loginId} onChange={(e) => setForm({ ...form, loginId: e.target.value })}
                  placeholder="例）yamada01"
                  className="w-full bg-sky-50 border border-sky-200 text-slate-800 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-sky-500/40 placeholder-slate-400" />
              </div>
              <div>
                <label className="text-slate-700 text-base mb-1.5 block font-medium">パスワード</label>
                <input type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="半角英数字"
                  className="w-full bg-sky-50 border border-sky-200 text-slate-800 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-sky-500/40 placeholder-slate-400" />
              </div>
              <div>
                <label className="text-slate-700 text-base mb-1.5 block font-medium">ステータス</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Patient['status'] })}
                  className="w-full bg-sky-50 border border-sky-200 text-slate-800 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-sky-500/40">
                  <option>有効</option>
                  <option>無効</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowForm(false)}
                className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-base font-medium transition-colors cursor-pointer">
                キャンセル
              </button>
              <button onClick={handleSave}
                className="flex-1 py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-base transition-colors cursor-pointer">
                {editItem ? '更新する' : '発行する'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteId !== null && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-sky-100 rounded-2xl p-6 w-full max-w-sm text-center shadow-2xl">
            <p className="text-slate-800 font-bold text-lg mb-2">削除しますか？</p>
            <p className="text-slate-600 text-base mb-6">この操作は取り消せません。</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)}
                className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-base font-medium transition-colors cursor-pointer">
                キャンセル
              </button>
              <button onClick={() => handleDelete(deleteId)}
                className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-400 text-white font-bold text-base transition-colors cursor-pointer">
                削除する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
