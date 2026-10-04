"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { cx } from "@/lib/format";
import { Field, Icon, PasswordInput, Spinner } from "@/components/ui";

export default function RegisterPage() {
  const { register } = useAuth();
  const [role, setRole] = useState<"STUDENT" | "TEACHER">("STUDENT");
  const [teacherOpen, setTeacherOpen] = useState(true);
  const [form, setForm] = useState({ name: "", phone: "", email: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<{ available: boolean }>("/api/auth/teacher-available")
      .then((d) => setTeacherOpen(d.available))
      .catch(() => {});
  }, []);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.phone.trim() && !form.email.trim()) return setError("Telefon və ya email daxil edin");
    if (form.password.length < 6) return setError("Şifrə ən azı 6 simvol olmalıdır");
    if (form.password !== form.confirm) return setError("Şifrələr uyğun gəlmir");

    setBusy(true);
    try {
      await register({
        name: form.name.trim(),
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
        password: form.password,
        role,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xəta baş verdi");
      setBusy(false);
    }
  }

  const roles = [
    { id: "STUDENT" as const, label: "Tələbə", icon: "grad" as const, text: "Test həll et, dərs izlə" },
    { id: "TEACHER" as const, label: "Müəllim", icon: "book" as const, text: "Qrup, test və dərs yarat" },
  ];

  return (
    <>
      <h1 className="text-3xl font-extrabold tracking-tight">Hesab yaradın</h1>
      <p className="mt-1.5 text-muted">Bir neçə saniyəyə qeydiyyatdan keçin.</p>

      <form onSubmit={submit} className="mt-8 space-y-5">
        {error && (
          <div className="flex items-start gap-2 rounded-xl border border-bad/30 bg-bad/10 p-3 text-sm text-bad" role="alert">
            <Icon name="alert" size={18} className="mt-0.5" /> {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          {roles.map((r) => {
            const disabled = r.id === "TEACHER" && !teacherOpen;
            const on = role === r.id;
            return (
              <button
                type="button"
                key={r.id}
                disabled={disabled}
                onClick={() => setRole(r.id)}
                className={cx(
                  "rounded-2xl border-2 p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-50",
                  on ? "border-brand bg-brand/5" : "border-line bg-surface hover:border-brand/40",
                )}
              >
                <Icon name={r.icon} size={22} className={on ? "text-brand" : "text-muted"} />
                <p className="mt-2 font-bold">{r.label}</p>
                <p className="text-xs text-muted">{disabled ? "Kontingent doludur" : r.text}</p>
              </button>
            );
          })}
        </div>

        <Field label="Ad və soyad">
          <input className="input" value={form.name} onChange={set("name")} autoComplete="name" required placeholder="Ad Soyad" />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Telefon (WhatsApp)">
            <input className="input" value={form.phone} onChange={set("phone")} placeholder="+994501234567" autoComplete="tel" inputMode="tel" />
          </Field>
          <Field label="Email">
            <input className="input" type="email" value={form.email} onChange={set("email")} placeholder="ad@mail.com" autoComplete="email" />
          </Field>
        </div>
        <p className="-mt-3 text-xs text-muted">Ən azı biri məcburidir. Şifrəni bərpa etmək üçün lazım olacaq.</p>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Şifrə">
            <PasswordInput value={form.password} onChange={set("password")} placeholder="Ən azı 6 simvol" autoComplete="new-password" required />
          </Field>
          <Field label="Şifrə təkrarı">
            <PasswordInput value={form.confirm} onChange={set("confirm")} placeholder="Təkrar daxil edin" autoComplete="new-password" required />
          </Field>
        </div>

        <button type="submit" className="btn-primary w-full py-3" disabled={busy}>
          {busy ? <Spinner /> : "Qeydiyyatdan keç"}
        </button>
      </form>

      <p className="mt-8 text-center text-sm text-muted">
        Artıq hesabınız var?{" "}
        <Link href="/login" className="font-bold text-brand hover:underline">Daxil olun</Link>
      </p>
    </>
  );
}
