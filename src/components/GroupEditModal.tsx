"use client";

import { useState } from "react";
import { api, errMsg } from "@/lib/api";
import { Field, ImageUpload, Modal, Spinner, Toggle, useToast } from "@/components/ui";

export interface GroupLite {
  id: string;
  name: string;
  description: string | null;
  schedule: string | null;
  photo: string | null;
  coverPhoto: string | null;
  isActive: boolean;
}

/** Qrupu yaratma / redaktə pəncərəsi. Yalnız lazım olanda render olunur (hər açılışda təzə vəziyyətlə). */
export default function GroupEditModal({
  editing, onClose, onSaved,
}: {
  editing: GroupLite | "new";
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const isNew = editing === "new";
  const [form, setForm] = useState(() =>
    editing === "new"
      ? { name: "", description: "", schedule: "", photo: null as string | null, coverPhoto: null as string | null, isActive: true }
      : {
          name: editing.name,
          description: editing.description ?? "",
          schedule: editing.schedule ?? "",
          photo: editing.photo,
          coverPhoto: editing.coverPhoto,
          isActive: editing.isActive,
        },
  );
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!form.name.trim()) return toast.error("Qrup adı məcburidir");
    setBusy(true);
    try {
      const body = { ...form, photo: form.photo ?? "", coverPhoto: form.coverPhoto ?? "" };
      if (editing === "new") await api("/api/groups", { body });
      else await api(`/api/groups/${editing.id}`, { method: "PATCH", body });
      toast.success(isNew ? "Qrup yaradıldı" : "Qrup yeniləndi");
      onSaved();
      onClose();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={isNew ? "Yeni qrup" : "Qrupu redaktə et"}
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>Ləğv et</button>
          <button className="btn-primary" onClick={save} disabled={busy}>{busy ? <Spinner /> : "Yadda saxla"}</button>
        </>
      }
    >
      <div className="space-y-4">
        <ImageUpload label="Üz qabığı" value={form.coverPhoto} onChange={(u) => setForm({ ...form, coverPhoto: u })} />
        <ImageUpload label="Qrup şəkli" shape="square" value={form.photo} onChange={(u) => setForm({ ...form, photo: u })} />
        <Field label="Ad *">
          <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="məs. 11-ci sinif Riyaziyyat" />
        </Field>
        <Field label="Təsvir">
          <textarea className="input min-h-24" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </Field>
        <Field label="Dərs cədvəli">
          <input className="input" value={form.schedule} onChange={(e) => setForm({ ...form, schedule: e.target.value })} placeholder="B.e, Çər — 18:00" />
        </Field>
        {!isNew && (
          <Toggle checked={form.isActive} onChange={(v) => setForm({ ...form, isActive: v })} label="Aktiv" hint="Deaktiv qruplara yeni müraciət göndərilə bilməz" />
        )}
      </div>
    </Modal>
  );
}
