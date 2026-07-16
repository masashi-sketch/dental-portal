'use client';

import Link from 'next/link';
import { use, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import AdminSidebar from '../../components/AdminSidebar';
import { useToast } from '@/hooks/useToast';
import type { PatientPublic, PeriodontalDiagnosisWithMaster, PeriodontalGrade, PeriodontalStage } from '@/lib/supabase/types';

type DiagnosisForm = {
  stageCode: string;
  gradeCode: string;
  diagnosedAt: string;
  memo: string;
};

const EMPTY_DIAGNOSIS_FORM: DiagnosisForm = { stageCode: '', gradeCode: '', diagnosedAt: '', memo: '' };

export default function AdminPatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: session } = useSession();

  const [patient, setPatient] = useState<PatientPublic | null>(null);
  const [diagnoses, setDiagnoses] = useState<PeriodontalDiagnosisWithMaster[]>([]);
  const [stages, setStages] = useState<PeriodontalStage[]>([]);
  const [grades, setGrades] = useState<PeriodontalGrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast, showToast } = useToast();
  const [showDiagnosisForm, setShowDiagnosisForm] = useState(false);
  const [diagnosisForm, setDiagnosisForm] = useState<DiagnosisForm>(EMPTY_DIAGNOSIS_FORM);
  const [saving, setSaving] = useState(false);
  const [periodontalEnabled, setPeriodontalEnabled] = useState(true);

  const fetchAll = () => {
    Promise.all([
      fetch(`/api/admin/patients/${id}`),
      fetch(`/api/admin/patients/${id}/diagnoses`),
      fetch('/api/periodontal/master'),
    ])
      .then(([patientRes, diagnosesRes, masterRes]) => {
        if (!patientRes.ok) throw new Error('患者情報の取得に失敗しました');
        if (!diagnosesRes.ok) throw new Error('診断履歴の取得に失敗しました');
        if (!masterRes.ok) throw new Error('マスタ情報の取得に失敗しました');
        return Promise.all([patientRes.json(), diagnosesRes.json(), masterRes.json()]);
      })
      .then(([patientData, diagnosesData, masterData]) => {
        setPatient(patientData.patient);
        setDiagnoses(diagnosesData.diagnoses);
        setStages(masterData.stages);
        setGrades(masterData.grades);
        setError(null);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'エラーが発生しました');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchAll(); }, [id]);

  useEffect(() => {
    const customerCode = session?.user?.customerCode;
    if (!customerCode) return;
    fetch(`/api/admin/clinic-info?customerCode=${encodeURIComponent(customerCode)}`)
      .then((res) => (res.ok ? res.json() : { clinic: null }))
      .then((data) => {
        if (data.clinic) setPeriodontalEnabled(data.clinic.show_periodontal_diagnosis);
      })
      .catch(() => {});
  }, [session?.user?.customerCode]);

  const previewAsPatient = () => {
    document.cookie = `demo-patient-id=${id}; path=/; max-age=86400; SameSite=Lax`;
    window.open('/medication', '_blank');
  };

  const openDiagnosisForm = () => {
    setDiagnosisForm({ ...EMPTY_DIAGNOSIS_FORM, diagnosedAt: new Date().toISOString().slice(0, 10) });
    setShowDiagnosisForm(true);
  };

  const handleSaveDiagnosis = async () => {
    if (!diagnosisForm.stageCode || !diagnosisForm.gradeCode) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/patients/${id}/diagnoses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stageCode: Number(diagnosisForm.stageCode),
          gradeCode: diagnosisForm.gradeCode,
          diagnosedAt: diagnosisForm.diagnosedAt,
          memo: diagnosisForm.memo,
        }),
      });
      if (!res.ok) throw new Error('診断の登録に失敗しました');
      const { diagnosis } = await res.json();
      const stage = stages.find((s) => s.code === diagnosis.stage_code) ?? null;
      const grade = grades.find((g) => g.code === diagnosis.grade_code) ?? null;
      setDiagnoses((prev) => [{ ...diagnosis, stage, grade }, ...prev]);
      showToast('歯周病診断を登録しました');
      setShowDiagnosisForm(false);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'エラーが発生しました');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-sky-50">
      <AdminSidebar active="patients" />

      <div className="flex-1 flex flex-col min-w-0 pt-14 md:pt-0">
        <main className="flex-1 p-5 sm:p-6">
          {toast && (
            <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-sky-600 text-white text-base px-5 py-3 rounded-2xl shadow-xl">{toast}</div>
          )}

          <div className="flex items-center gap-1.5 text-sm text-slate-400 mb-4">
            <Link href="/admin/patients" className="hover:text-sky-600">患者様一覧</Link>
            <span>/</span>
            <span className="text-slate-600">{patient?.name ?? '...'}</span>
          </div>

          {loading && <p className="text-slate-400">読み込み中...</p>}
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>
          )}

          {!loading && patient && (
            <>
              {/* ヘッダー */}
              <div className="flex flex-wrap items-start justify-between gap-y-3 mb-5">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-mono text-sm text-sky-600 font-bold bg-sky-50 px-2 py-0.5 rounded-lg">
                      {patient.patient_no}
                    </span>
                    <span className="font-mono text-sm text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg">
                      {patient.customer_code}
                    </span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      patient.status === '有効' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {patient.status}
                    </span>
                  </div>
                  <h1 className="text-xl font-bold text-slate-800">{patient.name}</h1>
                </div>
                <button
                  onClick={previewAsPatient}
                  className="flex items-center gap-2 bg-teal-500 hover:bg-teal-400 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-sm"
                >
                  患者ポータルをプレビュー
                </button>
              </div>

              {/* 基本情報 */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-5">
                <h2 className="text-sm font-bold text-slate-700 mb-4">基本情報</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8">
                  {[
                    ['氏名', patient.name],
                    ['患者番号', patient.patient_no],
                    ['得意先コード', patient.customer_code],
                    ['ログインID', patient.login_id],
                    ['ステータス', patient.status],
                    ['登録日', patient.registered_at],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <p className="text-xs text-slate-400 mb-0.5">{label}</p>
                      <p className="text-sm text-slate-800 font-semibold">{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* 歯周病診断 */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-bold text-slate-700">歯周病診断</h2>
                  <button
                    onClick={openDiagnosisForm}
                    disabled={!periodontalEnabled}
                    className="flex items-center gap-2 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
                  >
                    ＋ 新規診断を記録
                  </button>
                </div>

                {!periodontalEnabled && (
                  <p className="text-xs text-slate-400 bg-slate-50 rounded-lg px-3 py-2 mb-4">
                    「医院設定情報」の歯周病表示がオフのため、新規診断の入力はできません。オンにすると入力できるようになります。
                  </p>
                )}

                {showDiagnosisForm && periodontalEnabled && (
                  <div className="bg-sky-50 border border-sky-200 rounded-xl p-4 mb-4 flex flex-col gap-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-slate-500 mb-1 block">ステージ</label>
                        <select
                          value={diagnosisForm.stageCode}
                          onChange={(e) => setDiagnosisForm({ ...diagnosisForm, stageCode: e.target.value })}
                          className="w-full border border-sky-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-400"
                        >
                          <option value="">選択してください</option>
                          {stages.map((s) => (
                            <option key={s.code} value={s.code}>{s.label}・{s.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-500 mb-1 block">グレード</label>
                        <select
                          value={diagnosisForm.gradeCode}
                          onChange={(e) => setDiagnosisForm({ ...diagnosisForm, gradeCode: e.target.value })}
                          className="w-full border border-sky-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-400"
                        >
                          <option value="">選択してください</option>
                          {grades.map((g) => (
                            <option key={g.code} value={g.code}>{g.label}・{g.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500 mb-1 block">診断日</label>
                      <input
                        type="date"
                        value={diagnosisForm.diagnosedAt}
                        onChange={(e) => setDiagnosisForm({ ...diagnosisForm, diagnosedAt: e.target.value })}
                        className="w-full border border-sky-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-400"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500 mb-1 block">メモ</label>
                      <textarea
                        rows={2}
                        value={diagnosisForm.memo}
                        onChange={(e) => setDiagnosisForm({ ...diagnosisForm, memo: e.target.value })}
                        placeholder="所見・経過など"
                        className="w-full border border-sky-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-400 resize-none"
                      />
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setShowDiagnosisForm(false)}
                        className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-white transition-colors"
                      >
                        キャンセル
                      </button>
                      <button
                        onClick={handleSaveDiagnosis}
                        disabled={saving || !diagnosisForm.stageCode || !diagnosisForm.gradeCode}
                        className="flex-1 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
                      >
                        {saving ? '保存中...' : '保存する'}
                      </button>
                    </div>
                  </div>
                )}

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        {['診断日', 'ステージ', 'グレード', 'メモ', '登録者'].map((h) => (
                          <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {diagnoses.length === 0 && (
                        <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400 text-sm">診断履歴はまだありません</td></tr>
                      )}
                      {diagnoses.map((d) => (
                        <tr key={d.id} className="border-t border-slate-50 hover:bg-slate-50">
                          <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{d.diagnosed_at}</td>
                          <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{d.stage ? `${d.stage.label}・${d.stage.name}` : d.stage_code}</td>
                          <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{d.grade ? `${d.grade.label}・${d.grade.name}` : d.grade_code}</td>
                          <td className="px-4 py-3 text-slate-600">{d.memo || '—'}</td>
                          <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">{d.created_by ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
