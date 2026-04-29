"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

type Role = "STUDENT" | "TEACHER";

export default function RegisterPage() {
  const { register } = useAuth();
  const [role, setRole] = useState<Role>("STUDENT");
  const [loginMethod, setLoginMethod] = useState<"phone" | "email">("phone");
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [teacherFull, setTeacherFull] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleRoleClick(r: Role) {
    if (r === "TEACHER") {
      // Müəllim yerinin dolu olub-olmadığını yoxla
      const res = await fetch("/api/auth/teacher-available");
      const data = await res.json();
      if (!data.available) {
        setTeacherFull(true);
        return;
      }
      setTeacherFull(false);
    }
    setRole(r);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Şifrələr uyğun gəlmir");
      return;
    }

    setLoading(true);
    try {
      await register({
        name: formData.name,
        phone: loginMethod === "phone" ? formData.phone : undefined,
        email: loginMethod === "email" ? formData.email : undefined,
        password: formData.password,
        role,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Xəta baş verdi");
    } finally {
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Hesab yaradın</h1>
          <p className="text-gray-500 mb-8">Edu ilə öyrənmə yolculuğunuza bu gün başlayın.</p>

          {/* Rol seçimi */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">Rolunuzu seçin</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleRoleClick("STUDENT")}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                  role === "STUDENT"
                    ? "border-blue-900 bg-blue-50 text-blue-900"
                    : "border-gray-200 text-gray-600 hover:border-gray-300"
                }`}
              >
                <span className="text-2xl">👤</span>
                <span className="font-medium text-sm">Tələbə</span>
              </button>

              <button
                type="button"
                onClick={() => handleRoleClick("TEACHER")}
                disabled={teacherFull}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all relative ${
                  teacherFull
                    ? "border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed opacity-60"
                    : role === "TEACHER"
                    ? "border-blue-900 bg-blue-50 text-blue-900"
                    : "border-gray-200 text-gray-600 hover:border-gray-300"
                }`}
              >
                <span className="text-2xl">🎓</span>
                <span className="font-medium text-sm">Müəllim</span>
                {teacherFull && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">Dolu</span>
                )}
              </button>
            </div>
            {teacherFull && (
              <p className="text-red-500 text-xs mt-2">Müəllim kontingenti dolub.</p>
            )}
          </div>

          {/* Giriş yöntemi */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">Qeydiyyat üsulu</label>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setLoginMethod("phone")}
                className={`py-2 rounded-xl border-2 text-sm font-medium transition-all ${
                  loginMethod === "phone" ? "border-blue-900 bg-blue-50 text-blue-900" : "border-gray-200 text-gray-600"
                }`}>
                📱 Telefon
              </button>
              <button type="button" onClick={() => setLoginMethod("email")}
                className={`py-2 rounded-xl border-2 text-sm font-medium transition-all ${
                  loginMethod === "email" ? "border-blue-900 bg-blue-50 text-blue-900" : "border-gray-200 text-gray-600"
                }`}>
                ✉️ Email
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Ad */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ad və Soyad</label>
              <input type="text" name="name" value={formData.name} onChange={handleChange}
                placeholder="Nümunə: Əli Məmmədov" required
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-900/30 focus:border-blue-900 transition-all"
              />
            </div>

            {/* Telefon veya Email */}
            {loginMethod === "phone" ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp Nömrəsi</label>
                <input type="tel" name="phone" value={formData.phone} onChange={handleChange}
                  placeholder="+994501234567" required
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-900/30 focus:border-blue-900 transition-all"
                />
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Ünvanı</label>
                <input type="email" name="email" value={formData.email} onChange={handleChange}
                  placeholder="ad@misal.com" required
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-900/30 focus:border-blue-900 transition-all"
                />
              </div>
            )}

            {/* Şifre */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Şifrə</label>
              <div className="relative">
                <input type={showPassword ? "text" : "password"} name="password"
                  value={formData.password} onChange={handleChange}
                  placeholder="••••••••" required
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 pr-12 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-900/30 focus:border-blue-900 transition-all"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            {/* Şifre tekrar */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Şifrəni təsdiqləyin</label>
              <input type="password" name="confirmPassword"
                value={formData.confirmPassword} onChange={handleChange}
                placeholder="••••••••" required
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-900/30 focus:border-blue-900 transition-all"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-sm">
                ⚠️ {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full bg-blue-900 hover:bg-blue-800 disabled:bg-blue-900/50 text-white font-semibold py-3 rounded-xl transition-all">
              {loading ? "Hesab yaradılır..." : "Hesab yarat"}
            </button>
          </form>

          <p className="text-center text-gray-500 text-sm mt-6">
            Artıq hesabınız var?{" "}
            <Link href="/login" className="text-blue-900 font-medium hover:underline">Daxil olun</Link>
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