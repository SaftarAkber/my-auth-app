"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Group {
  id: string;
  name: string;
  description: string | null;
  schedule: string | null;
  photo: string | null;
  coverPhoto: string | null;
  isActive: boolean;
  _count: { members: number; posts: number };
}

export default function TeacherGroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editGroup, setEditGroup] = useState<Group | null>(null);
  const [form, setForm] = useState({ name: "", description: "", schedule: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchGroups(); }, []);

  async function fetchGroups() {
    const res = await fetch("/api/groups");
    const data = await res.json();
    setGroups(data.groups || []);
    setLoading(false);
  }

  function openAdd() {
    setEditGroup(null);
    setForm({ name: "", description: "", schedule: "" });
    setShowForm(true);
  }

  function openEdit(g: Group) {
    setEditGroup(g);
    setForm({ name: g.name, description: g.description || "", schedule: g.schedule || "" });
    setShowForm(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editGroup) {
        await fetch(`/api/groups/${editGroup.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
      } else {
        await fetch("/api/groups", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
      }
      setShowForm(false);
      await fetchGroups();
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(g: Group) {
    await fetch(`/api/groups/${g.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !g.isActive }),
    });
    await fetchGroups();
  }

  async function handleDelete(id: string) {
    if (!confirm("Bu qrupu silmək istədiyinizdən əminsiniz?")) return;
    await fetch(`/api/groups/${id}`, { method: "DELETE" });
    await fetchGroups();
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

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Qruplarım</h1>
        <button onClick={openAdd}
          className="bg-blue-900 hover:bg-blue-800 text-white font-medium px-5 py-2.5 rounded-xl text-sm transition-all">
          + Qrup əlavə et
        </button>
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-lg font-bold text-gray-900 mb-5">
              {editGroup ? "Qrupu düzənlə" : "Yeni qrup"}
            </h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Qrup adı</label>
                <input type="text" value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="məs: Fizika 9cu sinif, A qrupu..." required
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900/30 focus:border-blue-900" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Açıqlama / Qeyd
                </label>
                <textarea value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={3} placeholder="Qrup haqqında məlumat..."
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900/30 focus:border-blue-900 resize-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dərs cədvəli
                </label>
                <textarea value={form.schedule}
                  onChange={e => setForm(f => ({ ...f, schedule: e.target.value }))}
                  rows={2} placeholder="məs: Çərşənbə 14:00, Şənbə 12:00 (2 saatlıq)"
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900/30 focus:border-blue-900 resize-none" />
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

      {groups.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 border border-gray-200 text-center text-gray-400">
          <div className="text-4xl mb-3">🏫</div>
          <p>Hələ qrup yaradılmayıb</p>
          <button onClick={openAdd} className="mt-4 text-blue-900 text-sm font-medium hover:underline">
            İlk qrupu yarat →
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {groups.map(g => (
            <div key={g.id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${
              g.isActive ? "border-gray-200" : "border-gray-100 opacity-70"
            }`}>
              {/* Cover */}
              <div className="h-24 bg-gradient-to-br from-blue-800 to-blue-600 relative">
                {g.coverPhoto && (
                  <img src={g.coverPhoto} alt="" className="w-full h-full object-cover" />
                )}
                <div className="absolute top-2 right-2">
                  <button onClick={() => toggleActive(g)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                      g.isActive ? "bg-green-500 text-white" : "bg-gray-400 text-white"
                    }`}>
                    {g.isActive ? "Aktiv" : "Deaktiv"}
                  </button>
                </div>
              </div>

              <div className="p-5">
                <h3 className="font-bold text-gray-900 text-lg">{g.name}</h3>
                {g.description && (
                  <p className="text-sm text-gray-500 mt-1 line-clamp-2">{g.description}</p>
                )}
                {g.schedule && (
                  <p className="text-xs text-blue-700 bg-blue-50 rounded-lg px-3 py-2 mt-2">
                    🕐 {g.schedule}
                  </p>
                )}
                <div className="flex gap-3 mt-3 text-xs text-gray-400">
                  <span>👥 {g._count.members} tələbə</span>
                  <span>📌 {g._count.posts} paylaşım</span>
                </div>

                <div className="flex gap-2 mt-4">
                  <Link href={`/teacher/groups/${g.id}`}
                    className="flex-1 text-center bg-blue-900 hover:bg-blue-800 text-white font-medium py-2 rounded-xl text-sm transition-all">
                    Qrupa bax →
                  </Link>
                  <button onClick={() => openEdit(g)}
                    className="px-3 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl text-sm transition-all">
                    ✏️
                  </button>
                  <button onClick={() => handleDelete(g.id)}
                    className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-sm transition-all">
                    🗑️
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