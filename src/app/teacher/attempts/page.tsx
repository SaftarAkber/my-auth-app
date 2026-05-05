"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Student {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  photo: string | null;
}

interface Answer {
  id: string;
  answer: string;
  status: string;
  isCorrect: boolean | null;
  teacherComment: string | null;
  question: { text: string; type: string };
}

interface AttemptWithAnswers {
  id: string;
  finishedAt: string | null;
  score: number | null;
  totalScore: number | null;
  package: {
    name: string;
    collection: { name: string } | null;
    group: { name: string } | null;
  };
  answers: Answer[];
  student: Student;
}

export default function TeacherAttemptsPage() {
  const [attempts, setAttempts] = useState<AttemptWithAnswers[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedAttempt, setExpandedAttempt] = useState<string | null>(null);
  const [reviewAnswer, setReviewAnswer] = useState<Answer | null>(null);
  const [comment, setComment] = useState("");
  const [reviewLoading, setReviewLoading] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => { fetchAttempts(); }, []);

  async function fetchAttempts() {
    try {
      const res = await fetch("/api/teacher/attempts");
      const data = await res.json();
      setAttempts(data.attempts || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function handleReview(status: "APPROVED" | "REJECTED") {
    if (!reviewAnswer) return;
    setReviewLoading(true);
    try {
      await fetch(`/api/answers/${reviewAnswer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, teacherComment: comment }),
      });
      setReviewAnswer(null);
      setComment("");
      await fetchAttempts();
    } finally {
      setReviewLoading(false);
    }
  }

  const filtered = search.trim()
    ? attempts.filter(a =>
        a.student.name.toLowerCase().includes(search.toLowerCase()) ||
        a.package.name.toLowerCase().includes(search.toLowerCase()) ||
        a.student.email?.toLowerCase().includes(search.toLowerCase()) ||
        a.student.phone?.includes(search)
      )
    : attempts;

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
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Həll edilən testlər</h1>

      {/* Cavab qiymətləndirmə modal */}
      {reviewAnswer && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Cavabı Qiymətləndir</h2>
            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Sual:</p>
              <p className="text-sm text-gray-900">{reviewAnswer.question.text}</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-4 mb-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Tələbənin cavabı:</p>
              <p className="text-sm text-gray-900">{reviewAnswer.answer}</p>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Şərh (isteğe bağlı)</label>
              <textarea value={comment} onChange={e => setComment(e.target.value)}
                rows={3} placeholder="Tələbəyə şərh yazın..."
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900/30 resize-none" />
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setReviewAnswer(null); setComment(""); }}
                className="flex-1 border border-gray-300 text-gray-600 font-medium py-2.5 rounded-xl text-sm hover:bg-gray-50">
                Ləğv et
              </button>
              <button onClick={() => handleReview("REJECTED")} disabled={reviewLoading}
                className="flex-1 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white font-medium py-2.5 rounded-xl text-sm">
                ✗ Rədd et
              </button>
              <button onClick={() => handleReview("APPROVED")} disabled={reviewLoading}
                className="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white font-medium py-2.5 rounded-xl text-sm">
                ✓ Təsdiqlə
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Arama */}
      <div className="relative mb-6">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Tələbə adı, test adı ilə axtar..."
          className="w-full border border-gray-300 rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900/30 focus:border-blue-900"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 border border-gray-200 shadow-sm text-center text-gray-400">
          <div className="text-4xl mb-3">✅</div>
          <p>{search.trim() ? "Axtarışa uyğun test tapılmadı" : "Hələ həll edilmiş test yoxdur"}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(attempt => {
            const pendingAnswers = attempt.answers.filter(
              a => a.question.type === "OPEN_ENDED" && a.status === "PENDING"
            );

            return (
              <div key={attempt.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                {/* Attempt header */}
                <div
                  className="flex items-center justify-between p-5 cursor-pointer hover:bg-gray-50 transition-all"
                  onClick={() => setExpandedAttempt(expandedAttempt === attempt.id ? null : attempt.id)}>
                  <div className="flex items-center gap-4">
                    <Link href={`/teacher/students/${attempt.student.id}`}>
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-lg font-bold text-blue-900 overflow-hidden cursor-pointer hover:ring-2 hover:ring-blue-900 transition-all">
                        {attempt.student.photo ? (
                          <img src={attempt.student.photo} alt={attempt.student.name} className="w-full h-full object-cover" />
                        ) : attempt.student.name.charAt(0).toUpperCase()}
                      </div>
                    </Link>
                    <div>
                      <Link href={`/teacher/students/${attempt.student.id}`}>
                        <p className="font-semibold text-gray-900 hover:text-blue-900 cursor-pointer">{attempt.student.name}</p>
                      </Link>
                      <p className="text-sm text-gray-600">{attempt.package.name}</p>
                      <div className="flex gap-2 mt-1 flex-wrap">
                        {attempt.package.collection && (
                          <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">
                            📚 {attempt.package.collection.name}
                          </span>
                        )}
                        {attempt.package.group && (
                          <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                            🏫 {attempt.package.group.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {attempt.finishedAt && (
                      <div className="text-right">
                        {attempt.totalScore !== null && attempt.totalScore > 0 && (
                          <p className="text-sm font-medium text-blue-900">
                            {attempt.score}/{attempt.totalScore}
                          </p>
                        )}
                        {pendingAnswers.length > 0 && (
                          <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
                            {pendingAnswers.length} gözləyir
                          </span>
                        )}
                      </div>
                    )}
                    <span className="text-gray-400 text-sm">
                      {expandedAttempt === attempt.id ? "▲" : "▼"}
                    </span>
                  </div>
                </div>

                {/* Cavablar */}
                {expandedAttempt === attempt.id && (
                  <div className="border-t border-gray-100 p-5 space-y-3">
                    {attempt.answers.map((ans, idx) => (
                      <div key={ans.id} className={`rounded-xl p-4 border ${
                        ans.question.type === "OPEN_ENDED"
                          ? ans.status === "APPROVED" ? "bg-green-50 border-green-200"
                          : ans.status === "REJECTED" ? "bg-red-50 border-red-200"
                          : "bg-yellow-50 border-yellow-200"
                          : ans.isCorrect === true ? "bg-green-50 border-green-200"
                          : "bg-red-50 border-red-200"
                      }`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-700 mb-1">
                              {idx + 1}. {ans.question.text}
                            </p>
                            <p className="text-sm text-gray-900">
                              <span className="text-gray-500">Cavab: </span>
                              {ans.answer || "—"}
                            </p>
                            {ans.teacherComment && (
                              <p className="text-xs text-blue-700 bg-blue-50 rounded-lg px-3 py-2 mt-2">
                                💬 {ans.teacherComment}
                              </p>
                            )}
                          </div>
                          <div className="flex-shrink-0">
                            {ans.question.type === "OPEN_ENDED" ? (
                              ans.status === "PENDING" ? (
                                <button
                                  onClick={() => { setReviewAnswer(ans); setComment(""); }}
                                  className="bg-blue-900 hover:bg-blue-800 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-all">
                                  Qiymətləndir
                                </button>
                              ) : (
                                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                                  ans.status === "APPROVED"
                                    ? "bg-green-100 text-green-700"
                                    : "bg-red-100 text-red-700"
                                }`}>
                                  {ans.status === "APPROVED" ? "✓ Təsdiqləndi" : "✗ Rədd edildi"}
                                </span>
                              )
                            ) : (
                              <span className={`text-lg ${ans.isCorrect ? "text-green-500" : "text-red-500"}`}>
                                {ans.isCorrect ? "✓" : "✗"}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}