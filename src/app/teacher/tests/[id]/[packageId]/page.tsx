"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { api, errMsg, useFetch } from "@/lib/api";
import { cx } from "@/lib/format";
import {
  Empty, ErrorBox, Field, Icon, Modal, PageHeader, SkeletonList, Spinner, useConfirm, useToast,
} from "@/components/ui";

interface Question {
  id: string;
  text: string;
  type: "MULTIPLE_CHOICE" | "OPEN_ENDED";
  options: string[] | null;
  correctAnswer: string | null;
  isActive: boolean;
  order: number;
}
interface Pkg {
  id: string;
  name: string;
  isPublished: boolean;
  questions: Question[];
}

const BLANK = { text: "", type: "MULTIPLE_CHOICE" as Question["type"], options: ["", "", "", ""], correct: -1 };

export default function PackageQuestionsPage() {
  const { id, packageId } = useParams<{ id: string; packageId: string }>();
  const toast = useToast();
  const confirm = useConfirm();
  const { data, loading, error, reload } = useFetch<{ package: Pkg }>(`/api/packages/${packageId}`);
  const [editing, setEditing] = useState<Question | "new" | null>(null);
  const [form, setForm] = useState(BLANK);
  const [busy, setBusy] = useState(false);

  function open(q: Question | "new") {
    setEditing(q);
    if (q === "new") return setForm(BLANK);
    const opts = q.options?.length ? [...q.options] : ["", "", "", ""];
    setForm({ text: q.text, type: q.type, options: opts, correct: q.correctAnswer ? opts.indexOf(q.correctAnswer) : -1 });
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
      const body = { text: form.text.trim(), type: form.type, options: options ?? null, correctAnswer };
      if (editing === "new") await api(`/api/packages/${packageId}/questions`, { body });
      else if (editing) await api(`/api/questions/${editing.id}`, { method: "PATCH", body });
      toast.success("Yadda saxlanıldı");
      setEditing(null);
      reload();
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

  if (loading) return <div className="page-narrow"><SkeletonList rows={4} /></div>;
  if (error || !data) return <div className="page-narrow"><ErrorBox message={error ?? "Tapılmadı"} onRetry={reload} /></div>;

  const pkg = data.package;
  const qs = [...pkg.questions].sort((a, b) => a.order - b.order);

  return (
    <div className="page-narrow">
      <PageHeader
        title={pkg.name}
        subtitle={`${qs.filter((q) => q.isActive).length} aktiv sual · ${pkg.isPublished ? "Dərc olunub" : "Qaralama"}`}
        back={`/teacher/tests/${id}`}
        actions={<button className="btn-primary" onClick={() => open("new")}><Icon name="plus" size={16} /> Sual əlavə et</button>}
      />

      {qs.length === 0 ? (
        <Empty icon="file" title="Hələ sual yoxdur" text="Test seçimli və ya açıq suallardan ibarət ola bilər." action={<button className="btn-primary" onClick={() => open("new")}>İlk sualı yaz</button>} />
      ) : (
        <div className="space-y-3">
          {qs.map((q, i) => (
            <article key={q.id} className={cx("card p-4 sm:p-5", !q.isActive && "opacity-60")}>
              <div className="flex items-start gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-sm font-bold text-muted">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="mb-1.5 flex flex-wrap gap-1.5">
                    <span className={q.type === "MULTIPLE_CHOICE" ? "badge-brand" : "badge-warn"}>{q.type === "MULTIPLE_CHOICE" ? "Seçimli" : "Açıq"}</span>
                    {!q.isActive && <span className="badge-muted">Deaktiv</span>}
                  </div>
                  <p className="whitespace-pre-wrap font-semibold">{q.text}</p>
                  {q.type === "MULTIPLE_CHOICE" && (
                    <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                      {(q.options ?? []).map((o, k) => (
                        <li key={k} className={cx("flex items-center gap-2 rounded-lg border px-3 py-2 text-sm", o === q.correctAnswer ? "border-ok/50 bg-ok/10 font-semibold" : "border-line")}>
                          <span className="text-muted">{String.fromCharCode(65 + k)}</span> {o}
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
          ))}
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
            <button className="btn-primary" onClick={save} disabled={busy}>{busy ? <Spinner /> : "Yadda saxla"}</button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-surface-2 p-1">
            {(["MULTIPLE_CHOICE", "OPEN_ENDED"] as const).map((t) => (
              <button key={t} type="button" onClick={() => setForm({ ...form, type: t })}
                className={cx("rounded-xl py-2 text-sm font-semibold transition", form.type === t ? "bg-surface text-brand shadow-soft" : "text-muted")}>
                {t === "MULTIPLE_CHOICE" ? "Seçimli sual" : "Açıq sual"}
              </button>
            ))}
          </div>

          <Field label="Sual mətni *"><textarea className="input min-h-24" value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} autoFocus /></Field>

          {form.type === "MULTIPLE_CHOICE" ? (
            <div>
              <span className="label">Variantlar (düzgün olanı seçin)</span>
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
              {form.options.length < 6 && (
                <button type="button" className="btn-ghost btn-sm mt-2" onClick={() => setForm({ ...form, options: [...form.options, ""] })}>
                  <Icon name="plus" size={14} /> Variant əlavə et
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
