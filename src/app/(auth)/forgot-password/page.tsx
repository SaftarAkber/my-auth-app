"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, errMsg } from "@/lib/api";
import { cx } from "@/lib/format";
import { Field, FloatInput, FloatPassword, FloatPhone, Icon, Spinner, fullPhone } from "@/components/ui";

type Method = "whatsapp" | "email";

function Alert({ tone, children }: { tone: "bad" | "ok"; children: React.ReactNode }) {
  return (
    <div
      className={cx(
        "flex items-start gap-2 rounded-xl border p-3 text-sm",
        tone === "bad" ? "border-bad/30 bg-bad/10 text-bad" : "border-ok/30 bg-ok/10 text-ok",
      )}
      role="alert"
    >
      <Icon name={tone === "bad" ? "alert" : "check"} size={18} className="mt-0.5" /> {children}
    </div>
  );
}

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<"request" | "reset">("request");
  const [method, setMethod] = useState<Method>("whatsapp");
  const [value, setValue] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  // Serverin tapdığı hesabın dəqiq yazılışı (məs. 050… → +99450…); kod onunla yoxlanılır
  const [sentTo, setSentTo] = useState("");

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const identifier = method === "email" ? value.trim().toLowerCase() : fullPhone(value);

  async function sendCode(e?: React.FormEvent) {
    e?.preventDefault();
    setError("");
    setInfo("");
    setBusy(true);
    try {
      const r = await api<{ message: string; identifier: string }>("/api/auth/forgot-password", {
        body: method === "whatsapp" ? { method, phone: identifier } : { method, email: identifier },
      });
      setSentTo(r.identifier ?? identifier);
      setStep("reset");
      setCooldown(60);
      setInfo(method === "whatsapp" ? `Kod WhatsApp-a göndərildi: ${r.identifier ?? identifier}` : `Kod emailə göndərildi: ${r.identifier ?? identifier}. Gəlməyibsə «Spam» qovluğuna baxın.`);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  }

  async function reset(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 6) return setError("Şifrə ən azı 6 simvol olmalıdır");
    setBusy(true);
    try {
      await api("/api/auth/reset-password", { body: { phone: sentTo || identifier, code: code.trim(), newPassword: password } });
      window.location.replace("/");
    } catch (err) {
      setError(errMsg(err));
      setBusy(false);
    }
  }

  return (
    <>
      <Link href="/login" className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-ink">
        <Icon name="left" size={16} /> Girişə qayıt
      </Link>
      <h1 className="text-3xl font-extrabold tracking-tight">Şifrəni bərpa et</h1>
      <p className="mt-1.5 text-muted">
        {step === "request" ? "Doğrulama kodunu necə almaq istəyirsiniz?" : "Gələn 6 rəqəmli kodu və yeni şifrəni daxil edin."}
      </p>

      {step === "request" ? (
        <form onSubmit={sendCode} className="mt-8 space-y-5">
          {error && <Alert tone="bad">{error}</Alert>}

          <div className="grid grid-cols-2 gap-2 rounded-xl bg-surface-2 p-1">
            {([["whatsapp", "WhatsApp", "phone"], ["email", "Email", "mail"]] as const).map(([id, label, icon]) => (
              <button
                type="button"
                key={id}
                onClick={() => { setMethod(id); setValue(""); setError(""); }}
                className={cx(
                  "flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition",
                  method === id ? "bg-surface text-brand shadow-soft" : "text-muted",
                )}
              >
                <Icon name={icon} size={16} /> {label}
              </button>
            ))}
          </div>

          {method === "whatsapp" ? (
            <FloatPhone label="Telefon nömrəsi" value={value} onChange={setValue} autoComplete="tel-national" required autoFocus />
          ) : (
            <FloatInput label="Email ünvanı" type="email" value={value} onChange={(e) => setValue(e.target.value)} autoComplete="email" required autoFocus />
          )}

          <button className="btn-primary w-full py-3" disabled={busy}>
            {busy ? <Spinner /> : "Kodu göndər"}
          </button>
        </form>
      ) : (
        <form onSubmit={reset} className="mt-8 space-y-5">
          {info && <Alert tone="ok">{info}</Alert>}
          {error && <Alert tone="bad">{error}</Alert>}

          <Field label="Doğrulama kodu">
            <input
              className="input text-center font-mono text-2xl font-bold tracking-[0.5em]"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              placeholder="••••••"
              maxLength={6}
              required
              autoFocus
            />
          </Field>

          <FloatPassword label="Yeni şifrə (ən azı 6 simvol)" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" required />

          <button className="btn-primary w-full py-3" disabled={busy || code.length !== 6}>
            {busy ? <Spinner /> : "Şifrəni dəyiş"}
          </button>

          <div className="flex items-center justify-between text-sm">
            <button type="button" className="font-semibold text-muted hover:text-ink" onClick={() => { setStep("request"); setError(""); }}>
              Məlumatı dəyiş
            </button>
            <button type="button" disabled={cooldown > 0 || busy} onClick={() => sendCode()} className="font-semibold text-brand disabled:text-muted">
              {cooldown > 0 ? `Yenidən göndər (${cooldown})` : "Yenidən göndər"}
            </button>
          </div>
        </form>
      )}
    </>
  );
}
