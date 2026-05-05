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

interface Enrollment {
  id: string;
  status: "PENDING" | "ACCEPTED" | "DECLINED";
  createdAt: string;
  student: Student;
  group: { id: string; name: string };
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

type AcceptedStudent = { student: Student; enrollments: Enrollment[] };

export default function TeacherStudentsPage() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [reviewAnswer, setReviewAnswer] = useState<Answer | null>(null);
  const [comment, setComment] = useState("");
  const [reviewLoading, setReviewLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filtered, setFiltered] = useState<AcceptedStudent[]>([]);

  useEffect(() => { fetchEnrollments(); }, []);

  async function fetchEnrollments() {
    try {
      const res = await fetch("/api/enrollment/my");
      const data = await res.json();
      setEnrollments(data.enrollments || data.requests || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  const pending = enrollments.filter(e => e.status === "PENDING");
  const declined = enrollments.filter(e => e.status === "DECLINED");

  const acceptedMap = new Map<string, AcceptedStudent>();
  enrollments.filter(e => e.status === "ACCEPTED").forEach(e => {
    if (!acceptedMap.has(e.student.id)) {
      acceptedMap.set(e.student.id, { student: e.student, enrollments: [] });
    }
    acceptedMap.get(e.student.id)!.enrollments.push(e);
  });
  const acceptedStudents = Array.from(acceptedMap.values());

  useEffect(() => {
    if (!search.trim()) { setFiltered(acceptedStudents); return; }
    setFiltered(acceptedStudents.filter(({ student }) =>
      student.name.toLowerCase().includes(search.toLowerCase()) ||
      student.email?.toLowerCase().includes(search.toLowerCase()) ||
      student.phone?.includes(search)
    ));
  }, [search, enrollments]);

  async function handleRespond(enrollmentId: string, action: "ACCEPTED" | "DECLINED") {
    setActionLoading(enrollmentId);
    try {
      const res = await fetch("/api/enrollment/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enrollmentId, action }),
      });
      if (res.ok) await fetchEnrollments();
    } finally {
      setActionLoading(null);
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
      await fetchEnrollments();
    } finally {
      setReviewLoading(false);
    }
  }

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
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Tələbələrim</h1>

      {/* Arama */}
      <div className="relative mb-6">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Tələbə adı, email və ya telefon ilə axtar..."
          className="w-full border border-gray-300 rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900/30 focus:border-blue-900"
        />
      </div>

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
                  <Link href={`/teacher/students/${e.student.id}`}>
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-xl font-bold text-blue-900 overflow-hidden flex-shrink-0 cursor-pointer hover:ring-2 hover:ring-blue-900 transition-all">
                      {e.student.photo ? <img src={e.student.photo} alt={e.student.name} className="w-full h-full object-cover" /> : e.student.name.charAt(0).toUpperCase()}
                    </div>
                  </Link>
                  <div>
                    <Link href={`/teacher/students/${e.student.id}`}>
                      <p className="font-semibold text-gray-900 hover:text-blue-900 cursor-pointer">{e.student.name}</p>
                    </Link>
                    <p className="text-sm text-gray-500">{e.student.email || e.student.phone || "—"}</p>
                    {e.group && <p className="text-xs text-blue-700 mt-0.5">🏫 {e.group.name}</p>}
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
          <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full">{acceptedStudents.length}</span>
        </h2>

        {acceptedStudents.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm text-center text-gray-400">
            <div className="text-4xl mb-3">👥</div>
            <p>Hələ tələbəniz yoxdur</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm text-center text-gray-400">
            <p>Axtarışa uyğun tələbə tapılmadı</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map(({ student, enrollments: studentEnrollments }) => (
              <div key={student.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between p-5">
                  <div className="flex items-center gap-4">
                    <Link href={`/teacher/students/${student.id}`}>
                      <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-xl font-bold text-blue-900 overflow-hidden flex-shrink-0 cursor-pointer hover:ring-2 hover:ring-blue-900 transition-all">
                        {student.photo ? <img src={student.photo} alt={student.name} className="w-full h-full object-cover" /> : student.name.charAt(0).toUpperCase()}
                      </div>
                    </Link>
                    <div>
                      <Link href={`/teacher/students/${student.id}`}>
                        <p className="font-semibold text-gray-900 hover:text-blue-900 cursor-pointer">{student.name}</p>
                      </Link>
                      <p className="text-sm text-gray-500">{student.email || student.phone || "—"}</p>
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {studentEnrollments.map(e => (
                          <span key={e.id} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                            🏫 {e.group?.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  {/* ✅ Sadece Çıxar butonu — Testlərə Bax kaldırıldı */}
                  <button onClick={() => handleRespond(studentEnrollments[0].id, "DECLINED")}
                    disabled={actionLoading === studentEnrollments[0].id}
                    className="text-red-400 hover:text-red-600 text-sm transition-all px-3 py-2">
                    Çıxar
                  </button>
                </div>
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