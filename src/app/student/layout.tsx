"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
const menuItems = [
  { href: "/student", label: "Ana Səhifə", icon: "🏠" },
  { href: "/student/teacher", label: "Müəllim Səhifəsi", icon: "👨‍🏫" },
  { href: "/student/my-tests", label: "Testlərim", icon: "📝" },
  { href: "/student/settings", label: "Tənzimləmələr", icon: "⚙️" },
];

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
    if (!loading && user && user.role !== "STUDENT") router.replace("/teacher");
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="w-3 h-3 bg-blue-900 rounded-full animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-blue-900 transform transition-transform duration-200 lg:relative lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex flex-col h-full">
          <div className="flex items-center gap-2 px-6 py-5 border-b border-blue-800">
            <span className="text-2xl">🎓</span>
            <span className="text-white font-bold text-xl">Edu</span>
          </div>

          <div className="px-6 py-4 border-b border-blue-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-700 flex items-center justify-center text-white font-bold text-lg overflow-hidden">
                {user.photo ? (
                  <img src={user.photo} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  user.name.charAt(0).toUpperCase()
                )}
              </div>
              <div>
                <p className="text-white font-medium text-sm">{user.name}</p>
                <p className="text-blue-300 text-xs">Tələbə</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 px-4 py-4 space-y-1">
            {menuItems.map((item) => (
              <Link key={item.href} href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  pathname === item.href
                    ? "bg-white/20 text-white"
                    : "text-blue-200 hover:bg-white/10 hover:text-white"
                }`}>
                <span>{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="px-4 py-4 border-t border-blue-800">
            <button onClick={logout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-blue-200 hover:bg-white/10 hover:text-white text-sm font-medium transition-all">
              <span>🚪</span> Çıxış et
            </button>
          </div>
        </div>
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-gray-600">☰</button>
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-sm text-gray-500">{user.email || user.phone}</span>
          </div>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}