"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface Student {
  id: string;
  name: string;
  photo: string | null;
  email: string | null;
  phone: string | null;
}

interface GroupMember {
  id: string;
  student: Student;
}

interface PostImage {
  id: string;
  url: string;
}

interface GroupPost {
  id: string;
  content: string;
  createdAt: string;
  images: PostImage[];
}

interface Video {
  id: string;
  title: string;
  url: string;
  isActive: boolean;
}

interface VideoPackage {
  id: string;
  name: string;
  isPublished: boolean;
  videos: Video[];
}

interface TestPackage {
  id: string;
  name: string;
  isPublished: boolean;
  _count: { questions: number; attempts: number };
}

interface Group {
  id: string;
  name: string;
  description: string | null;
  schedule: string | null;
  photo: string | null;
  coverPhoto: string | null;
  members: GroupMember[];
  posts: GroupPost[];
  videoPackages: VideoPackage[];
  testPackages: TestPackage[];
  _count: { members: number };
}

type Tab = "posts" | "videos" | "tests" | "students";

export default function GroupDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("posts");

  // Post form
  const [postContent, setPostContent] = useState("");
  const [postImages, setPostImages] = useState<string[]>([]);
  const [postSaving, setPostSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Video package form
  const [showVPkgForm, setShowVPkgForm] = useState(false);
  const [vPkgForm, setVPkgForm] = useState({ name: "", description: "" });
  const [vPkgSaving, setVPkgSaving] = useState(false);

  // Video upload
  const [uploadingVideo, setUploadingVideo] = useState<string | null>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [activeVPkg, setActiveVPkg] = useState<string | null>(null);

  useEffect(() => { fetchGroup(); }, [id]);

  async function fetchGroup() {
    const res = await fetch(`/api/groups/${id}`);
    const data = await res.json();
    setGroup(data.group);
    setLoading(false);
  }

  async function handleUploadImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "image");
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (data.url) setPostImages(prev => [...prev, data.url]);
    } finally {
      setUploadingImage(false);
    }
  }

  async function handlePostSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!postContent.trim()) return;
    setPostSaving(true);
    try {
      await fetch(`/api/groups/${id}/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: postContent, images: postImages }),
      });
      setPostContent("");
      setPostImages([]);
      await fetchGroup();
    } finally {
      setPostSaving(false);
    }
  }

  async function handleDeletePost(postId: string) {
    if (!confirm("Bu paylaşımı silmək istədiyinizdən əminsiniz?")) return;
    await fetch(`/api/groups/${id}/posts?postId=${postId}`, { method: "DELETE" });
    await fetchGroup();
  }

  async function handleCreateVPkg(e: React.FormEvent) {
    e.preventDefault();
    setVPkgSaving(true);
    try {
      await fetch(`/api/groups/${id}/video-packages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(vPkgForm),
      });
      setShowVPkgForm(false);
      setVPkgForm({ name: "", description: "" });
      await fetchGroup();
    } finally {
      setVPkgSaving(false);
    }
  }

  async function handleUploadVideo(e: React.ChangeEvent<HTMLInputElement>, packageId: string) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingVideo(packageId);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "video");
      const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
      const uploadData = await uploadRes.json();

      if (uploadData.url) {
        await fetch(`/api/video-packages/${packageId}/videos`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: file.name.replace(/\.[^/.]+$/, ""),
            url: uploadData.url,
            publicId: uploadData.publicId,
          }),
        });
        await fetchGroup();
      }
    } finally {
      setUploadingVideo(null);
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

  if (!group) return <div className="text-center py-20 text-gray-400">Qrup tapılmadı</div>;

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: "posts", label: "Paylaşımlar", icon: "📌" },
    { key: "videos", label: "Videolar", icon: "🎬" },
    { key: "tests", label: "Testlər", icon: "📝" },
    { key: "students", label: "Tələbələr", icon: "👥" },
  ];

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/teacher/groups" className="text-gray-400 hover:text-gray-600 text-sm">← Qruplar</Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-2xl font-bold text-gray-900">{group.name}</h1>
      </div>

      {/* Qrup header */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-6">
        <div className="h-32 bg-gradient-to-br from-blue-800 to-blue-600">
          {group.coverPhoto && (
            <img src={group.coverPhoto} alt="" className="w-full h-full object-cover" />
          )}
        </div>
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-blue-100 border-4 border-white -mt-10 flex items-center justify-center text-2xl font-bold text-blue-900 overflow-hidden flex-shrink-0 shadow-md">
              {group.photo ? (
                <img src={group.photo} alt={group.name} className="w-full h-full object-cover" />
              ) : group.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 mt-1">
              <h2 className="text-xl font-bold text-gray-900">{group.name}</h2>
              {group.description && <p className="text-gray-500 text-sm mt-1">{group.description}</p>}
              {group.schedule && (
                <p className="text-xs text-blue-700 bg-blue-50 rounded-lg px-3 py-1.5 mt-2 inline-block">
                  🕐 {group.schedule}
                </p>
              )}
              <p className="text-xs text-gray-400 mt-2">👥 {group._count.members} tələbə</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all ${
              activeTab === t.key
                ? "bg-blue-900 text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:border-gray-300"
            }`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* PAYLAŞIMLAR */}
      {activeTab === "posts" && (
        <div className="space-y-5">
          {/* Yeni paylaşım formu */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Yeni paylaşım</h3>
            <form onSubmit={handlePostSubmit} className="space-y-3">
              <textarea
                value={postContent}
                onChange={e => setPostContent(e.target.value)}
                rows={4}
                placeholder="Qrupa nə paylaşmaq istəyirsiniz?"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900/30 focus:border-blue-900 resize-none"
              />
              {postImages.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {postImages.map((img, i) => (
                    <div key={i} className="relative">
                      <img src={img} alt="" className="w-20 h-20 object-cover rounded-xl border border-gray-200" />
                      <button type="button"
                        onClick={() => setPostImages(prev => prev.filter((_, idx) => idx !== i))}
                        className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center">
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-3">
                <button type="button" onClick={() => imageInputRef.current?.click()}
                  disabled={uploadingImage}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-xl text-sm transition-all">
                  {uploadingImage ? "Yüklənir..." : "🖼️ Şəkil əlavə et"}
                </button>
                <input ref={imageInputRef} type="file" accept="image/*"
                  onChange={handleUploadImage} className="hidden" />
                <button type="submit" disabled={postSaving || !postContent.trim()}
                  className="ml-auto bg-blue-900 hover:bg-blue-800 disabled:bg-blue-900/50 text-white font-medium px-5 py-2 rounded-xl text-sm transition-all">
                  {postSaving ? "Paylaşılır..." : "Paylaş"}
                </button>
              </div>
            </form>
          </div>

          {/* Paylaşımlar listesi */}
          {group.posts.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 border border-gray-200 text-center text-gray-400">
              <div className="text-4xl mb-3">📌</div>
              <p>Hələ paylaşım yoxdur</p>
            </div>
          ) : group.posts.map(post => (
            <div key={post.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <div className="flex items-start justify-between gap-3">
                <p className="text-gray-900 text-sm leading-relaxed flex-1">{post.content}</p>
                <button onClick={() => handleDeletePost(post.id)}
                  className="text-red-400 hover:text-red-600 flex-shrink-0">🗑️</button>
              </div>
              {post.images.length > 0 && (
                <div className="flex gap-2 mt-3 flex-wrap">
                  {post.images.map(img => (
                    <img key={img.id} src={img.url} alt=""
                      className="w-32 h-24 object-cover rounded-xl border border-gray-100" />
                  ))}
                </div>
              )}
              <p className="text-xs text-gray-400 mt-3">
                {new Date(post.createdAt).toLocaleDateString("az-AZ", {
                  day: "numeric", month: "long", year: "numeric",
                  hour: "2-digit", minute: "2-digit",
                })}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* VİDEOLAR */}
      {activeTab === "videos" && (
        <div>
          <div className="flex justify-end mb-5">
            <button onClick={() => setShowVPkgForm(true)}
              className="bg-blue-900 hover:bg-blue-800 text-white font-medium px-5 py-2.5 rounded-xl text-sm transition-all">
              + Video paketi əlavə et
            </button>
          </div>

          {showVPkgForm && (
            <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
                <h2 className="text-lg font-bold text-gray-900 mb-5">Video paketi</h2>
                <form onSubmit={handleCreateVPkg} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Paket adı</label>
                    <input type="text" value={vPkgForm.name}
                      onChange={e => setVPkgForm(f => ({ ...f, name: e.target.value }))} required
                      className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900/30 focus:border-blue-900" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Açıqlama</label>
                    <textarea value={vPkgForm.description}
                      onChange={e => setVPkgForm(f => ({ ...f, description: e.target.value }))}
                      rows={2}
                      className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900/30 focus:border-blue-900 resize-none" />
                  </div>
                  <div className="flex gap-3">
                    <button type="button" onClick={() => setShowVPkgForm(false)}
                      className="flex-1 border border-gray-300 text-gray-600 font-medium py-2.5 rounded-xl text-sm">
                      Ləğv et
                    </button>
                    <button type="submit" disabled={vPkgSaving}
                      className="flex-1 bg-blue-900 hover:bg-blue-800 text-white font-medium py-2.5 rounded-xl text-sm">
                      {vPkgSaving ? "Saxlanılır..." : "Saxla"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {group.videoPackages.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 border border-gray-200 text-center text-gray-400">
              <div className="text-4xl mb-3">🎬</div>
              <p>Hələ video paketi yoxdur</p>
            </div>
          ) : (
            <div className="space-y-4">
              {group.videoPackages.map(pkg => (
                <div key={pkg.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                  <div
                    className="flex items-center justify-between p-5 cursor-pointer hover:bg-gray-50"
                    onClick={() => setActiveVPkg(activeVPkg === pkg.id ? null : pkg.id)}>
                    <div>
                      <h3 className="font-semibold text-gray-900">{pkg.name}</h3>
                      <p className="text-xs text-gray-500 mt-0.5">{pkg.videos.length} video</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 cursor-pointer" onClick={e => e.stopPropagation()}>
                        <input type="file" accept="video/*"
                          ref={videoInputRef}
                          onChange={e => handleUploadVideo(e, pkg.id)}
                          className="hidden" />
                        <button
                          onClick={e => { e.stopPropagation(); videoInputRef.current?.click(); }}
                          disabled={uploadingVideo === pkg.id}
                          className="bg-blue-50 hover:bg-blue-100 text-blue-900 text-xs font-medium px-3 py-1.5 rounded-lg transition-all">
                          {uploadingVideo === pkg.id ? "Yüklənir..." : "+ Video əlavə et"}
                        </button>
                      </label>
                      <span className="text-gray-400">{activeVPkg === pkg.id ? "▲" : "▼"}</span>
                    </div>
                  </div>

                  {activeVPkg === pkg.id && pkg.videos.length > 0 && (
                    <div className="border-t border-gray-100 p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                      {pkg.videos.map(v => (
                        <div key={v.id} className="border border-gray-100 rounded-xl overflow-hidden">
                          <video
                            src={v.url}
                            controls
                            controlsList="nodownload"
                            className="w-full aspect-video bg-black"
                          />
                          <div className="p-3">
                            <p className="text-sm font-medium text-gray-900">{v.title}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TESTLƏR */}
      {activeTab === "tests" && (
        <div>
          <div className="flex justify-end mb-5">
            <Link href="/teacher/tests"
              className="bg-blue-900 hover:bg-blue-800 text-white font-medium px-5 py-2.5 rounded-xl text-sm transition-all">
              Test paketlərini idarə et →
            </Link>
          </div>
          {group.testPackages.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 border border-gray-200 text-center text-gray-400">
              <div className="text-4xl mb-3">📝</div>
              <p>Bu qrupa aid test paketi yoxdur</p>
            </div>
          ) : (
            <div className="space-y-3">
              {group.testPackages.map(pkg => (
                <div key={pkg.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">{pkg.name}</h3>
                    <div className="flex gap-3 mt-1 text-xs text-gray-500">
                      <span>{pkg._count.questions} sual</span>
                      <span>{pkg._count.attempts} həll</span>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    pkg.isPublished ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                  }`}>
                    {pkg.isPublished ? "Yayımda" : "Qaralama"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TƏLƏBƏLƏR */}
      {activeTab === "students" && (
        <div>
          {group.members.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 border border-gray-200 text-center text-gray-400">
              <div className="text-4xl mb-3">👥</div>
              <p>Bu qrupda hələ tələbə yoxdur</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tələbə</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Əlaqə</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tarix</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {group.members.map(m => (
                    <tr key={m.id} className="hover:bg-gray-50 transition-all">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-900 overflow-hidden flex-shrink-0">
                            {m.student.photo ? (
                              <img src={m.student.photo} alt={m.student.name} className="w-full h-full object-cover" />
                            ) : m.student.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium text-gray-900 text-sm">{m.student.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {m.student.email || m.student.phone || "—"}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-400">
                        {new Date(m.student.email || Date.now()).toLocaleDateString("az-AZ")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}