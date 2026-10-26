"use client";

import { useEffect, useRef, useState } from "react";
import { api, errMsg, ApiError } from "@/lib/api";
import { cx } from "@/lib/format";
import { Icon, Modal, Spinner, useToast } from "@/components/ui";

interface Draft {
  text: string;
  type: "MULTIPLE_CHOICE" | "OPEN_ENDED";
  options: string[];
  correct: number;
}

const MAX_IMAGES = 10;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/** Şəkli brauzerdə kiçildir (uzun tərəf 1800px, JPEG): həm sürətli yüklənir, həm server limitinə sığır. */
async function shrink(file: File): Promise<File> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 1800 / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * scale);
  c.height = Math.round(bmp.height * scale);
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("Şəkil işlənmədi");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(bmp, 0, 0, c.width, c.height);
  const blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/jpeg", 0.85));
  if (!blob) throw new Error("Şəkil işlənmədi");
  return new File([blob], "page.jpg", { type: "image/jpeg" });
}

/** Fayldan (PDF / DOCX / TXT) və ya şəkillərdən sualları yaradır. Fayl: avtomatik; şəkil: əvvəlcə önbaxış. */
export default function ImportQuestions({ packageId, onDone }: { packageId: string; onDone: () => void }) {
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [drafts, setDrafts] = useState<Draft[] | null>(null);
  const [help, setHelp] = useState(false);
  // 4 saniyədən uzun çəkəndə faiz göstərən yükləmə lövhəsi
  const [slow, setSlow] = useState(false);
  const [pct, setPct] = useState(0);
  const started = useRef(0);
  const imgProg = useRef<number | null>(null);
  const [imgInfo, setImgInfo] = useState("");

  useEffect(() => {
    if (!busy) return;
    started.current = Date.now();
    const t = setInterval(() => {
      const el = Date.now() - started.current;
      if (el >= 4000) setSlow(true);
      setPct(imgProg.current !== null ? Math.round(3 + imgProg.current * 92) : Math.min(92, Math.round(92 * (1 - Math.exp(-el / 7000)))));
    }, 150);
    return () => clearInterval(t);
  }, [busy]);

  function close() {
    setOpen(false);
    setDrafts(null);
  }

  async function finish(done: () => void) {
    if (slow) {
      setPct(100);
      await new Promise((r) => setTimeout(r, 500));
    }
    setSlow(false);
    setPct(0);
    done();
  }

  async function pick(file: File) {
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/packages/${packageId}/import`, { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new ApiError(data?.error ?? "Fayl oxunmadı", res.status);
      const list = data.questions as Draft[];
      if (list.some((d) => d.type === "MULTIPLE_CHOICE" && d.correct < 0)) {
        // Düzgün cavabı tapılmayan sual var: müəllim seçsin
        setSlow(false);
        setDrafts(list);
        setOpen(true);
      } else {
        await store(list, true);
      }
    } catch (e) {
      setSlow(false);
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  async function pickImages(files: File[]) {
    if (files.length > MAX_IMAGES) return toast.error(`Ən çoxu ${MAX_IMAGES} şəkil seçə bilərsiniz`);
    if (files.some((f) => f.size > MAX_IMAGE_BYTES)) return toast.error("Hər şəkil ən çoxu 5 MB ola bilər");
    setBusy(true);
    setSlow(true);
    imgProg.current = 0;
    const all: Draft[] = [];
    try {
      for (const [i, file] of files.entries()) {
        setImgInfo(`Şəkil ${i + 1} / ${files.length} oxunur`);
        imgProg.current = i / files.length;
        try {
          const fd = new FormData();
          fd.append("file", await shrink(file));
          const res = await fetch(`/api/packages/${packageId}/import-image`, { method: "POST", body: fd });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) throw new ApiError(data?.error ?? "Şəkil oxunmadı", res.status);
          all.push(...(data.questions as Draft[]));
        } catch (e) {
          toast.error(`${i + 1}-ci şəkil: ${errMsg(e)}`);
          if (e instanceof ApiError && e.status === 503) break;
        }
      }
      imgProg.current = 1;
      if (all.length) {
        setPct(100);
        await new Promise((r) => setTimeout(r, 400));
        setDrafts(all);
        setOpen(true);
      }
    } finally {
      imgProg.current = null;
      setImgInfo("");
      setSlow(false);
      setPct(0);
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  function onFiles(list: FileList | null) {
    const files = Array.from(list ?? []);
    if (files.length === 0) return;
    if (files.every((f) => f.type.startsWith("image/"))) void pickImages(files);
    else void pick(files.find((f) => !f.type.startsWith("image/")) ?? files[0]);
  }

  const patch = (i: number, p: Partial<Draft>) => setDrafts((d) => d && d.map((x, j) => (j === i ? { ...x, ...p } : x)));
  const missing = (drafts ?? []).filter((d) => d.type === "MULTIPLE_CHOICE" && d.correct < 0).length;

  async function store(list: Draft[], fromPick = false) {
    if (!list.length) return;
    if (!fromPick) setBusy(true);
    try {
      await api(`/api/packages/${packageId}/questions/bulk`, {
        body: {
          questions: list.map((d) => ({
            text: d.text, type: d.type,
            options: d.type === "MULTIPLE_CHOICE" ? d.options : undefined,
            correctAnswer: d.type === "MULTIPLE_CHOICE" ? d.options[d.correct] : null,
          })),
        },
      });
      await finish(() => {
        toast.success(`${list.length} sual əlavə olundu`);
        close();
        onDone();
      });
    } catch (e) {
      setSlow(false);
      toast.error(errMsg(e));
    } finally {
      if (!fromPick) setBusy(false);
    }
  }

  const save = () => drafts && store(drafts);

  return (
    <>
      <button className="btn-secondary" disabled={busy} onClick={() => input.current?.click()}>
        <Icon name="upload" size={16} /> Faylınızı əlavə edin
      </button>
      <button type="button" className="btn-icon" aria-label="Fayl formatı" title="Fayl formatı" onClick={() => setHelp(true)}>?</button>
      <input ref={input} type="file" hidden multiple accept=".pdf,.docx,.txt,application/pdf,image/jpeg,image/png,image/webp" onChange={(e) => onFiles(e.target.files)} />

      {slow && (
        <div className="fixed inset-0 z-[300] grid place-items-center bg-ink/60 px-6" role="status" aria-live="polite">
          <div className="w-full max-w-md rounded-3xl border-[3px] border-ink bg-white p-7 shadow-hard">
            <p className="text-xl font-extrabold">Test paketiniz yaradılır…</p>
            <p className="mt-1 text-sm text-muted">{imgInfo || "Fayl oxunur və suallar hazırlanır, bir az gözləyin."}</p>
            <div className="mt-5 h-5 overflow-hidden rounded-full border-[2.5px] border-ink bg-surface-2">
              <div className="h-full bg-sun transition-[width] duration-200 ease-out" style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-2 text-right text-sm font-extrabold tabular-nums">{pct}%</p>
          </div>
        </div>
      )}

      <Modal open={help} onClose={() => setHelp(false)} title="Fayl formatı">
        <div className="text-sm">
          <pre className="whitespace-pre-wrap font-sans text-muted">{`1. Sual mətni
A) birinci variant
B) ikinci variant
C) üçüncü variant
Cavab: B

