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
  const [collectionName, setCollectionName] = useState("");
  const [collectionDesc, setCollectionDesc] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchCollections(); }, []);

  async function fetchCollections() {
    const res = await fetch("/api/collections");
    const data = await res.json();
    setCollections(data.collections || []);
    setLoading(false);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await fetch("/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: collectionName, description: collectionDesc }),
      });
      setShowForm(false);
      setCollectionName("");
      setCollectionDesc("");
      await fetchCollections();
    } finally {
      setSaving(false);
    }
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
        <h1 className="text-2xl font-bold text-gray-900">Test Kolleksiyaları</h1>
        <button onClick={() => setShowForm(true)}
          className="bg-blue-900 hover:bg-blue-800 text-white font-medium px-5 py-2.5 rounded-xl text-sm transition-all">
          + Kolleksiya əlavə et
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-lg font-bold text-gray-900 mb-5">Yeni kolleksiya</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kolleksiya adı</label>
                <input type="text" value={collectionName}
                  onChange={e => setCollectionName(e.target.value)} required
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900/30" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Açıqlama</label>
                <textarea value={collectionDesc}
                  onChange={e => setCollectionDesc(e.target.value)}
                  rows={2}
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900/30 resize-none" />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 border border-gray-300 text-gray-600 font-medium py-2.5 rounded-xl text-sm">
                  Ləğv et
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 bg-blue-900 hover:bg-blue-800 text-white font-medium py-2.5 rounded-xl text-sm">
                  {saving ? "Saxlanılır..." : "Saxla"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {collections.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 border border-gray-200 text-center text-gray-400">
          <div className="text-4xl mb-3">📚</div>
          <p>Hələ kolleksiya yoxdur</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {collections.map(c => (
            <Link key={c.id} href={`/teacher/tests/${c.id}`}
              className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 hover:border-blue-900 hover:shadow-md transition-all">
              <h3 className="font-bold text-gray-900 text-lg mb-2">{c.name}</h3>
              <div className="flex gap-4 text-sm text-gray-500">
                <span>📝 {c._count.packages} paket</span>
                <span>🎬 {c._count.videoPackages} video</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}