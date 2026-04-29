"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Collection {
  id: string;
  name: string;
  _count: { packages: number; videoPackages: number };
}

export default function TeacherTestsPage() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editCol, setEditCol] = useState<Collection | null>(null);
  const [form, setForm] = useState({ name: "", description: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchCollections(); }, []);

  async function fetchCollections() {
    const res = await fetch("/api/collections");
    const data = await res.json();
    setCollections(data.collections || []);
    setLoading(false);
  }

  function openAdd() {
    setEditCol(null);
    setForm({ name: "", description: "" });
    setShowForm(true);
  }

  function openEdit(c: Collection) {
    setEditCol(c);
    setForm({ name: c.name, description: "" });
    setShowForm(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editCol) {
        await fetch(`/api/collections/${editCol.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
      } else {
        await fetch("/api/collections", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
      }
      setShowForm(false);
      await fetchCollections();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Bu koleksiyonu ve içindeki tüm paketleri silmek istediğinizden emin misiniz?")) return;
    await fetch(`/api/collections/${id}`, { method: "DELETE" });
    await fetchCollections();
  }

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="flex gap-2">
        {[0,1,2].map(i => <div key={i} className="w-3 h-3 bg-blue-900 rounded-full animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />)}
      </div>
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Testlerim</h1>
        <button onClick={openAdd}
          className="bg-blue-900 hover:bg-blue-800 text-white font-medium px-5 py-2.5 rounded-xl text-sm transition-all">
          + Koleksiyon Ekle
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-lg font-bold text-gray-900 mb-5">
              {editCol ? "Koleksiyon Düzenle" : "Yeni Koleksiyon"}
            </h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Koleksiyon Adı</label>
                <input type="text" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))}
                  placeholder="örn: Matematik, Fizik..." required
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900/30 focus:border-blue-900" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Açıklama (isteğe bağlı)</label>
                <textarea value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))}
                  rows={2} className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900/30 focus:border-blue-900 resize-none" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 border border-gray-300 text-gray-600 font-medium py-2.5 rounded-xl text-sm hover:bg-gray-50">
                  İptal
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 bg-blue-900 hover:bg-blue-800 disabled:bg-blue-900/50 text-white font-medium py-2.5 rounded-xl text-sm">
                  {saving ? "Kaydediliyor..." : "Kaydet"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {collections.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 border border-gray-200 text-center text-gray-400">
          <div className="text-4xl mb-3">📚</div>
          <p>Henüz koleksiyon eklenmedi</p>
          <button onClick={openAdd} className="mt-4 text-blue-900 text-sm font-medium hover:underline">
            İlk koleksiyonu oluştur →
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {collections.map(c => (
            <div key={c.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-bold text-gray-900">{c.name}</h3>
                  <div className="flex gap-3 mt-1">
                    <span className="text-xs text-gray-500">{c._count.packages} paket</span>
                    <span className="text-xs text-gray-500">{c._count.videoPackages} video</span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(c)}
                    className="p-1.5 hover:bg-gray-100 rounded-lg transition-all text-gray-500 text-sm">✏️</button>
                  <button onClick={() => handleDelete(c.id)}
                    className="p-1.5 hover:bg-red-50 rounded-lg transition-all text-red-500 text-sm">🗑️</button>
                </div>
              </div>
              <Link href={`/teacher/tests/${c.id}`}
                className="w-full block text-center bg-blue-50 hover:bg-blue-100 text-blue-900 font-medium py-2 rounded-xl text-sm transition-all">
                Paketleri Yönet →
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}