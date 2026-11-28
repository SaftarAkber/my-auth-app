"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { cx } from "@/lib/format";
import { useAuth } from "@/context/AuthContext";
import { FloatInput, FloatPassword, FloatPhone, Icon, Spinner, fullPhone } from "@/components/ui";

export default function LoginPage() {
  const { login } = useAuth();
  const [method, setMethod] = useState<"phone" | "email">("phone");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  // Son seçilmiş üsul yadda qalır (email ilə girənlərə hər dəfə dəyişmək lazım olmasın)
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (localStorage.getItem("login-method") === "email") setMethod("email");
    } catch { /* yaddaş bağlıdır */ }
  }, []);
  function pick(m: "phone" | "email") {
    setMethod(m);
    setError("");
    try { localStorage.setItem("login-method", m); } catch { /* yaddaş bağlıdır */ }
  }
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const id = method === "phone" ? fullPhone(phone) : email.trim();
      if (!id) throw new Error(method === "phone" ? "Telefon nömrəsini daxil edin" : "Email ünvanını daxil edin");
      await login(id, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xəta baş verdi");
      setBusy(false);
    }
  }

  return (
    <>
      <h1 className="text-3xl font-extrabold tracking-tight">Xoş gəlmisiniz</h1>
      <p className="mt-1.5 text-muted">Hesabınıza daxil olun.</p>

      <form onSubmit={submit} className="mt-8 space-y-5">
        {error && (
          <div className="flex items-start gap-2 rounded-xl border border-bad/30 bg-bad/10 p-3 text-sm text-bad" role="alert">
            <Icon name="alert" size={18} className="mt-0.5" /> {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 rounded-xl bg-surface-2 p-1">
          {([["phone", "Telefon", "phone"], ["email", "Email", "mail"]] as const).map(([id, label, icon]) => (
            <button
              type="button"
              key={id}
              onClick={() => pick(id)}
              aria-pressed={method === id}
              className={cx(
                "flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition",
                method === id ? "bg-surface text-brand shadow-soft" : "text-muted",
              )}
            >
              <Icon name={icon} size={16} /> {label}
            </button>
          ))}
        </div>

        {method === "phone" ? (
          <FloatPhone label="Telefon nömrəsi" value={phone} onChange={setPhone} autoComplete="tel-national" required autoFocus />
        ) : (
          <FloatInput label="Email ünvanı" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required autoFocus />
        )}

        <div>
          <FloatPassword label="Şifrə" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
          <div className="mt-2 text-right">
            <Link href="/forgot-password" className="text-xs font-bold text-brand-hover hover:underline">
              Şifrəni unutmusunuz?
            </Link>
          </div>
        </div>

        <button type="submit" className="btn-primary w-full py-3" disabled={busy}>
          {busy ? <Spinner /> : "Daxil ol"}
        </button>
      </form>

      <p className="mt-8 text-center text-sm text-muted">
        Hesabınız yoxdur?{" "}
        <Link href="/register" className="font-bold text-brand hover:underline">Qeydiyyatdan keçin</Link>
      </p>
    </>
  );
}
