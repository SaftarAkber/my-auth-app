"use client";

import { useRef, useState } from "react";
import { errMsg } from "@/lib/api";
import { Icon, Modal, Spinner, useToast } from "@/components/ui";

/**
 * "Mətnləri fayldan yenilə": artıq yüklənmiş paketin sual mətnlərini fayldakı düzülüşlə yeniləyir
 * (məs. alqoritm addımları alt-alta). Yeni sual yaranmır, cəhdlər və nəticələr qalır.
 */
export default function RefreshTexts({ packageId, onDone }: { packageId: string; onDone: () => void }) {
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function upload(file: File | undefined) {
    if (input.current) input.current.value = "";
    if (!file) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/packages/${packageId}/refresh-texts`, { method: "POST", body: fd });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? "Xəta baş verdi");
      const parts = [
        d.updated ? `${d.updated} sualın mətni yeniləndi` : "mətnlər artıq fayldakı kimidir",
      ].filter(Boolean);
      toast.success(parts.join(" · "));
      if (d.unmatched) toast.error(`${d.unmatched} sual faylda tapılmadı (mətni dəyişdirilib) – onlara toxunulmadı`);
      setOpen(false);
      onDone();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <input ref={input} type="file" accept=".docx,.txt" hidden onChange={(e) => upload(e.target.files?.[0])} />
      <button type="button" className="btn-secondary" onClick={() => setOpen(true)} title="Sual mətnlərinin yazılışını fayldakı kimi et">
        <Icon name="retry" size={16} /> Mətnləri fayldan yenilə
      </button>
      <Modal
        open={open}
        onClose={() => !busy && setOpen(false)}
        title="Mətnləri fayldan yenilə"
        size="sm"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setOpen(false)} disabled={busy}>Ləğv et</button>
            <button className="btn-primary" onClick={() => input.current?.click()} disabled={busy}>
              {busy ? <><Spinner /> Yenilənir…</> : <><Icon name="upload" size={16} /> Fayl seç</>}
            </button>
          </>
        }
      >
        <p className="text-sm text-muted">
          Bu paketi yüklədiyiniz DOCX faylını seçin. Mətni fayldakı ilə eyni olan sualların yazılışı (məs. alqoritm addımları alt-alta) fayldakı kimi olacaq.
          Yeni sual əlavə olunmur, cəhdlər və nəticələr qalır.
        </p>
      </Modal>
    </>
  );
}
