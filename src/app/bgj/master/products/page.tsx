"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/hooks/useToast";
import type { Product } from "@/lib/supabase/types";
import {
  PRODUCT_CATEGORIES,
  PRODUCT_BADGE_CLASS,
  PRODUCT_BADGE_COLOR_OPTIONS,
  PRODUCT_IMAGE_TYPE_OPTIONS,
} from "@/lib/productDisplay";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import LoadingState from "@/components/ui/LoadingState";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import ProductVisual from "@/components/ProductVisual";

type ProductForm = {
  name: string;
  productCode: string;
  category: string;
  description: string;
  price: string;
  unit: string;
  imageType: string;
  imageUrl: string;
  badge: string;
  badgeColor: string;
  subscriptionAvailable: boolean;
  volume: string;
  ingredients: string;
  howToUse: string;
  caution: string;
  workingPoint: string;
  dailyAmount: string;
  recommendationLevel: string;
  doctorComment: string;
  status: string;
  sortOrder: string;
};

const EMPTY_FORM: ProductForm = {
  name: "",
  productCode: "",
  category: PRODUCT_CATEGORIES[0],
  description: "",
  price: "",
  unit: "",
  imageType: "supplement",
  imageUrl: "",
  badge: "",
  badgeColor: "",
  subscriptionAvailable: false,
  volume: "",
  ingredients: "",
  howToUse: "",
  caution: "",
  workingPoint: "",
  dailyAmount: "",
  recommendationLevel: "",
  doctorComment: "",
  status: "下書き",
  sortOrder: "0",
};

function toForm(p: Product): ProductForm {
  return {
    name: p.name,
    productCode: p.product_code ?? "",
    category: p.category,
    description: p.description ?? "",
    price: String(p.price),
    unit: p.unit ?? "",
    imageType: p.image_type,
    imageUrl: p.image_url ?? "",
    badge: p.badge ?? "",
    badgeColor: p.badge_color ?? "",
    subscriptionAvailable: p.subscription_available,
    volume: p.volume ?? "",
    ingredients: p.ingredients ?? "",
    howToUse: p.how_to_use ?? "",
    caution: p.caution ?? "",
    workingPoint: p.working_point ?? "",
    dailyAmount: p.daily_amount ?? "",
    recommendationLevel: p.recommendation_level ?? "",
    doctorComment: p.doctor_comment ?? "",
    status: p.status,
    sortOrder: String(p.sort_order),
  };
}

function toRequestBody(form: ProductForm) {
  return {
    name: form.name,
    productCode: form.productCode || null,
    category: form.category,
    description: form.description,
    price: Number(form.price),
    unit: form.unit,
    imageType: form.imageType,
    imageUrl: form.imageUrl || null,
    badge: form.badge,
    badgeColor: form.badgeColor || null,
    subscriptionAvailable: form.subscriptionAvailable,
    volume: form.volume,
    ingredients: form.ingredients,
    howToUse: form.howToUse,
    caution: form.caution,
    workingPoint: form.workingPoint,
    dailyAmount: form.dailyAmount,
    recommendationLevel: form.recommendationLevel || null,
    doctorComment: form.doctorComment,
    status: form.status,
    sortOrder: form.sortOrder,
  };
}

const inputClass =
  "w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400";
const labelClass = "text-xs font-semibold text-slate-500 mb-1 block";

