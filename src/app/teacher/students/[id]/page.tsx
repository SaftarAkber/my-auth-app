"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface Student {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  photo: string | null;
  bio: string | null;
  createdAt: string;
}

interface Enrollment {
  id: string;
  group: { id: string; name: string };
}

interface Answer {
  id: string;
  answer: string;
  isCorrect: boolean | null;
  status: string;
  teacherComment: string | null;
  question: { text: string; type: string };
}

interface Attempt {
  id: string;
  finishedAt: string | null;
  score: number | null;
  totalScore: number | null;
  package: { name: string; collection: { name: string } | null };
  answers: Answer[];
}

export default function StudentProfilePage() {
  const params = useParams();
  const id = params.id as string;
  const [student, setStudent] = useState<Student | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedAttempt, setExpandedAttempt] = useState<string | null>(null);

  useEffect(() => { fetchData(); }, [id]);

  async function fetchData() {
    try {
      const res = await fetch(`/api/teacher/student/${id}`);
      const data = await res.json();
      setStudent(data.student);
      setEnrollments(data.enrollments || []);
      setAttempts(data.attempts || []);
    } finally {
      setLoading(false);
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

  if (!student) return (
    <div className="text-center py-20 text-gray-400">
      <p>Tələbə tapılmadı</p>
      <Link href="/teacher/students" className="text-blue-900 text-sm mt-3 inline-block hover:underline">← Geri</Link>
    </div>
  );

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/teacher/students" className="text-gray-400 hover:text-gray-600 text-sm">← Tələbələrim</Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-bold text-gray-900">{student.name}</h1>
      </div>

      {/* Profil kartı */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-6">
        <div className="h-24 bg-gradient-to-br from-blue-800 to-blue-600" />
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-blue-100 border-4 border-white -mt-10 flex items-center justify-center text-2xl font-bold text-blue-900 overflow-hidden flex-shrink-0 shadow-md">
              {student.photo
                ? <img src={student.photo} alt={student.name} className="w-full h-full object-cover" />
                : student.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 mt-1">
              <h2 className="text-xl font-bold text-gray-900">{student.name}</h2>
              {student.bio && <p className="text-gray-500 text-sm mt-1">{student.bio}</p>}
              <div className="flex gap-3 mt-2 flex-wrap">
                {student.phone && <span className="text-sm text-gray-500">📱 {student.phone}</span>}
                {student.email && <span className="text-sm text-gray-500">✉️ {student.email}</span>}
              </div>
              {/* Qruplar */}
              <div className="flex gap-2 mt-3 flex-wrap">
                {enrollments.map(e => (
                  <Link key={e.id} href={`/teacher/groups/${e.group.id}`}
                    className="text-xs bg-blue-50 text-blue-700 px-3 py-1 rounded-full hover:bg-blue-100 transition-all">
                    🏫 {e.group.name}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* İstatistikler */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-blue-900">{enrollments.length}</p>
          <p className="text-xs text-gray-500 mt-1">Qrup</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-blue-900">{attempts.length}</p>
          <p className="text-xs text-gray-500 mt-1">Test</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-blue-900">
            {attempts.filter(a => a.totalScore && a.totalScore > 0 && a.score !== null
              ? (a.score / a.totalScore) >= 0.7 : false).length}
          </p>
          <p className="text-xs text-gray-500 mt-1">Uğurlu test</p>
        </div>
      </div>

      {/* Tamamlanan testler */}
      <h2 className="text-lg font-semibold text-gray-700 mb-4">Tamamladığı Testlər</h2>

      {attempts.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 border border-gray-200 text-center text-gray-400">
          <div className="text-4xl mb-3">📝</div>
          <p>Hələ test həll etməyib</p>
        </div>
      ) : (
        <div className="space-y-3">
          {attempts.map(attempt => {
            const pendingAnswers = attempt.answers.filter(
              a => a.question.type === "OPEN_ENDED" && a.status === "PENDING"
            );
            return (
              <div key={attempt.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between p-5 cursor-pointer hover:bg-gray-50 transition-all"
                  onClick={() => setExpandedAttempt(expandedAttempt === attempt.id ? null : attempt.id)}>
                  <div>
                    <p className="font-semibold text-gray-900">{attempt.package.name}</p>
                    <div className="flex gap-3 mt-1 flex-wrap">
                      {attempt.package.collection && (
                        <span className="text-xs text-gray-400">📚 {attempt.package.collection.name}</span>
                      )}
                      {attempt.finishedAt && (
                        <span className="text-xs text-gray-500">
                          {new Date(attempt.finishedAt).toLocaleDateString("az-AZ")}
                        </span>
                      )}
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
                    </div>
                  </div>
                  <span className="text-gray-400">{expandedAttempt === attempt.id ? "▲" : "▼"}</span>
                </div>

                {expandedAttempt === attempt.id && (
                  <div className="border-t border-gray-100 p-5 space-y-3">
                    {attempt.answers.map((ans, idx) => (
                      <div key={ans.id} className={`rounded-xl p-4 border ${
                        ans.question.type === "OPEN_ENDED"
                          ? ans.status === "APPROVED" ? "bg-green-50 border-green-200"
                          : ans.status === "REJECTED" ? "bg-red-50 border-red-200"
                          : "bg-yellow-50 border-yellow-200"
                          : ans.isCorrect ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
                      }`}>
                        <p className="text-sm font-medium text-gray-700 mb-1">{idx + 1}. {ans.question.text}</p>
                        <p className="text-sm text-gray-900"><span className="text-gray-500">Cavab: </span>{ans.answer || "—"}</p>
                        {ans.teacherComment && (
                          <p className="text-xs text-blue-700 bg-blue-50 rounded-lg px-3 py-2 mt-2">💬 {ans.teacherComment}</p>
                        )}
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