"use client";

import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api, errMsg, useFetch } from "@/lib/api";
import { cx } from "@/lib/format";
import ImportQuestions from "@/components/ImportQuestions";
import QuestionImage from "@/components/QuestionImage";
import { shrinkImage } from "@/lib/imageShrink";
import {
  Empty, ErrorBox, Field, Icon, Modal, PageHeader, SkeletonList, Spinner, useConfirm, useToast,
} from "@/components/ui";

interface Question {
  id: string;
  text: string;
  type: "MULTIPLE_CHOICE" | "OPEN_ENDED";
  options: string[] | null;
  correctAnswer: string | null;
  imageUrl: string | null;
  difficulty: Diff | null;
  isActive: boolean;
  order: number;
}
type Diff = "EASY" | "MEDIUM" | "HARD";
const DIFF_LABEL: Record<Diff, string> = { EASY: "Asan", MEDIUM: "Orta", HARD: "Çətin" };
const DIFF_CLASS: Record<Diff, string> = { EASY: "badge-ok", MEDIUM: "badge-warn", HARD: "badge-bad" };
const PAGE = 50;
interface Pkg {
  id: string;
  name: string;
  isPublished: boolean;
  isBank: boolean;
  drawEasy: number;
  drawMedium: number;
  drawHard: number;
  questions: Question[];
}

const BLANK = { text: "", type: "MULTIPLE_CHOICE" as Question["type"], options: ["", "", "", ""], correct: -1, image: null as string | null, difficulty: null as Diff | null };