2. Növbəti sual ...`}</pre>
          <p className="mt-3 text-xs text-muted">
            PDF, DOCX və ya TXT (maksimum 4 MB). Şəkil də seçə bilərsiniz: bir dəfəyə ən çoxu 10 şəkil, hər biri 5 MB-a qədər (JPG, PNG, WEBP). Şəkillərdən oxunan suallar əlavə olunmazdan əvvəl yoxlanış üçün göstərilir. Variantlar A–E ola bilər. Düzgün cavab sualın altında &quot;Cavab: B&quot; kimi, ya faylın sonunda &quot;Cavablar: 1-A 2-C 3-B&quot; kimi, ya da variantın sonunda * ilə göstərilir. Variantsız suallar açıq sual olur.
          </p>
        </div>
      </Modal>

      <Modal
        open={open}
        onClose={close}
        size="xl"
        title="Sualları yoxlayın"
        footer={drafts ? (
          <>
            <button className="btn-secondary" onClick={() => setDrafts(null)}>Başqa fayl</button>
            <button className="btn-primary" onClick={save} disabled={busy || missing > 0 || drafts.length === 0}>
              {busy ? <Spinner /> : `${drafts.length} sualı əlavə et`}
            </button>
          </>
        ) : undefined}
      >
        {drafts && (
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
