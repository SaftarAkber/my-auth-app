"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";

interface Stats {
  students: number;
  videos: number;
  packages: number;
  attempts: number;
  pendingRequests: number;
  groups: number;
}

interface EnrollmentRequest {
  id: string;
  message: string | null;
  createdAt: string;
  status: string;
  student: { id: string; name: string; photo: string | null; email: string | null; phone: string | null };
  group: { id: string; name: string };
}

export default function TeacherDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>({
    students: 0, videos: 0, packages: 0,
    attempts: 0, pendingRequests: 0, groups: 0,
  });
  const [requests, setRequests] = useState<EnrollmentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    const [statsRes, reqRes] = await Promise.all([
      fetch("/api/teacher/stats"),
      fetch("/api/enrollment/my"),
    ]);
    const statsData = await statsRes.json();
    const reqData = await reqRes.json();
    setStats(statsData);
    setRequests((reqData.requests || []).filter((r: EnrollmentRequest) => r.status === "PENDING"));
    setLoading(false);
  }

  async function handleRespond(requestId: string, action: "ACCEPTED" | "DECLINED") {
    setActionLoading(requestId);
    try {
      await fetch("/api/enrollment/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId,
          action,
          teacherReply: replyText[requestId] || null,
        }),
      });
      await fetchData();
    } finally {
      setActionLoading(null);
    }
  }

  const statCards = [
    { label: "Tələbə", value: stats.students, icon: "👥", color: "bg-blue-50 text-blue-700 border-blue-100" },
    { label: "Video", value: stats.videos, icon: "🎬", color: "bg-green-50 text-green-700 border-green-100" },
    { label: "Test Paketi", value: stats.packages, icon: "📝", color: "bg-purple-50 text-purple-700 border-purple-100" },
    { label: "Həll edilən test", value: stats.attempts, icon: "✅", color: "bg-orange-50 text-orange-700 border-orange-100" },
    { label: "Qrup", value: stats.groups, icon: "🏫", color: "bg-teal-50 text-teal-700 border-teal-100" },
    { label: "Gözləyən müraciət", value: stats.pendingRequests, icon: "📩", color: stats.pendingRequests > 0 ? "bg-red-50 text-red-700 border-red-200" : "bg-gray-50 text-gray-700 border-gray-100" },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Xoş gəldiniz, {user?.name} 👋</h1>
        <p className="text-gray-500 mt-1">EduFlow müəllim panelinizə xoş gəldiniz.</p>
      </div>

      {/* Statistika */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {statCards.map(s => (
          <div key={s.label} className={`bg-white rounded-2xl p-5 border shadow-sm ${s.color}`}>
            <div className="text-2xl mb-2">{s.icon}</div>
            <p className="text-2xl font-bold">{loading ? "—" : s.value}</p>
            <p className="text-xs mt-1 opacity-80">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Gözləyən müraciətlər */}
      {requests.length > 0 && (
        <div className="bg-white rounded-2xl border border-yellow-200 shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-5 flex items-center gap-2">
            📩 Gözləyən Müraciətlər
            <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{requests.length}</span>
          </h2>
          <div className="space-y-4">
            {requests.map(r => (
              <div key={r.id} className="border border-gray-100 rounded-2xl p-5">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-xl font-bold text-blue-900 overflow-hidden flex-shrink-0">
                    {r.student.photo ? (
                      <img src={r.student.photo} alt={r.student.name} className="w-full h-full object-cover" />
                    ) : r.student.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-900">{r.student.name}</p>
                      <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                        {r.group.name}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">{r.student.email || r.student.phone || "—"}</p>
                    {r.message && (
                      <div className="bg-gray-50 rounded-xl px-4 py-2 mt-3 text-sm text-gray-700">
                        💬 {r.message}
                      </div>
                    )}
                    <div className="mt-3">
                      <input
                        type="text"
                        value={replyText[r.id] || ""}
                        onChange={e => setReplyText(prev => ({ ...prev, [r.id]: e.target.value }))}
                        placeholder="Cavab yazın (isteğe bağlı)..."
                        className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900/30 focus:border-blue-900"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button onClick={() => handleRespond(r.id, "ACCEPTED")} disabled={actionLoading === r.id}
                    className="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white font-medium py-2 rounded-xl text-sm transition-all">
                    ✓ Qəbul et
                  </button>
                  <button onClick={() => handleRespond(r.id, "DECLINED")} disabled={actionLoading === r.id}
                    className="flex-1 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white font-medium py-2 rounded-xl text-sm transition-all">
                    ✗ Rədd et
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sürətli keçid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Sürətli keçid</h2>
          <div className="space-y-2">
            {[
              { href: "/teacher/groups", label: "Qruplarım", icon: "🏫" },
              { href: "/teacher/lessons", label: "Dərs Videoları", icon: "🎬" },
              { href: "/teacher/tests", label: "Test Paketi", icon: "📝" },
              { href: "/teacher/students", label: "Tələbələrim", icon: "👥" },
            ].map(item => (
              <Link key={item.href} href={item.href}
                className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 transition-all text-gray-700 border border-gray-100">
                <span>{item.icon}</span>
                <span className="text-sm font-medium">{item.label}</span>
                <span className="ml-auto text-gray-400">→</span>
              </Link>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Məlumat</h2>
          <div className="space-y-3 text-sm text-gray-600">
            <p>📌 Testləri yayımlamadan əvvəl sualları əlavə edin.</p>
            <p>📌 Videoları kolleksiyalara bağlayaraq nizamlayın.</p>
            <p>📌 Tələbə müraciətləri buradan qəbul/rədd edilir.</p>
            <p>📌 Açıq uçlu sualları Tələbələrim səhifəsindən qiymətləndirin.</p>
          </div>
        </div>
      </div>
    </div>
  );
}