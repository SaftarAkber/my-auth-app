"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";

interface RecentVideo {
  id: string;
  title: string;
  url: string;
  description: string | null;
  packageName?: string;
  groupName?: string;
  watchedAt: string;
}

interface AttemptSummary {
  id: string;
  packageId: string;
  packageName: string;
  groupName: string;
  finishedAt: string | null;
  startedAt: string;
  score: number | null;
  totalScore: number | null;
  attemptNumber: number;
}

const RECENT_VIDEOS_KEY = "eduflow_recent_videos";

export default function StudentProfilePage() {
  const { user } = useAuth();
  const [attempts, setAttempts] = useState<AttemptSummary[]>([]);
  const [recentVideos, setRecentVideos] = useState<RecentVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"tests" | "videos">("tests");
  const [watchVideo, setWatchVideo] = useState<RecentVideo | null>(null);

  useEffect(() => {
    fetchAttempts();
    loadRecentVideos();
  }, []);

  function loadRecentVideos() {
    try {
      const raw = localStorage.getItem(RECENT_VIDEOS_KEY);
      setRecentVideos(raw ? JSON.parse(raw) : []);
    } catch {
      setRecentVideos([]);
    }
  }

  function clearRecentVideos() {
    localStorage.removeItem(RECENT_VIDEOS_KEY);
    setRecentVideos([]);
  }

  function getYoutubeEmbed(url: string) {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
    return match ? `https://www.youtube.com/embed/${match[1]}?autoplay=1` : null;
  }

  function getYoutubeThumb(url: string) {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
    return match ? `https://img.youtube.com/vi/${match[1]}/mqdefault.jpg` : null;
  }

  async function fetchAttempts() {
    try {
      const res = await fetch("/api/attempts");
      const data = await res.json();
      const raw: any[] = Array.isArray(data) ? data : (data.attempts || []);
      const mapped: AttemptSummary[] = raw.map((a: any) => ({
        id: a.id,
        packageId: a.package?.id || "",
        packageName: a.package?.name || "Test",
        groupName: a.package?.group?.name || a.package?.collection?.name || "—",
        finishedAt: a.finishedAt,
        startedAt: a.startedAt,
        score: a.score,
        totalScore: a.totalScore,
        attemptNumber: 1,
      }));

      const countByPkg: Record<string, number> = {};
      const sorted = [...mapped].sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime());
      sorted.forEach(a => {
        countByPkg[a.packageId] = (countByPkg[a.packageId] || 0) + 1;
        a.attemptNumber = countByPkg[a.packageId];
      });

      setAttempts(mapped.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  function getScoreColor(score: number, total: number) {
    const pct = score / total;
    if (pct >= 0.8) return "text-green-600 bg-green-50";
    if (pct >= 0.5) return "text-yellow-600 bg-yellow-50";
    return "text-red-600 bg-red-50";
  }

  const finishedAttempts = attempts.filter(a => a.finishedAt);
  const avgScore = finishedAttempts.length > 0
    ? Math.round(
        finishedAttempts
          .filter(a => a.totalScore && a.totalScore > 0)
          .reduce((sum, a) => sum + ((a.score || 0) / (a.totalScore || 1)), 0) /
        Math.max(1, finishedAttempts.filter(a => a.totalScore && a.totalScore > 0).length) * 100
      )
    : 0;

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="flex gap-2">
        {[0,1,2].map(i => (
          <div key={i} className="w-3 h-3 bg-blue-900 rounded-full animate-bounce"
            style={{ animationDelay: `${i*0.15}s` }} />
        ))}
      </div>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto">
      {/* Video izləmə modal */}
      {watchVideo && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col" onClick={() => setWatchVideo(null)}>
          <div className="flex items-center justify-between px-6 py-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-white font-semibold">{watchVideo.title}</h3>
            <button onClick={() => setWatchVideo(null)} className="text-white text-2xl hover:text-gray-300">✕</button>
          </div>
          <div className="flex-1" onClick={e => e.stopPropagation()}>
            {getYoutubeEmbed(watchVideo.url)
              ? <iframe src={getYoutubeEmbed(watchVideo.url)!} className="w-full h-full" allowFullScreen allow="autoplay; fullscreen" />
              : <video src={watchVideo.url} controls autoPlay className="w-full h-full" />
            }
          </div>
        </div>
      )}

      {/* Profil header */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-6">
        <div className="h-32 bg-gradient-to-br from-blue-800 to-blue-600 relative">
          {(user as any)?.coverPhoto && (
            <img src={(user as any).coverPhoto} alt="" className="w-full h-full object-cover" />
          )}
        </div>
        <div className="px-6 pb-6">
          <div className="flex items-end gap-4 -mt-10 mb-4">
            <div className="w-20 h-20 rounded-2xl bg-blue-100 flex items-center justify-center text-3xl font-bold text-blue-900 overflow-hidden border-4 border-white shadow-md flex-shrink-0">
              {user?.photo
                ? <img src={user.photo} alt={user.name} className="w-full h-full object-cover" />
                : user?.name.charAt(0).toUpperCase()}
            </div>
            <div className="pb-1">
              <h1 className="text-2xl font-bold text-gray-900">{user?.name}</h1>
              <p className="text-sm text-blue-700 font-medium">Tələbə</p>
            </div>
            <Link href="/student/settings"
              className="ml-auto mb-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium px-4 py-2 rounded-xl text-sm transition-all">
              Düzənlə ✏️
            </Link>
          </div>

          {user?.bio && <p className="text-gray-600 text-sm leading-relaxed mb-3">{user.bio}</p>}

          <div className="flex gap-3 flex-wrap text-xs text-gray-500">
            {user?.phone && <span>📱 {user.phone}</span>}
            {user?.email && <span>✉️ {user.email}</span>}
          </div>
        </div>
      </div>

      {/* Statistika kartları */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 text-center">
          <p className="text-2xl font-bold text-blue-900">{finishedAttempts.length}</p>
          <p className="text-xs text-gray-500 mt-1">Tamamlanan test</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 text-center">
          <p className="text-2xl font-bold text-blue-900">{avgScore}%</p>
          <p className="text-xs text-gray-500 mt-1">Orta nəticə</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 text-center">
          <p className="text-2xl font-bold text-blue-900">
            {finishedAttempts.filter(a => a.totalScore && a.totalScore > 0 && (a.score || 0) / a.totalScore >= 0.7).length}
          </p>
          <p className="text-xs text-gray-500 mt-1">Uğurlu test</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5">
        <button onClick={() => setActiveTab("tests")}
          className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-all ${
            activeTab === "tests" ? "bg-blue-900 text-white" : "bg-white border border-gray-200 text-gray-600"
          }`}>
          📝 Testlərim
        </button>
        <button onClick={() => setActiveTab("videos")}
          className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-all ${
            activeTab === "videos" ? "bg-blue-900 text-white" : "bg-white border border-gray-200 text-gray-600"
          }`}>
          🎬 Videolarım
        </button>
      </div>

      {/* TESTLƏR */}
      {activeTab === "tests" && (
        <div className="space-y-3">
          {attempts.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 border border-gray-200 text-center text-gray-400">
              <div className="text-4xl mb-3">📝</div>
              <p>Hələ heç bir test həll etməmisiniz</p>
              <Link href="/student/teacher" className="mt-3 inline-block text-blue-900 text-sm font-medium hover:underline">
                Testlərə bax →
              </Link>
            </div>
          ) : attempts.map(a => {
            const isDone = !!a.finishedAt;
            const hasScore = a.totalScore && a.totalScore > 0;
            const pct = hasScore ? Math.round((a.score || 0) / a.totalScore! * 100) : null;

            return (
              <Link key={a.id} href={`/student/attempts/${a.id}`}
                className="block bg-white rounded-2xl border border-gray-200 shadow-sm p-5 hover:border-blue-200 hover:shadow-md transition-all">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-900 font-bold text-sm flex-shrink-0">
                      {a.attemptNumber > 1 ? `#${a.attemptNumber}` : "📝"}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{a.packageName}</p>
                      <div className="flex gap-2 mt-0.5 flex-wrap">
                        <span className="text-xs text-gray-400">{a.groupName}</span>
                        {a.attemptNumber > 1 && (
                          <span className="text-xs text-blue-600 font-medium">{a.attemptNumber}. cəhd</span>
                        )}
                        <span className="text-xs text-gray-400">
                          {new Date(a.startedAt).toLocaleDateString("az-AZ", { day: "numeric", month: "short" })}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    {isDone ? (
                      <>
                        {hasScore && pct !== null && (
                          <span className={`text-sm font-bold px-3 py-1 rounded-xl ${getScoreColor(a.score!, a.totalScore!)}`}>
                            {a.score}/{a.totalScore} · {pct}%
                          </span>
                        )}
                        <span className="text-xs text-green-600 bg-green-50 px-2.5 py-1 rounded-full font-medium">✓ Bitdi</span>
                      </>
                    ) : (
                      <span className="text-xs text-yellow-600 bg-yellow-50 px-2.5 py-1 rounded-full font-medium">⏳ Davam edir</span>
                    )}
                    <span className="text-gray-300 text-sm">→</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* VİDEOLAR — son izlənənlər */}
      {activeTab === "videos" && (
        <div>
          {recentVideos.length > 0 && (
            <div className="flex justify-end mb-3">
              <button onClick={clearRecentVideos}
                className="text-xs text-gray-400 hover:text-red-500 transition-all">
                🗑️ Tarixçəni təmizlə
              </button>
            </div>
          )}

          {recentVideos.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 border border-gray-200 text-center text-gray-400">
              <div className="text-4xl mb-3">🎬</div>
              <p>Son baxdığınız videolar burada görünəcək</p>
              <Link href="/student/teacher" className="mt-3 inline-block text-blue-900 text-sm font-medium hover:underline">
                Videolara bax →
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recentVideos.map(v => {
                const thumb = getYoutubeThumb(v.url);
                return (
                  <div key={v.id + v.watchedAt}
                    className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden cursor-pointer hover:border-blue-200 hover:shadow-md transition-all"
                    onClick={() => setWatchVideo(v)}>
                    <div className="relative h-40 bg-gray-200">
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
                    <div className="p-4">
                      <p className="text-sm font-semibold text-gray-900">{v.title}</p>
                      <div className="flex gap-2 mt-1 flex-wrap">
                        {v.packageName && (
                          <span className="text-xs text-gray-400">{v.packageName}</span>
                        )}
                        {v.groupName && (
                          <span className="text-xs text-blue-600">🏫 {v.groupName}</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-1.5">
                        {new Date(v.watchedAt).toLocaleDateString("az-AZ", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}