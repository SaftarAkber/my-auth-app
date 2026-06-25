"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

interface Teacher {
  id: string;
  name: string;
  bio: string | null;
  photo: string | null;
  coverPhoto: string | null;
}

interface Stats {
  groups: number;
  students: number;
  tests: number;
  videos: number;
}

interface TestPackageMini {
  id: string;
  name: string;
  isTimed: boolean;
  duration: number | null;
  isPublic: boolean;
  _count: { questions: number };
  testPackageGroups: { group: { id: string; name: string } }[];
}

interface VideoPackageMini {
  id: string;
  name: string;
  isPublic: boolean;
  _count: { videos: number };
  videoPackageGroups: { group: { id: string; name: string } }[];
}

interface Group {
  id: string;
  name: string;
  description: string | null;
  schedule: string | null;
  _count: { members: number };
  testPackages: TestPackageMini[];
  videoPackages: VideoPackageMini[];
}

interface Enrollment {
  id: string;
  status: string;
  groupId: string;
  group: { id: string; name: string };
}

interface PublicTestPackage {
  id: string;
  name: string;
  isTimed: boolean;
  duration: number | null;
  _count: { questions: number };
  testPackageGroups: { group: { id: string; name: string } }[];
}

interface PublicVideoPackage {
  id: string;
  name: string;
  _count: { videos: number };
  videoPackageGroups: { group: { id: string; name: string } }[];
}

interface PublicPost {
  id: string;
  content: string;
  createdAt: string;
  images: { id: string; url: string }[];
  group: { id: string; name: string };
}

type Tab = "groups" | "posts" | "public";

