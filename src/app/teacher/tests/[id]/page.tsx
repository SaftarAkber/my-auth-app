"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface TestPackageGroup {
  groupId: string;
  group: { id: string; name: string };
}

interface TestPackage {
  id: string;
  name: string;
  description: string | null;
  isPublished: boolean;
  isPublic: boolean;
  isTimed: boolean;
  duration: number | null;
  startsAt: string | null;
  endsAt: string | null;
  allowRetry: boolean;
  visibility: "PUBLIC" | "GROUP_ONLY";
  groupId: string | null;
  group: { id: string; name: string } | null;
  testPackageGroups: TestPackageGroup[];
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
  const [pkgForm, setPkgForm] = useState({
    name: "",
    description: "",
    isPublic: false,
    selectedGroupIds: [] as string[],
    isTimed: false,
    durationMin: "",
    startsAt: "",
    endsAt: "",
    allowRetry: false,
  });
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
    setPkgForm({
      name: "", description: "", isPublic: false,
      selectedGroupIds: [], isTimed: false, durationMin: "",
      startsAt: "", endsAt: "", allowRetry: false,
    });
    setShowForm(true);
  }

  function openEdit(pkg: TestPackage) {
    setEditPkg(pkg);
    setPkgForm({
      name: pkg.name,
      description: pkg.description || "",
      isPublic: pkg.isPublic,
      selectedGroupIds: pkg.testPackageGroups?.map(tpg => tpg.groupId) ?? (pkg.groupId ? [pkg.groupId] : []),
      isTimed: pkg.isTimed,
      durationMin: pkg.duration ? String(Math.floor(pkg.duration / 60)) : "",
      startsAt: pkg.startsAt ? new Date(pkg.startsAt).toISOString().slice(0, 16) : "",
      endsAt: pkg.endsAt ? new Date(pkg.endsAt).toISOString().slice(0, 16) : "",
      allowRetry: pkg.allowRetry,
    });
    setShowForm(true);
  }

  function toggleGroup(groupId: string) {
    setPkgForm(f => ({
      ...f,
      selectedGroupIds: f.selectedGroupIds.includes(groupId)
        ? f.selectedGroupIds.filter(id => id !== groupId)
        : [...f.selectedGroupIds, groupId],
    }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const body = {
        name: pkgForm.name,
        description: pkgForm.description || null,
        isPublic: pkgForm.isPublic,
        groupIds: pkgForm.selectedGroupIds,
        visibility: pkgForm.selectedGroupIds.length > 0 ? "GROUP_ONLY" : "PUBLIC",
        isTimed: pkgForm.isTimed,
        duration: pkgForm.isTimed && pkgForm.durationMin ? parseInt(pkgForm.durationMin) * 60 : null,
        startsAt: pkgForm.startsAt || null,
        endsAt: pkgForm.endsAt || null,
        allowRetry: pkgForm.allowRetry,
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
          body: JSON.stringify({ ...body, collectionId: id }),
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
        {[0, 1, 2].map(i => (
          <div key={i} className="w-3 h-3 bg-blue-900 rounded-full animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }} />
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
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl my-4">
            <h2 className="text-lg font-bold text-gray-900 mb-5">
              {editPkg ? "Paketi düzənlə" : "Yeni paket"}
            </h2>
            <form onSubmit={handleSave} className="space-y-5">
              {/* Ad */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Paket adı</label>
                <input type="text" value={pkgForm.name}
                  onChange={e => setPkgForm(f => ({ ...f, name: e.target.value }))} required
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900/30" />
              </div>

              {/* Açıqlama */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Açıqlama</label>
                <textarea value={pkgForm.description}
                  onChange={e => setPkgForm(f => ({ ...f, description: e.target.value }))}
                  rows={2}
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900/30 resize-none" />
              </div>

              {/* ═══ GÖRÜNÜRLÜk ═══ */}
              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 space-y-4">
                <p className="text-sm font-semibold text-blue-900">🔍 Görünürlük Ayarları</p>

                {/* Herkese açıq toggle */}
                <label className="flex items-center gap-3 cursor-pointer">
                  <div
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${pkgForm.isPublic ? "bg-green-500" : "bg-gray-300"}`}
                    onClick={() => setPkgForm(f => ({ ...f, isPublic: !f.isPublic }))}>
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${pkgForm.isPublic ? "translate-x-6" : "translate-x-1"}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">🌍 Herkese açıq (Profildə görünsün)</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {pkgForm.isPublic
                        ? "Bu paket müəllimin profilini görən hər kəsə görünür"
                        : "Bu paket yalnız qrup üzvlərinə görünür"}
                    </p>
                  </div>
                </label>

                {/* Qrup seçimi — çox seçim */}
                {groups.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      🏫 Qruplara əlavə et
                      <span className="text-xs text-gray-400 ml-2">(bir neçə seçilə bilər)</span>
                    </p>
                    <div className="space-y-2">
                      {groups.map(g => (
                        <label key={g.id} className="flex items-center gap-3 cursor-pointer p-2.5 rounded-xl hover:bg-blue-100/50 transition-all">
                          <div
                            className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                              pkgForm.selectedGroupIds.includes(g.id)
                                ? "border-blue-900 bg-blue-900"
                                : "border-gray-300 bg-white"
                            }`}
                            onClick={() => toggleGroup(g.id)}>
                            {pkgForm.selectedGroupIds.includes(g.id) && (
                              <span className="text-white text-xs">✓</span>
                            )}
                          </div>
                          <span className="text-sm text-gray-700">{g.name}</span>
                        </label>
                      ))}
                    </div>
                    {pkgForm.selectedGroupIds.length > 0 && (
                      <p className="text-xs text-blue-700 mt-2">
                        ✓ {pkgForm.selectedGroupIds.length} qrup seçilib
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Zamanlayıcı */}
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-4">
                <p className="text-sm font-semibold text-gray-700">⏱ Zamanlayıcı Ayarları</p>

                <label className="flex items-center gap-3 cursor-pointer">
                  <div
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${pkgForm.isTimed ? "bg-blue-900" : "bg-gray-300"}`}
                    onClick={() => setPkgForm(f => ({ ...f, isTimed: !f.isTimed }))}>
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${pkgForm.isTimed ? "translate-x-6" : "translate-x-1"}`} />
                  </div>
                  <span className="text-sm font-medium text-gray-700">Geri sayım aktiv</span>
                </label>

                {pkgForm.isTimed && (
                  <input type="number" value={pkgForm.durationMin}
                    onChange={e => setPkgForm(f => ({ ...f, durationMin: e.target.value }))}
                    placeholder="Dəqiqə sayı (məs: 30)"
                    min={1} max={300}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900/30" />
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Başlama tarixi</label>
                    <input type="datetime-local" value={pkgForm.startsAt}
                      onChange={e => setPkgForm(f => ({ ...f, startsAt: e.target.value }))}
                      className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900/30" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Bitmə tarixi</label>
                    <input type="datetime-local" value={pkgForm.endsAt}
                      onChange={e => setPkgForm(f => ({ ...f, endsAt: e.target.value }))}
                      className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900/30" />
                  </div>
                </div>
              </div>

              {/* Yenidən həlletmə */}
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <div
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${pkgForm.allowRetry ? "bg-green-500" : "bg-gray-300"}`}
                    onClick={() => setPkgForm(f => ({ ...f, allowRetry: !f.allowRetry }))}>
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${pkgForm.allowRetry ? "translate-x-6" : "translate-x-1"}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">🔄 Yenidən həll etməyə icazə ver</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {pkgForm.allowRetry
                        ? "Tələbə testi istənilən vaxt yenidən həll edə bilər"
                        : "Tələbə yenidən həll etmək üçün müraciət göndərməlidir"}
                    </p>
                  </div>
                </label>
              </div>

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
          {packages.map(pkg => {
            const now = new Date();
            const isActive = (!pkg.startsAt || new Date(pkg.startsAt) <= now) && (!pkg.endsAt || new Date(pkg.endsAt) >= now);
            const assignedGroups = pkg.testPackageGroups?.map(tpg => tpg.group) ?? [];

            return (
              <div key={pkg.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-gray-900">{pkg.name}</h3>
                      {/* Herkese açıq badge */}
                      {pkg.isPublic && (
                        <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-green-100 text-green-700">
                          🌍 Herkese açıq
                        </span>
                      )}
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                        pkg.isPublished ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"
                      }`}>
                        {pkg.isPublished ? "✓ Yayımda" : "○ Qaralama"}
                      </span>
                    </div>

                    {/* Qruplar */}
                    {assignedGroups.length > 0 && (
                      <div className="flex gap-1.5 mt-2 flex-wrap">
                        {assignedGroups.map(g => (
                          <span key={g.id} className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full">
                            🏫 {g.name}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-3 mt-1.5 flex-wrap text-xs text-gray-500">
                      <span>{pkg._count.questions} sual</span>
                      <span>{pkg._count.attempts} cəhd</span>
                      {pkg.isTimed && pkg.duration && (
                        <span className="text-blue-700">⏱ {Math.floor(pkg.duration / 60)} dəq</span>
                      )}
                      {pkg.allowRetry && (
                        <span className="text-green-700">🔄 Yenidən həll açıq</span>
                      )}
                      {pkg.startsAt && (
                        <span>📅 {new Date(pkg.startsAt).toLocaleDateString("az-AZ")} →</span>
                      )}
                      {pkg.endsAt && (
                        <span className={!isActive && pkg.isPublished ? "text-red-500" : ""}>
                          {new Date(pkg.endsAt).toLocaleDateString("az-AZ")}
                          {!isActive && pkg.isPublished && " (Bitmişdir)"}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 flex-shrink-0">
                    <Link href={`/teacher/tests/${id}/${pkg.id}`}
                      className="bg-blue-50 hover:bg-blue-100 text-blue-900 font-medium px-4 py-2 rounded-xl text-sm transition-all">
                      Suallar →
                    </Link>
                    <button onClick={() => openEdit(pkg)}
                      className="px-3 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl text-sm transition-all">✏️</button>
                    <button onClick={() => togglePublish(pkg)}
                      className={`px-3 py-2 rounded-xl text-sm transition-all ${
                        pkg.isPublished ? "bg-yellow-50 hover:bg-yellow-100 text-yellow-700" : "bg-green-50 hover:bg-green-100 text-green-700"
                      }`}>
                      {pkg.isPublished ? "Geri çək" : "Yayımla"}
                    </button>
                    <button onClick={() => handleDelete(pkg.id)}
                      className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-sm transition-all">🗑️</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
