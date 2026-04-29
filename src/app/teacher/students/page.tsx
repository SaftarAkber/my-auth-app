"use client";

import { useEffect, useState } from "react";

interface Student {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  photo: string | null;
  createdAt: string;
}

interface Enrollment {
  id: string;
  status: "PENDING" | "ACCEPTED" | "DECLINED";
  createdAt: string;
  student: Student;
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
  package: { name: string };
  answers: Answer[];
}

export default function TeacherStudentsPage() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [studentAttempts, setStudentAttempts] = useState<Record<string, AttemptWithAnswers[]>>({});
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);
  const [expandedAttempt, setExpandedAttempt] = useState<string | null>(null);
  const [reviewAnswer, setReviewAnswer] = useState<Answer | null>(null);
  const [comment, setComment] = useState("");
  const [reviewLoading, setReviewLoading] = useState(false);

  useEffect(() => { fetchEnrollments(); }, []);

  async function fetchEnrollments() {
    try {
      const res = await fetch("/api/enrollment/my");
      const data = await res.json();
      
      setEnrollments(data.requests || data.enrollments || []); 
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function handleRespond(enrollmentId: string, action: "ACCEPTED" | "DECLINED") {
    setActionLoading(enrollmentId);
    try {
      const res = await fetch("/api/enrollment/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enrollmentId, action }),
      });
      if (res.ok) await fetchEnrollments();
    } catch (error) {
      console.error(error);
    } finally {
      setActionLoading(null);
    }
  }

  async function fetchStudentAttempts(studentId: string) {
    if (expandedStudent === studentId) {
      setExpandedStudent(null);
      return;
    }
    if (!studentAttempts[studentId]) {
      const res = await fetch(`/api/teacher/student-attempts/${studentId}`);
      const data = await res.json();
      setStudentAttempts(prev => ({ ...prev, [studentId]: data.attempts || [] }));
    }
    setExpandedStudent(studentId);
    setExpandedAttempt(null);
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
      if (expandedStudent) {
        const res = await fetch(`/api/teacher/student-attempts/${expandedStudent}`);
        const data = await res.json();
        setStudentAttempts(prev => ({ ...prev, [expandedStudent]: data.attempts || [] }));
      }
    } finally {
      setReviewLoading(false);
    }
  }

  const pending = enrollments.filter(e => e.status === "PENDING");
  const accepted = enrollments.filter(e => e.status === "ACCEPTED");
  const declined = enrollments.filter(e => e.status === "DECLINED");

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
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Tələbələrim</h1>

      {/* Açık uçlu değerlendirme modal */}
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Şərh (isteğe bağlı)
              </label>
              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                rows={3}
                placeholder="Tələbəyə şərh yazın..."
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900/30 resize-none"
              />
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

      {/* Gözləyən müraciətlər */}
      {pending.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-yellow-400 rounded-full"></span>
            Gözləyən Müraciətlər
            <span className="bg-yellow-100 text-yellow-700 text-xs font-bold px-2 py-0.5 rounded-full">{pending.length}</span>
          </h2>
          <div className="space-y-3">
            {pending.map(e => (
              <div key={e.id} className="bg-white rounded-2xl p-5 border border-yellow-200 shadow-sm flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-xl font-bold text-blue-900 overflow-hidden flex-shrink-0">
                    {e.student.photo ? (
                      <img src={e.student.photo} alt={e.student.name} className="w-full h-full object-cover" />
                    ) : e.student.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{e.student.name}</p>
                    <p className="text-sm text-gray-500">{e.student.email || e.student.phone || "—"}</p>
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => handleRespond(e.id, "ACCEPTED")} disabled={actionLoading === e.id}
                    className="bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white font-medium px-4 py-2 rounded-xl text-sm transition-all">
                    ✓ Qəbul et
                  </button>
                  <button onClick={() => handleRespond(e.id, "DECLINED")} disabled={actionLoading === e.id}
                    className="bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white font-medium px-4 py-2 rounded-xl text-sm transition-all">
                    ✗ Rədd et
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Qəbul edilmiş tələbələr */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <span className="w-2 h-2 bg-green-400 rounded-full"></span>
          Tələbələrim
          <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full">{accepted.length}</span>
        </h2>

        {accepted.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm text-center text-gray-400">
            <div className="text-4xl mb-3">👥</div>
            <p>Hələ tələbəniz yoxdur</p>
          </div>
        ) : (
          <div className="space-y-4">
            {accepted.map(e => (
              <div key={e.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                {/* Tələbə başlık */}
                <div className="flex items-center justify-between p-5">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-xl font-bold text-blue-900 overflow-hidden flex-shrink-0">
                      {e.student.photo ? (
                        <img src={e.student.photo} alt={e.student.name} className="w-full h-full object-cover" />
                      ) : e.student.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{e.student.name}</p>
                      <p className="text-sm text-gray-500">{e.student.email || e.student.phone || "—"}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => fetchStudentAttempts(e.student.id)}
                      className="bg-blue-50 hover:bg-blue-100 text-blue-900 font-medium px-4 py-2 rounded-xl text-sm transition-all">
                      {expandedStudent === e.student.id ? "▲ Testleri Gizlə" : "▼ Testlərə Bax"}
                    </button>
                    <button onClick={() => handleRespond(e.id, "DECLINED")} disabled={actionLoading === e.id}
                      className="text-red-400 hover:text-red-600 text-sm transition-all px-3 py-2">
                      Çıxar
                    </button>
                  </div>
                </div>

                {/* Tələbənin testleri */}
                {expandedStudent === e.student.id && (
                  <div className="border-t border-gray-100 p-5">
                    {!studentAttempts[e.student.id] ? (
                      <div className="text-center text-gray-400 py-4">Yüklənir...</div>
                    ) : studentAttempts[e.student.id].length === 0 ? (
                      <div className="text-center text-gray-400 py-4">
                        <p>Bu tələbə hələ test həll etməyib</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {studentAttempts[e.student.id].map(attempt => {
                          const pendingAnswers = attempt.answers.filter(
                            a => a.question.type === "OPEN_ENDED" && a.status === "PENDING"
                          );

                          return (
                            <div key={attempt.id} className="border border-gray-100 rounded-xl overflow-hidden">
                              {/* Test özeti */}
                              <div
                                className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-all"
                                onClick={() => setExpandedAttempt(expandedAttempt === attempt.id ? null : attempt.id)}>
                                <div>
                                  <p className="font-medium text-gray-900 text-sm">{attempt.package.name}</p>
                                  <div className="flex gap-3 mt-1">
                                    {attempt.finishedAt ? (
                                      <>
                                        <span className="text-xs text-gray-500">
                                          {new Date(attempt.finishedAt).toLocaleDateString("az-AZ")}
                                        </span>
                                        {attempt.totalScore !== null && attempt.totalScore > 0 && (
                                          <span className="text-xs font-medium text-blue-700">
                                            {attempt.score}/{attempt.totalScore} doğru
                                          </span>
                                        )}
                                        {pendingAnswers.length > 0 && (
                                          <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
                                            {pendingAnswers.length} cavab gözləyir
                                          </span>
                                        )}
                                      </>
                                    ) : (
                                      <span className="text-xs text-yellow-600">Davam edir</span>
                                    )}
                                  </div>
                                </div>
                                <span className="text-gray-400 text-sm">
                                  {expandedAttempt === attempt.id ? "▲" : "▼"}
                                </span>
                              </div>

                              {/* Cavablar */}
                              {expandedAttempt === attempt.id && (
                                <div className="border-t border-gray-100 p-4 space-y-3">
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
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Rədd edilənlər */}
      {declined.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-red-400 rounded-full"></span>
            Rədd edilənlər
            <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full">{declined.length}</span>
          </h2>
          <div className="space-y-3">
            {declined.map(e => (
              <div key={e.id} className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm flex items-center justify-between gap-4 opacity-60">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-xl font-bold text-gray-500 overflow-hidden flex-shrink-0">
                    {e.student.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-700">{e.student.name}</p>
                    <p className="text-sm text-gray-400">{e.student.email || e.student.phone || "—"}</p>
                  </div>
                </div>
                <button onClick={() => handleRespond(e.id, "ACCEPTED")} disabled={actionLoading === e.id}
                  className="bg-green-500 hover:bg-green-600 text-white font-medium px-4 py-2 rounded-xl text-sm transition-all">
                  Qəbul et
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}