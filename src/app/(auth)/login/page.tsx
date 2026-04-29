"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(identifier, password);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Xəta baş verdi");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Sol panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-64 h-64 bg-blue-400 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-80 h-80 bg-blue-300 rounded-full blur-3xl" />
        </div>
        <div className="relative">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎓</span>
            <span className="text-white font-bold text-xl">Edu</span>
          </div>
        </div>
        <div className="relative">
          <h2 className="text-4xl font-bold text-white leading-tight mb-4">
            Yeni nəsil öyrənənləri gücləndiririk.
          </h2>
          <p className="text-blue-200 text-lg">
            Dərin fokus və akademik mükəmməllik üçün nəzərdə tutulmuş birgə mühitdə minlərlə tələbə və müəllimə qoşulun.
          </p>
        </div>
        <div className="relative">
          <div className="flex items-center gap-2 text-blue-200 text-sm">
            <span>⭐</span>
            <span>10 mindən çox müəllim qoşulub</span>
          </div>
        </div>
      </div>

      {/* Sağ panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Yenidən xoş gördük</h1>
          <p className="text-gray-500 mb-8">Edu hesabınıza daxil olun.</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Telefon və ya Email
              </label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="+994501234567 və ya name@example.com"
                required
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-900/30 focus:border-blue-900 transition-all"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-gray-700">Şifrə</label>
                <Link href="/forgot-password" className="text-xs text-blue-900 hover:underline">
                  Şifrəni unutmusunuz?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 pr-12 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-900/30 focus:border-blue-900 transition-all"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-sm">
                ⚠️ {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full bg-blue-900 hover:bg-blue-800 disabled:bg-blue-900/50 text-white font-semibold py-3 rounded-xl transition-all">
              {loading ? "Giriş edilir..." : "Daxil ol"}
            </button>
          </form>

          <p className="text-center text-gray-500 text-sm mt-6">
            Hesabınız yoxdur?{" "}
            <Link href="/register" className="text-blue-900 font-medium hover:underline">
              Hesab yaradın
            </Link>
          </p>

          <div className="flex justify-center gap-6 mt-8 text-xs text-gray-400">
            <a href="#" className="hover:text-gray-600">Məxfilik Siyasəti</a>
            <a href="#" className="hover:text-gray-600">İstifadə Şərtləri</a>
          </div>
        </div>
      </div>
    </div>
  );
}