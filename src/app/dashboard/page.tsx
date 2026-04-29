"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function DashboardPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="w-3 h-3 bg-emerald-500 rounded-full animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-4xl mx-auto p-8">
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-500/20 rounded-2xl border border-emerald-500/30 flex items-center justify-center text-xl font-bold text-emerald-400">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-white font-bold text-lg">{user.name}</h1>
              <p className="text-slate-400 text-sm">{user.phone}</p>
            </div>
          </div>
          <button onClick={logout}
            className="bg-slate-700/50 hover:bg-slate-700 text-slate-300 hover:text-white px-4 py-2 rounded-xl text-sm font-medium transition-all border border-slate-600/50">
            Çıxış
          </button>
        </div>

        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-8 mb-6">
          <div className="text-4xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-white mb-2">Xoş gəldiniz, {user.name}!</h2>
          <p className="text-slate-300">Hesabınıza uğurla daxil oldunuz.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: "İD", value: user.id.slice(0, 8) + "...", icon: "🆔" },
            { label: "WhatsApp", value: user.phone, icon: "📱" },
            { label: "Email", value: user.email || "Qeyd edilməyib", icon: "✉️" },
          ].map((item) => (
            <div key={item.label} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
              <div className="text-2xl mb-2">{item.icon}</div>
              <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">{item.label}</p>
              <p className="text-white font-mono text-sm truncate">{item.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}