"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Step = "method" | "contact" | "otp" | "newPassword";
type Method = "whatsapp" | "email";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("method");
  const [method, setMethod] = useState<Method>("whatsapp");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  function startCountdown() {
    setCountdown(60);
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(interval);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  }

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method,
          phone: method === "whatsapp" ? phone : undefined,
          email: method === "email" ? email : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStep("otp");
      startCountdown();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Xəta oldu!");
    } finally {
      setLoading(false);
    }
  }

  function handleOtpNext(e: React.FormEvent) {
    e.preventDefault();
    if (code.length !== 6) {
      setError("6 xanalı kodu girin");
      return;
    }
    setError("");
    setStep("newPassword");
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (newPassword !== confirmPassword) {
      setError("Şifrələr uyuşmur");
      return;
    }
    if (newPassword.length < 6) {
      setError("Şifre ən az 6 xanalı olmalıdır");
      return;
    }
    setLoading(true);
    try {
      const identifier = method === "whatsapp" ? phone : email;
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: identifier, code, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.user.role === "TEACHER") {
        router.push("/teacher");
      } else {
        router.push("/student");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Hata oluştu");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Adım göstergesi */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {(["method", "contact", "otp", "newPassword"] as Step[]).map(
            (s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    step === s
                      ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30"
                      : ["contact", "otp", "newPassword"].indexOf(step) >
                          ["method", "contact", "otp", "newPassword"].indexOf(
                            s,
                          ) -
                            1
                        ? "bg-emerald-500/30 text-emerald-400 border border-emerald-500/50"
                        : "bg-slate-700 text-slate-500"
                  }`}
                >
                  {i + 1}
                </div>
                {i < 3 && <div className="w-6 h-0.5 bg-slate-700" />}
              </div>
            ),
          )}
        </div>

        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-500/20 rounded-2xl mb-4 border border-emerald-500/30">
            <span className="text-2xl">
              {step === "method"
                ? "🔐"
                : step === "contact"
                  ? method === "whatsapp"
                    ? "📱"
                    : "✉️"
                  : step === "otp"
                    ? "💬"
                    : "🔑"}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Şifrəmi Sıfırla
          </h1>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8 shadow-2xl">
          {/* ADIM 1 — Yöntem seç */}
          {step === "method" && (
            <div className="space-y-4">
              <p className="text-slate-300 text-sm text-center mb-6">
                Doğrulama kodunu hardan almaq istəyirsiniz?
              </p>

              <button
                onClick={() => {
                  setMethod("whatsapp");
                  setStep("contact");
                }}
                className="w-full bg-slate-700/50 hover:bg-emerald-500/20 border border-slate-600 hover:border-emerald-500/50 rounded-xl p-4 text-left transition-all group"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📱</span>
                  <div>
                    <p className="text-white font-medium">WhatsApp ilə al</p>
                    <p className="text-slate-400 text-xs mt-0.5">
                      WhatsApp nömrənizə kod göndərilir
                    </p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => {
                  setMethod("email");
                  setStep("contact");
                }}
                className="w-full bg-slate-700/50 hover:bg-emerald-500/20 border border-slate-600 hover:border-emerald-500/50 rounded-xl p-4 text-left transition-all group"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">✉️</span>
                  <div>
                    <p className="text-white font-medium">Email ilə al</p>
                    <p className="text-slate-400 text-xs mt-0.5">
                      Email adresinizə kod göndərilir
                    </p>
                  </div>
                </div>
              </button>

              {/* Bilgi notu */}
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 text-amber-300 text-xs flex items-start gap-2 mt-2">
                <span className="text-base">💡</span>
                <span>
                  WhatsApp kodu 1 dəqiqə içində gəlməsə email ilə təkrar
                  yoxlayın.
                </span>
              </div>
            </div>
          )}

          {/* ADIM 2 — İletişim bilgisi */}
          {step === "contact" && (
            <form onSubmit={handleSendOtp} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  {method === "whatsapp" ? "WhatsApp Nömrəsi" : "Email Adresi"}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm">
                    {method === "whatsapp" ? "📱" : "✉️"}
                  </span>
                  {method === "whatsapp" ? (
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+994501234567"
                      required
                      className="w-full bg-slate-900/50 border border-slate-600 rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
                    />
                  ) : (
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="ornek@gmail.com"
                      required
                      className="w-full bg-slate-900/50 border border-slate-600 rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
                    />
                  )}
                </div>
              </div>

              {method === "whatsapp" && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 text-amber-300 text-xs flex items-start gap-2">
                  <span className="text-base">💡</span>
                  <span>
                    Kod 1 dəqiqə ərzində gəlməzsə<strong>email ilə</strong>
                    təkrar yoxlayın.
                  </span>
                </div>
              )}

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm flex items-center gap-2">
                  <span>⚠️</span> {error}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setStep("method");
                    setError("");
                  }}
                  className="flex-1 bg-slate-700/50 hover:bg-slate-700 text-slate-300 font-medium py-3 rounded-xl transition-all border border-slate-600/50"
                >
                  ← Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-2 w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-500/50 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-emerald-500/20"
                >
                  {loading ? "Göndərilir..." : "Kod Göndər"}
                </button>
              </div>
            </form>
          )}

          {/* ADIM 3 — OTP */}
          {step === "otp" && (
            <form onSubmit={handleOtpNext} className="space-y-5">
              <p className="text-slate-400 text-sm text-center">
                {method === "whatsapp"
                  ? `📱 ${phone} nömrəsinə WhatsApp mesajı gönderildi`
                  : `✉️ ${email} adresinə email göndərildi`}
              </p>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  6-digit code
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) =>
                    setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  placeholder="123456"
                  maxLength={6}
                  required
                  className="w-full bg-slate-900/50 border border-slate-600 rounded-xl px-4 py-4 text-white text-center text-2xl tracking-[0.5em] font-mono placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                />
              </div>

              {method === "whatsapp" && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 text-amber-300 text-xs flex items-start gap-2">
                  <span className="text-base">💡</span>
                  <span>
                    If the code hasn't arrived within 1 minute...{" "}
                    <button
                      type="button"
                      onClick={() => {
                        setStep("method");
                        setCode("");
                      }}
                      className="underline font-medium"
                    >
                      geri dönüp email ile deneyin.
                    </button>
                  </span>
                </div>
              )}

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm flex items-center gap-2">
                  <span>⚠️</span> {error}
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-emerald-500/20"
              >
                Confirm Password
              </button>

              <div className="text-center">
                {countdown > 0 ? (
                  <p className="text-slate-400 text-sm">
                    ReSend:{" "}
                    <span className="text-emerald-400 font-mono">
                      {countdown}s
                    </span>
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setStep("contact");
                      setCode("");
                    }}
                    className="text-emerald-400 hover:text-emerald-300 text-sm transition-colors"
                  >
                    ReSend code
                  </button>
                )}
              </div>
            </form>
          )}

          {/* ADIM 4 — Yeni şifre */}
          {step === "newPassword" && (
            <form onSubmit={handleResetPassword} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  New Password
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm">
                    🔑
                  </span>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full bg-slate-900/50 border border-slate-600 rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Confirm Pasword
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm">
                    🔒
                  </span>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full bg-slate-900/50 border border-slate-600 rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                  />
                </div>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm flex items-center gap-2">
                  <span>⚠️</span> {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-500/50 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-emerald-500/20"
              >
                {loading ? "Changing..." : "Change password and log in again"}
              </button>
            </form>
          )}

          <div className="mt-6 text-center">
            <Link
              href="/login"
              className="text-slate-400 hover:text-slate-300 text-sm transition-colors"
            >
              ← Get Back
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
