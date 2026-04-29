"use client";

import { useEffect, useState } from "react";

interface Collection {
  id: string;
  name: string;
}

interface Video {
  id: string;
  title: string;
  description: string | null;
  url: string;
  isActive: boolean;
  order: number;
  collection: { name: string } | null;
  collectionId: string | null;
}

export default function TeacherLessonsPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editVideo, setEditVideo] = useState<Video | null>(null);
  const [form, setForm] = useState({
    title: "", description: "", url: "", collectionId: "",
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const [vRes, cRes] = await Promise.all([
      fetch("/api/videos"),
      fetch("/api/collections"),
    ]);
    const vData = await vRes.json();
    const cData = await cRes.json();
    setVideos(vData.videos || []);
    setCollections(cData.collections || []);
    setLoading(false);
  }

  function openAdd() {
    setEditVideo(null);
    setForm({ title: "", description: "", url: "", collectionId: "" });
    setShowForm(true);
    setMsg("");
  }

  function openEdit(v: Video) {
    setEditVideo(v);
    setForm({
      title: v.title,
      description: v.description || "",
      url: v.url,
      collectionId: v.collectionId || "",
    });
    setShowForm(true);
    setMsg("");
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    try {
      let res;
      if (editVideo) {
        res = await fetch(`/api/videos/${editVideo.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, collectionId: form.collectionId || null }),
        });
      } else {
        res = await fetch("/api/videos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, collectionId: form.collectionId || null }),
        });
      }
      if (!res.ok) throw new Error("Hata");
      setShowForm(false);
      await fetchData();
      setMsg("✅ Kaydedildi");
    } catch {
      setMsg("❌ Hata oluştu");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(v: Video) {
    await fetch(`/api/videos/${v.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !v.isActive }),
    });
    await fetchData();
  }

  async function handleDelete(id: string) {
    if (!confirm("Bu videoyu silmek istediğinizden emin misiniz?")) return;
    await fetch(`/api/videos/${id}`, { method: "DELETE" });
    await fetchData();
  }

  function getYoutubeEmbed(url: string) {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
    return match ? `https://img.youtube.com/vi/${match[1]}/mqdefault.jpg` : null;
  }

  // Koleksiyona göre grupla
  const grouped: Record<string, Video[]> = {};
  const noCollection: Video[] = [];
  videos.forEach((v) => {
    if (v.collection) {
      if (!grouped[v.collection.name]) grouped[v.collection.name] = [];
      grouped[v.collection.name].push(v);
    } else {
      noCollection.push(v);
    }
  });

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
        <h1 className="text-2xl font-bold text-gray-900">Ders Videolarım</h1>
        <button onClick={openAdd}
          className="bg-blue-900 hover:bg-blue-800 text-white font-medium px-5 py-2.5 rounded-xl text-sm transition-all">
          + Video Ekle
        </button>
      </div>

      {msg && <p className="mb-4 text-sm text-green-600">{msg}</p>}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl">
            <h2 className="text-lg font-bold text-gray-900 mb-5">
              {editVideo ? "Video Düzenle" : "Yeni Video Ekle"}
            </h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Başlık</label>
                <input type="text" value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))}
                  required className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900/30 focus:border-blue-900" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Video URL (YouTube vb.)</label>
                <input type="url" value={form.url} onChange={e => setForm(f => ({...f, url: e.target.value}))}
                  placeholder="https://youtube.com/watch?v=..." required
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900/30 focus:border-blue-900" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Açıklama</label>
                <textarea value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))}
                  rows={3} className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900/30 focus:border-blue-900 resize-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Koleksiyon</label>
                <select value={form.collectionId} onChange={e => setForm(f => ({...f, collectionId: e.target.value}))}
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900/30 focus:border-blue-900">
                  <option value="">Koleksiyon seçin (isteğe bağlı)</option>
                  {collections.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
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

      {/* Video listesi — koleksiyona göre gruplu */}
      {videos.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 border border-gray-200 text-center text-gray-400">
          <div className="text-4xl mb-3">🎬</div>
          <p>Henüz video eklenmedi</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([colName, vids]) => (
            <div key={colName}>
              <h2 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <span>📚</span> {colName}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {vids.map(v => (
                  <VideoCard key={v.id} video={v} onEdit={openEdit} onToggle={toggleActive} onDelete={handleDelete} getThumb={getYoutubeEmbed} />
                ))}
              </div>
            </div>
          ))}
          {noCollection.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <span>📁</span> Koleksiyonsuz
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {noCollection.map(v => (
                  <VideoCard key={v.id} video={v} onEdit={openEdit} onToggle={toggleActive} onDelete={handleDelete} getThumb={getYoutubeEmbed} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function VideoCard({ video, onEdit, onToggle, onDelete, getThumb }: {
  video: Video;
  onEdit: (v: Video) => void;
  onToggle: (v: Video) => void;
  onDelete: (id: string) => void;
  getThumb: (url: string) => string | null;
}) {
  const thumb = getThumb(video.url);

  return (
    <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${video.isActive ? "border-gray-200" : "border-gray-100 opacity-60"}`}>
      {/* Thumbnail */}
      <div className="relative h-40 bg-gray-100">
        {thumb ? (
          <img src={thumb} alt={video.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl">🎬</div>
        )}
        <div className="absolute top-2 right-2">
          <button onClick={() => onToggle(video)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
              video.isActive ? "bg-green-500 text-white" : "bg-gray-400 text-white"
            }`}>
            {video.isActive ? "Aktif" : "Pasif"}
          </button>
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 text-sm truncate">{video.title}</h3>
        {video.description && (
          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{video.description}</p>
        )}
        <div className="flex gap-2 mt-3">
          <a href={video.url} target="_blank" rel="noopener noreferrer"
            className="flex-1 text-center bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-medium py-1.5 rounded-lg transition-all">
            İzle
          </a>
          <button onClick={() => onEdit(video)}
            className="flex-1 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-medium py-1.5 rounded-lg transition-all">
            Düzenle
          </button>
          <button onClick={() => onDelete(video.id)}
            className="bg-red-50 hover:bg-red-100 text-red-600 text-xs font-medium px-3 py-1.5 rounded-lg transition-all">
            Sil
          </button>
        </div>
      </div>
    </div>
  );
}