"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Question {
  id: string;
  text: string;
  type: string;
  options: Record<string, string> | null;
  correctAnswer: string | null;
}

interface Answer {
  id: string;
  answer: string;
  isCorrect: boolean | null;
  status: string;
  teacherComment: string | null;
  question: Question;
}

interface Attempt {
  id: string;
  startedAt: string;
  finishedAt: string | null;
  score: number | null;
  totalScore: number | null;
  package: {
    id: string;
    name: string;
    collection: { name: string };
  };
  answers: Answer[];
}

export default function MyTestsPage() {
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/attempts")
      .then((r) => r.json())
      .then((d) => {
        setAttempts(d.attempts || []);
        setLoading(false);
      });
  }, []);

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

  // Koleksiyona göre grupla
  const grouped: Record<string, Attempt[]> = {};
  attempts.forEach((a) => {
    // Eğer collection yoksa "Genel" veya "Kategorisiz" ismini veriyoruz
    // Köhnə kod: const col = a.package.collection.name;
    // Yeni təhlükəsiz kod:
    const col = a.package?.collection?.name || "Ümumi";

    if (!grouped[col]) grouped[col] = [];
    grouped[col].push(a);
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">
        Yaptığım Testler
      </h1>

      {attempts.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 border border-gray-200 text-center text-gray-400">
          <div className="text-4xl mb-3">📝</div>
          <p>Henüz test çözmediniz</p>
          <Link
            href="/student"
            className="mt-4 inline-block text-blue-900 text-sm font-medium hover:underline"
          >
            Öğretmen sayfasına git →
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([colName, colAttempts]) => (
            <div key={colName}>
              <h2 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <span>📚</span> {colName}
              </h2>
              <div className="space-y-3">
                {colAttempts.map((a) => (
                  <div
                    key={a.id}
                    className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden"
                  >
                    {/* Özet satır */}
                    <div
                      className="flex items-center justify-between p-5 cursor-pointer hover:bg-gray-50 transition-all"
                      onClick={() =>
                        setExpandedId(expandedId === a.id ? null : a.id)
                      }
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-900 font-bold text-sm">
                          📝
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">
                            {a.package.name}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {new Date(a.startedAt).toLocaleDateString("tr-TR", {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {a.finishedAt ? (
                          <div className="text-right">
                            {a.totalScore !== null && a.totalScore > 0 && (
                              <p className="font-bold text-gray-900">
                                {a.score}/{a.totalScore}
                                <span className="text-xs text-gray-500 ml-1">
                                  doğru
                                </span>
                              </p>
                            )}
                            <p className="text-xs text-green-600">Tamamlandı</p>
                          </div>
                        ) : (
                          <span className="text-xs text-yellow-600 bg-yellow-50 px-2 py-1 rounded-full">
                            Devam ediyor
                          </span>
                        )}
                        <span className="text-gray-400 text-sm">
                          {expandedId === a.id ? "▲" : "▼"}
                        </span>
                      </div>
                    </div>

                    {/* Detay — cevaplar */}
                    {expandedId === a.id && (
                      <div className="border-t border-gray-100 p-5 space-y-3">
                        {a.answers.map((ans, idx) => (
                          <div
                            key={ans.id}
                            className={`rounded-xl p-4 border ${
                              ans.question.type === "OPEN_ENDED"
                                ? ans.status === "APPROVED"
                                  ? "bg-green-50 border-green-200"
                                  : ans.status === "REJECTED"
                                    ? "bg-red-50 border-red-200"
                                    : "bg-yellow-50 border-yellow-200"
                                : ans.isCorrect === true
                                  ? "bg-green-50 border-green-200"
                                  : ans.isCorrect === false
                                    ? "bg-red-50 border-red-200"
                                    : "bg-gray-50 border-gray-200"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900 mb-1">
                                  <span className="text-gray-400 mr-2">
                                    {idx + 1}.
                                  </span>
                                  {ans.question.text}
                                </p>

                                {/* Çoktan seçmeli şıklar */}
                                {ans.question.type === "MULTIPLE_CHOICE" &&
                                  ans.question.options && (
                                    <div className="flex flex-wrap gap-1.5 mt-2">
                                      {Object.entries(ans.question.options).map(
                                        ([k, v]) =>
                                          v && (
                                            <span
                                              key={k}
                                              className={`text-xs px-2 py-1 rounded-lg ${
                                                k === ans.question.correctAnswer
                                                  ? "bg-green-200 text-green-800 font-bold"
                                                  : k === ans.answer &&
                                                      ans.answer !==
                                                        ans.question
                                                          .correctAnswer
                                                    ? "bg-red-200 text-red-800"
                                                    : "bg-white text-gray-600 border border-gray-200"
                                              }`}
                                            >
                                              {k}: {v}
                                            </span>
                                          ),
                                      )}
                                    </div>
                                  )}

                                <p className="text-sm mt-2">
                                  <span className="text-gray-500">
                                    Cevabınız:{" "}
                                  </span>
                                  <span className="font-medium text-gray-900">
                                    {ans.answer}
                                  </span>
                                </p>

                                {ans.teacherComment && (
                                  <p className="text-xs text-blue-700 bg-blue-50 rounded-lg px-3 py-2 mt-2">
                                    💬 Öğretmen: {ans.teacherComment}
                                  </p>
                                )}
                              </div>

                              <div className="flex-shrink-0">
                                {ans.question.type === "OPEN_ENDED" ? (
                                  <span
                                    className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                                      ans.status === "APPROVED"
                                        ? "bg-green-100 text-green-700"
                                        : ans.status === "REJECTED"
                                          ? "bg-red-100 text-red-700"
                                          : "bg-yellow-100 text-yellow-700"
                                    }`}
                                  >
                                    {ans.status === "APPROVED"
                                      ? "✓ Onaylandı"
                                      : ans.status === "REJECTED"
                                        ? "✗ Reddedildi"
                                        : "⏳ Bekliyor"}
                                  </span>
                                ) : (
                                  <span
                                    className={`text-lg ${ans.isCorrect ? "text-green-500" : "text-red-500"}`}
                                  >
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
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