export default function PackageQuestionsPage() {
  const { id, packageId } = useParams<{ id: string; packageId: string }>();
  const toast = useToast();
  const confirm = useConfirm();
  const { data, loading, error, reload } = useFetch<{ package: Pkg }>(`/api/packages/${packageId}`);
  const [editing, setEditing] = useState<Question | "new" | null>(null);
  const [form, setForm] = useState(BLANK);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const imgInput = useRef<HTMLInputElement>(null);
  // Yadda saxlanan sual: siyahı yeniləndikdən sonra (yeni sual isə) ona sürüşdürülür və qısa müddət vurğulanır
  const [flash, setFlash] = useState<{ id: string; scroll: boolean } | null>(null);
  // Böyük bankda: səviyyəyə görə süzgəc və hissə-hissə göstərmə
  const [filter, setFilter] = useState<Diff | "NONE" | "ALL">("ALL");
  const [shown, setShown] = useState(PAGE);

  useEffect(() => {
    if (!flash || !data) return;
    const el = document.getElementById(`q-${flash.id}`);
    if (el && flash.scroll) el.scrollIntoView({ behavior: "smooth", block: "center" });
    const t = setTimeout(() => setFlash(null), 1800);
    return () => clearTimeout(t);
  }, [flash, data]);

  function open(q: Question | "new") {
    setEditing(q);
    if (q === "new") return setForm({ ...BLANK, difficulty: filter !== "ALL" && filter !== "NONE" ? filter : null });
    const opts = q.options?.length ? [...q.options] : ["", "", "", ""];
    setForm({ text: q.text, type: q.type, options: opts, correct: q.correctAnswer ? opts.indexOf(q.correctAnswer) : -1, image: q.imageUrl, difficulty: q.difficulty });
  }

  async function pickImage(file: File | undefined) {
    if (imgInput.current) imgInput.current.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Şəkil seçin (JPG, PNG, WEBP)");
    setUploading(true);
    try {
      // Sxemlər (qraf, cədvəl) kiçikdir və olduğu kimi qalır; böyük foto kiçildilir
      const fd = new FormData();
      fd.append("file", await shrinkImage(file, { minBytes: 1.5 * 1024 * 1024 }));
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.url) throw new Error(d?.error ?? "Şəkil yüklənmədi");
      setForm((f) => ({ ...f, image: d.url }));
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    if (!form.text.trim()) return toast.error("Sual mətnini yazın");
    let options: string[] | undefined;
    let correctAnswer: string | null = null;
    if (form.type === "MULTIPLE_CHOICE") {
      options = form.options.map((o) => o.trim());
      const filled = options.filter(Boolean);
      if (filled.length < 2) return toast.error("Ən azı 2 variant doldurun");
      if (form.correct < 0 || !options[form.correct]) return toast.error("Düzgün cavabı seçin");
      correctAnswer = options[form.correct];
      options = filled;
    }
    setBusy(true);
    try {
      const body = { text: form.text.trim(), type: form.type, options: options ?? null, correctAnswer, imageUrl: form.image, difficulty: form.difficulty };
      if (editing === "new") {
        const r = await api<{ question: { id: string } }>(`/api/packages/${packageId}/questions`, { body });
        setFlash({ id: r.question.id, scroll: true });
      } else if (editing) {
        await api(`/api/questions/${editing.id}`, { method: "PATCH", body });
        setFlash({ id: editing.id, scroll: false });
      }
      toast.success("Yadda saxlanıldı");
      setEditing(null);
      await reload();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(q: Question) {
    try {
      await api(`/api/questions/${q.id}`, { method: "PATCH", body: { isActive: !q.isActive } });
      reload();
    } catch (e) {
      toast.error(errMsg(e));
    }
  }

  async function move(q: Question, dir: -1 | 1) {
    const list = [...data!.package.questions].sort((a, b) => a.order - b.order);
    const i = list.findIndex((x) => x.id === q.id);
    if (!list[i + dir]) return;
    [list[i], list[i + dir]] = [list[i + dir], list[i]];
    try {
      // Sıralar bərabər ola bilər — bütün siyahını indekslərə görə yenidən nömrələyirik
      await Promise.all(
        list.flatMap((x, idx) =>
          x.order === idx ? [] : [api(`/api/questions/${x.id}`, { method: "PATCH", body: { order: idx } })],
        ),
      );
      reload();
    } catch (e) {
      toast.error(errMsg(e));
    }
  }

  async function remove(q: Question) {
    if (!(await confirm({ title: "Sual silinsin?", message: "Tələbələrin bu suala cavabları da silinəcək.", confirmText: "Sil", danger: true }))) return;
    try {
      await api(`/api/questions/${q.id}`, { method: "DELETE" });
      reload();
    } catch (e) {
      toast.error(errMsg(e));
    }
  }

  if (loading && !data) return <div className="page-narrow"><SkeletonList rows={4} /></div>;
  if (error || !data) return <div className="page-narrow"><ErrorBox message={error ?? "Tapılmadı"} onRetry={reload} /></div>;

  const pkg = data.package;
  const qs = [...pkg.questions].sort((a, b) => a.order - b.order);
  const num = new Map(qs.map((q, i) => [q.id, i + 1]));
  const cnt = { EASY: 0, MEDIUM: 0, HARD: 0, NONE: 0 };
  for (const q of qs) if (q.isActive) cnt[q.difficulty ?? "NONE"]++;
  const filtered = filter === "ALL" ? qs : qs.filter((q) => (q.difficulty ?? "NONE") === filter);
  const visible = filtered.slice(0, shown);
  const showFilter = pkg.isBank || qs.some((q) => q.difficulty);

  return (
    <div className="page-narrow">
      <PageHeader
        title={pkg.name}
        subtitle={`${qs.filter((q) => q.isActive).length} aktiv sual${pkg.isBank ? ` · Sual bankı: hər testə ${pkg.drawEasy + pkg.drawMedium + pkg.drawHard} sual` : ""} · ${pkg.isPublished ? "Dərc olunub" : "Qaralama"}`}
        back={`/teacher/tests/${id}`}
        actions={<div className="flex flex-wrap gap-2"><ImportQuestions packageId={packageId} onDone={reload} /><button className="btn-primary" onClick={() => open("new")}><Icon name="plus" size={16} /> Sual əlavə et</button></div>}
      />

      {qs.length === 0 ? (
        <Empty icon="file" title="Hələ sual yoxdur" text="Test seçimli və ya açıq suallardan ibarət ola bilər." action={<div className="flex flex-wrap justify-center gap-2"><ImportQuestions packageId={packageId} onDone={reload} /><button className="btn-primary" onClick={() => open("new")}>İlk sualı yaz</button></div>} />
      ) : (
        <div className="space-y-3">
          {showFilter && (
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Səviyyə">
              {([["ALL", `Hamısı (${qs.length})`], ["EASY", `Asan (${cnt.EASY})`], ["MEDIUM", `Orta (${cnt.MEDIUM})`], ["HARD", `Çətin (${cnt.HARD})`], ...(cnt.NONE ? [["NONE", `Səviyyəsiz (${cnt.NONE})`]] : [])] as [typeof filter, string][]).map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  aria-pressed={filter === k}
                  onClick={() => { setFilter(k); setShown(PAGE); }}
                  className={cx("min-h-9 rounded-md border px-3 text-sm font-semibold transition-colors", filter === k ? "border-brand bg-brand text-white" : "border-line bg-surface hover:bg-tint")}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
          {visible.map((q) => { const i = (num.get(q.id) ?? 1) - 1; return (
            <article key={q.id} id={`q-${q.id}`} className={cx("card scroll-mt-24 p-4 transition-shadow duration-500 sm:p-5", !q.isActive && "opacity-60", flash?.id === q.id && "ring-2 ring-accent")}>
              <div className="flex items-start gap-3">
                <span className="flex h-8 min-w-8 shrink-0 items-center justify-center rounded-lg bg-surface-2 px-1 text-sm font-bold text-muted">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="mb-1.5 flex flex-wrap gap-1.5">
                    <span className={q.type === "MULTIPLE_CHOICE" ? "badge-brand" : "badge-warn"}>{q.type === "MULTIPLE_CHOICE" ? "Seçimli" : "Açıq"}</span>
                    {q.difficulty && <span className={DIFF_CLASS[q.difficulty]}>{DIFF_LABEL[q.difficulty]}</span>}
                    {!q.isActive && <span className="badge-muted">Deaktiv</span>}
                  </div>
                  <p className="whitespace-pre-wrap break-words font-semibold">{q.text}</p>
                  <QuestionImage src={q.imageUrl} />
                  {q.type === "MULTIPLE_CHOICE" && (
                    <ul className="mt-3 grid gap-2">
                      {(q.options ?? []).map((o, k) => (
                        <li key={k} className={cx("flex items-center gap-2 rounded-lg border px-3 py-2 text-sm", o === q.correctAnswer ? "border-ok/50 bg-ok/10 font-semibold" : "border-line")}>
                          <b className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-line bg-white text-xs">{String.fromCharCode(65 + k)}</b>
                          <span className="min-w-0 flex-1 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{o}</span>
                          {o === q.correctAnswer && <Icon name="check" size={14} className="ml-auto text-ok" />}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="flex shrink-0 flex-col items-center sm:flex-row">
                  <button className="btn-icon" disabled={i === 0} onClick={() => move(q, -1)} title="Yuxarı"><Icon name="down" size={16} className="rotate-180" /></button>
                  <button className="btn-icon" disabled={i === qs.length - 1} onClick={() => move(q, 1)} title="Aşağı"><Icon name="down" size={16} /></button>
                </div>
              </div>
              <div className="mt-3 flex justify-end gap-1 border-t border-line pt-3">
                <button className="btn-ghost btn-sm" onClick={() => toggleActive(q)}><Icon name={q.isActive ? "eyeOff" : "eye"} size={14} /> {q.isActive ? "Deaktiv et" : "Aktiv et"}</button>
                <button className="btn-ghost btn-sm" onClick={() => open(q)}><Icon name="edit" size={14} /> Redaktə</button>
                <button className="btn-ghost btn-sm hover:!text-bad" onClick={() => remove(q)}><Icon name="trash" size={14} /> Sil</button>
              </div>
            </article>
          ); })}
          {filtered.length > shown && (
            <button className="btn-secondary w-full" onClick={() => setShown((n) => n + PAGE)}>
              Daha çox göstər ({filtered.length - shown} qalıb)
            </button>
          )}
        </div>
      )}

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing === "new" ? "Yeni sual" : "Sualı redaktə et"}
        size="lg"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setEditing(null)}>Ləğv et</button>
            <button className="btn-primary" onClick={save} disabled={busy || uploading}>{busy ? <Spinner /> : "Yadda saxla"}</button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-surface-2 p-1">
            {(["MULTIPLE_CHOICE", "OPEN_ENDED"] as const).map((t) => (
              <button key={t} type="button" onClick={() => setForm({ ...form, type: t })}
                className={cx("rounded-xl py-2 text-sm font-semibold transition", form.type === t ? "bg-surface text-brand shadow-soft" : "text-muted")}>
                {t === "MULTIPLE_CHOICE" ? "Seçimli sual" : "Açıq sual"}
              </button>
            ))}
          </div>

          <div>
            <span className="label">Çətinlik</span>
            <div className="grid grid-cols-4 gap-1.5" role="radiogroup" aria-label="Çətinlik">
              {([[null, "Yoxdur"], ["EASY", "Asan"], ["MEDIUM", "Orta"], ["HARD", "Çətin"]] as [Diff | null, string][]).map(([d, label]) => (
                <button
                  key={label}
                  type="button"
                  role="radio"
                  aria-checked={form.difficulty === d}
                  onClick={() => setForm({ ...form, difficulty: d })}
                  className={cx("min-h-9 rounded-md border text-sm font-semibold transition-colors", form.difficulty === d ? "border-brand bg-tint text-brand" : "border-line bg-surface text-muted hover:bg-tint/50")}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <Field label="Sual mətni *"><textarea className="input min-h-24" value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} autoFocus /></Field>

          <div>
            <span className="label">Şəkil (qraf, ağac, cədvəl və s.) · istəyə görə</span>
            {form.image ? (
              <div className="flex flex-wrap items-start gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={form.image} alt="" className="max-h-48 max-w-full rounded-lg border border-line bg-white object-contain" />
                <div className="flex gap-2">
                  <button type="button" className="btn-secondary btn-sm" disabled={uploading} onClick={() => imgInput.current?.click()}>
                    {uploading ? <Spinner /> : <><Icon name="upload" size={14} /> Dəyiş</>}
                  </button>
                  <button type="button" className="btn-ghost btn-sm hover:!text-bad" onClick={() => setForm({ ...form, image: null })}>
                    <Icon name="trash" size={14} /> Sil
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" className="btn-secondary btn-sm" disabled={uploading} onClick={() => imgInput.current?.click()}>
                {uploading ? <Spinner /> : <><Icon name="upload" size={14} /> Şəkil əlavə et</>}
              </button>
            )}
            <input ref={imgInput} type="file" hidden accept="image/png,image/jpeg,image/webp,image/gif" onChange={(e) => pickImage(e.target.files?.[0])} />
          </div>

          {form.type === "MULTIPLE_CHOICE" ? (
            <div>
              <span className="label">Variantlar (düzgün olanı seçin) · 2–5 variant (A–E)</span>
              <div className="space-y-2">
                {form.options.map((o, k) => (
                  <div key={k} className="flex items-center gap-2">
                    <button type="button" onClick={() => setForm({ ...form, correct: k })}
                      className={cx("flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 transition", form.correct === k ? "border-ok bg-ok text-white" : "border-line text-transparent hover:border-ok/50")}
                      aria-label="Düzgün cavab">
                      <Icon name="check" size={16} />
                    </button>
                    <input className="input" placeholder={`Variant ${String.fromCharCode(65 + k)}`} value={o}
                      onChange={(e) => setForm({ ...form, options: form.options.map((x, j) => (j === k ? e.target.value : x)) })} />
                    {form.options.length > 2 && (
                      <button type="button" className="btn-icon" onClick={() => setForm({ ...form, options: form.options.filter((_, j) => j !== k), correct: form.correct === k ? -1 : form.correct > k ? form.correct - 1 : form.correct })}>
                        <Icon name="x" size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {form.options.length < 5 && (
                <button type="button" className="btn-ghost btn-sm mt-2" onClick={() => setForm({ ...form, options: [...form.options, ""] })}>
                  <Icon name="plus" size={14} /> Variant əlavə et ({String.fromCharCode(65 + form.options.length)})
                </button>
              )}
            </div>
          ) : (
            <p className="rounded-xl bg-warn/10 p-3 text-sm text-warn">Açıq sualları siz “Nəticələr” bölməsində əl ilə yoxlayacaqsınız.</p>
          )}
        </div>
      </Modal>
    </div>
  );
}
