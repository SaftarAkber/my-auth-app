"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface TestPackage {
  id: string;
  name: string;
  description: string | null;
  isPublished: boolean;
  visibility: "PUBLIC" | "GROUP_ONLY";
  groupId: string | null;
  group: { id: string; name: string } | null;
  _count: { questions: number; attempts: number };
}

interface Group {
  id: string;
  name: string;
}

export default function CollectionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [collection, setCollection] = useState<{ id: string; name: string } | null>(null);
  const [packages, setPackages] = useState<TestPackage[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editPkg, setEditPkg] = useState<TestPackage | null>(null);
  const [pkgForm, setPkgForm] = useState({ name: "", description: "", visibility: "PUBLIC", groupId: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchData(); }, [id]);

  async function fetchData() {
    const [collRes, groupsRes] = await Promise.all([
      fetch(`/api/collections/${id}`),
      fetch("/api/groups"),
    ]);
    const collData = await collRes.json();
    const groupsData = await groupsRes.json();

    setCollection({ id: collData.collection.id, name: collData.collection.name });
    setPackages(collData.collection.packages || []);
    setGroups(groupsData.groups || []);
    setLoading(false);
  }

  function openAdd() {
    setEditPkg(null);
    setPkgForm({ name: "", description: "", visibility: "PUBLIC", groupId: "" });
    setShowForm(true);
  }

  function openEdit(pkg: TestPackage) {
    setEditPkg(pkg);
    setPkgForm({
      name: pkg.name,
      description: pkg.description || "",
      visibility: pkg.visibility,
      groupId: pkg.groupId || "",
    });
    setShowForm(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editPkg) {
        await fetch(`/api/packages/${editPkg.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(pkgForm),
        });
      } else {
        await fetch("/api/packages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...pkgForm, collectionId: id }),
        });
      }
      setShowForm(false);
      await fetchData();
    } finally {
      setSaving(false);
    }
  }

  async function togglePublish(pkg: TestPackage) {
    await fetch(`/api/packages/${pkg.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPublished: !pkg.isPublished }),
    });
    await fetchData();
  }

  async function handleDelete(pkgId: string) {
    if (!confirm("Bu paketi silmək istədiyinizdən əminsiniz?")) return;
    await fetch(`/api/packages/${pkgId}`, { method: "DELETE" });
    await fetchData();
  }

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="flex gap-2">
        {[0,1,2].map(i => (
          <div key={i} className="w-3 h-3 bg-blue-900 rounded-full animate-bounce"
            style={{ animationDelay: `${i*0.15}s` }} />
        ))}
      </div>
    </div>
  );

  if (!collection) return <div className="text-center py-20 text-gray-400">Kolleksiya tapılmadı</div>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/teacher/tests" className="text-gray-400 hover:text-gray-600 text-sm">← Testlər</Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-2xl font-bold text-gray-900">{collection.name}</h1>
      </div>

      <div className="flex justify-end mb-6">
        <button onClick={openAdd}
          className="bg-blue-900 hover:bg-blue-800 text-white font-medium px-5 py-2.5 rounded-xl text-sm transition-all">
          + Paket əlavə et
        </button>
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-lg font-bold text-gray-900 mb-5">
              {editPkg ? "Paketi düzənlə" : "Yeni paket"}
            </h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Paket adı</label>
                <input type="text" value={pkgForm.name}
                  onChange={e => setPkgForm(f => ({ ...f, name: e.target.value }))} required
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900/30" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Açıqlama</label>
                <textarea value={pkgForm.description}
                  onChange={e => setPkgForm(f => ({ ...f, description: e.target.value }))}
                  rows={2}
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900/30 resize-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Görünürlük</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="visibility" value="PUBLIC"
                      checked={pkgForm.visibility === "PUBLIC"}
                      onChange={e => setPkgForm(f => ({ ...f, visibility: e.target.value as any, groupId: "" }))}
                      className="w-4 h-4" />
                    <span className="text-sm text-gray-700">Herkese açıq</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="visibility" value="GROUP_ONLY"
                      checked={pkgForm.visibility === "GROUP_ONLY"}
                      onChange={e => setPkgForm(f => ({ ...f, visibility: e.target.value as any }))}
                      className="w-4 h-4" />
                    <span className="text-sm text-gray-700">Qrupa xas</span>
                  </label>
                </div>
              </div>
              {pkgForm.visibility === "GROUP_ONLY" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Qrup seçin</label>
                  <select value={pkgForm.groupId}
                    onChange={e => setPkgForm(f => ({ ...f, groupId: e.target.value }))} required
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900/30">
                    <option value="">Qrup seçin</option>
                    {groups.map(g => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 border border-gray-300 text-gray-600 font-medium py-2.5 rounded-xl text-sm hover:bg-gray-50">
                  Ləğv et
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 bg-blue-900 hover:bg-blue-800 disabled:bg-blue-900/50 text-white font-medium py-2.5 rounded-xl text-sm">
                  {saving ? "Saxlanılır..." : "Saxla"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {packages.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 border border-gray-200 text-center text-gray-400">
          <div className="text-4xl mb-3">📝</div>
          <p>Hələ paket yoxdur</p>
        </div>
      ) : (
        <div className="space-y-3">
          {packages.map(pkg => (
            <div key={pkg.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <h3 className="font-semibold text-gray-900">{pkg.name}</h3>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                    pkg.visibility === "PUBLIC" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                  }`}>
                    {pkg.visibility === "PUBLIC" ? "🌍 Herkese açıq" : `🏫 ${pkg.group?.name || "Qrup"}`}
                  </span>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                    pkg.isPublished ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                  }`}>
                    {pkg.isPublished ? "Yayımda" : "Qaralama"}
                  </span>
                </div>
                <div className="flex gap-3 mt-1 text-xs text-gray-500">
                  <span>{pkg._count.questions} sual</span>
                  <span>{pkg._count.attempts} həll</span>
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Link href={`/teacher/tests/${id}/${pkg.id}`}
                  className="bg-blue-50 hover:bg-blue-100 text-blue-900 font-medium px-4 py-2 rounded-xl text-sm transition-all">
                  Suallar →
                </Link>
                <button onClick={() => openEdit(pkg)}
                  className="px-3 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl text-sm transition-all">
                  ✏️
                </button>
                <button onClick={() => togglePublish(pkg)}
                  className={`px-3 py-2 rounded-xl text-sm transition-all ${
                    pkg.isPublished
                      ? "bg-yellow-50 hover:bg-yellow-100 text-yellow-700"
                      : "bg-green-50 hover:bg-green-100 text-green-700"
                  }`}>
                  {pkg.isPublished ? "Geri çək" : "Yayımla"}
                </button>
                <button onClick={() => handleDelete(pkg.id)}
                  className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-sm transition-all">
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}