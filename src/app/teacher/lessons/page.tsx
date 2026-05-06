"use client";

import { useEffect, useState } from "react";

interface Group {
  id: string;
  name: string;
}

interface VideoPackage {
  id: string;
  name: string;
  visibility: string;
  groupId: string | null;
  group: { id: string; name: string } | null;
  videos: Video[];
}

interface Video {
  id: string;
  title: string;
  description: string | null;
  url: string;
  isActive: boolean;
  order: number;
  packageId: string | null;
}

export default function TeacherLessonsPage() {
  const [packages, setPackages] = useState<VideoPackage[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showPkgForm, setShowPkgForm] = useState(false);
  const [editVideo, setEditVideo] = useState<Video | null>(null);
  const [activePackage, setActivePackage] = useState<string | null>(null);
  const [watchVideo, setWatchVideo] = useState<Video | null>(null);

  const [form, setForm] = useState<{
    title: string; description: string; url: string; packageId: string;
  }>({ title: "", description: "", url: "", packageId: "" });

  const [pkgForm, setPkgForm] = useState<{
    name: string; description: string; groupId: string; visibility: string;
  }>({ name: "", description: "", groupId: "", visibility: "PUBLIC" });

  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    const [pkgRes, grpRes] = await Promise.all([
      fetch("/api/video-packages"),
      fetch("/api/groups"),
    ]);
    const pkgData = await pkgRes.json();
    const grpData = await grpRes.json();
    setPackages(pkgData.packages || []);
    setGroups(grpData.groups || []);
    setLoading(false);
  }

  function openAdd(packageId?: string) {
    setEditVideo(null);
    setForm({ title: "", description: "", url: "", packageId: packageId || "" });
    setShowForm(true);
  }

  function openEdit(v: Video) {
    setEditVideo(v);
    setForm({
      title: v.title || "",
      description: v.description || "",
      url: v.url || "",
      packageId: v.packageId || "",
    });
    setShowForm(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.url) return;
    setSaving(true);
    try {
      if (editVideo) {
        await fetch(`/api/videos/${editVideo.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: form.title, description: form.description,
            url: form.url, packageId: form.packageId || null,
          }),
        });
      } else {
        await fetch("/api/videos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: form.title, description: form.description,
            url: form.url, packageId: form.packageId || null,
          }),
        });
      }
      setShowForm(false);
      await fetchData();
    } finally {
      setSaving(false);
    }
  }

  async function handleCreatePkg(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await fetch("/api/video-packages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: pkgForm.name,
          description: pkgForm.description || null,
          groupId: pkgForm.groupId || null,
          visibility: pkgForm.visibility,
        }),
      });
      setPkgForm({ name: "", description: "", groupId: "", visibility: "PUBLIC" });
      setShowPkgForm(false);
      await fetchData();
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdatePkgVisibility(pkgId: string, groupId: string | null, visibility: string) {
    await fetch(`/api/video-packages/${pkgId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupId: groupId || null, visibility }),
    });
    await fetchData();
  }

  async function handleDelete(id: string) {
    if (!confirm("Bu videoyu silmək istədiyinizdən əminsiniz?")) return;
    await fetch(`/api/videos/${id}`, { method: "DELETE" });
    await fetchData();
  }

  function getYoutubeEmbed(url: string) {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
    return match ? `https://www.youtube.com/embed/${match[1]}?autoplay=1` : null;
  }

  function getYoutubeThumb(url: string) {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
    return match ? `https://img.youtube.com/vi/${match[1]}/mqdefault.jpg` : null;
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
        <h1 className="text-2xl font-bold text-gray-900">Dərs Videolarım</h1>
        <div className="flex gap-2">
          <button onClick={() => setShowPkgForm(true)}
            className="border border-blue-900 text-blue-900 hover:bg-blue-50 font-medium px-4 py-2.5 rounded-xl text-sm transition-all">
            + Paket əlavə et
          </button>
          <button onClick={() => openAdd()}
            className="bg-blue-900 hover:bg-blue-800 text-white font-medium px-4 py-2.5 rounded-xl text-sm transition-all">
            + Video əlavə et
          </button>
        </div>
      </div>

      {/* Video izleme modal */}
      {watchVideo && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col" onClick={() => setWatchVideo(null)}>
          <div className="flex items-center justify-between px-6 py-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-white font-semibold">{watchVideo.title}</h3>
            <button onClick={() => setWatchVideo(null)} className="text-white text-2xl hover:text-gray-300">✕</button>
          </div>
          <div className="flex-1" onClick={e => e.stopPropagation()}>
            <iframe src={getYoutubeEmbed(watchVideo.url) || ""} className="w-full h-full" allowFullScreen allow="autoplay; fullscreen" />
          </div>
        </div>
      )}

      {/* Paket oluşturma modal */}
      {showPkgForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-lg font-bold text-gray-900 mb-5">Yeni video paketi</h2>
            <form onSubmit={handleCreatePkg} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Paket adı</label>
                <input type="text" value={pkgForm.name}
                  onChange={e => setPkgForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="məs: Fizika 9. sinif" required
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900/30" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Açıqlama</label>
                <textarea value={pkgForm.description}
                  onChange={e => setPkgForm(f => ({ ...f, description: e.target.value }))}
                  rows={2}
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900/30 resize-none" />
              </div>
              {/* Görünürlük */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Kimə görünsün?</label>
                <div className="flex gap-3">
                  <button type="button"
                    onClick={() => setPkgForm(f => ({ ...f, visibility: "PUBLIC", groupId: "" }))}
                    className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                      pkgForm.visibility === "PUBLIC" ? "border-blue-900 bg-blue-50 text-blue-900" : "border-gray-200 text-gray-600"
                    }`}>
                    🌍 Herkese açıq
                  </button>
                  <button type="button"
                    onClick={() => setPkgForm(f => ({ ...f, visibility: "GROUP_ONLY" }))}
                    className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                      pkgForm.visibility === "GROUP_ONLY" ? "border-blue-900 bg-blue-50 text-blue-900" : "border-gray-200 text-gray-600"
                    }`}>
                    🏫 Qrupa xas
                  </button>
                </div>
              </div>
              {/* Grup seçimi */}
              {pkgForm.visibility === "GROUP_ONLY" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Qrup seç</label>
                  <select value={pkgForm.groupId}
                    onChange={e => setPkgForm(f => ({ ...f, groupId: e.target.value }))}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900/30">
                    <option value="">Qrup seçin</option>
                    {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                </div>
              )}
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowPkgForm(false)}
                  className="flex-1 border border-gray-300 text-gray-600 font-medium py-2.5 rounded-xl text-sm">
                  Ləğv et
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 bg-blue-900 text-white font-medium py-2.5 rounded-xl text-sm">
                  {saving ? "Saxlanılır..." : "Saxla"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Video ekleme/düzenleme modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl">
            <h2 className="text-lg font-bold text-gray-900 mb-5">
              {editVideo ? "Videoyu düzənlə" : "Yeni video əlavə et"}
            </h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Başlıq</label>
                <input type="text" value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900/30" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">YouTube URL</label>
                <input type="url" value={form.url}
                  onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
                  placeholder="https://youtube.com/watch?v=..." required
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900/30" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Açıqlama</label>
                <textarea value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={2}
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900/30 resize-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Paket</label>
                <select value={form.packageId}
                  onChange={e => setForm(f => ({ ...f, packageId: e.target.value }))}
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900/30">
                  <option value="">Paketsiz</option>
                  {packages.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
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

      {/* Paketler */}
      {packages.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 border border-gray-200 text-center text-gray-400">
          <div className="text-4xl mb-3">🎬</div>
          <p>Hələ video paketi yoxdur</p>
          <button onClick={() => setShowPkgForm(true)}
            className="mt-4 text-blue-900 text-sm font-medium hover:underline">
            İlk paketi yarat →
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {packages.map(pkg => (
            <div key={pkg.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <div>
                  <h2 className="font-bold text-gray-900">{pkg.name}</h2>
                  <div className="flex gap-2 mt-1 items-center">
                    <p className="text-xs text-gray-500">{pkg.videos.length} video</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      pkg.visibility === "PUBLIC" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                    }`}>
                      {pkg.visibility === "PUBLIC" ? "🌍 Herkese açıq" : `🏫 ${pkg.group?.name || "Qrupa xas"}`}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* Görünürlük değiştir */}
                  <select
                    value={pkg.groupId || pkg.visibility}
                    onChange={e => {
                      const val = e.target.value;
                      if (val === "PUBLIC") {
                        handleUpdatePkgVisibility(pkg.id, null, "PUBLIC");
                      } else {
                        handleUpdatePkgVisibility(pkg.id, val, "GROUP_ONLY");
                      }
                    }}
                    className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-900/30"
                    onClick={e => e.stopPropagation()}>
                    <option value="PUBLIC">🌍 Herkese açıq</option>
                    {groups.map(g => <option key={g.id} value={g.id}>🏫 {g.name}</option>)}
                  </select>
                  <button onClick={() => openAdd(pkg.id)}
                    className="bg-blue-50 hover:bg-blue-100 text-blue-900 text-xs font-medium px-3 py-1.5 rounded-lg transition-all">
                    + Video əlavə et
                  </button>
                  <button onClick={() => setActivePackage(activePackage === pkg.id ? null : pkg.id)}
                    className="text-gray-400 px-2">
                    {activePackage === pkg.id ? "▲" : "▼"}
                  </button>
                </div>
              </div>

              {activePackage === pkg.id && (
                <div className="p-5">
                  {pkg.videos.length === 0 ? (
                    <p className="text-center text-gray-400 py-6 text-sm">Bu paketdə hələ video yoxdur</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {pkg.videos.map(v => {
                        const thumb = getYoutubeThumb(v.url);
                        return (
                          <div key={v.id} className="bg-gray-50 rounded-xl overflow-hidden border border-gray-100">
                            <div className="relative h-36 bg-gray-200 cursor-pointer" onClick={() => setWatchVideo(v)}>
                              {thumb ? (
                                <img src={thumb} alt={v.title} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-4xl">🎬</div>
                              )}
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-12 h-12 bg-black/50 rounded-full flex items-center justify-center">
                                  <span className="text-white text-xl ml-1">▶</span>
                                </div>
                              </div>
                            </div>
                            <div className="p-3">
                              <p className="font-medium text-gray-900 text-sm truncate">{v.title}</p>
                              {v.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{v.description}</p>}
                              <div className="flex gap-2 mt-2">
                                <button onClick={() => setWatchVideo(v)}
                                  className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-medium py-1.5 rounded-lg transition-all">
                                  ▶ İzlə
                                </button>
                                <button onClick={() => openEdit(v)}
                                  className="bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs px-2.5 py-1.5 rounded-lg transition-all">✏️</button>
                                <button onClick={() => handleDelete(v.id)}
                                  className="bg-red-50 hover:bg-red-100 text-red-600 text-xs px-2.5 py-1.5 rounded-lg transition-all">🗑️</button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}