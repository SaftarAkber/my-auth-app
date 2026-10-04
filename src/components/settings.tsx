"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { api, errMsg } from "@/lib/api";
import { Field, Icon, ImageUpload, Modal, PasswordInput, Spinner, useToast } from "@/components/ui";

/* ───────── Profil redaktəsi ───────── */
export function ProfileEditor({ open, onClose, withCover }: { open: boolean; onClose: () => void; withCover?: boolean }) {
  const { user, refreshUser } = useAuth();
  const toast = useToast();
  const [name, setName] = useState(user?.name ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [photo, setPhoto] = useState<string | null>(user?.photo ?? null);
  const [cover, setCover] = useState<string | null>(user?.coverPhoto ?? null);
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!name.trim()) return toast.error("Ad boş ola bilməz");
    setBusy(true);
    try {
      await api("/api/auth/me", {
        method: "PATCH",
        body: { name, bio, photo: photo ?? "", ...(withCover ? { coverPhoto: cover ?? "" } : {}) },
      });
      await refreshUser();
      toast.success("Profil yeniləndi");
      onClose();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Profili redaktə et"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>Ləğv et</button>
          <button className="btn-primary" onClick={save} disabled={busy}>{busy ? <Spinner /> : "Yadda saxla"}</button>
        </>
      }
    >
      <div className="space-y-5">
        {withCover && <ImageUpload label="Üz qabığı" value={cover} onChange={setCover} />}
        <ImageUpload label="Profil şəkli" value={photo} onChange={setPhoto} shape="round" />
        <Field label="Ad və soyad">
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Haqqında" hint="Qısa təqdimat — profilinizdə görünür">
          <textarea className="input min-h-28" value={bio ?? ""} onChange={(e) => setBio(e.target.value)} maxLength={500} />
        </Field>
      </div>
    </Modal>
  );
}

/* ───────── Telefon / email dəyişmə (OTP ilə) ───────── */
function ContactRow({ type }: { type: "phone" | "email" }) {
  const { user, refreshUser } = useAuth();
  const toast = useToast();
  const current = type === "phone" ? user?.phone : user?.email;
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const normalized = type === "email" ? value.trim().toLowerCase() : value.trim();

  function reset() {
    setEditing(false);
    setSent(false);
    setValue("");
    setCode("");
  }

  async function send() {
    setBusy(true);
    try {
      await api("/api/auth/update-contact", { body: { type, value: normalized } });
      setSent(true);
      toast.success("Doğrulama kodu göndərildi");
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    setBusy(true);
    try {
      await api("/api/auth/verify-contact", { body: { type, value: normalized, code: code.trim() } });
      await refreshUser();
      toast.success("Məlumat yeniləndi");
      reset();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-line p-4">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-2 text-muted">
          <Icon name={type === "phone" ? "phone" : "mail"} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">{type === "phone" ? "Telefon (WhatsApp)" : "Email"}</p>
          <p className="truncate font-semibold">{current ?? "Əlavə edilməyib"}</p>
        </div>
        {!editing && (
          <button className="btn-secondary btn-sm" onClick={() => setEditing(true)}>{current ? "Dəyiş" : "Əlavə et"}</button>
        )}
      </div>

      {editing && (
        <div className="mt-4 space-y-3">
          {!sent ? (
            <>
              <input
                className="input"
                type={type === "email" ? "email" : "tel"}
                placeholder={type === "phone" ? "+994501234567" : "yeni@mail.com"}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                autoFocus
              />
              <div className="flex gap-2">
                <button className="btn-primary btn-sm" onClick={send} disabled={busy || !value.trim()}>
                  {busy ? <Spinner /> : "Kod göndər"}
                </button>
                <button className="btn-ghost btn-sm" onClick={reset}>Ləğv et</button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-muted"><strong>{normalized}</strong> ünvanına göndərilən 6 rəqəmli kodu daxil edin.</p>
              <input
                className="input text-center font-mono text-xl font-bold tracking-[0.4em]"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                inputMode="numeric"
                placeholder="••••••"
                autoFocus
              />
              <div className="flex gap-2">
                <button className="btn-primary btn-sm" onClick={verify} disabled={busy || code.length !== 6}>
                  {busy ? <Spinner /> : "Təsdiqlə"}
                </button>
                <button className="btn-ghost btn-sm" onClick={reset}>Ləğv et</button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function ContactCard() {
  return (
    <section className="card p-5 sm:p-6">
      <h2 className="text-lg font-bold">Əlaqə məlumatları</h2>
      <p className="mb-4 text-sm text-muted">Dəyişiklik doğrulama kodu ilə təsdiqlənir.</p>
      <div className="space-y-3">
        <ContactRow type="phone" />
        <ContactRow type="email" />
      </div>
    </section>
  );
}

/* ───────── Şifrə dəyişmə ───────── */
export function PasswordCard() {
  const toast = useToast();
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (form.next.length < 6) return toast.error("Yeni şifrə ən azı 6 simvol olmalıdır");
    if (form.next !== form.confirm) return toast.error("Yeni şifrələr uyğun gəlmir");
    setBusy(true);
    try {
      await api("/api/auth/change-password", { body: { currentPassword: form.current, newPassword: form.next } });
      toast.success("Şifrə dəyişdirildi");
      setForm({ current: "", next: "", confirm: "" });
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card p-5 sm:p-6">
      <h2 className="text-lg font-bold">Şifrə</h2>
      <p className="mb-4 text-sm text-muted">Təhlükəsizlik üçün güclü şifrə seçin.</p>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Cari şifrə">
          <PasswordInput value={form.current} onChange={(e) => setForm({ ...form, current: e.target.value })} autoComplete="current-password" required />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Yeni şifrə">
            <PasswordInput value={form.next} onChange={(e) => setForm({ ...form, next: e.target.value })} autoComplete="new-password" required />
          </Field>
          <Field label="Təkrar">
            <PasswordInput value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} autoComplete="new-password" required />
          </Field>
        </div>
        <button className="btn-primary" disabled={busy}>{busy ? <Spinner /> : "Şifrəni yenilə"}</button>
      </form>
    </section>
  );
}
