"use client";

import { useRef, useState } from "react";
import { errMsg } from "@/lib/api";
import { Icon, Spinner, useConfirm, useToast } from "@/components/ui";

/**
 * "Mətnləri fayldan yenilə": artıq yüklənmiş paketin sual mətnlərini fayldakı düzülüşlə yeniləyir
 * (məs. alqoritm addımları alt-alta). Yeni sual yaranmır, cəhdlər və nəticələr qalır.
 */
export default function RefreshTexts({ packageId, onDone }: { packageId: string; onDone: () => void }) {
  const toast = useToast();
  const confirm = useConfirm();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function pick() {
    const ok = await confirm({
      title: "Mətnləri fayldan yenilə",
      message:
        "Bu paketi yüklədiyiniz DOCX faylını seçin. Mətni fayldakı ilə eyni olan sualların yazılışı (sətir keçidləri) fayldakı kimi olacaq. Yeni sual əlavə olunmur, heç nə silinmir, cəhdlər və nəticələr qalır.",
      confirmText: "Fayl seç",
    });
    if (ok) input.current?.click();
  }

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
      if (d.updated) toast.success(`${d.updated} sualın mətni yeniləndi`);
      else toast.success("Dəyişiklik lazım olmadı: mətnlər artıq fayldakı kimidir");
      if (d.unmatched) toast.error(`${d.unmatched} sual faylda tapılmadı (mətni dəyişdirilib) – onlara toxunulmadı`);
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
      <button type="button" className="btn-secondary" onClick={pick} disabled={busy} title="Sual mətnlərinin yazılışını fayldakı kimi et">
        {busy ? <Spinner /> : <Icon name="retry" size={16} />} Mətnləri fayldan yenilə
      </button>
    </>
  );
}
