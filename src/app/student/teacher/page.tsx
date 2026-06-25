"use client";

import { useEffect, useState } from "react";

interface Question {
  id: string;
  text: string;
  type: "MULTIPLE_CHOICE" | "OPEN_ENDED";
  options: Record<string, string> | null;
  correctAnswer: string | null;
  isActive: boolean;
}

interface TestPackage {
  id: string;
  name: string;
  isTimed: boolean;
  duration: number | null;
  startsAt: string | null;
  endsAt: string | null;
  visibility: string;
  questions: { id: string }[];
  attempts?: {
    id: string;
    score: number | null;
    totalScore: number | null;
    finishedAt: string | null;
  }[];
}

interface VideoPackage {
  id: string;
  name: string;
  videos: Video[];
}

interface Video {
  id: string;
  title: string;
  url: string;
  description: string | null;
}

interface GroupPost {
  id: string;
  content: string;
  createdAt: string;
  images: { id: string; url: string }[];
}

interface Group {
  id: string;
  name: string;
  description: string | null;
  schedule: string | null;
  photo: string | null;
  coverPhoto: string | null;
  videoPackages: VideoPackage[];
  testPackages: TestPackage[];
  posts: GroupPost[];
}

interface Teacher {
  id: string;
  name: string;
  bio: string | null;
  photo: string | null;
  email: string | null;
  phone: string | null;
}

type TestStep = "idle" | "running" | "finished";

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
    answers: Array<{
      id: string;
      answer: string;
      isCorrect: boolean | null;
      status: string;
      teacherComment: string | null;
      question: Question;
    }>;
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