export default function TeacherProfilePage() {
  const { id: teacherId } = useParams<{ id: string }>();
  const router = useRouter();

  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [stats, setStats] = useState<Stats>({ groups: 0, students: 0, tests: 0, videos: 0 });
  const [groups, setGroups] = useState<Group[]>([]);
  const [myEnrollments, setMyEnrollments] = useState<Enrollment[]>([]);
  const [memberGroupIds, setMemberGroupIds] = useState<string[]>([]);
  const [publicTestPackages, setPublicTestPackages] = useState<PublicTestPackage[]>([]);
  const [publicVideoPackages, setPublicVideoPackages] = useState<PublicVideoPackage[]>([]);
  const [publicPosts, setPublicPosts] = useState<PublicPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestingGroupId, setRequestingGroupId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [requestLoading, setRequestLoading] = useState(false);
  const [msg, setMsg] = useState<{ groupId: string; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("groups");

  useEffect(() => { fetchProfile(); }, [teacherId]);

  async function fetchProfile() {
    try {
      const res = await fetch(`/api/teacher/${teacherId}/profile`);
      if (!res.ok) { router.push("/student"); return; }
      const data = await res.json();
      setTeacher(data.teacher);
      setStats(data.stats ?? { groups: 0, students: 0, tests: 0, videos: 0 });
      setGroups(data.groups ?? []);
      setMyEnrollments(data.myEnrollments ?? []);
      setMemberGroupIds(data.memberGroupIds ?? []);
      setPublicTestPackages(data.publicTestPackages ?? []);
      setPublicVideoPackages(data.publicVideoPackages ?? []);
      setPublicPosts(data.publicPosts ?? []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSendRequest(groupId: string) {
    setRequestLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/enrollment/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId, message }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMsg({ groupId, text: "✅ Müraciət göndərildi!" });
      setRequestingGroupId(null);
      setMessage("");
      await fetchProfile();
    } catch (err: unknown) {
      setMsg({ groupId, text: "❌ " + (err instanceof Error ? err.message : "Xəta baş verdi") });
    } finally {
      setRequestLoading(false);
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="flex gap-2">
        {[0, 1, 2].map(i => (
          <div key={i} className="w-3 h-3 bg-blue-900 rounded-full animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }} />
        ))}
      </div>
    </div>
  );

  if (!teacher) return (
    <div className="text-center py-20 text-gray-400">
      <div className="text-4xl mb-3">👨‍🏫</div>
      <p>Müəllim tapılmadı</p>
      <button onClick={() => router.push("/student")} className="mt-4 text-blue-900 text-sm font-medium hover:underline">
        ← Geri qayıt
      </button>
    </div>
  );

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: "groups", label: "Qruplar", icon: "🏫" },
    ...(publicPosts.length > 0 ? [{ key: "posts" as Tab, label: "Paylaşımlar", icon: "📌" }] : []),
    ...(publicTestPackages.length > 0 || publicVideoPackages.length > 0
      ? [{ key: "public" as Tab, label: "Açıq məzmun", icon: "🌍" }]
      : []),
  ];

  return (
    <div className="-mx-6 -mt-6">
      {/* ── Cover photo — tam genişlik, full bleed ── */}
      <div className="relative h-56 bg-gradient-to-br from-blue-800 to-blue-600 overflow-hidden">
        {teacher.coverPhoto && (
          <img src={teacher.coverPhoto} alt="" className="w-full h-full object-cover" />
        )}
        <button onClick={() => router.back()}
          className="absolute top-3 left-3 bg-white/90 hover:bg-white text-gray-700 font-medium px-3 py-1.5 rounded-xl text-xs transition-all shadow z-20">
          ← Geri
        </button>
      </div>

      {/* ── Profil kartı - LinkedIn stili, avatar cover ÜZƏRİNDƏ (z-index ilə) ── */}
      <div className="bg-white border-b border-gray-200 px-6 pb-6 relative">
        {/* Avatar — yarısı cover üstündə, yarısı ağ fonun üstündə, üst qatda */}
        <div className="relative -mt-16 mb-4 z-10">
          <div className="w-32 h-32 rounded-2xl bg-blue-100 flex items-center justify-center text-4xl font-bold text-blue-900 overflow-hidden border-4 border-white shadow-2xl">
            {teacher.photo
              ? <img src={teacher.photo} alt={teacher.name} className="w-full h-full object-cover" />
              : teacher.name.charAt(0).toUpperCase()}
          </div>
        </div>

        {/* Ad, rol, bio */}
        <h1 className="text-2xl font-bold text-gray-900">{teacher.name}</h1>
        <p className="text-sm text-blue-700 font-medium mt-0.5">Müəllim</p>

        {teacher.bio && (
          <p className="text-gray-600 text-sm mt-3 leading-relaxed">{teacher.bio}</p>
        )}

        {/* Stats — hər kəsə görünür, qeydiyyatsız da daxil */}
        <div className="flex gap-6 mt-4 pt-4 border-t border-gray-100 flex-wrap">
          <div>
            <p className="text-xl font-bold text-gray-900">{stats.groups}</p>
            <p className="text-xs text-gray-500">Qrup</p>
          </div>
          <div>
            <p className="text-xl font-bold text-gray-900">{stats.students}</p>
            <p className="text-xs text-gray-500">Tələbə</p>
          </div>
          <div>
            <p className="text-xl font-bold text-gray-900">{stats.tests}</p>
            <p className="text-xs text-gray-500">Test paketi</p>
          </div>
          <div>
            <p className="text-xl font-bold text-gray-900">{stats.videos}</p>
            <p className="text-xs text-gray-500">Video</p>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="bg-white border-b border-gray-200 px-6">
        <div className="flex gap-1">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-all ${
                activeTab === t.key ? "border-blue-900 text-blue-900" : "border-transparent text-gray-500 hover:text-gray-700"
              }`}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="px-6 py-6">

        {/* ── QRUPLAR TAB ── */}
        {activeTab === "groups" && (
          <>
            {groups.length === 0 ? (
              <div className="bg-white rounded-2xl p-10 border border-gray-200 text-center text-gray-400">
                <div className="text-4xl mb-3">🏫</div>
                <p>Bu müəllimin hələ aktiv qrupu yoxdur</p>
              </div>
            ) : (
              <div className="space-y-4">
                {groups.map(group => {
                  const enrollment = myEnrollments.find(e => e.groupId === group.id) ?? null;
                  const isMember = memberGroupIds.includes(group.id);
                  const isPending = enrollment?.status === "PENDING";
                  const isDeclined = enrollment?.status === "DECLINED";
                  const isRequesting = requestingGroupId === group.id;

                  return (
                    <div key={group.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                      <div className="p-5">
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div>
                            <h3 className="font-bold text-gray-900 text-lg">{group.name}</h3>
                            {group.description && <p className="text-sm text-gray-500 mt-1">{group.description}</p>}
                            {group.schedule && (
                              <p className="text-xs text-blue-700 bg-blue-50 rounded-lg px-3 py-1.5 mt-2 inline-block">
                                🕐 {group.schedule}
                              </p>
                            )}
                            <p className="text-xs text-gray-400 mt-2">👥 {group._count.members} tələbə</p>
                          </div>

                          <div className="flex gap-2 flex-shrink-0 flex-wrap items-center">
                            {/* Qrupa bax — yalnız üzv və ya müəllim deyilsə də görünür, lakin daxil olmaq üçün müraciət lazımdır */}
                            <button
                              onClick={() => router.push(`/student/groups/${group.id}`)}
                              className="inline-flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold px-3 py-1.5 rounded-full transition-all">
                              👁 Qrupa bax
                            </button>

                            {isMember ? (
                              <span className="inline-flex items-center gap-1.5 bg-green-100 text-green-700 text-xs font-semibold px-3 py-1.5 rounded-full">
                                ✅ Üzvsünüz
                              </span>
                            ) : isPending ? (
                              <span className="inline-flex items-center gap-1.5 bg-yellow-100 text-yellow-700 text-xs font-semibold px-3 py-1.5 rounded-full">
                                ⏳ Gözlənilir
                              </span>
                            ) : isDeclined ? (
                              <div className="flex flex-col items-end gap-1">
                                <span className="inline-flex items-center gap-1.5 bg-red-100 text-red-700 text-xs font-semibold px-3 py-1.5 rounded-full">
                                  ❌ Rədd edildi
                                </span>
                                <button
                                  onClick={() => { setRequestingGroupId(group.id); setMessage(""); setMsg(null); }}
                                  className="text-xs text-blue-700 hover:underline">
                                  Yenidən müraciət et
                                </button>
                              </div>
                            ) : !isRequesting ? (
                              <button
                                onClick={() => { setRequestingGroupId(group.id); setMessage(""); setMsg(null); }}
                                className="bg-blue-900 hover:bg-blue-800 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all">
                                📩 Müraciət et
                              </button>
                            ) : null}
                          </div>
                        </div>

                        {/* Müraciət formu */}
                        {isRequesting && !isMember && !isPending && (
                          <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                            <textarea value={message} onChange={e => setMessage(e.target.value)} rows={2}
                              placeholder="Müəllimə bir mesaj yazın (isteğe bağlı)..."
                              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900/30 resize-none" />
                            {msg?.groupId === group.id && (
                              <p className={`text-sm ${msg.text.startsWith("✅") ? "text-green-600" : "text-red-600"}`}>{msg.text}</p>
                            )}
                            <div className="flex gap-2">
                              <button onClick={() => { setRequestingGroupId(null); setMsg(null); }}
                                className="flex-1 border border-gray-300 text-gray-600 text-sm font-medium py-2 rounded-xl hover:bg-gray-50">
                                Ləğv et
                              </button>
                              <button onClick={() => handleSendRequest(group.id)} disabled={requestLoading}
                                className="flex-1 bg-blue-900 hover:bg-blue-800 disabled:bg-blue-900/50 text-white text-sm font-semibold py-2 rounded-xl transition-all">
                                {requestLoading ? "Göndərilir..." : "Göndər →"}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Bu qrupdakı məzmun */}
                      {(group.testPackages.length > 0 || group.videoPackages.length > 0) && (
                        <div className="border-t border-gray-100 px-5 py-4 bg-gray-50">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Bu qrupda nələr var</p>
                          <div className="flex flex-wrap gap-2">
                            {group.testPackages.map(tp => (
                              <span key={tp.id} className="text-xs bg-purple-100 text-purple-700 px-3 py-1.5 rounded-full font-medium">
                                📝 {tp.name} · {tp._count.questions} sual
                                {tp.isTimed && tp.duration ? ` · ⏱ ${Math.floor(tp.duration / 60)}dəq` : ""}
                                {tp.isPublic && " · 🌍"}
                              </span>
                            ))}
                            {group.videoPackages.map(vp => (
                              <span key={vp.id} className="text-xs bg-orange-100 text-orange-700 px-3 py-1.5 rounded-full font-medium">
                                🎬 {vp.name} · {vp._count.videos} video
                                {vp.isPublic && " · 🌍"}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ── PAYLAŞIMLAR TAB (herkese açıq) ── */}
        {activeTab === "posts" && (
          <div className="max-w-2xl space-y-4">
            {publicPosts.length === 0 ? (
              <div className="bg-white rounded-2xl p-10 border border-gray-200 text-center text-gray-400">
                <div className="text-4xl mb-3">📌</div>
                <p>Hələ herkese açıq paylaşım yoxdur</p>
              </div>
            ) : publicPosts.map(post => (
              <div key={post.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-900 overflow-hidden flex-shrink-0">
                    {teacher.photo
                      ? <img src={teacher.photo} alt={teacher.name} className="w-full h-full object-cover" />
                      : teacher.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{teacher.name}</p>
                    <div className="flex items-center gap-1.5 text-xs text-gray-400">
                      <span>{new Date(post.createdAt).toLocaleDateString("az-AZ", { day: "numeric", month: "short", year: "numeric" })}</span>
                      <span>·</span>
                      <span className="text-green-600">🌍 Herkese açıq</span>
                    </div>
                  </div>
                </div>
                <p className="text-gray-900 text-sm leading-relaxed">{post.content}</p>
                {post.images?.length > 0 && (
                  <div className="flex gap-2 mt-3 flex-wrap">
                    {post.images.map(img => (
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

        {/* ── HERKESE AÇIQ MƏZMUN TAB ── */}
        {activeTab === "public" && (
          <div className="space-y-6">
            {publicTestPackages.length > 0 && (
              <div>
                <h2 className="text-base font-semibold text-gray-700 mb-3">📝 Açıq Test Paketləri</h2>
                <div className="space-y-3">
                  {publicTestPackages.map(pkg => (
                    <div key={pkg.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-semibold text-gray-900">{pkg.name}</h3>
                          <div className="flex gap-2 mt-1.5 flex-wrap text-xs text-gray-500">
                            <span>{pkg._count.questions} sual</span>
                            {pkg.isTimed && pkg.duration && <span>⏱ {Math.floor(pkg.duration / 60)} dəq</span>}
                          </div>
                          {pkg.testPackageGroups.length > 0 && (
                            <div className="flex gap-1.5 mt-2 flex-wrap">
                              {pkg.testPackageGroups.map(tpg => (
                                <span key={tpg.group.id} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                                  🏫 {tpg.group.name}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <span className="text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-full font-medium flex-shrink-0">
                          🌍 Açıq
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {publicVideoPackages.length > 0 && (
              <div>
                <h2 className="text-base font-semibold text-gray-700 mb-3">🎬 Açıq Video Paketləri</h2>
                <div className="space-y-3">
                  {publicVideoPackages.map(pkg => (
                    <div key={pkg.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-semibold text-gray-900">{pkg.name}</h3>
                          <p className="text-xs text-gray-500 mt-1">{pkg._count.videos} video</p>
                          {pkg.videoPackageGroups.length > 0 && (
                            <div className="flex gap-1.5 mt-2 flex-wrap">
                              {pkg.videoPackageGroups.map(vpg => (
                                <span key={vpg.group.id} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                                  🏫 {vpg.group.name}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <span className="text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-full font-medium flex-shrink-0">
                          🌍 Açıq
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}