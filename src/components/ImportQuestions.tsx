"use client";

import { useEffect, useRef, useState } from "react";
import { api, errMsg, ApiError } from "@/lib/api";
import { cx } from "@/lib/format";
import { Icon, Modal, Spinner, useToast } from "@/components/ui";
import { shrinkImage } from "@/lib/imageShrink";

interface Draft {
  text: string;
  type: "MULTIPLE_CHOICE" | "OPEN_ENDED";
  options: string[];
  correct: number;
  image?: string;
  difficulty?: "EASY" | "MEDIUM" | "HARD";
}
const DIFF_LABEL = { EASY: "Asan", MEDIUM: "Orta", HARD: "Çətin" } as const;
/** Bazaya bir sorğuda göndərilən sual sayı (böyük fayl hissə-hissə yazılır) */
const CHUNK = 200;

const MAX_IMAGES = 10;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

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
          fd.append("file", await shrinkImage(file));
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
    const many = list.length > CHUNK;
    try {
      if (many) {
        setSlow(true);
        imgProg.current = 0;
      }
      for (let k = 0; k < list.length; k += CHUNK) {
        if (many) {
          setImgInfo(`Suallar yazılır: ${Math.min(k + CHUNK, list.length)} / ${list.length}`);
          imgProg.current = k / list.length;
        }
        await api(`/api/packages/${packageId}/questions/bulk`, {
          body: {
            questions: list.slice(k, k + CHUNK).map((d) => ({
              text: d.text, type: d.type,
              options: d.type === "MULTIPLE_CHOICE" ? d.options : undefined,
              correctAnswer: d.type === "MULTIPLE_CHOICE" ? d.options[d.correct] : null,
              imageUrl: d.image ?? null,
              difficulty: d.difficulty ?? null,
            })),
          },
        });
      }
      imgProg.current = null;
      setImgInfo("");
      await finish(() => {
        toast.success(`${list.length} sual əlavə olundu`);
        close();
        onDone();
      });
    } catch (e) {
      imgProg.current = null;
      setImgInfo("");
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
          <div className="w-full max-w-md rounded-xl border border-line bg-white p-7 shadow-soft">
            <p className="text-xl font-extrabold">Test paketiniz yaradılır…</p>
            <p className="mt-1 text-sm text-muted">{imgInfo || "Fayl oxunur və suallar hazırlanır, bir az gözləyin."}</p>
            <div className="mt-5 h-5 overflow-hidden rounded-full border border-line bg-surface-2">
              <div className="h-full bg-tint transition-[width] duration-200 ease-out" style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-2 text-right text-sm font-extrabold tabular-nums">{pct}%</p>
          </div>
        </div>
      )}

      <Modal open={help} onClose={() => setHelp(false)} title="Fayl formatı">
        <div className="text-sm">
          <pre className="whitespace-pre-wrap font-sans text-muted">{`Asan          ← çətinlik başlığı (istəyə görə)
1. Sual mətni
[şəkil — istəyə görə, DOCX-də sualın altında]
A) birinci variant
B) ikinci variant
C) üçüncü variant
Cavab: B

2. Növbəti sual ...`}</pre>
          <p className="mt-3 text-xs text-muted">
            PDF, DOCX və ya TXT (maksimum 4 MB). Şəkil də seçə bilərsiniz: bir dəfəyə ən çoxu 10 şəkil, hər biri 5 MB-a qədər (JPG, PNG, WEBP). Şəkillərdən oxunan suallar əlavə olunmazdan əvvəl yoxlanış üçün göstərilir. Variantlar A–E ola bilər. Düzgün cavab sualın altında &quot;Cavab: B&quot; kimi, ya faylın sonunda &quot;Cavablar: 1-A 2-C 3-B&quot; kimi, ya da variantın sonunda * ilə göstərilir. &quot;Cavab:&quot; sətri və ya cavab açarı varsa, düzgün cavab yalnız ondan götürülür və variantların mətni olduğu kimi qalır (məs. &quot;B) *&quot; variantı ulduz simvolunun özüdür). Variantsız suallar açıq sual olur. DOCX-də sualın mətni ilə variantları arasına qoyulan şəkil (qraf, ağac, cədvəl) həmin sualın şəklinə çevrilir. Ayrıca sətirdə yazılan “Asan”, “Orta” və ya “Çətin” başlığı özündən sonrakı bütün sualların çətinliyini təyin edir (sual bankı üçün). Bir faylda 1000 suala qədər ola bilər.
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
              <p className="flex items-center gap-2 rounded-xl border border-line bg-tint px-3 py-2 text-sm font-semibold">
                <Icon name="clock" size={15} /> {missing} sualda düzgün cavab tapılmadı. Aşağıda seçin.
              </p>
            )}
            {drafts.map((d, i) => (
              <article key={i} className={cx("rounded-xl border border-line bg-white p-4", d.type === "MULTIPLE_CHOICE" && d.correct < 0 && "bg-tint")}>
                <div className="mb-2 flex items-center gap-2">
                  <span className="grid h-7 w-7 place-items-center rounded-lg bg-surface-2 text-sm font-bold">{i + 1}</span>
                  <span className={d.type === "MULTIPLE_CHOICE" ? "badge-brand" : "badge-warn"}>{d.type === "MULTIPLE_CHOICE" ? "Seçimli" : "Açıq"}</span>
                  {d.difficulty && <span className="badge-muted">{DIFF_LABEL[d.difficulty]}</span>}
                  <button className="btn-icon ml-auto" aria-label="Sil" onClick={() => setDrafts((x) => x && x.filter((_, j) => j !== i))}><Icon name="trash" size={16} /></button>
                </div>
                <textarea className="input min-h-[60px]" value={d.text} onChange={(e) => patch(i, { text: e.target.value })} />
                {d.image && (
                  <div className="relative mt-2 inline-block max-w-full">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={d.image} alt="" className="max-h-56 max-w-full rounded-lg border border-line bg-white object-contain" />
                    <button type="button" className="btn-icon absolute right-1 top-1 bg-white" aria-label="Şəkli sil" title="Şəkli sil" onClick={() => patch(i, { image: undefined })}>
                      <Icon name="trash" size={14} />
                    </button>
                  </div>
                )}
                {d.type === "MULTIPLE_CHOICE" && (
                  <ul className="mt-2 space-y-1.5">
                    {d.options.map((o, k) => (
                      <li key={k} className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => patch(i, { correct: k })}
                          aria-label={`${String.fromCharCode(65 + k)} düzgündür`}
                          aria-pressed={d.correct === k}
                          className={cx("grid h-8 w-8 shrink-0 place-items-center rounded-full border border-line text-sm font-bold transition", d.correct === k ? "bg-tint" : "bg-white hover:bg-tint")}
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
