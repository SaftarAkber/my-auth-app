"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Field, Icon, PasswordInput, Spinner } from "@/components/ui";

export default function LoginPage() {
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login(identifier.trim(), password);
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

        <Field label="Telefon və ya email" hint="Telefon beynəlxalq formatda: +994501234567">
          <input
            className="input"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="+994501234567 və ya ad@mail.com"
            autoComplete="username"
            required
            autoFocus
          />
        </Field>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="label !mb-0">Şifrə</span>
            <Link href="/forgot-password" className="text-xs font-semibold text-brand hover:underline">
              Şifrəni unutmusunuz?
            </Link>
          </div>
          <PasswordInput
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
            required
          />
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
