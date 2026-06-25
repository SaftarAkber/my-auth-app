"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

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
  description: string | null;
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
  isTimed: boolean;
  duration: number | null;
  allowRetry?: boolean;
  _count: { questions: number };
  attempts?: {
    id: string;
    score: number | null;
    totalScore: number | null;
    finishedAt: string | null;
    startedAt: string;
  }[];
}

interface Group {
  id: string;
  name: string;
  description: string | null;
  schedule: string | null;
  photo: string | null;
  coverPhoto: string | null;
  teacher: { id: string; name: string; photo: string | null; bio: string | null };
  members: GroupMember[];
  posts: GroupPost[];
  videoPackages: VideoPackage[];
  testPackages: TestPackage[];
  isMember: boolean;
  isTeacher: boolean;
  hasAccess: boolean;
  enrollmentStatus: string | null;
  _count: { members: number };
}

type Tab = "posts" | "videos" | "tests";
type TestStep = "idle" | "running" | "finished";

interface Question {
  id: string;
  text: string;
  type: "MULTIPLE_CHOICE" | "OPEN_ENDED";
  options: Record<string, string> | null;
  correctAnswer: string | null;
  isActive: boolean;
}

interface AttemptState {
  attemptId: string;
  packageId: string;
  packageName: string;
  questions: Question[];
  answers: Record<string, string>;
  timeLeft: number | null;
  step: TestStep;
  result: null | {
    score: number;
    totalScore: number;
    answers: any[];
  };
}

const RECENT_VIDEOS_KEY = "eduflow_recent_videos";

function pushRecentVideo(v: Video & { packageName?: string; groupName?: string }) {
  try {
    const raw = localStorage.getItem(RECENT_VIDEOS_KEY);
    const list: any[] = raw ? JSON.parse(raw) : [];
    const filtered = list.filter((item) => item.id !== v.id);
    filtered.unshift({ ...v, watchedAt: new Date().toISOString() });
    localStorage.setItem(RECENT_VIDEOS_KEY, JSON.stringify(filtered.slice(0, 20)));
  } catch {
    /* ignore */
  }
}

