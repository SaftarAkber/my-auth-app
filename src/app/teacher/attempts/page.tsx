"use client";

import { useMemo, useState } from "react";
import { api, errMsg, useFetch } from "@/lib/api";
import { cx, fmtDateTime, percent } from "@/lib/format";
import { Avatar, Empty, ErrorBox, Icon, Modal, PageHeader, SkeletonList, Spinner, Tabs, useToast } from "@/components/ui";

interface Answer {
  id: string;
  answer: string;
  isCorrect: boolean | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  teacherComment: string | null;
  question: { text: string; type: "MULTIPLE_CHOICE" | "OPEN_ENDED"; options: string[] | null; correctAnswer: string | null };
}
interface Attempt {
  id: string;
  score: number | null;
  totalScore: number | null;
  startedAt: string;
  finishedAt: string | null;
  student: { id: string; name: string; photo: string | null };
  package: { id: string; name: string; collection: { name: string } | null; group: { name: string } | null };
  answers: Answer[];
}

export default function TeacherAttemptsPage() {
  const toast = useToast();
  const { data, loading, error, reload } = useFetch<{ attempts: Attempt[] }>("/api/teacher/attempts");
  const [tab, setTab] = useState<"all" | "review">("all");
  const [pkgId, setPkgId] = useState("");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  const [grading, setGrading] = useState<Answer | null>(null);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  const all = useMemo(() => data?.attempts ?? [], [data]);
  const needsReview = (a: Attempt) => a.answers.some((x) => x.status === "PENDING");

  const packages = useMemo(() => {
    const m = new Map<string, string>();
    all.forEach((a) => m.set(a.package.id, a.package.name));
    return [...m.entries()];
  }, [all]);

  const list = all.filter(
    (a) =>
      (tab === "all" || needsReview(a)) &&
      (!pkgId || a.package.id === pkgId) &&
      (!q.trim() || a.student.name.toLowerCase().includes(q.trim().toLowerCase())),
  );

  async function grade(status: "APPROVED" | "REJECTED") {
    if (!grading) return;
    setBusy(true);
    try {
      await api(`/api/answers/${grading.id}`, { method: "PATCH", body: { status, teacherComment: comment.trim() || undefined } });
      toast.success(status === "APPROVED" ? "Düzgün sayıldı" : "Yanlış sayıldı");
      setGrading(null);
      reload();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <PageHeader title="Nəticələr" subtitle="Tələbələrin tamamladığı testlər və açıq sualların yoxlanması" />

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { id: "all", label: "Hamısı", count: all.length },
          { id: "review", label: "Yoxlanmalı", count: all.filter(needsReview).length },
        ]}
      />

      <div className="mb-5 flex flex-wrap gap-3">
        <div className="relative min-w-60 flex-1 sm:max-w-sm">
          <Icon name="search" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" size={17} />
          <input className="input pl-10" placeholder="Tələbə axtar…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="input !w-auto" value={pkgId} onChange={(e) => setPkgId(e.target.value)}>
          <option value="">Bütün testlər</option>
          {packages.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
        </select>
      </div>

      {loading ? (
        <SkeletonList />
      ) : error ? (
        <ErrorBox message={error} onRetry={reload} />
      ) : list.length === 0 ? (
        <Empty icon="chart" title={tab === "review" ? "Yoxlanacaq cavab yoxdur" : "Nəticə tapılmadı"} />
      ) : (
        <div className="space-y-3">
          {list.map((a) => {
            const p = percent(a.score, a.totalScore);
            const pend = a.answers.filter((x) => x.status === "PENDING").length;
            const isOpen = open === a.id;
            return (
              <article key={a.id} className="card overflow-hidden">
                <button className="flex w-full items-center gap-3 p-4 text-left" onClick={() => setOpen(isOpen ? null : a.id)}>
                  <Avatar src={a.student.photo} name={a.student.name} size={42} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{a.student.name}</p>
                    <p className="truncate text-xs text-muted">{a.package.name} · {fmtDateTime(a.finishedAt)}</p>
                  </div>
                  {pend > 0 && <span className="badge-warn">{pend} yoxlanmamış</span>}
                  <span className="hidden text-sm text-muted sm:inline">{a.score}/{a.totalScore}</span>
                  <span className={cx("badge", p >= 70 ? "bg-ok/10 text-ok" : p >= 40 ? "bg-warn/10 text-warn" : "bg-bad/10 text-bad")}>{p}%</span>
                  <Icon name="down" className={cx("text-muted transition", isOpen && "rotate-180")} />
                </button>

                {isOpen && (
                  <div className="space-y-3 border-t border-line bg-surface-2/50 p-4">
                    {a.answers.length === 0 && <p className="text-sm text-muted">Cavab qeyd olunmayıb.</p>}
                    {a.answers.map((r, i) => (
                      <div key={r.id} className="rounded-xl border border-line bg-surface p-4">
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <span className="text-xs font-bold uppercase text-muted">Sual {i + 1} · {r.question.type === "MULTIPLE_CHOICE" ? "Seçimli" : "Açıq"}</span>
                          {r.status === "PENDING" ? <span className="badge-warn">Yoxlanmalı</span> : r.isCorrect ? <span className="badge-ok">Düzgün</span> : <span className="badge-bad">Yanlış</span>}
                        </div>
                        <p className="whitespace-pre-wrap text-sm font-semibold">{r.question.text}</p>
                        <p className="mt-2 text-sm"><span className="text-muted">Cavab:</span> <span className="whitespace-pre-wrap">{r.answer}</span></p>
                        {r.question.type === "MULTIPLE_CHOICE" && !r.isCorrect && (
                          <p className="mt-1 text-sm"><span className="text-muted">Düzgün cavab:</span> <span className="font-semibold text-ok">{r.question.correctAnswer}</span></p>
                        )}
                        {r.teacherComment && <p className="mt-2 rounded-lg bg-brand/5 p-2.5 text-sm"><span className="font-semibold text-brand">Şərhiniz:</span> {r.teacherComment}</p>}
                        {r.question.type === "OPEN_ENDED" && (
                          <button className="btn-soft btn-sm mt-3" onClick={() => { setGrading(r); setComment(r.teacherComment ?? ""); }}>
                            <Icon name="edit" size={14} /> {r.status === "PENDING" ? "Qiymətləndir" : "Yenidən qiymətləndir"}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      <Modal
        open={!!grading}
        onClose={() => setGrading(null)}
        title="Açıq sualı qiymətləndir"
        footer={
          <>
            <button className="btn-danger" onClick={() => grade("REJECTED")} disabled={busy}>{busy ? <Spinner /> : <><Icon name="x" size={15} /> Yanlış</>}</button>
            <button className="btn-primary" onClick={() => grade("APPROVED")} disabled={busy}>{busy ? <Spinner /> : <><Icon name="check" size={15} /> Düzgün</>}</button>
          </>
        }
      >
        {grading && (
          <div className="space-y-4">
            <div>
              <p className="label">Sual</p>
              <p className="whitespace-pre-wrap font-semibold">{grading.question.text}</p>
            </div>
            <div className="rounded-xl bg-surface-2 p-3.5">
              <p className="label">Tələbənin cavabı</p>
              <p className="whitespace-pre-wrap text-sm">{grading.answer}</p>
            </div>
            <label className="block">
              <span className="label">Şərh (istəyə bağlı)</span>
              <textarea className="input min-h-20" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Tələbəyə geri bildirim…" />
            </label>
          </div>
        )}
      </Modal>
    </div>
  );
}
