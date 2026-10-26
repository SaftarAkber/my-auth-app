"use client";

import { useState } from "react";
import { Field, Icon, PasswordInput, Spinner } from "@/components/ui";

/** Admin giriş formu: /admin və /dashboard ünvanlarında göstərilir. Adi /login admini qəbul etmir. */
export default function AdminLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Xəta baş verdi");
      window.location.replace("/admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xəta baş verdi");
      setBusy(false);
    }
  }

  return (
    <div className="relative z-10 grid min-h-screen place-items-center px-4 py-10">
      <div className="w-full max-w-md animate-fade-up">
        <div className="mb-6 flex items-center gap-2.5">
          <span className="grid h-11 w-11 place-items-center rounded-full border-[2.5px] border-ink bg-white">
            <span className="h-4 w-4 rounded-full bg-ink" />
          </span>
          <span className="text-2xl font-extrabold tracking-tight">EduFlow</span>
          <span className="badge-bad ml-1">Admin</span>
        </div>

        <form onSubmit={submit} className="card space-y-5 p-6 sm:p-8">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">İdarə paneli</h1>
            <p className="mt-1 text-sm text-muted">Yalnız idarəçilər üçün giriş.</p>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-xl border-[2.5px] border-ink bg-flame/30 p-3 text-sm font-semibold" role="alert">
              <Icon name="alert" size={18} className="mt-0.5 shrink-0" /> {error}
            </div>
          )}

          <Field label="İstifadəçi adı">
            <input
              className="input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              required
              autoFocus
            />
          </Field>
          <Field label="Parol">
            <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
          </Field>

          <button type="submit" className="btn-primary w-full py-3" disabled={busy}>
            {busy ? <Spinner /> : "Daxil ol"}
          </button>
        </form>
      </div>
    </div>
  );
}
