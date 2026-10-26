"use client";

import { useRef, useState } from "react";
import { api, errMsg, ApiError } from "@/lib/api";
import { cx } from "@/lib/format";
import { Icon, Modal, Spinner, useToast } from "@/components/ui";

interface Draft {
  text: string;
  type: "MULTIPLE_CHOICE" | "OPEN_ENDED";
  options: string[];
  correct: number;
}

/** PDF / DOCX / TXT faylından sualları avtomatik yaradır: əvvəl önbaxış, təsdiqdən sonra yazılır. */
export default function ImportQuestions({ packageId, onDone }: { packageId: string; onDone: () => void }) {
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [drafts, setDrafts] = useState<Draft[] | null>(null);

  function close() {
    setOpen(false);
    setDrafts(null);
  }

  async function pick(file: File) {
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/packages/${packageId}/import`, { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new ApiError(data?.error ?? "Fayl oxunmadı", res.status);
      setDrafts(data.questions as Draft[]);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  const patch = (i: number, p: Partial<Draft>) => setDrafts((d) => d && d.map((x, j) => (j === i ? { ...x, ...p } : x)));
  const missing = (drafts ?? []).filter((d) => d.type === "MULTIPLE_CHOICE" && d.correct < 0).length;

  async function save() {
    if (!drafts?.length) return;
    setBusy(true);
    try {
      await api(`/api/packages/${packageId}/questions/bulk`, {
        body: {
          questions: drafts.map((d) => ({
            text: d.text, type: d.type,
            options: d.type === "MULTIPLE_CHOICE" ? d.options : undefined,
            correctAnswer: d.type === "MULTIPLE_CHOICE" ? d.options[d.correct] : null,
          })),
        },
      });
      toast.success(`${drafts.length} sual əlavə olundu`);
      close();
      onDone();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button className="btn-secondary" onClick={() => setOpen(true)}><Icon name="upload" size={16} /> Fayldan yüklə</button>
      <Modal
        open={open}
        onClose={close}
        size="xl"
        title="Fayldan sual yüklə"
        footer={drafts ? (
          <>
            <button className="btn-secondary" onClick={() => setDrafts(null)}>Başqa fayl</button>
            <button className="btn-primary" onClick={save} disabled={busy || missing > 0 || drafts.length === 0}>
              {busy ? <Spinner /> : `${drafts.length} sualı əlavə et`}
            </button>
          </>
        ) : undefined}
      >
        {!drafts ? (
          <div className="space-y-4">
            <button
              type="button"
              disabled={busy}
              onClick={() => input.current?.click()}
              className="flex w-full flex-col items-center gap-2 rounded-2xl border-[2.5px] border-dashed border-ink bg-surface-2 px-6 py-10 text-center transition hover:bg-sun/25"
            >
              {busy ? <Spinner /> : <Icon name="upload" size={28} />}
              <span className="font-bold">{busy ? "Fayl oxunur…" : "PDF, DOCX və ya TXT faylı seçin"}</span>
              <span className="text-xs text-muted">Maksimum 4 MB</span>
            </button>
            <input ref={input} type="file" hidden accept=".pdf,.docx,.txt,application/pdf" onChange={(e) => e.target.files?.[0] && pick(e.target.files[0])} />
            <div className="rounded-xl border-2 border-ink/20 bg-white p-4 text-sm">
              <p className="mb-2 font-bold">Fayl belə hazırlanmalıdır:</p>
              <pre className="whitespace-pre-wrap font-sans text-muted">{`1. Sual mətni
A) birinci variant
B) ikinci variant
C) üçüncü variant
Cavab: B

2. Növbəti sual ...`}</pre>
              <p className="mt-2 text-xs text-muted">
                Variantlar A–E ola bilər. Düzgün cavab sualın altında &quot;Cavab: B&quot; kimi, ya faylın sonunda &quot;Cavablar: 1-A 2-C 3-B&quot; kimi, ya da variantın sonunda * ilə göstərilir. Variantsız suallar açıq sual olur. Əlavə etməzdən əvvəl hamısını yoxlaya və düzəldə bilərsiniz.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {missing > 0 && (
              <p className="flex items-center gap-2 rounded-xl border-2 border-ink bg-sun/40 px-3 py-2 text-sm font-semibold">
                <Icon name="clock" size={15} /> {missing} sualda düzgün cavab tapılmadı. Aşağıda seçin.
              </p>
            )}
            {drafts.map((d, i) => (
              <article key={i} className={cx("rounded-2xl border-[2.5px] border-ink bg-white p-4", d.type === "MULTIPLE_CHOICE" && d.correct < 0 && "bg-sun/20")}>
                <div className="mb-2 flex items-center gap-2">
                  <span className="grid h-7 w-7 place-items-center rounded-lg bg-surface-2 text-sm font-bold">{i + 1}</span>
                  <span className={d.type === "MULTIPLE_CHOICE" ? "badge-brand" : "badge-warn"}>{d.type === "MULTIPLE_CHOICE" ? "Seçimli" : "Açıq"}</span>
                  <button className="btn-icon ml-auto" aria-label="Sil" onClick={() => setDrafts((x) => x && x.filter((_, j) => j !== i))}><Icon name="trash" size={16} /></button>
                </div>
                <textarea className="input min-h-[60px]" value={d.text} onChange={(e) => patch(i, { text: e.target.value })} />
                {d.type === "MULTIPLE_CHOICE" && (
                  <ul className="mt-2 space-y-1.5">
                    {d.options.map((o, k) => (
                      <li key={k} className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => patch(i, { correct: k })}
                          aria-label={`${String.fromCharCode(65 + k)} düzgündür`}
                          aria-pressed={d.correct === k}
                          className={cx("grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 border-ink text-sm font-bold transition", d.correct === k ? "bg-sun" : "bg-white hover:bg-sun/40")}
                        >
                          {d.correct === k ? <Icon name="check" size={14} /> : String.fromCharCode(65 + k)}
                        </button>
                        <input className="input !py-1.5" value={o} onChange={(e) => patch(i, { options: d.options.map((x, j) => (j === k ? e.target.value : x)) })} />
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            ))}
          </div>
        )}
      </Modal>
    </>
  );
}