export default function ProductsMasterPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast, showToast } = useToast();

  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchProducts = () => {
    fetch("/api/bgj/products")
      .then((res) => {
        if (!res.ok) throw new Error("商品マスタの取得に失敗しました");
        return res.json();
      })
      .then((data) => {
        setProducts(data.products ?? []);
        setError(null);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "エラーが発生しました");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchProducts(); }, []);

  const openNew = () => {
    setEditItem(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (product: Product) => {
    setEditItem(product);
    setForm(toForm(product));
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.price.trim()) {
      showToast("商品名と基準価格を入力してください");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(editItem ? `/api/bgj/products/${editItem.id}` : "/api/bgj/products", {
        method: editItem ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toRequestBody(form)),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "保存に失敗しました");
      }
      showToast(editItem ? "商品を更新しました" : "商品を追加しました");
      setShowModal(false);
      fetchProducts();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/bgj/products/upload-image", { method: "POST", body: fd });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "画像のアップロードに失敗しました");
      }
      const data = await res.json();
      setForm((f) => ({ ...f, imageUrl: data.url }));
      showToast("画像をアップロードしました。反映するには下部の「更新する/追加」を押して保存してください");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/bgj/products/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "削除に失敗しました");
      }
      setDeleteId(null);
      showToast("商品を削除しました");
      fetchProducts();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "エラーが発生しました");
    }
  };

  return (
    <div className="p-4 sm:p-6">
      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-violet-600 text-white text-base px-5 py-3 rounded-2xl shadow-xl">{toast}</div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-y-3 mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-800">商品マスタ</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            患者様ポータル「おすすめ商品」に掲載する商品を管理します（「公開」のみ掲載。医院ごとの表示有無は各医院ポータルの商品管理で設定）
          </p>
        </div>
        <Button theme="violet" size="sm" className="shadow-sm" onClick={openNew}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          商品を追加
        </Button>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>
      )}

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500">画像</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500">商品名</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500">カテゴリ</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500">基準価格</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500">バッジ</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500">定期購入</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500">ステータス</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500">表示順</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500"></th>
              </tr>
            </thead>
            <tbody>
              {loading && <LoadingState variant="table-row" colSpan={9} />}
              {!loading && products.length === 0 && (
                <tr><td colSpan={9} className="px-5 py-8 text-center text-slate-400">商品がまだ登録されていません</td></tr>
              )}
              {products.map((p) => (
                <tr key={p.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                  <td className="px-5 py-3">
                    <ProductVisual type={p.image_type} imageUrl={p.image_url} className="w-10 h-10 rounded-lg flex items-center justify-center" />
                  </td>
                  <td className="px-5 py-3 text-slate-800 font-semibold">{p.name}</td>
                  <td className="px-5 py-3 text-slate-600">{p.category}</td>
                  <td className="px-5 py-3 text-right text-slate-800">¥{p.price.toLocaleString()}</td>
                  <td className="px-5 py-3">
                    {p.badge && p.badge_color ? (
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${PRODUCT_BADGE_CLASS[p.badge_color]}`}>{p.badge}</span>
                    ) : (
                      <span className="text-slate-300 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-slate-600 text-xs">{p.subscription_available ? "対応" : "—"}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      p.status === "公開" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                    }`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right text-slate-500">{p.sort_order}</td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center gap-2 justify-end">
                      <button onClick={() => openEdit(p)} className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors">編集</button>
                      <button onClick={() => setDeleteId(p.id)} className="text-xs text-red-600 hover:text-red-800 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors">削除</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-slate-800 mb-5">{editItem ? "商品を編集" : "商品を追加"}</h2>

            <p className="text-xs font-bold text-violet-600 tracking-wider mb-2">基本情報</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
              <div className="sm:col-span-2">
                <label className={labelClass}>商品名（必須）</label>
                <input type="text" placeholder="例）オーラルプロバイオティクス 30日分" value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>商品コード（任意・重複不可）</label>
                <input type="text" placeholder="例）BG-0001" value={form.productCode}
                  onChange={(e) => setForm({ ...form, productCode: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>カテゴリ</label>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={inputClass}>
                  {PRODUCT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>画像タイプ（画像未アップロード時のプレースホルダー）</label>
                <select value={form.imageType} onChange={(e) => setForm({ ...form, imageType: e.target.value })} className={inputClass}>
                  {PRODUCT_IMAGE_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>商品画像（jpeg/png/webp/gif、5MBまで）</label>
                <div className="flex items-center gap-3">
                  <ProductVisual type={form.imageType} imageUrl={form.imageUrl || null} className="w-16 h-16 rounded-lg flex items-center justify-center shrink-0" />
                  <div className="flex-1">
                    <input
                      type="file"
                      data-testid="product-image-file-input"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      disabled={uploading}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload(file);
                        e.target.value = "";
                      }}
                      className="block w-full text-sm text-slate-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100"
                    />
                    {uploading && <p className="text-xs text-slate-400 mt-1">アップロード中...</p>}
                    {form.imageUrl && !uploading && (
                      <button type="button" onClick={() => setForm({ ...form, imageUrl: "" })} className="text-xs text-red-600 hover:text-red-800 mt-1">
                        画像を削除
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <div>
                <label className={labelClass}>基準価格（税込・円、必須）</label>
                <input type="number" placeholder="例）3980" value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>単位（例：本・個・セット）</label>
                <input type="text" value={form.unit}
                  onChange={(e) => setForm({ ...form, unit: e.target.value })} className={inputClass} />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>説明文（一覧カード）</label>
                <textarea rows={2} value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })} className={`${inputClass} resize-none`} />
              </div>
              <div>
                <label className={labelClass}>バッジ（例：歯科医推奨。空欄=なし）</label>
                <input type="text" value={form.badge}
                  onChange={(e) => setForm({ ...form, badge: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>バッジ色</label>
                <div className="flex items-center gap-2">
                  <select value={form.badgeColor} onChange={(e) => setForm({ ...form, badgeColor: e.target.value })} className={inputClass}>
                    <option value="">（未設定）</option>
                    {PRODUCT_BADGE_COLOR_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  {form.badge && form.badgeColor && (
                    <span className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${PRODUCT_BADGE_CLASS[form.badgeColor as keyof typeof PRODUCT_BADGE_CLASS]}`}>
                      {form.badge}
                    </span>
                  )}
                </div>
              </div>
              <div>
                <label className={labelClass}>ステータス</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={inputClass}>
                  <option value="下書き">下書き</option>
                  <option value="公開">公開</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>表示順（小さいほど先頭）</label>
                <input type="number" value={form.sortOrder}
                  onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} className={inputClass} />
              </div>
              <label className="sm:col-span-2 flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={form.subscriptionAvailable}
                  onChange={(e) => setForm({ ...form, subscriptionAvailable: e.target.checked })}
                  className="w-4 h-4 accent-violet-600" />
                定期購入対応
              </label>
            </div>

            <p className="text-xs font-bold text-violet-600 tracking-wider mb-2">詳細ページ項目（未入力のセクションは非表示）</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
              <div>
                <label className={labelClass}>内容量</label>
                <input type="text" value={form.volume}
                  onChange={(e) => setForm({ ...form, volume: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>成分</label>
                <input type="text" value={form.ingredients}
                  onChange={(e) => setForm({ ...form, ingredients: e.target.value })} className={inputClass} />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>使用方法</label>
                <textarea rows={2} value={form.howToUse}
                  onChange={(e) => setForm({ ...form, howToUse: e.target.value })} className={`${inputClass} resize-none`} />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>注意事項</label>
                <textarea rows={2} value={form.caution}
                  onChange={(e) => setForm({ ...form, caution: e.target.value })} className={`${inputClass} resize-none`} />
              </div>
            </div>

            <p className="text-xs font-bold text-violet-600 tracking-wider mb-2">先生のおすすめ（全医院共通）</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>主な働き</label>
                <input type="text" value={form.workingPoint}
                  onChange={(e) => setForm({ ...form, workingPoint: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>1日の目安</label>
                <input type="text" value={form.dailyAmount}
                  onChange={(e) => setForm({ ...form, dailyAmount: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>推奨度</label>
                <select value={form.recommendationLevel} onChange={(e) => setForm({ ...form, recommendationLevel: e.target.value })} className={inputClass}>
                  <option value="">（未設定）</option>
                  <option value="◎">◎（特におすすめ）</option>
                  <option value="○">○（おすすめ）</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>先生の一言コメント</label>
                <textarea rows={2} value={form.doctorComment}
                  onChange={(e) => setForm({ ...form, doctorComment: e.target.value })} className={`${inputClass} resize-none`} />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)}
                className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors">
                キャンセル
              </button>
              <Button theme="violet" size="sm" fullWidth onClick={handleSave} disabled={saving}>
                {saving ? "保存中..." : editItem ? "更新する" : "追加"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={deleteId !== null}
        theme="violet"
        title="削除しますか？"
        description="この操作は取り消せません。各医院の表示設定も削除され、患者様ポータルからも表示されなくなります。"
        onCancel={() => setDeleteId(null)}
        onConfirm={() => deleteId !== null && handleDelete(deleteId)}
      />
    </div>
  );
}
