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
  _count: { questions: number };
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

export default function StudentTeacherPage() {
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [myGroups, setMyGroups] = useState<Group[]>([]);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"posts" | "videos" | "tests">("posts");
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState<AttemptState | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (!attempt || attempt.step !== "running" || attempt.timeLeft === null) return;
    if (attempt.timeLeft <= 0) { handleSubmitTest(); return; }
    const timer = setTimeout(() => {
      setAttempt(a => a ? { ...a, timeLeft: (a.timeLeft ?? 0) - 1 } : a);
    }, 1000);
    return () => clearTimeout(timer);
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

      const acceptedGroupIds = (reqData.requests || [])
        .filter((r: { status: string; group: { id: string } }) => r.status === "ACCEPTED")
        .map((r: { group: { id: string } }) => r.group.id);

      if (acceptedGroupIds.length > 0 && teacherData.teacher) {
        const groupsData = await Promise.all(
          acceptedGroupIds.map((gId: string) => fetch(`/api/groups/${gId}`).then(r => r.json()))
        );
        const groups = groupsData.map((d: { group: Group }) => d.group).filter(Boolean);
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
        if (res.status === 409) { setMsg("❌ Bu testi artıq həll etmisiniz."); return; }
        throw new Error(data.error);
      }

      const pkgRes = await fetch(`/api/packages/${pkg.id}`);
      const pkgData = await pkgRes.json();
      const activeQuestions = pkgData.package.questions.filter((q: Question) => q.isActive);

      setAttempt({
        attemptId: data.attempt.id,
        packageId: pkg.id,
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

      setAttempt(a => a ? {
        ...a, step: "finished",
        result: {
          score: data.attempt.score,
          totalScore: data.attempt.totalScore,
          answers: data.attempt.answers,
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

  if (!teacher) return (
    <div className="text-center py-20 text-gray-400">
      <div className="text-4xl mb-3">👨‍🏫</div>
      <p>Müəllim tapılmadı</p>
    </div>
  );

  if (myGroups.length === 0) return (
    <div className="text-center py-20 text-gray-400">
      <div className="text-4xl mb-3">🔒</div>
      <p>Siz hələ heç bir qrupa qəbul edilməmisiniz</p>
      <a href="/student" className="mt-4 inline-block text-blue-900 text-sm font-medium hover:underline">
        ← Geri qayıt
      </a>
    </div>
  );

  // Test çözme ekranı
  if (attempt && attempt.step === "running") {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Test həll edilir</h2>
          {attempt.timeLeft !== null && (
            <div className={`text-2xl font-mono font-bold px-4 py-2 rounded-xl ${
              attempt.timeLeft < 60 ? "bg-red-100 text-red-600" : "bg-blue-50 text-blue-900"
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
                <textarea
                  value={attempt.answers[q.id] || ""}
                  onChange={e => setAttempt(a => a ? { ...a, answers: { ...a.answers, [q.id]: e.target.value } } : a)}
                  rows={4} placeholder="Cavabınızı yazın..."
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900/30 resize-none"
                />
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

  // Test nəticə ekranı
  if (attempt && attempt.step === "finished" && attempt.result) {
    const { score, totalScore, answers } = attempt.result;
    const openEnded = answers.filter(a => a.question.type === "OPEN_ENDED");
    const mc = answers.filter(a => a.question.type === "MULTIPLE_CHOICE");

    return (
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 mb-6 text-center">
          <div className="text-5xl mb-4">{totalScore > 0 && score / totalScore >= 0.7 ? "🎉" : "📊"}</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Test tamamlandı!</h2>
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

        {mc.length > 0 && (
          <div className="space-y-3 mb-6">
            <h3 className="font-semibold text-gray-700">Çoxseçimli nəticələr</h3>
            {mc.map((a, idx) => (
              <div key={a.id} className={`bg-white rounded-2xl border shadow-sm p-5 ${a.isCorrect ? "border-green-200" : "border-red-200"}`}>
                <div className="flex items-start gap-3">
                  <span className={`text-xl flex-shrink-0 ${a.isCorrect ? "text-green-500" : "text-red-500"}`}>
                    {a.isCorrect ? "✓" : "✗"}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{idx + 1}. {a.question.text}</p>
                    {a.question.options && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {Object.entries(a.question.options).map(([k, v]) => v && (
                          <span key={k} className={`text-xs px-2 py-1 rounded-lg ${
                            k === a.question.correctAnswer ? "bg-green-100 text-green-700 font-bold"
                            : k === a.answer && a.answer !== a.question.correctAnswer ? "bg-red-100 text-red-700"
                            : "bg-gray-50 text-gray-500"
                          }`}>{k}: {v}</span>
                        ))}
                      </div>
                    )}
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
              <div key={a.id} className="bg-yellow-50 rounded-2xl border border-yellow-200 p-5">
                <p className="text-sm font-medium text-gray-900 mb-2">{idx + 1}. {a.question.text}</p>
                <p className="text-sm text-gray-600 bg-white rounded-xl px-3 py-2">{a.answer}</p>
                {a.teacherComment ? (
                  <p className="text-xs text-blue-700 mt-2">💬 {a.teacherComment}</p>
                ) : (
                  <span className="text-xs text-yellow-600 mt-2 inline-block">⏳ Müəllim təsdiqi gözlənilir</span>
                )}
              </div>
            ))}
          </div>
        )}

        <button onClick={() => setAttempt(null)}
          className="w-full bg-blue-900 hover:bg-blue-800 text-white font-medium py-3 rounded-xl transition-all">
          ← Geri qayıt
        </button>
      </div>
    );
  }

  const currentGroup = myGroups.find(g => g.id === activeGroup);

  return (
    <div>
      {/* Müəllim bilgisi */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6">
        <div className="flex items-start gap-5">
          <div className="w-20 h-20 rounded-2xl bg-blue-100 flex items-center justify-center text-3xl font-bold text-blue-900 overflow-hidden flex-shrink-0 border-2 border-blue-200">
            {teacher.photo ? (
              <img src={teacher.photo} alt={teacher.name} className="w-full h-full object-cover" />
            ) : teacher.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{teacher.name}</h1>
            {teacher.bio && <p className="text-gray-600 text-sm mt-2">{teacher.bio}</p>}
            <div className="flex gap-3 mt-2">
              {teacher.phone && <span className="text-sm text-gray-500">📱 {teacher.phone}</span>}
              {teacher.email && <span className="text-sm text-gray-500">✉️ {teacher.email}</span>}
            </div>
          </div>
        </div>
      </div>

      {msg && <p className="mb-4 text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{msg}</p>}

      {/* Qrup seçimi */}
      {myGroups.length > 1 && (
        <div className="flex gap-2 mb-5 flex-wrap">
          {myGroups.map(g => (
            <button key={g.id} onClick={() => setActiveGroup(g.id)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                activeGroup === g.id ? "bg-blue-900 text-white" : "bg-white border border-gray-200 text-gray-600"
              }`}>
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
            {currentGroup.description && <p className="text-sm text-gray-500 mt-1">{currentGroup.description}</p>}
            {currentGroup.schedule && (
              <p className="text-xs text-blue-700 bg-blue-50 rounded-lg px-3 py-1.5 mt-2 inline-block">
                🕐 {currentGroup.schedule}
              </p>
            )}
          </div>

          {/* Tab */}
          <div className="flex gap-2 mb-5">
            {(["posts", "videos", "tests"] as const).map(t => (
              <button key={t} onClick={() => setActiveTab(t)}
                className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-all ${
                  activeTab === t ? "bg-blue-900 text-white" : "bg-white border border-gray-200 text-gray-600"
                }`}>
                {t === "posts" ? "📌 Paylaşımlar" : t === "videos" ? "🎬 Videolar" : "📝 Testlər"}
              </button>
            ))}
          </div>

          {/* Paylaşımlar */}
          {activeTab === "posts" && (
            <div className="space-y-4">
              {currentGroup.posts.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 border border-gray-200 text-center text-gray-400">
                  <div className="text-4xl mb-3">📌</div>
                  <p>Hələ paylaşım yoxdur</p>
                </div>
              ) : currentGroup.posts.map(post => (
                <div key={post.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                  <p className="text-gray-900 text-sm leading-relaxed">{post.content}</p>
                  {post.images.length > 0 && (
                    <div className="flex gap-2 mt-3 flex-wrap">
                      {post.images.map(img => (
                        <img key={img.id} src={img.url} alt=""
                          className="w-40 h-32 object-cover rounded-xl border border-gray-100 cursor-pointer"
                          onClick={() => window.open(img.url, "_blank")}
                        />
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-gray-400 mt-3">
                    {new Date(post.createdAt).toLocaleDateString("az-AZ", {
                      day: "numeric", month: "long", year: "numeric",
                    })}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Videolar */}
          {activeTab === "videos" && (
            <div className="space-y-4">
              {currentGroup.videoPackages.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 border border-gray-200 text-center text-gray-400">
                  <div className="text-4xl mb-3">🎬</div>
                  <p>Hələ video yoxdur</p>
                </div>
              ) : currentGroup.videoPackages.map(pkg => (
                <div key={pkg.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-100">
                    <h3 className="font-semibold text-gray-900">{pkg.name}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">{pkg.videos.length} video</p>
                  </div>
                  <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
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
                          {v.description && <p className="text-xs text-gray-500 mt-1">{v.description}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Testlər */}
          {activeTab === "tests" && (
            <div className="space-y-3">
              {currentGroup.testPackages.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 border border-gray-200 text-center text-gray-400">
                  <div className="text-4xl mb-3">📝</div>
                  <p>Hələ test yoxdur</p>
                </div>
              ) : currentGroup.testPackages.map(pkg => {
                const now = new Date();
                const isActive =
                  (!pkg.startsAt || new Date(pkg.startsAt) <= now) &&
                  (!pkg.endsAt || new Date(pkg.endsAt) >= now);

                return (
                  <div key={pkg.id} className={`bg-white rounded-2xl border shadow-sm p-5 ${isActive ? "border-gray-200" : "border-gray-100 opacity-60"}`}>
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <h3 className="font-semibold text-gray-900">{pkg.name}</h3>
                        <div className="flex gap-3 mt-1 text-xs text-gray-500">
                          <span>{pkg._count.questions} sual</span>
                          {pkg.isTimed && pkg.duration && <span>⏱ {Math.floor(pkg.duration / 60)} dəq</span>}
                        </div>
                      </div>
                      {isActive ? (
                        <button onClick={() => startTest(pkg)}
                          className="bg-blue-900 hover:bg-blue-800 text-white font-medium px-5 py-2.5 rounded-xl text-sm transition-all flex-shrink-0">
                          Testi başlat →
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400 bg-gray-50 px-3 py-2 rounded-xl">
                          {pkg.startsAt && new Date(pkg.startsAt) > now ? "Hələ başlamayıb" : "Bitmişdir"}
                        </span>
                      )}
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