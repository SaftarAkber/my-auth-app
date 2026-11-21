"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, errMsg, useFetch } from "@/lib/api";
import { fmtDate } from "@/lib/format";
import { useAuth } from "@/context/AuthContext";
import { Avatar, Empty, ErrorBox, Field, Icon, Modal, PageHeader, SkeletonList, Spinner, useConfirm, useToast } from "@/components/ui";

interface Row {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  role: "STUDENT" | "TEACHER" | "ADMIN";
  bio: string | null;
  photo: string | null;
  coinBalance: number;
  createdAt: string;
  _count: { groups: number; groupMembers: number; attempts: number };
}
interface Res {
  users: Row[];
  totals: { all: number; teachers: number; students: number; admins: number };
}

const ROLE = {
  STUDENT: { label: "Tələbə", cls: "badge-warn" },
  TEACHER: { label: "Müəllim", cls: "badge-brand" },
  ADMIN: { label: "Admin", cls: "badge-bad" },
} as const;

export default function AdminUsersPage() {
  const { user: me } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [role, setRole] = useState("");
  const [editing, setEditing] = useState<Row | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);

  const { data, loading, error, reload } = useFetch<Res>(
    `/api/admin/users?q=${encodeURIComponent(debounced)}${role ? `&role=${role}` : ""}`,
  );

  async function remove(u: Row) {
    const ok = await confirm({
      title: `${u.name} silinsin?`,
      message: "Hesab bağlanacaq və tələbələrə heç yerdə görünməyəcək (cədvəllər onsuz yenidən sıralanır). Coin tarixçəsi və nəticələri saxlanılır — “Silinənlər” bölməsindən bərpa etmək olar.",
      confirmText: "Sil",
      danger: true,
    });
    if (!ok) return;
    try {
      await api(`/api/admin/users/${u.id}`, { method: "DELETE" });
      toast.success("Hesab silindi");
      reload();
    } catch (e) {
      toast.error(errMsg(e));
    }
  }

  const t = data?.totals;

  return (
    <div className="page">
      <PageHeader title="İstifadəçilər" subtitle="Qeydiyyatdan keçən hər kəs" />

      <section className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { l: "Cəmi hesab", v: t?.all, c: "bg-tint" },
          { l: "Müəllim", v: t?.teachers, c: "bg-iris" },
          { l: "Tələbə", v: t?.students, c: "bg-iris" },
          { l: "Admin", v: t?.admins, c: "bg-brand" },
        ].map((k) => (
          <div key={k.l} className={`card ${k.c} p-4`}>
            <p className="text-sm font-semibold">{k.l}</p>
            <p className="mt-1 text-4xl font-extrabold tabular-nums">{k.v ?? "—"}</p>
          </div>
        ))}
      </section>

      <div className="mb-5 flex flex-wrap gap-3">
        <div className="relative min-w-60 flex-1 sm:max-w-sm">
          <Icon name="search" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" size={17} />
          <input className="input pl-10" placeholder="Ad, email və ya telefon" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="input !w-auto min-w-0 max-w-full" value={role} onChange={(e) => setRole(e.target.value)} aria-label="Rol">
          <option value="">Bütün rollar</option>
          <option value="TEACHER">Müəllim</option>
          <option value="STUDENT">Tələbə</option>
          <option value="ADMIN">Admin</option>
        </select>
      </div>

      {loading && !data ? (
        <SkeletonList rows={5} className="h-16" />
      ) : error ? (
        <ErrorBox message={error} onRetry={reload} />
      ) : (data?.users ?? []).length === 0 ? (
        <Empty icon="users" title="İstifadəçi tapılmadı" />
      ) : (
        <div className="card max-w-[1400px] overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-surface-2 text-left">
                <th className="px-4 py-3 font-semibold">Ad</th>
                <th className="px-4 py-3 font-semibold">Rol</th>
                <th className="px-4 py-3 font-semibold">Əlaqə</th>
                <th className="px-4 py-3 text-right font-semibold">Coin</th>
                <th className="px-4 py-3 font-semibold">Qeydiyyat</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {data!.users.map((u) => (
                <tr key={u.id} className="border-b border-line transition last:border-0 hover:bg-tint">
                  <td className="px-4 py-2.5">
                    <Link href={`/u/${u.id}`} className="flex items-center gap-3 font-semibold hover:underline">
                      <Avatar src={u.photo} name={u.name} size={34} className="border border-line" />
                      {u.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5"><span className={ROLE[u.role].cls}>{ROLE[u.role].label}</span></td>
                  <td className="px-4 py-2.5 text-muted">{u.email ?? u.phone ?? "—"}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{u.role === "ADMIN" ? "—" : u.coinBalance}</td>
                  <td className="px-4 py-2.5 text-muted">{fmtDate(u.createdAt)}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-right">
                    <button className="btn-icon" onClick={() => setEditing(u)} aria-label="Redaktə et"><Icon name="edit" size={16} /></button>
                    {u.id !== me?.id && (
                      <button className="btn-icon hover:!bg-bad hover:!text-white" onClick={() => remove(u)} aria-label="Sil"><Icon name="trash" size={16} /></button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && <EditUser key={editing.id} user={editing} self={editing.id === me?.id} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload(); }} />}
    </div>
  );
}

function EditUser({ user, self, onClose, onSaved }: { user: Row; self: boolean; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [f, setF] = useState({
    name: user.name, phone: user.phone ?? "", email: user.email ?? "", bio: user.bio ?? "",
    role: user.role as string, coinBalance: String(user.coinBalance),
  });
  const [busy, setBusy] = useState(false);
  const [pw, setPw] = useState("");
  // Yeni parol saxlanandan sonra bir dəfə göstərilir ki, admin istifadəçiyə ötürə bilsin
  const [done, setDone] = useState<{ login: string; password: string } | null>(null);

  function genPassword() {
    const abc = "abcdefghjkmnpqrstuvwxyz23456789";
    const a = new Uint32Array(8);
    crypto.getRandomValues(a);
    setPw(Array.from(a, (n) => abc[n % abc.length]).join(""));
  }

  async function save() {
    setBusy(true);
    try {
      await api(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        body: {
          name: f.name, phone: f.phone, email: f.email, bio: f.bio, role: f.role,
          ...(user.role !== "ADMIN" ? { coinBalance: Number(f.coinBalance) } : {}),
          ...(pw ? { password: pw } : {}),
        },
      });
      toast.success(pw ? "Yeniləndi, yeni parol təyin olundu" : "Yeniləndi");
      if (pw) setDone({ login: f.phone.trim() || f.email.trim(), password: pw });
      else onSaved();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    const text = `Giriş: ${done.login}
Parol: ${done.password}`;
    return (
      <Modal
        open
        onClose={onSaved}
        title="Yeni parol təyin olundu"
        size="sm"
        footer={<button className="btn-primary" onClick={onSaved}>Bağla</button>}
      >
        <p className="text-sm text-muted">Bu məlumatı {user.name} ilə paylaşın. Pəncərə bağlananda parol bir daha göstərilməyəcək.</p>
        <div className="mt-4 space-y-2 rounded-lg border border-line bg-surface-2 p-3 text-sm">
          <p><span className="text-muted">Giriş:</span> <span className="font-semibold">{done.login || "—"}</span></p>
          <p><span className="text-muted">Parol:</span> <span className="select-all font-mono text-base font-bold tracking-wide">{done.password}</span></p>
        </div>
        <button
          type="button"
          className="btn-secondary mt-3 w-full"
          onClick={() => navigator.clipboard?.writeText(text).then(() => toast.success("Kopyalandı"), () => toast.error("Kopyalanmadı"))}
        >
          <Icon name="file" size={16} /> Kopyala
        </button>
      </Modal>
    );
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="İstifadəçini redaktə et"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>Ləğv et</button>
          <button className="btn-primary" onClick={save} disabled={busy}>{busy ? <Spinner /> : "Yadda saxla"}</button>
        </>
      }
    >
      <div className="grid gap-4">
        <Field label="Ad"><input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Telefon" hint="+994XXXXXXXXX"><input className="input" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
          <Field label="Email"><input className="input" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
        </div>
        <Field label="Haqqında"><textarea className="input min-h-20" value={f.bio} onChange={(e) => setF({ ...f, bio: e.target.value })} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Rol">
            <select className="input" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })} disabled={self}>
              <option value="STUDENT">Tələbə</option>
              <option value="TEACHER">Müəllim</option>
              <option value="ADMIN">Admin</option>
            </select>
          </Field>
          {user.role !== "ADMIN" && (
            <Field label="Coin balansı" hint="Dəyişiklik “Admin düzəlişi” kimi qeyd olunur">
              <input className="input tabular-nums" type="number" min={0} value={f.coinBalance} onChange={(e) => setF({ ...f, coinBalance: e.target.value })} />
            </Field>
          )}
        </div>
        <Field label="Yeni parol" hint="Boş qalsa parol dəyişmir. Hazırkı parol görünmür — saytda yalnız şifrələnmiş izi saxlanır.">
          <div className="flex gap-2">
            <input
              className="input font-mono"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              placeholder="Ən azı 6 simvol"
              autoComplete="new-password"
              spellCheck={false}
            />
            <button type="button" className="btn-secondary shrink-0" onClick={genPassword}>Yarat</button>
          </div>
        </Field>
      </div>
    </Modal>
  );
}