export default function StudentTeacherPage() {
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [myGroups, setMyGroups] = useState<Group[]>([]);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"posts" | "videos" | "tests">(
    "posts",
  );
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState<AttemptState | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState("");
  const [watchVideo, setWatchVideo] = useState<Video | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!attempt || attempt.step !== "running" || attempt.timeLeft === null)
      return;
    if (attempt.timeLeft <= 0) {
      handleSubmitTest();
      return;
    }
    const timer = setTimeout(() => {
      setAttempt((a) => (a ? { ...a, timeLeft: (a.timeLeft ?? 0) - 1 } : a));
    }, 1000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt?.timeLeft, attempt?.step]);

  async function fetchData() {
    try {
      const [teacherRes, reqRes] = await Promise.all([
        fetch("/api/teacher/public"),
        fetch("/api/enrollment/my"),
      ]);
      const teacherData = await teacherRes.json();
      const reqData = await reqRes.json();

      setTeacher(teacherData.teacher);

      const enrollments = reqData.enrollments || reqData.requests || [];
      const acceptedGroupIds = enrollments
        .filter((r: { status: string }) => r.status === "ACCEPTED")
        .map(
          (r: { group?: { id: string }; groupId?: string }) =>
            r.group?.id ?? r.groupId,
        );

      if (acceptedGroupIds.length > 0) {
        const groupsData = await Promise.all(
          acceptedGroupIds
            .filter(Boolean)
            .map((gId: string) =>
              fetch(`/api/groups/${gId}`).then((r) => r.json()),
            ),
        );

        const groups: Group[] = groupsData
          .filter((d: { error?: string }) => !d.error)
          .map((d: Group & { isMember?: boolean; isTeacher?: boolean }) => ({
            id: d.id,
            name: d.name,
            description: d.description ?? null,
            schedule: d.schedule ?? null,
            photo: d.photo ?? null,
            coverPhoto: d.coverPhoto ?? null,
            posts: d.posts ?? [],
            videoPackages: d.videoPackages ?? [],
            testPackages: d.testPackages ?? [],
          }));

        setMyGroups(groups);
        if (groups.length > 0) setActiveGroup(groups[0].id);
      }
    } catch (error) {
      console.error(error);
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
        if (res.status === 409) {
          setMsg("❌ Bu testi artıq həll etmisiniz.");
          return;
        }
        throw new Error(data.error);
      }

      const pkgRes = await fetch(`/api/packages/${pkg.id}`);
      const pkgData = await pkgRes.json();
      const activeQuestions = (pkgData.package?.questions ?? []).filter(
        (q: Question) => q.isActive,
      );

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
      const answers = attempt.questions.map((q) => ({
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

      setAttempt((a) =>
        a
          ? {
              ...a,
              step: "finished",
              result: {
                score: attemptResult.score ?? 0,
                totalScore: attemptResult.totalScore ?? 0,
                answers: attemptResult.answers ?? [],
              },
            }
          : a,
      );
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

  function openVideo(v: Video, pkgName: string, groupName: string) {
    setWatchVideo(v);
    pushRecentVideo({ ...v, packageName: pkgName, groupName });
  }

  if (loading)
    return (
      <div className="flex justify-center py-20">
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-3 h-3 bg-blue-900 rounded-full animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    );

  if (!teacher)
    return (
      <div className="text-center py-20 text-gray-400">
        <div className="text-4xl mb-3">👨‍🏫</div>
        <p>Müəllim tapılmadı</p>
        <a
          href="/student"
          className="mt-4 inline-block text-blue-900 text-sm font-medium hover:underline"
        >
          ← Geri qayıt
        </a>
      </div>
    );

  if (myGroups.length === 0)
    return (
      <div className="text-center py-20 text-gray-400">
        <div className="text-4xl mb-3">🔒</div>
        <p>Siz hələ heç bir qrupa qəbul edilməmisiniz</p>
        <a
          href="/student"
          className="mt-4 inline-block text-blue-900 text-sm font-medium hover:underline"
        >
          ← Geri qayıt
        </a>
      </div>
    );

  /* ─── TEST RUNNING ─── */
  if (attempt && attempt.step === "running") {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Test həll edilir
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {attempt.packageName}
            </p>
          </div>
          {attempt.timeLeft !== null && (
            <div
              className={`text-2xl font-mono font-bold px-4 py-2 rounded-xl ${
                attempt.timeLeft < 60
                  ? "bg-red-100 text-red-600 animate-pulse"
                  : "bg-blue-50 text-blue-900"
              }`}
            >
              ⏱ {formatTime(attempt.timeLeft)}
            </div>
          )}
        </div>

        <div className="space-y-5">
          {attempt.questions.map((q, idx) => (
            <div
              key={q.id}
              className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6"
            >
              <p className="font-semibold text-gray-900 mb-4">
                <span className="text-blue-900 mr-2">{idx + 1}.</span>
                {q.text}
              </p>
              {q.type === "MULTIPLE_CHOICE" && q.options ? (
                <div className="space-y-2">
                  {Object.entries(q.options).map(
                    ([k, v]) =>
                      v && (
                        <button
                          key={k}
                          type="button"
                          onClick={() =>
                            setAttempt((a) =>
                              a
                                ? { ...a, answers: { ...a.answers, [q.id]: k } }
                                : a,
                            )
                          }
                          className={`w-full text-left px-4 py-3 rounded-xl border-2 text-sm transition-all ${
                            attempt.answers[q.id] === k
                              ? "border-blue-900 bg-blue-50 text-blue-900 font-medium"
                              : "border-gray-200 hover:border-gray-300 text-gray-700"
                          }`}
                        >
                          <span className="font-bold mr-2">{k}.</span>
                          {v}
                        </button>
                      ),
                  )}
                </div>
              ) : (
                <textarea
                  value={attempt.answers[q.id] || ""}
                  onChange={(e) =>
                    setAttempt((a) =>
                      a
                        ? {
                            ...a,
                            answers: { ...a.answers, [q.id]: e.target.value },
                          }
                        : a,
                    )
                  }
                  rows={4}
                  placeholder="Cavabınızı yazın..."
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900/30 resize-none"
                />
              )}
            </div>
          ))}
        </div>

        <button
          onClick={handleSubmitTest}
          disabled={submitting}
          className="w-full mt-6 bg-blue-900 hover:bg-blue-800 disabled:bg-blue-900/50 text-white font-semibold py-3 rounded-xl transition-all"
        >
          {submitting ? "Göndərilir..." : "Testi tamamla ✓"}
        </button>
      </div>
    );
  }

  /* ─── TEST FINISHED ─── */
  if (attempt && attempt.step === "finished" && attempt.result) {
    const { score, totalScore, answers } = attempt.result;
    const openEnded = answers.filter((a) => a.question.type === "OPEN_ENDED");
    const mc = answers.filter((a) => a.question.type === "MULTIPLE_CHOICE");

    return (
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 mb-6 text-center">
          <div className="text-5xl mb-4">
            {totalScore > 0 && score / totalScore >= 0.7 ? "🎉" : "📊"}
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Test tamamlandı!
          </h2>
          <p className="text-sm text-gray-500">{attempt.packageName}</p>
          {totalScore > 0 && (
            <p className="text-4xl font-bold text-blue-900 mt-4">
              {score}
              <span className="text-gray-400 text-2xl">/{totalScore}</span>
            </p>
          )}
          {openEnded.length > 0 && (
            <p className="text-sm text-yellow-600 mt-3 bg-yellow-50 rounded-xl px-4 py-2 inline-block">
              ⏳ {openEnded.length} açıq sual müəllim təsdiqi gözləyir
            </p>
          )}
        </div>

        {mc.length > 0 && (
          <div className="space-y-3 mb-6">
            <h3 className="font-semibold text-gray-700">
              Çoxseçimli nəticələr
            </h3>
            {mc.map((a, idx) => (
              <div
                key={a.id}
                className={`bg-white rounded-2xl border shadow-sm p-5 ${a.isCorrect ? "border-green-200" : "border-red-200"}`}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`text-xl flex-shrink-0 ${a.isCorrect ? "text-green-500" : "text-red-500"}`}
                  >
                    {a.isCorrect ? "✓" : "✗"}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {idx + 1}. {a.question.text}
                    </p>
                    {a.question.options && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {Object.entries(a.question.options).map(
                          ([k, v]) =>
                            v && (
                              <span
                                key={k}
                                className={`text-xs px-2 py-1 rounded-lg ${
                                  k === a.question.correctAnswer
                                    ? "bg-green-100 text-green-700 font-bold"
                                    : k === a.answer &&
                                        a.answer !== a.question.correctAnswer
                                      ? "bg-red-100 text-red-700"
                                      : "bg-gray-50 text-gray-500"
                                }`}
                              >
                                {k}: {v}
                              </span>
                            ),
                        )}
                      </div>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      Cavabınız:{" "}
                      <span className="font-medium text-gray-800">
                        {a.answer}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {openEnded.length > 0 && (
          <div className="space-y-3 mb-6">
            <h3 className="font-semibold text-gray-700">Açıq suallar</h3>
            {openEnded.map((a, idx) => (
              <div
                key={a.id}
                className="bg-yellow-50 rounded-2xl border border-yellow-200 p-5"
              >
                <p className="text-sm font-medium text-gray-900 mb-2">
                  {idx + 1}. {a.question.text}
                </p>
                <p className="text-sm text-gray-600 bg-white rounded-xl px-3 py-2">
                  {a.answer}
                </p>
                {a.teacherComment ? (
                  <p className="text-xs text-blue-700 mt-2">
                    💬 {a.teacherComment}
                  </p>
                ) : (
                  <span className="text-xs text-yellow-600 mt-2 inline-block">
                    ⏳ Müəllim təsdiqi gözlənilir
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        <button
          onClick={() => setAttempt(null)}
          className="w-full bg-blue-900 hover:bg-blue-800 text-white font-medium py-3 rounded-xl transition-all"
        >
          ← Geri qayıt
        </button>
      </div>
    );
  }

  /* ─── MAIN VIEW ─── */
  const currentGroup = myGroups.find((g) => g.id === activeGroup);

  return (
    <div>
      {/* Video izləmə modal — YouTube embed dəstəyi ilə */}
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

      {/* Müəllim bilgisi */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6">
        <div className="flex items-start gap-5">
          <div className="w-20 h-20 rounded-2xl bg-blue-100 flex items-center justify-center text-3xl font-bold text-blue-900 overflow-hidden flex-shrink-0 border-2 border-blue-200">
            {teacher.photo ? (
              <img
                src={teacher.photo}
                alt={teacher.name}
                className="w-full h-full object-cover"
              />
            ) : (
              teacher.name.charAt(0).toUpperCase()
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{teacher.name}</h1>
            {teacher.bio && (
              <p className="text-gray-600 text-sm mt-2">{teacher.bio}</p>
            )}
            <div className="flex gap-3 mt-2 flex-wrap">
              {teacher.phone && (
                <span className="text-sm text-gray-500">
                  📱 {teacher.phone}
                </span>
              )}
              {teacher.email && (
                <span className="text-sm text-gray-500">
                  ✉️ {teacher.email}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {msg && (
        <p className="mb-4 text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">
          {msg}
        </p>
      )}

      {/* Qrup seçimi */}
      {myGroups.length > 1 && (
        <div className="flex gap-2 mb-5 flex-wrap">
          {myGroups.map((g) => (
            <button
              key={g.id}
              onClick={() => setActiveGroup(g.id)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                activeGroup === g.id
                  ? "bg-blue-900 text-white"
                  : "bg-white border border-gray-200 text-gray-600"
              }`}
            >
              🏫 {g.name}
            </button>
          ))}
        </div>
      )}

      {currentGroup && (
        <>
          {/* Qrup header */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 mb-5">
            <h2 className="font-bold text-gray-900">{currentGroup.name}</h2>
            {currentGroup.description && (
              <p className="text-sm text-gray-500 mt-1">
                {currentGroup.description}
              </p>
            )}
            {currentGroup.schedule && (
              <p className="text-xs text-blue-700 bg-blue-50 rounded-lg px-3 py-1.5 mt-2 inline-block">
                🕐 {currentGroup.schedule}
              </p>
            )}
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-5">
            {(["posts", "videos", "tests"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-all ${
                  activeTab === t
                    ? "bg-blue-900 text-white"
                    : "bg-white border border-gray-200 text-gray-600"
                }`}
              >
                {t === "posts"
                  ? "📌 Paylaşımlar"
                  : t === "videos"
                    ? "🎬 Videolar"
                    : "📝 Testlər"}
              </button>
            ))}
          </div>

          {/* Paylaşımlar */}
          {activeTab === "posts" && (
            <div className="space-y-4">
              {(currentGroup.posts ?? []).length === 0 ? (
                <div className="bg-white rounded-2xl p-12 border border-gray-200 text-center text-gray-400">
                  <div className="text-4xl mb-3">📌</div>
                  <p>Hələ paylaşım yoxdur</p>
                </div>
              ) : (
                (currentGroup.posts ?? []).map((post) => (
                  <div
                    key={post.id}
                    className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5"
                  >
                    <p className="text-gray-900 text-sm leading-relaxed">
                      {post.content}
                    </p>
                    {post.images?.length > 0 && (
                      <div className="flex gap-2 mt-3 flex-wrap">
                        {post.images.map((img) => (
                          <img
                            key={img.id}
                            src={img.url}
                            alt=""
                            className="w-40 h-32 object-cover rounded-xl border border-gray-100 cursor-pointer"
                            onClick={() => window.open(img.url, "_blank")}
                          />
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-gray-400 mt-3">
                      {new Date(post.createdAt).toLocaleDateString("az-AZ", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Videolar — YouTube thumbnail + modal ilə */}
          {activeTab === "videos" && (
            <div className="space-y-4">
              {(currentGroup.videoPackages ?? []).length === 0 ? (
                <div className="bg-white rounded-2xl p-12 border border-gray-200 text-center text-gray-400">
                  <div className="text-4xl mb-3">🎬</div>
                  <p>Hələ video yoxdur</p>
                </div>
              ) : (
                (currentGroup.videoPackages ?? []).map((pkg) => (
                  <div
                    key={pkg.id}
                    className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden"
                  >
                    <div className="px-5 py-4 border-b border-gray-100">
                      <h3 className="font-semibold text-gray-900">
                        {pkg.name}
                      </h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {pkg.videos?.length ?? 0} video
                      </p>
                    </div>
                    <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                      {(pkg.videos ?? []).map((v) => {
                        const thumb = getYoutubeThumb(v.url);
                        return (
                          <div
                            key={v.id}
                            className="border border-gray-100 rounded-xl overflow-hidden cursor-pointer"
                            onClick={() => openVideo(v, pkg.name, currentGroup.name)}
                          >
                            <div className="relative h-36 bg-gray-200">
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
                              <p className="text-sm font-medium text-gray-900">{v.title}</p>
                              {v.description && (
                                <p className="text-xs text-gray-500 mt-1">{v.description}</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Testlər */}
          {activeTab === "tests" && (
            <div className="space-y-3">
              {(currentGroup.testPackages ?? []).map((pkg) => {
                const now = new Date();
                const isActive =
                  (!pkg.startsAt || new Date(pkg.startsAt) <= now) &&
                  (!pkg.endsAt || new Date(pkg.endsAt) >= now);

                const myAttempts = (pkg.attempts ?? []).sort(
                  (a: any, b: any) =>
                    new Date(b.startedAt).getTime() -
                    new Date(a.startedAt).getTime(),
                );
                const latestAttempt = myAttempts[0];
                const isDone = !!latestAttempt?.finishedAt;
                const canRetry = (pkg as any).allowRetry;

                return (
                  <div
                    key={pkg.id}
                    className={`bg-white rounded-2xl border shadow-sm p-5 ${
                      isActive
                        ? "border-gray-200"
                        : "border-gray-100 opacity-70"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">
                          {pkg.name}
                        </h3>
                        <div className="flex gap-3 mt-1 text-xs text-gray-500 flex-wrap">
                          <span>{pkg.questions?.length ?? 0} sual</span>
                          {pkg.isTimed && pkg.duration && (
                            <span>⏱ {Math.floor(pkg.duration / 60)} dəq</span>
                          )}
                          {myAttempts.length > 1 && (
                            <span className="text-blue-600">
                              {myAttempts.length} cəhd
                            </span>
                          )}
                        </div>

                        {myAttempts.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {myAttempts.map((att: any, idx: number) => (
                              <div
                                key={att.id}
                                className="flex items-center gap-2 text-xs"
                              >
                                <span className="text-gray-400">
                                  #{myAttempts.length - idx}
                                </span>
                                {att.finishedAt ? (
                                  <>
                                    {att.totalScore > 0 ? (
                                      <span
                                        className={`font-medium px-2 py-0.5 rounded-lg ${
                                          att.score / att.totalScore >= 0.8
                                            ? "bg-green-100 text-green-700"
                                            : att.score / att.totalScore >= 0.5
                                              ? "bg-yellow-100 text-yellow-700"
                                              : "bg-red-100 text-red-700"
                                        }`}
                                      >
                                        {att.score}/{att.totalScore} ·{" "}
                                        {Math.round(
                                          (att.score / att.totalScore) * 100,
                                        )}
                                        %
                                      </span>
                                    ) : (
                                      <span className="text-gray-400">
                                        ✓ Tamamlandı
                                      </span>
                                    )}
                                    <span className="text-gray-400">
                                      {new Date(
                                        att.startedAt,
                                      ).toLocaleDateString("az-AZ", {
                                        day: "numeric",
                                        month: "short",
                                      })}
                                    </span>
                                  </>
                                ) : (
                                  <span className="text-yellow-600">
                                    ⏳ Davam edir
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex-shrink-0 flex flex-col gap-2 items-end">
                        {!isDone ? (
                          isActive ? (
                            <button
                              onClick={() => startTest(pkg)}
                              className="bg-blue-900 hover:bg-blue-800 text-white font-medium px-5 py-2.5 rounded-xl text-sm transition-all"
                            >
                              Testi başlat →
                            </button>
                          ) : (
                            <span className="text-xs text-gray-400 bg-gray-50 px-3 py-2 rounded-xl">
                              {pkg.startsAt && new Date(pkg.startsAt) > now
                                ? "Hələ başlamayıb"
                                : "Bitmişdir"}
                            </span>
                          )
                        ) : (
                          <>
                            <span className="text-xs bg-green-100 text-green-700 px-3 py-1.5 rounded-full font-medium">
                              ✅ Həll edilib
                            </span>
                            {canRetry && isActive && (
                              <button
                                onClick={() => startTest(pkg)}
                                className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-900 font-medium px-3 py-1.5 rounded-xl transition-all"
                              >
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
  );
}