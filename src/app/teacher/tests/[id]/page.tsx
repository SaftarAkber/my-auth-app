"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface Question {
  id: string;
  text: string;
  type: string;
  isActive: boolean;
}

interface Package {
  id: string;
  name: string;
  isPublished: boolean;
  isTimed: boolean;
  duration: number | null;
  startsAt: string | null;
  endsAt: string | null;
  _count: { questions: number; attempts: number };
  questions?: Question[];
}

interface Collection {
  id: string;
  name: string;
  packages: Package[];
}

export default function CollectionDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [collection, setCollection] = useState<Collection | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPkgForm, setShowPkgForm] = useState(false);
  const [editPkg, setEditPkg] = useState<Package | null>(null);
  const [pkgForm, setPkgForm] = useState({
    name: "", description: "", isTimed: false,
    duration: "", startsAt: "", endsAt: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchCollection(); }, [id]);

  async function fetchCollection() {
    const res = await fetch(`/api/collections/${id}`);
    const data = await res.json();
    setCollection(data.collection);
    setLoading(false);
  }

  function openAddPkg() {
    setEditPkg(null);
    setPkgForm({ name: "", description: "", isTimed: false, duration: "", startsAt: "", endsAt: "" });
    setShowPkgForm(true);
  }

  function openEditPkg(p: Package) {
    setEditPkg(p);
    setPkgForm({
      name: p.name,
      description: "",
      isTimed: p.isTimed,
      duration: p.duration ? String(Math.floor(p.duration / 60)) : "",
      startsAt: p.startsAt ? new Date(p.startsAt).toISOString().slice(0, 16) : "",
      endsAt: p.endsAt ? new Date(p.endsAt).toISOString().slice(0, 16) : "",
    });
    setShowPkgForm(true);
  }

  async function handleSavePkg(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const body = {
        name: pkgForm.name,
        description: pkgForm.description,
        collectionId: id,
        isTimed: pkgForm.isTimed,
        duration: pkgForm.isTimed && pkgForm.duration ? parseInt(pkgForm.duration) * 60 : null,
        startsAt: pkgForm.startsAt || null,
        endsAt: pkgForm.endsAt || null,
      };

      if (editPkg) {
        await fetch(`/api/packages/${editPkg.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } else {
        await fetch("/api/packages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      }
      setShowPkgForm(false);
      await fetchCollection();
    } finally {
      setSaving(false);
    }
  }

  async function togglePublish(p: Package) {
    await fetch(`/api/packages/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPublished: !p.isPublished }),
    });
    await fetchCollection();
  }

  async function handleDeletePkg(id: string) {
    if (!confirm("Bu paketi silmek istediğinizden emin misiniz?")) return;
    await fetch(`/api/packages/${id}`, { method: "DELETE" });
    await fetchCollection();
  }

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="flex gap-2">
        {[0,1,2].map(i => <div key={i} className="w-3 h-3 bg-blue-900 rounded-full animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />)}
      </div>
    </div>
  );

  if (!collection) return <div className="text-center py-20 text-gray-400">Koleksiyon bulunamadı</div>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <Link href="/teacher/tests" className="text-gray-400 hover:text-gray-600 text-sm">← Testler</Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-2xl font-bold text-gray-900">{collection.name}</h1>
      </div>

      <div className="flex justify-end mb-5">
        <button onClick={openAddPkg}
          className="bg-blue-900 hover:bg-blue-800 text-white font-medium px-5 py-2.5 rounded-xl text-sm transition-all">
          + Paket Ekle
        </button>
      </div>

      {/* Paket formu modal */}
      {showPkgForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-gray-900 mb-5">
              {editPkg ? "Paketi Düzenle" : "Yeni Paket"}
            </h2>
            <form onSubmit={handleSavePkg} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Paket Adı</label>
                <input type="text" value={pkgForm.name}
                  onChange={e => setPkgForm(f => ({...f, name: e.target.value}))}
                  required className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900/30 focus:border-blue-900" />
              </div>

              <div className="flex items-center gap-3">
                <input type="checkbox" id="isTimed" checked={pkgForm.isTimed}
                  onChange={e => setPkgForm(f => ({...f, isTimed: e.target.checked}))}
                  className="w-4 h-4 rounded" />
                <label htmlFor="isTimed" className="text-sm font-medium text-gray-700">Süreli test</label>
              </div>

              {pkgForm.isTimed && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Süre (dakika)</label>
                  <input type="number" min="1" value={pkgForm.duration}
                    onChange={e => setPkgForm(f => ({...f, duration: e.target.value}))}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900/30 focus:border-blue-900" />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Başlangıç (isteğe bağlı)</label>
                  <input type="datetime-local" value={pkgForm.startsAt}
                    onChange={e => setPkgForm(f => ({...f, startsAt: e.target.value}))}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900/30 focus:border-blue-900" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bitiş (isteğe bağlı)</label>
                  <input type="datetime-local" value={pkgForm.endsAt}
                    onChange={e => setPkgForm(f => ({...f, endsAt: e.target.value}))}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900/30 focus:border-blue-900" />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowPkgForm(false)}
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

      {/* Paket listesi */}
      {collection.packages.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 border border-gray-200 text-center text-gray-400">
          <div className="text-4xl mb-3">📝</div>
          <p>Bu koleksiyonda henüz paket yok</p>
        </div>
      ) : (
        <div className="space-y-4">
          {collection.packages.map(p => (
            <div key={p.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-bold text-gray-900">{p.name}</h3>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      p.isPublished ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                    }`}>
                      {p.isPublished ? "Yayında" : "Taslak"}
                    </span>
                    {p.isTimed && p.duration && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                        ⏱ {Math.floor(p.duration / 60)} dk
                      </span>
                    )}
                  </div>
                  <div className="flex gap-4 text-xs text-gray-500">
                    <span>{p._count.questions} soru</span>
                    <span>{p._count.attempts} çözüm</span>
                    {p.startsAt && <span>📅 {new Date(p.startsAt).toLocaleDateString("tr-TR")}</span>}
                    {p.endsAt && <span>→ {new Date(p.endsAt).toLocaleDateString("tr-TR")}</span>}
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => togglePublish(p)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                      p.isPublished
                        ? "bg-yellow-50 hover:bg-yellow-100 text-yellow-700"
                        : "bg-green-50 hover:bg-green-100 text-green-700"
                    }`}>
                    {p.isPublished ? "Yayından Kaldır" : "Yayınla"}
                  </button>
                  <button onClick={() => openEditPkg(p)}
                    className="px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl text-xs font-medium transition-all">
                    Düzenle
                  </button>
                  <Link href={`/teacher/tests/${id}/${p.id}`}
                    className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-medium transition-all">
                    Sorular →
                  </Link>
                  <button onClick={() => handleDeletePkg(p.id)}
                    className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-xs font-medium transition-all">
                    Sil
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}