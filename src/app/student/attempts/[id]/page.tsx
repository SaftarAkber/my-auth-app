"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface Question {
  id: string;
  text: string;
  type: "MULTIPLE_CHOICE" | "OPEN_ENDED";
  options: Record<string, string> | null;
  correctAnswer: string | null;
  order: number;
}

interface Answer {
  id: string;
  answer: string;
  isCorrect: boolean | null;
  status: string;
  teacherComment: string | null;
  question: Question;
}

interface AttemptDetail {
  id: string;
  startedAt: string;
  finishedAt: string | null;
  score: number | null;
  totalScore: number | null;
  student: { id: string; name: string; photo: string | null };
  package: {
    id: string;
    name: string;
    isTimed: boolean;
    duration: number | null;
    allowRetry?: boolean;
    group: { id: string; name: string; teacherId: string } | null;
  };
  answers: Answer[];
}

export default function AttemptDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [attempt, setAttempt] = useState<AttemptDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [retryRequested, setRetryRequested] = useState(false);
  const [retryMsg, setRetryMsg] = useState("");

  useEffect(() => {
    fetch(`/api/attempts/${id}`)
      .then(r => r.json())
      .then(d => {
        setAttempt(d);
        setLoading(false);
      });
  }, [id]);

  async function handleRetryRequest() {
    setRetryMsg("");
    try {
      const res = await fetch("/api/enrollment/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          retryPackageId: attempt?.package.id,
          message: `${attempt?.package.name} testini yenidən həll etmək istəyirəm.`,
          groupId: attempt?.package.group?.id,
        }),
      });
      setRetryMsg("✅ Müraciət göndərildi! Müəllim icazə versə bildiriş alacaqsınız.");
      setRetryRequested(true);
    } catch {
      setRetryMsg("❌ Xəta baş verdi");
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

  if (!attempt) return (
    <div className="text-center py-20 text-gray-400">
      <p>Test tapılmadı</p>
      <Link href="/student/profile" className="text-blue-900 text-sm mt-3 inline-block hover:underline">← Geri</Link>
    </div>
  );

  const mc = attempt.answers.filter(a => a.question.type === "MULTIPLE_CHOICE");
  const open = attempt.answers.filter(a => a.question.type === "OPEN_ENDED");
  const correct = mc.filter(a => a.isCorrect === true).length;
  const wrong = mc.filter(a => a.isCorrect === false).length;
  const pct = attempt.totalScore && attempt.totalScore > 0
    ? Math.round(((attempt.score || 0) / attempt.totalScore) * 100) : null;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600 text-sm">← Geri</button>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-bold text-gray-900">{attempt.package.name}</h1>
      </div>

      {/* Nəticə kartı */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-sm text-gray-500 mb-1">Test nəticəsi</p>
            {attempt.finishedAt ? (
              <>
                {pct !== null && (
                  <p className="text-4xl font-bold text-blue-900">{pct}%
                    <span className="text-lg text-gray-400 ml-2">{attempt.score}/{attempt.totalScore}</span>
                  </p>
                )}
                <div className="flex gap-3 mt-2 flex-wrap">
                  {correct > 0 && <span className="text-sm bg-green-100 text-green-700 px-3 py-1 rounded-full font-medium">✓ {correct} doğru</span>}
                  {wrong > 0 && <span className="text-sm bg-red-100 text-red-700 px-3 py-1 rounded-full font-medium">✗ {wrong} yanlış</span>}
                  {open.filter(a => a.status === "PENDING").length > 0 && (
                    <span className="text-sm bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full">
                      ⏳ {open.filter(a => a.status === "PENDING").length} gözlənilir
                    </span>
                  )}
                </div>
              </>
            ) : (
              <p className="text-yellow-600 font-medium">⏳ Test davam edir</p>
            )}
          </div>

          <div className="text-right text-xs text-gray-400 space-y-1">
            <p>📅 {new Date(attempt.startedAt).toLocaleDateString("az-AZ", { day: "numeric", month: "long", year: "numeric" })}</p>
            {attempt.finishedAt && (
              <p>⏱ {Math.round((new Date(attempt.finishedAt).getTime() - new Date(attempt.startedAt).getTime()) / 60000)} dəq</p>
            )}
          </div>
        </div>

        {/* Retry bölməsi */}
        {attempt.finishedAt && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            {attempt.package.allowRetry ? (
              <button
                onClick={() => router.push(`/student/teacher`)}
                className="bg-blue-900 hover:bg-blue-800 text-white font-medium px-5 py-2.5 rounded-xl text-sm transition-all">
                🔄 Yenidən həll et
              </button>
            ) : (
              <div className="flex flex-col gap-2">
                {!retryRequested ? (
                  <button onClick={handleRetryRequest}
                    className="inline-flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium px-5 py-2.5 rounded-xl text-sm transition-all w-fit">
                    📩 Müəllimə yenidən həll etmək üçün müraciət et
                  </button>
                ) : null}
                {retryMsg && (
                  <p className={`text-sm ${retryMsg.startsWith("✅") ? "text-green-600" : "text-red-600"}`}>{retryMsg}</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Cavablar */}
      <h2 className="text-lg font-semibold text-gray-700 mb-4">Cavablarım</h2>
      <div className="space-y-3">
        {attempt.answers
          .slice()
          .sort((a, b) => (a.question.order || 0) - (b.question.order || 0))
          .map((ans, idx) => {
            const isOE = ans.question.type === "OPEN_ENDED";
            const bgClass = isOE
              ? ans.status === "APPROVED" ? "bg-green-50 border-green-200"
              : ans.status === "REJECTED" ? "bg-red-50 border-red-200"
              : "bg-yellow-50 border-yellow-200"
              : ans.isCorrect === true ? "bg-green-50 border-green-200"
              : "bg-red-50 border-red-200";

            return (
              <div key={ans.id} className={`rounded-2xl border p-5 ${bgClass}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900 mb-2">
                      <span className="text-gray-400 mr-1">{idx + 1}.</span>
                      {ans.question.text}
                    </p>

                    {/* MC şıkları */}
                    {!isOE && ans.question.options && (
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {Object.entries(ans.question.options).map(([k, v]) => v && (
                          <span key={k} className={`text-xs px-2.5 py-1 rounded-lg font-medium ${
                            k === ans.question.correctAnswer
                              ? "bg-green-200 text-green-800"
                              : k === ans.answer && ans.answer !== ans.question.correctAnswer
                              ? "bg-red-200 text-red-800"
                              : "bg-white text-gray-500 border border-gray-200"
                          }`}>
                            {k}: {v}
                            {k === ans.question.correctAnswer && " ✓"}
                          </span>
                        ))}
                      </div>
                    )}

                    <p className="text-sm">
                      <span className="text-gray-500">Cavabınız: </span>
                      <span className={`font-medium ${
                        !isOE && ans.isCorrect === false ? "text-red-700 line-through" : "text-gray-900"
                      }`}>{ans.answer || "—"}</span>
                    </p>

                    {ans.teacherComment && (
                      <p className="text-xs text-blue-700 bg-blue-50 rounded-xl px-3 py-2 mt-2">
                        💬 Müəllim: {ans.teacherComment}
                      </p>
                    )}
                  </div>

                  <div className="flex-shrink-0 mt-0.5">
                    {isOE ? (
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                        ans.status === "APPROVED" ? "bg-green-100 text-green-700"
                        : ans.status === "REJECTED" ? "bg-red-100 text-red-700"
                        : "bg-yellow-100 text-yellow-700"
                      }`}>
                        {ans.status === "APPROVED" ? "✓ Düzgün" : ans.status === "REJECTED" ? "✗ Yanlış" : "⏳ Gözlənilir"}
                      </span>
                    ) : (
                      <span className={`text-xl ${ans.isCorrect ? "text-green-500" : "text-red-500"}`}>
                        {ans.isCorrect ? "✓" : "✗"}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}