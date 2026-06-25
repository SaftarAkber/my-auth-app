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
  studentId: string;
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
  visibility: string;
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
  teacherId: string;
  teacher: { id: string; name: string; photo: string | null };
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
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("posts");

  // Post form
  const [postContent, setPostContent] = useState("");
  const [postImages, setPostImages] = useState<string[]>([]);
  const [postVisibility, setPostVisibility] = useState<"PUBLIC" | "GROUP">("GROUP");
  const [postSaving, setPostSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Video package form
  const [showVPkgForm, setShowVPkgForm] = useState(false);
  const [vPkgForm, setVPkgForm] = useState({ name: "", description: "" });
  const [vPkgSaving, setVPkgSaving] = useState(false);

  // Video form
  const [showVideoForm, setShowVideoForm] = useState(false);
  const [activeVideoPkgId, setActiveVideoPkgId] = useState<string | null>(null);
  const [videoForm, setVideoForm] = useState({ title: "", url: "", description: "" });
  const [videoSaving, setVideoSaving] = useState(false);

  const [activeVPkg, setActiveVPkg] = useState<string | null>(null);
  const [watchVideo, setWatchVideo] = useState<Video | null>(null);

  useEffect(() => {
    if (id) fetchGroup();
  }, [id]);

  async function fetchGroup() {
    try {
      setError(null);
      const res = await fetch(`/api/groups/${id}`);
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Qrup tapılmadı"); setLoading(false); return; }
      setGroup({
        id: data.id, name: data.name, description: data.description ?? null,
        schedule: data.schedule ?? null, photo: data.photo ?? null,
        coverPhoto: data.coverPhoto ?? null,
        teacherId: data.teacherId ?? data.teacher?.id,
        teacher: data.teacher ?? { id: "", name: "", photo: null },
        members: data.members ?? [],
        posts: data.posts ?? [],
        videoPackages: data.videoPackages ?? [],
        testPackages: data.testPackages ?? [],
        _count: data._count ?? { members: (data.members ?? []).length },
      });
    } catch (err) {
      setError("Məlumat yüklənərkən xəta baş verdi");
    } finally {
      setLoading(false);
    }
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
      if (data.url) setPostImages((prev) => [...prev, data.url]);
    } finally {
      setUploadingImage(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
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
        body: JSON.stringify({ content: postContent, images: postImages, visibility: postVisibility }),
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

  async function handleSaveVideo(e: React.FormEvent) {
    e.preventDefault();
    if (!videoForm.url || !activeVideoPkgId) return;
    setVideoSaving(true);
    try {
      await fetch(`/api/video-packages/${activeVideoPkgId}/videos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: videoForm.title, url: videoForm.url, description: videoForm.description || null }),
      });
      setShowVideoForm(false);
      setVideoForm({ title: "", url: "", description: "" });
      await fetchGroup();
    } finally {
      setVideoSaving(false);
    }
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
        {[0, 1, 2].map((i) => (
          <div key={i} className="w-3 h-3 bg-blue-900 rounded-full animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }} />
        ))}
      </div>
    </div>
  );

  if (error || !group) return (
    <div className="text-center py-20 text-gray-400">
      <div className="text-4xl mb-3">🏫</div>
      <p>{error || "Qrup tapılmadı"}</p>
      <Link href="/teacher/groups" className="text-blue-900 text-sm mt-3 inline-block hover:underline">← Qruplara qayıt</Link>
    </div>
  );

  const tabs: { key: Tab; label: string; icon: string; count?: number }[] = [
    { key: "posts", label: "Paylaşımlar", icon: "📌", count: group.posts.length },
    { key: "videos", label: "Videolar", icon: "🎬", count: group.videoPackages.reduce((s, p) => s + p.videos.length, 0) },
    { key: "tests", label: "Testlər", icon: "📝", count: group.testPackages.length },
    { key: "students", label: "Tələbələr", icon: "👥", count: group._count.members },
  ];

  return (
    <div className="-mx-6 -mt-6">
      {/* ── Cover photo — full bleed ── */}
      <div className="relative h-52 bg-gradient-to-br from-blue-800 to-blue-600 overflow-hidden">
        {group.coverPhoto && (
          <img src={group.coverPhoto} alt="" className="w-full h-full object-cover" />
        )}
        <Link href="/teacher/groups" className="absolute top-3 left-3 bg-white/90 hover:bg-white text-gray-700 font-medium px-3 py-1.5 rounded-xl text-xs transition-all shadow flex items-center gap-1">
          ← Qruplar
        </Link>
      </div>

      {/* ── Group info ── */}
      <div className="bg-white border-b border-gray-200 px-6 pb-5">
        <div className="flex items-end gap-4 -mt-12 mb-4">
          {/* Group avatar — bigger */}
          <div className="w-24 h-24 rounded-2xl bg-blue-100 flex items-center justify-center text-3xl font-bold text-blue-900 overflow-hidden border-4 border-white shadow-lg flex-shrink-0">
            {group.photo
              ? <img src={group.photo} alt={group.name} className="w-full h-full object-cover" />
              : group.name.charAt(0).toUpperCase()}
          </div>
          <div className="pb-1 flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-gray-900 truncate">{group.name}</h1>
            {group.schedule && (
              <p className="text-xs text-blue-700 font-medium mt-0.5">🕐 {group.schedule}</p>
            )}
          </div>
        </div>

        {group.description && (
          <p className="text-gray-600 text-sm leading-relaxed mb-3">{group.description}</p>
        )}

        <div className="flex gap-5 text-sm">
          <span className="text-gray-700 font-semibold">{group._count.members} <span className="font-normal text-gray-500">tələbə</span></span>
          <span className="text-gray-700 font-semibold">{group.videoPackages.length} <span className="font-normal text-gray-500">video paketi</span></span>
          <span className="text-gray-700 font-semibold">{group.testPackages.length} <span className="font-normal text-gray-500">test paketi</span></span>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="bg-white border-b border-gray-200 px-6">
        <div className="flex gap-1">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-all flex items-center gap-1.5 ${
                activeTab === t.key
                  ? "border-blue-900 text-blue-900"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}>
              {t.icon} {t.label}
              {t.count !== undefined && t.count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  activeTab === t.key ? "bg-blue-100 text-blue-900" : "bg-gray-100 text-gray-500"
                }`}>{t.count}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Modals ── */}
      {watchVideo && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col" onClick={() => setWatchVideo(null)}>
          <div className="flex items-center justify-between px-6 py-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-white font-semibold">{watchVideo.title}</h3>
            <button onClick={() => setWatchVideo(null)} className="text-white text-2xl hover:text-gray-300">✕</button>
          </div>
          <div className="flex-1" onClick={(e) => e.stopPropagation()}>
            {getYoutubeEmbed(watchVideo.url)
              ? <iframe src={getYoutubeEmbed(watchVideo.url)!} className="w-full h-full" allowFullScreen allow="autoplay; fullscreen" />
              : <video src={watchVideo.url} controls autoPlay className="w-full h-full" />
            }
          </div>
        </div>
      )}

      {showVideoForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-lg font-bold text-gray-900 mb-5">Video əlavə et</h2>
            <form onSubmit={handleSaveVideo} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Başlıq</label>
                <input type="text" value={videoForm.title} onChange={(e) => setVideoForm((f) => ({ ...f, title: e.target.value }))} required
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900/30" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">YouTube URL</label>
                <input type="url" value={videoForm.url} onChange={(e) => setVideoForm((f) => ({ ...f, url: e.target.value }))}
                  placeholder="https://youtube.com/watch?v=..." required
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900/30" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Açıqlama</label>
                <textarea value={videoForm.description} onChange={(e) => setVideoForm((f) => ({ ...f, description: e.target.value }))} rows={2}
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900/30 resize-none" />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowVideoForm(false)}
                  className="flex-1 border border-gray-300 text-gray-600 font-medium py-2.5 rounded-xl text-sm">Ləğv et</button>
                <button type="submit" disabled={videoSaving}
                  className="flex-1 bg-blue-900 hover:bg-blue-800 text-white font-medium py-2.5 rounded-xl text-sm">
                  {videoSaving ? "Saxlanılır..." : "Saxla"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showVPkgForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-lg font-bold text-gray-900 mb-5">Video paketi</h2>
            <form onSubmit={handleCreateVPkg} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Paket adı</label>
                <input type="text" value={vPkgForm.name} onChange={(e) => setVPkgForm((f) => ({ ...f, name: e.target.value }))} required
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900/30" />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowVPkgForm(false)}
                  className="flex-1 border border-gray-300 text-gray-600 font-medium py-2.5 rounded-xl text-sm">Ləğv et</button>
                <button type="submit" disabled={vPkgSaving}
                  className="flex-1 bg-blue-900 hover:bg-blue-800 text-white font-medium py-2.5 rounded-xl text-sm">
                  {vPkgSaving ? "Saxlanılır..." : "Saxla"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Content ── */}
      <div className="px-6 py-6">

        {/* PAYLAŞIMLAR */}
        {activeTab === "posts" && (
          <div className="max-w-2xl space-y-5">
            {/* Create post */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <form onSubmit={handlePostSubmit} className="space-y-3">
                <textarea value={postContent} onChange={(e) => setPostContent(e.target.value)}
                  rows={3} placeholder="Bu qrupa nə paylaşmaq istəyirsiniz?"
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900/30 focus:border-blue-900 resize-none" />

                {postImages.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {postImages.map((img, i) => (
                      <div key={i} className="relative">
                        <img src={img} alt="" className="w-20 h-20 object-cover rounded-xl border border-gray-200" />
                        <button type="button" onClick={() => setPostImages((prev) => prev.filter((_, idx) => idx !== i))}
                          className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center">×</button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2 flex-wrap">
                  <button type="button" onClick={() => setPostVisibility("GROUP")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                      postVisibility === "GROUP" ? "border-blue-900 bg-blue-50 text-blue-900" : "border-gray-200 text-gray-500"
                    }`}>
                    🔒 Qrupa xas
                  </button>
                  <button type="button" onClick={() => setPostVisibility("PUBLIC")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                      postVisibility === "PUBLIC" ? "border-blue-900 bg-blue-50 text-blue-900" : "border-gray-200 text-gray-500"
                    }`}>
                    🌍 Herkese açıq
                  </button>
                  <div className="flex gap-2 ml-auto">
                    <button type="button" onClick={() => imageInputRef.current?.click()} disabled={uploadingImage}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-xs transition-all">
                      {uploadingImage ? "Yüklənir..." : "🖼️ Şəkil"}
                    </button>
                    <input ref={imageInputRef} type="file" accept="image/*" onChange={handleUploadImage} className="hidden" />
                    <button type="submit" disabled={postSaving || !postContent.trim()}
                      className="px-4 py-1.5 bg-blue-900 hover:bg-blue-800 disabled:bg-blue-900/40 text-white text-xs font-semibold rounded-xl transition-all">
                      {postSaving ? "Paylaşılır..." : "Paylaş"}
                    </button>
                  </div>
                </div>
              </form>
            </div>

            {group.posts.length === 0 ? (
              <div className="bg-white rounded-2xl p-10 border border-gray-200 text-center text-gray-400">
                <div className="text-4xl mb-3">📌</div>
                <p>Hələ paylaşım yoxdur</p>
              </div>
            ) : group.posts.map((post) => (
              <div key={post.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-900 overflow-hidden flex-shrink-0">
                      {group.teacher.photo
                        ? <img src={group.teacher.photo} alt={group.teacher.name} className="w-full h-full object-cover" />
                        : group.teacher.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{group.teacher.name}</p>
                      <div className="flex items-center gap-1.5 text-xs text-gray-400">
                        <span>{new Date(post.createdAt).toLocaleDateString("az-AZ", { day: "numeric", month: "short" })}</span>
                        <span>·</span>
                        {post.visibility === "PUBLIC"
                          ? <span className="text-green-600">🌍</span>
                          : <span className="text-blue-600">🔒</span>
                        }
                      </div>
                    </div>
                  </div>
                  <button onClick={() => handleDeletePost(post.id)}
                    className="text-gray-300 hover:text-red-500 transition-all text-sm">🗑️</button>
                </div>
                <p className="text-gray-900 text-sm leading-relaxed">{post.content}</p>
                {post.images?.length > 0 && (
                  <div className="flex gap-2 mt-3 flex-wrap">
                    {post.images.map((img) => (
                      <img key={img.id} src={img.url} alt=""
                        className="w-32 h-24 object-cover rounded-xl border border-gray-100 cursor-pointer"
                        onClick={() => window.open(img.url, "_blank")} />
                    ))}
                  </div>
                )}
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

            {group.videoPackages.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 border border-gray-200 text-center text-gray-400">
                <div className="text-4xl mb-3">🎬</div>
                <p>Hələ video paketi yoxdur</p>
              </div>
            ) : (
              <div className="space-y-4">
                {group.videoPackages.map((pkg) => (
                  <div key={pkg.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between p-5 cursor-pointer hover:bg-gray-50"
                      onClick={() => setActiveVPkg(activeVPkg === pkg.id ? null : pkg.id)}>
                      <div>
                        <h3 className="font-semibold text-gray-900">{pkg.name}</h3>
                        <p className="text-xs text-gray-500 mt-0.5">{pkg.videos.length} video</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button onClick={(e) => { e.stopPropagation(); setActiveVideoPkgId(pkg.id); setVideoForm({ title: "", url: "", description: "" }); setShowVideoForm(true); }}
                          className="bg-blue-50 hover:bg-blue-100 text-blue-900 text-xs font-medium px-3 py-1.5 rounded-lg transition-all">
                          + Video əlavə et
                        </button>
                        <span className="text-gray-400">{activeVPkg === pkg.id ? "▲" : "▼"}</span>
                      </div>
                    </div>
                    {activeVPkg === pkg.id && (
                      <div className="border-t border-gray-100 p-5">
                        {pkg.videos.length === 0 ? (
                          <p className="text-center text-gray-400 text-sm py-4">Bu paketdə hələ video yoxdur</p>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {pkg.videos.map((v) => {
                              const thumb = getYoutubeThumb(v.url);
                              return (
                                <div key={v.id} className="border border-gray-100 rounded-xl overflow-hidden">
                                  <div className="relative h-36 bg-gray-200 cursor-pointer" onClick={() => setWatchVideo(v)}>
                                    {thumb ? <img src={thumb} alt={v.title} className="w-full h-full object-cover" />
                                      : <div className="w-full h-full flex items-center justify-center text-4xl">🎬</div>}
                                    <div className="absolute inset-0 flex items-center justify-center">
                                      <div className="w-12 h-12 bg-black/50 rounded-full flex items-center justify-center">
                                        <span className="text-white text-xl ml-1">▶</span>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="p-3">
                                    <p className="text-sm font-medium text-gray-900">{v.title}</p>
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {group.testPackages.map((pkg) => (
                  <div key={pkg.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900 text-sm">{pkg.name}</h3>
                      <div className="flex gap-3 mt-1 text-xs text-gray-500">
                        <span>{pkg._count.questions} sual</span>
                        <span>{pkg._count.attempts} həll</span>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium flex-shrink-0 ${
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {group.members.map((m) => (
                  <div key={m.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex items-center justify-between hover:border-blue-200 transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-900 overflow-hidden flex-shrink-0">
                        {m.student.photo
                          ? <img src={m.student.photo} alt={m.student.name} className="w-full h-full object-cover" />
                          : m.student.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{m.student.name}</p>
                        <p className="text-xs text-gray-400">{m.student.email || m.student.phone || "—"}</p>
                      </div>
                    </div>
                    <Link href={`/teacher/students/${m.student.id}`}
                      className="text-xs text-blue-700 hover:underline flex-shrink-0">
                      Profilə bax →
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}