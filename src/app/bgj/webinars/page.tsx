import WebinarManager from './WebinarManager';

export default function BgjWebinarsPage() {
  return <div className="max-w-[1600px] p-4 sm:p-6"><header className="mb-5"><p className="text-xs font-bold tracking-widest text-violet-500">ウェビナー管理</p><h1 className="mt-1 text-2xl font-bold text-slate-800">ウェビナー一覧</h1><p className="mt-1 text-sm text-slate-500">Google Meet・Zoomの開催情報を対象医院へ公開します。</p></header><WebinarManager /></div>;
}

