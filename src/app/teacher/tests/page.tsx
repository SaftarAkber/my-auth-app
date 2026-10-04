"use client";

import Link from "next/link";
import { useState } from "react";
import { api, errMsg, useFetch } from "@/lib/api";
import {
  Empty, ErrorBox, Field, Icon, Modal, PageHeader, SkeletonList, Spinner, useConfirm, useToast,
} from "@/components/ui";

interface Collection {
  id: string;
  name: string;
  description: string | null;
  _count: { packages: number; videoPackages: number };
}

export default function TeacherTestsPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const { data, loading, error, reload } = useFetch<{ collections: Collection[] }>("/api/collections");
  const [editing, setEditing] = useState<Collection | "new" | null>(null);
  const [form, setForm] = useState({ name: "", description: "" });
  const [busy, setBusy] = useState(false);

  function open(c: Collection | "new") {
    setEditing(c);
    setForm(c === "new" ? { name: "", description: "" } : { name: c.name, description: c.description ?? "" });
  }

  async function save() {
    if (!form.name.trim()) return toast.error("Ad məcburidir");
    setBusy(true);
    try {
      if (editing === "new") await api("/api/collections", { body: form });
      else if (editing) await api(`/api/collections/${editing.id}`, { method: "PATCH", body: form });
      toast.success("Yadda saxlanıldı");
      setEditing(null);
      reload();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  async function remove(c: Collection) {
    const ok = await confirm({
      title: `“${c.name}” kolleksiyası silinsin?`,
      message: "İçindəki bütün testlər, suallar və tələbə cəhdləri də silinəcək.",
      confirmText: "Sil",
      danger: true,
    });
    if (!ok) return;
    try {
      await api(`/api/collections/${c.id}`, { method: "DELETE" });
      toast.success("Silindi");
      reload();
    } catch (e) {
      toast.error(errMsg(e));
    }
  }

  const list = data?.collections ?? [];

  return (
    <div className="page">
      <PageHeader
        title="Testlər"
        subtitle="Testlərinizi kolleksiyalara bölün, sonra qruplara bağlayın"
        actions={<button className="btn-primary" onClick={() => open("new")}><Icon name="plus" size={16} /> Yeni kolleksiya</button>}
      />

      {loading ? (
        <SkeletonList rows={3} className="h-32" />
      ) : error ? (
        <ErrorBox message={error} onRetry={reload} />
      ) : list.length === 0 ? (
        <Empty
          icon="folder"
          title="Hələ kolleksiya yoxdur"
          text="Mövzu və ya fənn üzrə kolleksiya yaradın, testləri içinə əlavə edin."
          action={<button className="btn-primary" onClick={() => open("new")}>Kolleksiya yarat</button>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((c) => (
            <article key={c.id} className="card flex flex-col p-5 transition hover:border-brand/40">
              <Link href={`/teacher/tests/${c.id}`} className="flex-1">
                <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/10 text-brand"><Icon name="folder" size={22} /></span>
                <h3 className="text-lg font-bold hover:text-brand">{c.name}</h3>
                <p className="mt-1 line-clamp-2 min-h-10 text-sm text-muted">{c.description || "Təsvir yoxdur."}</p>
                <span className="badge-muted mt-3"><Icon name="file" size={12} /> {c._count.packages} test</span>
              </Link>
              <div className="mt-4 flex items-center gap-1 border-t border-line pt-3">
                <Link href={`/teacher/tests/${c.id}`} className="btn-soft btn-sm flex-1">Aç</Link>
                <button className="btn-icon" onClick={() => open(c)} title="Redaktə"><Icon name="edit" size={17} /></button>
                <button className="btn-icon hover:!text-bad" onClick={() => remove(c)} title="Sil"><Icon name="trash" size={17} /></button>
              </div>
            </article>
          ))}
        </div>
      )}

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing === "new" ? "Yeni kolleksiya" : "Kolleksiyanı redaktə et"}
        footer={
          <>
            <button className="btn-secondary" onClick={() => setEditing(null)}>Ləğv et</button>
            <button className="btn-primary" onClick={save} disabled={busy}>{busy ? <Spinner /> : "Yadda saxla"}</button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Ad *"><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="məs. Riyaziyyat — Triqonometriya" autoFocus /></Field>
          <Field label="Təsvir"><textarea className="input min-h-24" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
        </div>
      </Modal>
    </div>
  );
}
