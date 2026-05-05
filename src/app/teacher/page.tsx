"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

interface Stats {
  students: number;
  videos: number;
  packages: number;
  attempts: number;
  groups: number;
  pendingRequests: number;
}

export default function TeacherDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>({
    students: 0, videos: 0, packages: 0, attempts: 0, groups: 0, pendingRequests: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/teacher/stats")
      .then(r => r.json())
      .then(d => { setStats(d); setLoading(false); });
  }, []);

  const statCards = [
  {
    label: "Qruplarım",
    value: stats.groups,
    icon: "🏫",
    color: "border-blue-100 bg-blue-50 text-blue-700",
    href: "/teacher/groups",
  },
  {
    label: "Tələbələrim",
    value: stats.students,
    icon: "👥",
    color: "border-green-100 bg-green-50 text-green-700",
    href: "/teacher/students",        // ✅ telebelerim
  },
  {
    label: "Test Paketləri",
    value: stats.packages,
    icon: "📝",
    color: "border-purple-100 bg-purple-50 text-purple-700",
    href: "/teacher/tests",
  },
  {
    label: "Videolarım",
    value: stats.videos,
    icon: "🎬",
    color: "border-orange-100 bg-orange-50 text-orange-700",
    href: "/teacher/lessons",
  },
  {
    label: "Həll edilən testlər",
    value: stats.attempts,
    icon: "✅",
    color: "border-teal-100 bg-teal-50 text-teal-700",
    href: "/teacher/attempts",        // ✅ yeni sayfa
  },
  {
    label: "Gələn istəklər",
    value: stats.pendingRequests,
    icon: "⏳",
    color: stats.pendingRequests > 0
      ? "border-yellow-200 bg-yellow-50 text-yellow-700"
      : "border-gray-100 bg-gray-50 text-gray-500",
    href: "/teacher/requests",        // ✅ yeni sayfa
  },
];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Xoş gəldiniz, {user?.name} 👋</h1>
        <p className="text-gray-500 mt-1">EduFlow müəllim panelinə xoş gəldiniz.</p>
      </div>

      {/* Stat kartları */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {statCards.map(s => (
          <Link key={s.label} href={s.href}
            className={`rounded-2xl p-6 border shadow-sm hover:shadow-md transition-all cursor-pointer ${s.color}`}>
            <div className="text-3xl mb-3">{s.icon}</div>
            <p className="text-3xl font-bold">{loading ? "—" : s.value}</p>
            <p className="text-sm mt-1 opacity-80">{s.label}</p>
            <p className="text-xs mt-3 opacity-60">Baxmaq üçün tıklayın →</p>
          </Link>
        ))}
      </div>
    </div>
  );
}