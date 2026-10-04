"use client";

import { useParams } from "next/navigation";
import { useFetch } from "@/lib/api";
import { cx, fmtDateTime, percent } from "@/lib/format";
import { Avatar, ErrorBox, Icon, PageHeader, ProgressBar, SkeletonList } from "@/components/ui";

interface ReviewAttempt {
  id: string;
  score: number | null;
  totalScore: number | null;
  startedAt: string;
  finishedAt: string | null;
  student: { id: string; name: string; photo: string | null };
  package: { id: string; name: string; group: { id: string; name: string } | null };
  answers: {
    id: string;
    answer: string;
    isCorrect: boolean | null;
    status: "PENDING" | "APPROVED" | "REJECTED";
    teacherComment: string | null;
    question: { id: string; text: string; type: "MULTIPLE_CHOICE" | "OPEN_ENDED"; options: string[] | null; correctAnswer: string | null; order: number };
  }[];
}

export default function AttemptReviewPage() {
  const { id } = useParams<{ id: string }>();
  const { data: a, loading, error, reload } = useFetch<ReviewAttempt>(`/api/attempts/${id}`);

  if (loading) return <div className="page-narrow"><SkeletonList rows={4} /></div>;
  if (error || !a) return <div className="page-narrow"><ErrorBox message={error ?? "Tapılmadı"} onRetry={reload} /></div>;

  const pct = percent(a.score, a.totalScore);
  const pending = a.answers.filter((x) => x.status === "PENDING").length;

  return (
    <div className="page-narrow">
      <PageHeader title={a.package.name} subtitle={a.finishedAt ? `Tamamlandı: ${fmtDateTime(a.finishedAt)}` : "Davam edir"} back="/student/my-tests" />

      <section className="card mb-6 p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Avatar src={a.student.photo} name={a.student.name} size={44} />
            <div>
              <p className="font-bold">{a.student.name}</p>
              {a.package.group && <p className="text-xs text-muted">{a.package.group.name}</p>}
            </div>
          </div>
          <div className="text-right">
            <p className={cx("text-3xl font-extrabold", pct >= 70 ? "text-ok" : pct >= 40 ? "text-warn" : "text-bad")}>{pct}%</p>
            <p className="text-sm text-muted">{a.score} / {a.totalScore} düzgün</p>
          </div>
        </div>
        <div className="mt-4"><ProgressBar value={pct} tone={pct >= 70 ? "ok" : pct >= 40 ? "warn" : "bad"} /></div>
        {pending > 0 && (
          <p className="mt-3 flex items-center gap-2 text-sm text-warn"><Icon name="clock" size={15} /> {pending} açıq sual müəllimin yoxlamasını gözləyir.</p>
        )}
      </section>

      <div className="space-y-4">
        {a.answers.map((r, i) => {
          const q = r.question;
          const state = r.status === "PENDING" ? "pending" : r.isCorrect ? "ok" : "bad";
          return (
            <article
              key={r.id}
              className={cx(
                "card border-l-4 p-5",
                state === "ok" && "border-l-ok",
                state === "bad" && "border-l-bad",
                state === "pending" && "border-l-warn",
              )}
            >
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="text-xs font-bold uppercase tracking-wide text-muted">Sual {i + 1}</span>
                {state === "ok" && <span className="badge-ok"><Icon name="check" size={12} /> Düzgün</span>}
                {state === "bad" && <span className="badge-bad"><Icon name="x" size={12} /> Yanlış</span>}
                {state === "pending" && <span className="badge-warn"><Icon name="clock" size={12} /> Yoxlanılır</span>}
              </div>
              <p className="whitespace-pre-wrap font-semibold">{q.text}</p>

              {q.type === "MULTIPLE_CHOICE" ? (
                <ul className="mt-3 space-y-2">
                  {(q.options ?? []).map((opt, k) => {
                    const mine = r.answer === opt;
                    const right = q.correctAnswer === opt;
                    return (
                      <li
                        key={k}
                        className={cx(
                          "flex items-center gap-3 rounded-xl border px-3.5 py-2.5 text-sm",
                          right ? "border-ok/50 bg-ok/10" : mine ? "border-bad/50 bg-bad/10" : "border-line",
                        )}
                      >
                        <span className="font-bold text-muted">{String.fromCharCode(65 + k)}</span>
                        <span className="flex-1">{opt}</span>
                        {right && <Icon name="check" size={16} className="text-ok" />}
                        {mine && !right && <Icon name="x" size={16} className="text-bad" />}
                        {mine && <span className="text-xs font-semibold text-muted">Sizin cavab</span>}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="mt-3 rounded-xl bg-surface-2 p-3.5 text-sm">
                  <p className="mb-1 text-xs font-semibold uppercase text-muted">Sizin cavab</p>
                  <p className="whitespace-pre-wrap">{r.answer}</p>
                </div>
              )}

              {r.teacherComment && (
                <div className="mt-3 flex gap-2 rounded-xl bg-brand/5 p-3.5 text-sm">
                  <Icon name="message" size={16} className="mt-0.5 text-brand" />
                  <div><span className="font-semibold text-brand">Müəllim şərhi:</span> {r.teacherComment}</div>
                </div>
              )}
            </article>
          );
        })}
        {a.answers.length === 0 && <p className="text-center text-muted">Cavab qeyd olunmayıb.</p>}
      </div>
    </div>
  );
}
