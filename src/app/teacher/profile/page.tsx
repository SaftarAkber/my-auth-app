"use client";

import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";

interface Group {
  id: string;
  name: string;
  description: string | null;
  schedule: string | null;
  photo: string | null;
  coverPhoto: string | null;
  _count: { members: number };
}

interface PublicTestPackage {
  id: string;
  name: string;
  isTimed: boolean;
  duration: number | null;
  isPublic: boolean;
  _count: { questions: number };
  testPackageGroups: { group: { id: string; name: string } }[];
}

interface PublicVideoPackage {
  id: string;
  name: string;
  isPublic: boolean;
  _count: { videos: number };
  videoPackageGroups: { group: { id: string; name: string } }[];
}

interface GroupPost {
  id: string;
  content: string;
  createdAt: string;
  visibility: string;
  groupId: string;
  group?: { id: string; name: string };
  images: { id: string; url: string }[];
}

type Tab = "posts" | "groups" | "public" | "group-content";

export default function TeacherProfilePage() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [publicTestPackages, setPublicTestPackages] = useState<PublicTestPackage[]>([]);
  const [publicVideoPackages, setPublicVideoPackages] = useState<PublicVideoPackage[]>([]);
  const [posts, setPosts] = useState<GroupPost[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>("posts");
  const [loading, setLoading] = useState(true);

  // Post form
  const [postContent, setPostContent] = useState("");
  const [postVisibility, setPostVisibility] = useState<"PUBLIC" | "GROUP">("PUBLIC");
  const [postGroupId, setPostGroupId] = useState("");
  const [postImages, setPostImages] = useState<string[]>([]);
  const [postSaving, setPostSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    try {
      const [groupsRes, videosRes, testsRes] = await Promise.all([
        fetch("/api/groups"),
        fetch("/api/video-packages"),
        fetch("/api/packages"),
      ]);
      const groupsData = await groupsRes.json();
      const videosData = await videosRes.json();
      const testsData = await testsRes.json();

      const fetchedGroups: Group[] = groupsData.groups || [];
      setGroups(fetchedGroups);

      // Fetch posts from all groups
      if (fetchedGroups.length > 0) {
        const allPosts: GroupPost[] = [];
        await Promise.all(
          fetchedGroups.map(async (g) => {
            try {
              const res = await fetch(`/api/groups/${g.id}`);
              const data = await res.json();
              (data.posts || []).forEach((p: GroupPost) => {
                allPosts.push({ ...p, group: { id: g.id, name: g.name } });
              });
            } catch {}
          })
        );
        allPosts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setPosts(allPosts);
      }

      const allVideoPkgs: PublicVideoPackage[] = (videosData.packages || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        isPublic: p.isPublic ?? false,
        _count: { videos: p.videos?.length ?? 0 },
        videoPackageGroups: p.videoPackageGroups ?? [],
      }));
      setPublicVideoPackages(allVideoPkgs);

      const allTestPkgs: PublicTestPackage[] = (testsData.packages || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        isTimed: p.isTimed,
        duration: p.duration,
        isPublic: p.isPublic ?? false,
        _count: { questions: p._count?.questions ?? 0 },
        testPackageGroups: p.testPackageGroups ?? [],
      }));
      setPublicTestPackages(allTestPkgs);
    } catch (error) {
      console.error(error);
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
    const targetGroupId = postVisibility === "GROUP" ? postGroupId : (groups[0]?.id ?? "");
    if (!targetGroupId) return;
    setPostSaving(true);
    try {
      await fetch(`/api/groups/${targetGroupId}/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: postContent,
          images: postImages,
          visibility: postVisibility,
        }),
      });
      setPostContent("");
      setPostImages([]);
      await fetchData();
    } finally {
      setPostSaving(false);
    }
  }

  async function handleDeletePost(post: GroupPost) {
    if (!confirm("Bu paylaşımı silmək istədiyinizdən əminsiniz?")) return;
    const gId = post.groupId || post.group?.id;
    if (!gId) return;
    await fetch(`/api/groups/${gId}/posts?postId=${post.id}`, { method: "DELETE" });
    await fetchData();
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

  const publicTests = publicTestPackages.filter((p) => p.isPublic);
  const publicVideos = publicVideoPackages.filter((p) => p.isPublic);
  const groupOnlyTests = publicTestPackages.filter((p) => !p.isPublic && p.testPackageGroups.length > 0);
  const groupOnlyVideos = publicVideoPackages.filter((p) => !p.isPublic && p.videoPackageGroups.length > 0);
  const unassignedTests = publicTestPackages.filter((p) => !p.isPublic && p.testPackageGroups.length === 0);
  const unassignedVideos = publicVideoPackages.filter((p) => !p.isPublic && p.videoPackageGroups.length === 0);

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: "posts", label: "Paylaşımlar", icon: "📌" },
    { key: "groups", label: "Qruplar", icon: "🏫" },
    { key: "public", label: "Herkese açıq", icon: "🌍" },
    { key: "group-content", label: "Qruplara xas", icon: "🔒" },
  ];

  return (
    <div className="-mx-6 -mt-6">
      {/* ── Cover photo — full bleed, no margin ── */}
      <div className="relative h-52 bg-gradient-to-br from-blue-800 to-blue-600 overflow-hidden">
        {(user as any)?.coverPhoto && (
          <img src={(user as any).coverPhoto} alt="" className="w-full h-full object-cover" />
        )}
        <Link href="/teacher/settings"
          className="absolute top-3 right-3 bg-white/90 hover:bg-white text-gray-700 font-medium px-3 py-1.5 rounded-xl text-xs transition-all shadow">
          ✏️ Düzənlə
        </Link>
      </div>

      {/* ── Profile card ── */}
      <div className="bg-white border-b border-gray-200 px-6 pb-5">
        <div className="flex items-end gap-4 -mt-12 mb-4">
          {/* Avatar — bigger */}
          <div className="w-24 h-24 rounded-2xl bg-blue-100 flex items-center justify-center text-3xl font-bold text-blue-900 overflow-hidden border-4 border-white shadow-lg flex-shrink-0">
            {user?.photo
              ? <img src={user.photo} alt={user.name} className="w-full h-full object-cover" />
              : user?.name.charAt(0).toUpperCase()}
          </div>
          <div className="pb-1 flex-1">
            <h1 className="text-2xl font-bold text-gray-900">{user?.name}</h1>
            <p className="text-sm text-blue-700 font-medium">Müəllim</p>
          </div>
        </div>

        {user?.bio && (
          <p className="text-gray-600 text-sm leading-relaxed mb-3">{user.bio}</p>
        )}
        <div className="flex gap-4 flex-wrap text-sm text-gray-500 mb-4">
          {user?.phone && <span>📱 {user.phone}</span>}
          {user?.email && <span>✉️ {user.email}</span>}
        </div>

        {/* Stats row */}
        <div className="flex gap-5 text-sm">
          <span className="text-gray-700 font-semibold">{groups.length} <span className="font-normal text-gray-500">qrup</span></span>
          <span className="text-gray-700 font-semibold">{publicTests.length + publicVideos.length} <span className="font-normal text-gray-500">açıq məzmun</span></span>
          <span className="text-gray-700 font-semibold">{posts.length} <span className="font-normal text-gray-500">paylaşım</span></span>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="bg-white border-b border-gray-200 px-6">
        <div className="flex gap-1">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-all ${
                activeTab === t.key
                  ? "border-blue-900 text-blue-900"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content area — restore padding ── */}
      <div className="px-6 py-6">

        {/* ── PAYLAŞIMLAR ── */}
        {activeTab === "posts" && (
          <div className="max-w-2xl space-y-5">
            {/* Create post card */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-base font-bold text-blue-900 overflow-hidden flex-shrink-0">
                  {user?.photo
                    ? <img src={user.photo} alt={user.name} className="w-full h-full object-cover" />
                    : user?.name.charAt(0).toUpperCase()}
                </div>
                <button
                  onClick={() => {}}
                  className="flex-1 text-left bg-gray-100 hover:bg-gray-150 text-gray-400 text-sm px-4 py-2.5 rounded-full cursor-text transition-all">
                  Nə paylaşmaq istəyirsiniz?
                </button>
              </div>

              <form onSubmit={handlePostSubmit} className="space-y-3">
                <textarea
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  rows={3}
                  placeholder="Paylaşımınızı yazın..."
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900/30 focus:border-blue-900 resize-none"
                />

                {postImages.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {postImages.map((img, i) => (
                      <div key={i} className="relative">
                        <img src={img} alt="" className="w-20 h-20 object-cover rounded-xl border border-gray-200" />
                        <button type="button"
                          onClick={() => setPostImages((prev) => prev.filter((_, idx) => idx !== i))}
                          className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center">
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Visibility selector */}
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex gap-2">
                    <button type="button"
                      onClick={() => setPostVisibility("PUBLIC")}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                        postVisibility === "PUBLIC"
                          ? "border-blue-900 bg-blue-50 text-blue-900"
                          : "border-gray-200 text-gray-500"
                      }`}>
                      🌍 Herkese açıq
                    </button>
                    <button type="button"
                      onClick={() => setPostVisibility("GROUP")}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                        postVisibility === "GROUP"
                          ? "border-blue-900 bg-blue-50 text-blue-900"
                          : "border-gray-200 text-gray-500"
                      }`}>
                      🔒 Qrupa xas
                    </button>
                  </div>

                  {postVisibility === "GROUP" && groups.length > 0 && (
                    <select value={postGroupId} onChange={(e) => setPostGroupId(e.target.value)}
                      className="border border-gray-300 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-900/30">
                      <option value="">Qrup seçin</option>
                      {groups.map((g) => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                      ))}
                    </select>
                  )}

                  <div className="flex gap-2 ml-auto">
                    <button type="button" onClick={() => imageInputRef.current?.click()}
                      disabled={uploadingImage}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-xs transition-all">
                      {uploadingImage ? "Yüklənir..." : "🖼️ Şəkil"}
                    </button>
                    <input ref={imageInputRef} type="file" accept="image/*" onChange={handleUploadImage} className="hidden" />
                    <button type="submit"
                      disabled={postSaving || !postContent.trim() || (postVisibility === "GROUP" && !postGroupId && groups.length > 1)}
                      className="px-4 py-1.5 bg-blue-900 hover:bg-blue-800 disabled:bg-blue-900/40 text-white text-xs font-semibold rounded-xl transition-all">
                      {postSaving ? "Paylaşılır..." : "Paylaş"}
                    </button>
                  </div>
                </div>
              </form>
            </div>

            {/* Posts list */}
            {posts.length === 0 ? (
              <div className="bg-white rounded-2xl p-10 border border-gray-200 text-center text-gray-400">
                <div className="text-4xl mb-3">📌</div>
                <p>Hələ paylaşım yoxdur</p>
              </div>
            ) : posts.map((post) => (
              <div key={post.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-900 overflow-hidden flex-shrink-0">
                      {user?.photo
                        ? <img src={user.photo} alt={user.name} className="w-full h-full object-cover" />
                        : user?.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{user?.name}</p>
                      <div className="flex items-center gap-1.5 text-xs text-gray-400">
                        <span>{new Date(post.createdAt).toLocaleDateString("az-AZ", { day: "numeric", month: "short", year: "numeric" })}</span>
                        <span>·</span>
                        {post.visibility === "PUBLIC"
                          ? <span className="text-green-600">🌍 Herkese açıq</span>
                          : <span className="text-blue-600">🔒 {post.group?.name || "Qrupa xas"}</span>
                        }
                      </div>
                    </div>
                  </div>
                  <button onClick={() => handleDeletePost(post)}
                    className="text-gray-300 hover:text-red-500 transition-all text-sm flex-shrink-0">
                    🗑️
                  </button>
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

        {/* ── QRUPLAR ── */}
        {activeTab === "groups" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {groups.length === 0 ? (
              <div className="col-span-full bg-white rounded-2xl p-12 border border-gray-200 text-center text-gray-400">
                <div className="text-4xl mb-3">🏫</div>
                <p>Hələ qrup yoxdur</p>
                <Link href="/teacher/groups" className="mt-3 inline-block text-blue-900 text-sm font-medium hover:underline">
                  Qrup yarat →
                </Link>
              </div>
            ) : groups.map((g) => (
              <Link key={g.id} href={`/teacher/groups/${g.id}`}
                className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden hover:border-blue-900 hover:shadow-md transition-all">
                <div className="h-24 bg-gradient-to-br from-blue-800 to-blue-600">
                  {g.coverPhoto && <img src={g.coverPhoto} alt="" className="w-full h-full object-cover" />}
                </div>
                <div className="p-5">
                  <h3 className="font-bold text-gray-900">{g.name}</h3>
                  {g.description && <p className="text-sm text-gray-500 mt-1 line-clamp-2">{g.description}</p>}
                  {g.schedule && (
                    <p className="text-xs text-blue-700 bg-blue-50 px-2.5 py-1.5 rounded-lg mt-2 inline-block">
                      🕐 {g.schedule}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-2">👥 {g._count.members} tələbə</p>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* ── HERKESE AÇIQ ── */}
        {activeTab === "public" && (
          <div className="space-y-6 max-w-2xl">
            {publicTests.length === 0 && publicVideos.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 border border-gray-200 text-center text-gray-400">
                <div className="text-4xl mb-3">🌍</div>
                <p>Herkese açıq məzmun yoxdur</p>
                <p className="text-xs text-gray-400 mt-2">Test və video paketlərini düzənləyərək "Herkese açıq" seçin</p>
              </div>
            ) : (
              <>
                {publicTests.length > 0 && (
                  <div>
                    <h2 className="text-base font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      📝 Test Paketləri
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">{publicTests.length}</span>
                    </h2>
                    <div className="space-y-3">
                      {publicTests.map((pkg) => (
                        <div key={pkg.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-semibold text-gray-900">{pkg.name}</h3>
                                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">🌍 Herkese açıq</span>
                              </div>
                              <div className="flex gap-3 mt-1 text-xs text-gray-500 flex-wrap">
                                <span>{pkg._count.questions} sual</span>
                                {pkg.isTimed && pkg.duration && <span>⏱ {Math.floor(pkg.duration / 60)} dəq</span>}
                                {pkg.testPackageGroups.length > 0 && (
                                  <span className="text-blue-600">+ {pkg.testPackageGroups.map((tpg) => tpg.group.name).join(", ")}</span>
                                )}
                              </div>
                            </div>
                            <Link href="/teacher/tests" className="text-blue-900 text-sm font-medium hover:underline flex-shrink-0">Düzənlə →</Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {publicVideos.length > 0 && (
                  <div>
                    <h2 className="text-base font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      🎬 Video Paketləri
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">{publicVideos.length}</span>
                    </h2>
                    <div className="space-y-3">
                      {publicVideos.map((pkg) => (
                        <div key={pkg.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-semibold text-gray-900">{pkg.name}</h3>
                                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">🌍 Herkese açıq</span>
                              </div>
                              <div className="flex gap-3 mt-1 text-xs text-gray-500 flex-wrap">
                                <span>{pkg._count.videos} video</span>
                                {pkg.videoPackageGroups.length > 0 && (
                                  <span className="text-blue-600">+ {pkg.videoPackageGroups.map((vpg) => vpg.group.name).join(", ")}</span>
                                )}
                              </div>
                            </div>
                            <Link href="/teacher/lessons" className="text-blue-900 text-sm font-medium hover:underline flex-shrink-0">Düzənlə →</Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── QRUPLARA XAS ── */}
        {activeTab === "group-content" && (
          <div className="space-y-6 max-w-2xl">
            {groupOnlyTests.length === 0 && groupOnlyVideos.length === 0 && unassignedTests.length === 0 && unassignedVideos.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 border border-gray-200 text-center text-gray-400">
                <div className="text-4xl mb-3">🔒</div>
                <p>Qruplara xas məzmun yoxdur</p>
              </div>
            ) : (
              <>
                {groupOnlyTests.length > 0 && (
                  <div>
                    <h2 className="text-base font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      📝 Qruplara xas testlər
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{groupOnlyTests.length}</span>
                    </h2>
                    <div className="space-y-3">
                      {groupOnlyTests.map((pkg) => (
                        <div key={pkg.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <h3 className="font-semibold text-gray-900">{pkg.name}</h3>
                              <div className="flex gap-1.5 mt-2 flex-wrap">
                                {pkg.testPackageGroups.map((tpg) => (
                                  <span key={tpg.group.id} className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full">
                                    🏫 {tpg.group.name}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <Link href="/teacher/tests" className="text-blue-900 text-sm font-medium hover:underline flex-shrink-0">Düzənlə →</Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {groupOnlyVideos.length > 0 && (
                  <div>
                    <h2 className="text-base font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      🎬 Qruplara xas videolar
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{groupOnlyVideos.length}</span>
                    </h2>
                    <div className="space-y-3">
                      {groupOnlyVideos.map((pkg) => (
                        <div key={pkg.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <h3 className="font-semibold text-gray-900">{pkg.name}</h3>
                              <div className="flex gap-1.5 mt-2 flex-wrap">
                                {pkg.videoPackageGroups.map((vpg) => (
                                  <span key={vpg.group.id} className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full">
                                    🏫 {vpg.group.name}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <Link href="/teacher/lessons" className="text-blue-900 text-sm font-medium hover:underline flex-shrink-0">Düzənlə →</Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {(unassignedTests.length > 0 || unassignedVideos.length > 0) && (
                  <div>
                    <h2 className="text-base font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      ⚠️ Heç yerə əlavə edilməyənlər
                      <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
                        {unassignedTests.length + unassignedVideos.length}
                      </span>
                    </h2>
                    <p className="text-xs text-gray-500 mb-3">Bu məzmunlar nə herkese açıqdır, nə də qrupa bağlıdır.</p>
                    <div className="space-y-2">
                      {unassignedTests.map((pkg) => (
                        <div key={pkg.id} className="bg-yellow-50 rounded-xl border border-yellow-200 px-4 py-3 flex items-center justify-between">
                          <span className="text-sm text-gray-700">📝 {pkg.name}</span>
                          <Link href="/teacher/tests" className="text-xs text-blue-900 hover:underline">Düzənlə →</Link>
                        </div>
                      ))}
                      {unassignedVideos.map((pkg) => (
                        <div key={pkg.id} className="bg-yellow-50 rounded-xl border border-yellow-200 px-4 py-3 flex items-center justify-between">
                          <span className="text-sm text-gray-700">🎬 {pkg.name}</span>
                          <Link href="/teacher/lessons" className="text-xs text-blue-900 hover:underline">Düzənlə →</Link>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}