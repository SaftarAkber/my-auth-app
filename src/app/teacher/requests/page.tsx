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
  message: string | null;
  createdAt: string;
  student: Student;
  group: { id: string; name: string };
}

export default function TeacherRequestsPage() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");

  useEffect(() => { fetchEnrollments(); }, []);

  async function fetchEnrollments() {
    try {
      const res = await fetch("/api/enrollment/my");
      const data = await res.json();
      setEnrollments((data.enrollments || data.requests || []).filter((e: Enrollment) => e.status === "PENDING"));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function handleRespond(enrollmentId: string, action: "ACCEPTED" | "DECLINED") {
    setActionLoading(enrollmentId);
    try {
      await fetch("/api/enrollment/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: enrollmentId,
          action,
          teacherReply: replyText[enrollmentId] || null,
        }),
      });
      await fetchEnrollments();
    } finally {
      setActionLoading(null);
    }
  }

  const filtered = search.trim()
    ? enrollments.filter(e =>
        e.student.name.toLowerCase().includes(search.toLowerCase()) ||
        e.student.email?.toLowerCase().includes(search.toLowerCase()) ||
        e.student.phone?.includes(search)
      )
    : enrollments;

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
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Gələn istəklər</h1>

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

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 border border-gray-200 shadow-sm text-center text-gray-400">
          <div className="text-4xl mb-3">📩</div>
          <p>{search.trim() ? "Axtarışa uyğun istək tapılmadı" : "Gələn istək yoxdur"}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(e => (
            <div key={e.id} className="bg-white rounded-2xl p-5 border border-yellow-200 shadow-sm">
              <div className="flex items-start gap-4">
                <Link href={`/teacher/students/${e.student.id}`}>
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-xl font-bold text-blue-900 overflow-hidden flex-shrink-0 cursor-pointer hover:ring-2 hover:ring-blue-900 transition-all">
                    {e.student.photo ? (
                      <img src={e.student.photo} alt={e.student.name} className="w-full h-full object-cover" />
                    ) : e.student.name.charAt(0).toUpperCase()}
                  </div>
                </Link>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link href={`/teacher/students/${e.student.id}`}>
                      <p className="font-semibold text-gray-900 hover:text-blue-900 cursor-pointer">{e.student.name}</p>
                    </Link>
                    <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                      {e.group.name}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">{e.student.email || e.student.phone || "—"}</p>
                  {e.message && (
                    <div className="bg-gray-50 rounded-xl px-4 py-2 mt-3 text-sm text-gray-700">
                      💬 {e.message}
                    </div>
                  )}
                  <div className="mt-3">
                    <input
                      type="text"
                      value={replyText[e.id] || ""}
                      onChange={ev => setReplyText(prev => ({ ...prev, [e.id]: ev.target.value }))}
                      placeholder="Cavab yazın (isteğe bağlı)..."
                      className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900/30 focus:border-blue-900"
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={() => handleRespond(e.id, "ACCEPTED")} disabled={actionLoading === e.id}
                  className="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white font-medium py-2 rounded-xl text-sm transition-all">
                  ✓ Qəbul et
                </button>
                <button onClick={() => handleRespond(e.id, "DECLINED")} disabled={actionLoading === e.id}
                  className="flex-1 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white font-medium py-2 rounded-xl text-sm transition-all">
                  ✗ Rədd et
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}