export default function StudentGroupPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("posts");
  const [attempt, setAttempt] = useState<AttemptState | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState("");
  const [watchVideo, setWatchVideo] = useState<Video | null>(null);

  useEffect(() => { fetchGroup(); }, [id]);

  useEffect(() => {
    if (!attempt || attempt.step !== "running" || attempt.timeLeft === null) return;
    if (attempt.timeLeft <= 0) { handleSubmitTest(); return; }
    const timer = setTimeout(() => {
      setAttempt(a => a ? { ...a, timeLeft: (a.timeLeft ?? 0) - 1 } : a);
    }, 1000);
    return () => clearTimeout(timer);
  }, [attempt?.timeLeft, attempt?.step]);

  async function fetchGroup() {
    try {
      const res = await fetch(`/api/groups/${id}`);
      const data = await res.json();
      if (!res.ok) { setLoading(false); return; }
      setGroup(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function startTest(pkg: TestPackage) {
    setMsg("");
    try {
      const res = await fetch("/api/attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId: pkg.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409) { setMsg("❌ Bu testi artıq həll etmisiniz."); return; }
        throw new Error(data.error);
      }
      const pkgRes = await fetch(`/api/packages/${pkg.id}`);
      const pkgData = await pkgRes.json();
      const activeQuestions = (pkgData.package?.questions ?? []).filter((q: Question) => q.isActive);
      setAttempt({
        attemptId: data.attemptId ?? data.attempt?.id,
        packageId: pkg.id,
        packageName: pkg.name,
        questions: activeQuestions,
        answers: {},
        timeLeft: pkg.isTimed && pkg.duration ? pkg.duration : null,
        step: "running",
        result: null,
      });
    } catch (err: unknown) {
      setMsg("❌ " + (err instanceof Error ? err.message : "Xəta"));
    }
  }

  async function handleSubmitTest() {
    if (!attempt || submitting) return;
    setSubmitting(true);
    try {
      const answers = attempt.questions.map(q => ({
        questionId: q.id,
        answer: attempt.answers[q.id] || "",
      }));
      const res = await fetch(`/api/attempts/${attempt.attemptId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      const data = await res.json();
      const attemptResult = data.attempt ?? data;
      setAttempt(a => a ? {
        ...a, step: "finished",
        result: {
          score: attemptResult.score ?? 0,
          totalScore: attemptResult.totalScore ?? 0,
          answers: attemptResult.answers ?? [],
        },
      } : a);
    } finally {
      setSubmitting(false);
    }
  }

  function formatTime(secs: number) {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }

  function getYoutubeEmbed(url: string) {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
    return match ? `https://www.youtube.com/embed/${match[1]}?autoplay=1` : null;
  }

  function getYoutubeThumb(url: string) {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
    return match ? `https://img.youtube.com/vi/${match[1]}/mqdefault.jpg` : null;
  }

  function openVideo(v: Video, pkgName: string) {
    setWatchVideo(v);
    pushRecentVideo({ ...v, packageName: pkgName, groupName: group?.name });
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

  if (!group) return (
    <div className="text-center py-20 text-gray-400">
      <div className="text-4xl mb-3">🏫</div>
      <p>Qrup tapılmadı</p>
      <button onClick={() => router.back()} className="mt-3 text-blue-900 text-sm font-medium hover:underline">← Geri</button>
    </div>
  );

  /* ─── TEST RUNNING ─── */
  if (attempt && attempt.step === "running") {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Test həll edilir</h2>
            <p className="text-sm text-gray-500 mt-0.5">{attempt.packageName}</p>
          </div>
          {attempt.timeLeft !== null && (
            <div className={`text-2xl font-mono font-bold px-4 py-2 rounded-xl ${
              attempt.timeLeft < 60 ? "bg-red-100 text-red-600 animate-pulse" : "bg-blue-50 text-blue-900"
            }`}>
              ⏱ {formatTime(attempt.timeLeft)}
            </div>
          )}
        </div>
        <div className="space-y-5">
          {attempt.questions.map((q, idx) => (
            <div key={q.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <p className="font-semibold text-gray-900 mb-4">
                <span className="text-blue-900 mr-2">{idx + 1}.</span>{q.text}
              </p>
              {q.type === "MULTIPLE_CHOICE" && q.options ? (
                <div className="space-y-2">
                  {Object.entries(q.options).map(([k, v]) => v && (
                    <button key={k} type="button"
                      onClick={() => setAttempt(a => a ? { ...a, answers: { ...a.answers, [q.id]: k } } : a)}
                      className={`w-full text-left px-4 py-3 rounded-xl border-2 text-sm transition-all ${
                        attempt.answers[q.id] === k
                          ? "border-blue-900 bg-blue-50 text-blue-900 font-medium"
                          : "border-gray-200 hover:border-gray-300 text-gray-700"
                      }`}>
                      <span className="font-bold mr-2">{k}.</span>{v}
                    </button>
                  ))}
                </div>
              ) : (
                <textarea value={attempt.answers[q.id] || ""}
                  onChange={e => setAttempt(a => a ? { ...a, answers: { ...a.answers, [q.id]: e.target.value } } : a)}
                  rows={4} placeholder="Cavabınızı yazın..."
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900/30 resize-none" />
              )}
            </div>
          ))}
        </div>
        <button onClick={handleSubmitTest} disabled={submitting}
          className="w-full mt-6 bg-blue-900 hover:bg-blue-800 disabled:bg-blue-900/50 text-white font-semibold py-3 rounded-xl transition-all">
          {submitting ? "Göndərilir..." : "Testi tamamla ✓"}
        </button>
      </div>
    );
  }

  /* ─── TEST FINISHED ─── */
  if (attempt && attempt.step === "finished" && attempt.result) {
    const { score, totalScore, answers } = attempt.result;
    const mc = answers.filter((a: any) => a.question.type === "MULTIPLE_CHOICE");
    const openEnded = answers.filter((a: any) => a.question.type === "OPEN_ENDED");
    return (
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 mb-6 text-center">
          <div className="text-5xl mb-4">{totalScore > 0 && score / totalScore >= 0.7 ? "🎉" : "📊"}</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Test tamamlandı!</h2>
          <p className="text-sm text-gray-500">{attempt.packageName}</p>
          {totalScore > 0 && (
            <p className="text-4xl font-bold text-blue-900 mt-4">
              {score}<span className="text-gray-400 text-2xl">/{totalScore}</span>
            </p>
          )}
          {openEnded.length > 0 && (
            <p className="text-sm text-yellow-600 mt-3 bg-yellow-50 rounded-xl px-4 py-2 inline-block">
              ⏳ {openEnded.length} açıq sual müəllim təsdiqi gözləyir
            </p>
          )}
        </div>
        <button onClick={() => setAttempt(null)}
          className="w-full bg-blue-900 hover:bg-blue-800 text-white font-medium py-3 rounded-xl transition-all">
          ← Geri qayıt
        </button>
      </div>
    );
  }

  /* ─── MAIN VIEW ─── */
  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: "posts", label: "Paylaşımlar", icon: "📌" },
    { key: "videos", label: "Videolar", icon: "🎬" },
    { key: "tests", label: "Testlər", icon: "📝" },
  ];

  return (
    <div className="-mx-6 -mt-6">
      {/* Video modal */}
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

      {/* ── Cover - LinkedIn stili ── */}
      <div className="relative h-52 bg-gradient-to-br from-blue-800 to-blue-600 overflow-hidden">
        {group.coverPhoto && (
          <img src={group.coverPhoto} alt="" className="w-full h-full object-cover" />
        )}
        <button onClick={() => router.back()}
          className="absolute top-3 left-3 bg-white/90 hover:bg-white text-gray-700 font-medium px-3 py-1.5 rounded-xl text-xs transition-all shadow">
          ← Geri
        </button>
      </div>

      {/* ── Group info - LinkedIn stili ── */}
      <div className="bg-white border-b border-gray-200 px-6 pb-5">
        {/* Avatar yarısı cover üstündə */}
        <div className="flex items-end gap-4 -mt-14 mb-4">
          <div className="w-28 h-28 rounded-2xl bg-blue-100 flex items-center justify-center text-3xl font-bold text-blue-900 overflow-hidden border-4 border-white shadow-xl flex-shrink-0">
            {group.photo
              ? <img src={group.photo} alt={group.name} className="w-full h-full object-cover" />
              : group.name.charAt(0).toUpperCase()}
          </div>
          <div className="pb-2 flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-gray-900 truncate">{group.name}</h1>
            {group.description && (
              <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{group.description}</p>
            )}
            {group.schedule && (
              <p className="text-xs text-blue-700 font-medium mt-1">🕐 {group.schedule}</p>
            )}
          </div>
        </div>

        {/* Teacher info */}
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-900 overflow-hidden flex-shrink-0">
            {group.teacher.photo
              ? <img src={group.teacher.photo} alt={group.teacher.name} className="w-full h-full object-cover" />
              : group.teacher.name.charAt(0).toUpperCase()}
          </div>
          <p className="text-sm text-gray-600">👨‍🏫 {group.teacher.name}</p>
          <span className="text-gray-300">·</span>
          <p className="text-sm text-gray-500">👥 {group._count.members} tələbə</p>
        </div>

        {/* Enrollment status */}
        {!group.isMember && !group.isTeacher && (
          <div className="mt-2">
            {group.enrollmentStatus === "PENDING" ? (
              <span className="text-xs bg-yellow-100 text-yellow-700 px-3 py-1.5 rounded-full font-medium">⏳ Müraciətiniz gözlənilir</span>
            ) : group.enrollmentStatus === "DECLINED" ? (
              <span className="text-xs bg-red-100 text-red-700 px-3 py-1.5 rounded-full font-medium">❌ Müraciətiniz rədd edildi</span>
            ) : (
              <span className="text-xs bg-gray-100 text-gray-600 px-3 py-1.5 rounded-full">🔒 Bu qrupun üzvü deyilsiniz</span>
            )}
          </div>
        )}
        {group.isMember && (
          <span className="text-xs bg-green-100 text-green-700 px-3 py-1.5 rounded-full font-medium">✅ Qrup üzvüsünüz</span>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 px-6">
        <div className="flex gap-1">
          {tabs.map(t => (
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

      {/* Content */}
      <div className="px-6 py-6">
        {!group.hasAccess && (
          <div className="bg-white rounded-2xl p-12 border border-gray-200 text-center text-gray-400">
            <div className="text-4xl mb-3">🔒</div>
            <p>Bu məzmunu görmək üçün qrup üzvü olmalısınız</p>
          </div>
        )}

        {group.hasAccess && (
          <>
            {/* POSTS */}
            {activeTab === "posts" && (
              <div className="max-w-2xl space-y-4">
                {(group.posts ?? []).length === 0 ? (
                  <div className="bg-white rounded-2xl p-12 border border-gray-200 text-center text-gray-400">
                    <div className="text-4xl mb-3">📌</div>
                    <p>Hələ paylaşım yoxdur</p>
                  </div>
                ) : (group.posts ?? []).map(post => (
                  <div key={post.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-900 overflow-hidden flex-shrink-0">
                        {group.teacher.photo
                          ? <img src={group.teacher.photo} alt={group.teacher.name} className="w-full h-full object-cover" />
                          : group.teacher.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{group.teacher.name}</p>
                        <p className="text-xs text-gray-400">
                          {new Date(post.createdAt).toLocaleDateString("az-AZ", { day: "numeric", month: "short", year: "numeric" })}
                        </p>
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

            {/* VIDEOS */}
            {activeTab === "videos" && (
              <div className="space-y-4">
                {(group.videoPackages ?? []).length === 0 ? (
                  <div className="bg-white rounded-2xl p-12 border border-gray-200 text-center text-gray-400">
                    <div className="text-4xl mb-3">🎬</div>
                    <p>Hələ video yoxdur</p>
                  </div>
                ) : (group.videoPackages ?? []).map(pkg => (
                  <div key={pkg.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100">
                      <h3 className="font-semibold text-gray-900">{pkg.name}</h3>
                      <p className="text-xs text-gray-500 mt-0.5">{pkg.videos?.length ?? 0} video</p>
                    </div>
                    <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                      {(pkg.videos ?? []).map(v => {
                        const thumb = getYoutubeThumb(v.url);
                        return (
                          <div key={v.id} className="border border-gray-100 rounded-xl overflow-hidden cursor-pointer"
                            onClick={() => openVideo(v, pkg.name)}>
                            <div className="relative h-36 bg-gray-200">
                              {thumb
                                ? <img src={thumb} alt={v.title} className="w-full h-full object-cover" />
                                : <div className="w-full h-full flex items-center justify-center text-4xl">🎬</div>}
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-12 h-12 bg-black/50 rounded-full flex items-center justify-center">
                                  <span className="text-white text-xl ml-1">▶</span>
                                </div>
                              </div>
                            </div>
                            <div className="p-3">
                              <p className="text-sm font-medium text-gray-900">{v.title}</p>
                              {v.description && <p className="text-xs text-gray-500 mt-1">{v.description}</p>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* TESTS */}
            {activeTab === "tests" && (
              <div className="space-y-3">
                {msg && (
                  <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{msg}</p>
                )}
                {(group.testPackages ?? []).length === 0 ? (
                  <div className="bg-white rounded-2xl p-12 border border-gray-200 text-center text-gray-400">
                    <div className="text-4xl mb-3">📝</div>
                    <p>Hələ test yoxdur</p>
                  </div>
                ) : (group.testPackages ?? []).map(pkg => {
                  const myAttempts = (pkg.attempts ?? []).sort((a: any, b: any) =>
                    new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
                  );
                  const latestAttempt = myAttempts[0];
                  const isDone = !!latestAttempt?.finishedAt;
                  const canRetry = pkg.allowRetry;

                  return (
                    <div key={pkg.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">{pkg.name}</h3>
                          <div className="flex gap-3 mt-1 text-xs text-gray-500 flex-wrap">
                            <span>{pkg._count?.questions ?? 0} sual</span>
                            {pkg.isTimed && pkg.duration && (
                              <span>⏱ {Math.floor(pkg.duration / 60)} dəq</span>
                            )}
                          </div>
                          {myAttempts.length > 0 && isDone && latestAttempt.totalScore && latestAttempt.totalScore > 0 && (
                            <div className="mt-2">
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-lg ${
                                (latestAttempt.score ?? 0) / latestAttempt.totalScore >= 0.8 ? "bg-green-100 text-green-700"
                                : (latestAttempt.score ?? 0) / latestAttempt.totalScore >= 0.5 ? "bg-yellow-100 text-yellow-700"
                                : "bg-red-100 text-red-700"
                              }`}>
                                {latestAttempt.score}/{latestAttempt.totalScore} · {Math.round(((latestAttempt.score ?? 0) / latestAttempt.totalScore) * 100)}%
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex-shrink-0 flex flex-col gap-2 items-end">
                          {!isDone ? (
                            <button onClick={() => startTest(pkg)}
                              className="bg-blue-900 hover:bg-blue-800 text-white font-medium px-5 py-2.5 rounded-xl text-sm transition-all">
                              Testi başlat →
                            </button>
                          ) : (
                            <>
                              <span className="text-xs bg-green-100 text-green-700 px-3 py-1.5 rounded-full font-medium">✅ Həll edilib</span>
                              {canRetry && (
                                <button onClick={() => startTest(pkg)}
                                  className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-900 font-medium px-3 py-1.5 rounded-xl transition-all">
                                  🔄 Yenidən həll et
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}