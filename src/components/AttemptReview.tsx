"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, errMsg, useFetch } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { cx, fmtDateTime, percent } from "@/lib/format";
import { Avatar, ErrorBox, Icon, Modal, PageHeader, ProgressBar, SkeletonList, Spinner, useConfirm, useToast } from "@/components/ui";
import QuestionImage from "@/components/QuestionImage";
import QuestionComments, { type ReviewComment } from "@/components/ReviewComments";

interface ReviewAttempt {
  id: string;
  score: number | null;
  totalScore: number | null;
  startedAt: string;
  finishedAt: string | null;
  rewardGranted: boolean;
  rewardCoins: number;
  student: { id: string; name: string; photo: string | null };
  package: { id: string; name: string; group: { id: string; name: string } | null };
  numbers?: Record<string, number>;
  blanks?: { id: string; text: string; type: "MULTIPLE_CHOICE" | "OPEN_ENDED"; options: string[] | null; correctAnswer: string | null; imageUrl?: string | null; order: number }[];
  answers: {
    id: string;
    answer: string;
    isCorrect: boolean | null;
    status: "PENDING" | "APPROVED" | "REJECTED";
    teacherComment: string | null;
    question: { id: string; text: string; type: "MULTIPLE_CHOICE" | "OPEN_ENDED"; options: string[] | null; correctAnswer: string | null; imageUrl?: string | null; order: number };
  }[];
}

export default function AttemptReview({ id, back, viewer = "student" }: { id: string; back: string; viewer?: "student" | "teacher" }) {
  const { user } = useAuth();
  const { data: a, loading, error, reload } = useFetch<ReviewAttempt>(`/api/attempts/${id}`);
  const cm = useFetch<{ comments: ReviewComment[]; canEdit: boolean; drafts: number; wrong: string[] }>(`/api/attempts/${id}/comments`);
  const router = useRouter();
  const toast = useToast();
  const canEdit = !!cm.data?.canEdit;
  const drafts = cm.data?.drafts ?? 0;
  const [sending, setSending] = useState(false);
  // Göndərilməmiş şərh varsa səhifədən çıxanda soruşulur: göndər / saxla / sil
  const [leaveTo, setLeaveTo] = useState<string | null>(null);

  useEffect(() => {
    if (!canEdit || drafts === 0) return;
    const onBefore = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const navBtn = (e.target as HTMLElement).closest<HTMLElement>("[data-nav]");
      if (navBtn) {
        e.preventDefault();
        e.stopPropagation();
        setLeaveTo(navBtn.dataset.nav === "back" ? "__back" : navBtn.dataset.nav!);
        return;
      }
      const link = (e.target as HTMLElement).closest("a");
      if (!link || link.target === "_blank" || link.hasAttribute("download")) return;
      const url = new URL(link.href, location.href);
      if (url.origin !== location.origin || url.pathname === location.pathname) return;
      e.preventDefault();
      e.stopPropagation();
      setLeaveTo(url.pathname + url.search);
    };
    window.addEventListener("beforeunload", onBefore);
    document.addEventListener("click", onClick, true);
    return () => { window.removeEventListener("beforeunload", onBefore); document.removeEventListener("click", onClick, true); };
  }, [canEdit, drafts]);

  const go = (to: string) => (to === "__back" ? router.back() : router.push(to));
  const confirm = useConfirm();

  // Müəllim: bu cəhdi birdəfəlik sil (cədvəllər onsuz yenidən hesablanır)
  async function removeAttempt() {
    const ok = await confirm({
      title: "Cəhd silinsin?",
      message: "Cəhd, cavabları və şərhləri birdəfəlik silinəcək; reytinq və aylıq cədvəl onsuz yenidən hesablanacaq. Verilmiş coin geri alınmır.",
      confirmText: "Sil",
      danger: true,
    });
    if (!ok) return;
    try {
      await api(`/api/attempts/${id}`, { method: "DELETE" });
      toast.success("Cəhd silindi");
      router.push(back);
    } catch (e) {
      toast.error(errMsg(e));
    }
  }

  async function sendAll(then?: string) {
    setSending(true);
    try {
      const r = await api<{ sent: number }>(`/api/attempts/${id}/comments/send`, { method: "POST" });
      toast.success(`${r.sent} şərh tələbəyə göndərildi`);
      if (then) go(then);
      else cm.reload();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setSending(false);
    }
  }
  async function discard(then: string) {
    setSending(true);
    try {
      await api(`/api/attempts/${id}/comments`, { method: "DELETE" });
      go(then);
    } catch (e) {
      toast.error(errMsg(e));
      setSending(false);
    }
  }

  // Nəticə cədvəlindən gələndə (?q=<sual ID>) kitabça həmin sualda açılır və sual qısa müddət vurğulanır
  const [lit, setLit] = useState<string | null>(null);
  const loaded = !!a;
  useEffect(() => {
    if (!loaded) return;
    const q = new URLSearchParams(window.location.search).get("q");
    if (!q) return;
    const t = setTimeout(() => {
      const el = document.getElementById(`q-${q}`);
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setLit(q);
      setTimeout(() => setLit(null), 2200);
    }, 80);
    return () => clearTimeout(t);
  }, [loaded]);

  if (loading && !a) return <div className="page-narrow"><SkeletonList rows={4} /></div>;
  if (error || !a) return <div className="page-narrow"><ErrorBox message={error ?? "Tapılmadı"} onRetry={reload} /></div>;

  const pct = percent(a.score, a.totalScore);
  const pending = a.answers.filter((x) => x.status === "PENDING").length;
  // Cavabsız suallar (yalnız təkrarsız testlərdə gəlir) cavablarla birlikdə sual sırasına düzülür
  const rows = [
    ...a.answers.map((r) => ({ ...r, blank: false })),
    ...(a.blanks ?? []).map((q) => ({
      id: `blank-${q.id}`, answer: "", isCorrect: false, status: "APPROVED" as const, teacherComment: null, question: q, blank: true,
    })),
  ].sort((x, y) => x.question.order - y.question.order);

  const comments = cm.data?.comments ?? [];
  // Şərh sütunu: müəllimə həmişə, tələbəyə şərh varsa
  const side = canEdit || comments.length > 0;

  return (
    <div className={cx(side ? "page" : "page-narrow", canEdit && drafts > 0 && "pb-24")}>
      <PageHeader title={a.package.name} subtitle={a.finishedAt ? `Tamamlandı: ${fmtDateTime(a.finishedAt)}` : "Davam edir"} back={back} />

      <section className={cx("card mb-6 p-5", side && "lg:mr-[316px]")}>
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
            {canEdit && (
              <button type="button" onClick={removeAttempt} className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-muted hover:text-bad">
                <Icon name="trash" size={12} /> Cəhdi sil
              </button>
            )}
          </div>
        </div>
        <div className="mt-4"><ProgressBar value={pct} tone={pct >= 70 ? "ok" : pct >= 40 ? "warn" : "bad"} /></div>
        {a.rewardGranted && a.rewardCoins > 0 && (
          <p className="mt-3 inline-flex items-center gap-2 rounded-md border border-line bg-tint px-3 py-1 text-sm font-bold"><Icon name="coin" size={14} /> Müəllimdən +{a.rewardCoins} coin</p>
        )}
        {pending > 0 && (
          <p className="mt-3 flex items-center gap-2 text-sm text-warn"><Icon name="clock" size={15} /> {pending} açıq sual müəllimin yoxlamasını gözləyir.</p>
        )}
      </section>

      <div className="space-y-4">
        {rows.map((r, i) => {
          const q = r.question;
          const state = r.blank ? "blank" : r.status === "PENDING" ? "pending" : r.isCorrect ? "ok" : "bad";
          const qComments = comments.filter((c) => c.questionId === q.id);
          return (
            <div key={r.id} className={cx(side && "lg:grid lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start lg:gap-4")}>
            <article
              id={`q-${q.id}`}
              className={cx(
                "card scroll-mt-24 border-l-4 p-5 transition-shadow duration-700",
                lit === q.id && "ring-2 ring-ok ring-offset-2",
                state === "ok" && "border-l-ok",
                state === "bad" && "border-l-bad",
                state === "pending" && "border-l-warn",
                state === "blank" && "border-l-ink/30",
              )}
            >
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="text-xs font-bold uppercase tracking-wide text-muted">Sual {a.numbers?.[q.id] ?? i + 1}</span>
                {state === "ok" && <span className="badge-ok"><Icon name="check" size={12} /> Düzgün</span>}
                {state === "bad" && <span className="badge-bad"><Icon name="x" size={12} /> Yanlış</span>}
                {state === "pending" && <span className="badge-warn"><Icon name="clock" size={12} /> Yoxlanılır</span>}
                {state === "blank" && <span className="badge-muted">Cavab verilməyib</span>}
              </div>
              <p className="whitespace-pre-wrap break-words font-semibold">{q.text}</p>
              <QuestionImage src={q.imageUrl} />

              {q.type === "MULTIPLE_CHOICE" ? (
                <ul className="mt-3 space-y-2">
                  {(q.options ?? []).map((opt, k) => {
                    const mine = r.answer === opt;
                    const right = q.correctAnswer === opt;
                    return (
                      <li
                        key={k}
                        className={cx(
                          "flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border px-3.5 py-2.5 text-sm",
                          right ? "border-ok/50 bg-ok/10" : mine ? "border-bad/50 bg-bad/10" : "border-line",
                        )}
                      >
                        <span className="shrink-0 font-bold text-muted">{String.fromCharCode(65 + k)}</span>
                        <span className="min-w-0 flex-1 basis-40 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{opt}</span>
                        {(right || mine) && (
                          <span className="ml-auto flex shrink-0 items-center gap-1.5 whitespace-nowrap">
                            {right && <Icon name="check" size={16} className="text-ok" />}
                            {mine && !right && <Icon name="x" size={16} className="text-bad" />}
                            {mine && <span className="text-xs font-semibold text-muted">{viewer === "student" && a.student.id === user?.id ? "Sizin cavab" : "Cavab"}</span>}
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="mt-3 rounded-xl bg-surface-2 p-3.5 text-sm">
                  <p className="mb-1 text-xs font-semibold uppercase text-muted">{viewer === "student" && a.student.id === user?.id ? "Sizin cavab" : "Cavab"}</p>
                  <p className="whitespace-pre-wrap break-words">{r.blank ? "Cavab verilməyib" : r.answer}</p>
                </div>
              )}

              {r.teacherComment && (
                <div className="mt-3 flex gap-2 rounded-xl bg-brand/5 p-3.5 text-sm">
                  <Icon name="message" size={16} className="mt-0.5 text-brand" />
                  <div><span className="font-semibold text-brand">Müəllim şərhi:</span> {r.teacherComment}</div>
                </div>
              )}
            </article>
            {side && (
              <div className="mt-2 lg:sticky lg:top-24 lg:mt-0">
                <QuestionComments
                  attemptId={a.id}
                  questionId={q.id}
                  comments={qComments}
                  canEdit={canEdit}
                  wrong={state === "bad" || state === "blank"}
                  onChanged={cm.reload}
                />
              </div>
            )}
            </div>
          );
        })}
        {rows.length === 0 && <p className="text-center text-muted">Cavab qeyd olunmayıb.</p>}
      </div>

      {canEdit && drafts > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur lg:bottom-0">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
            <p className="text-sm"><b>{drafts}</b> şərh hələ göndərilməyib. İşiniz bitəndə tələbəyə bir bildirişlə göndərin.</p>
            <button type="button" className="btn-primary" onClick={() => sendAll()} disabled={sending}>
              {sending ? <Spinner /> : <Icon name="send" size={16} />} Qeydləri göndər
            </button>
          </div>
        </div>
      )}

      <Modal
        open={!!leaveTo}
        onClose={() => setLeaveTo(null)}
        title="Göndərilməmiş şərhlər var"
        size="sm"
        footer={
          <div className="flex w-full flex-col gap-2">
            <button className="btn-primary w-full" disabled={sending} onClick={() => leaveTo && sendAll(leaveTo)}>
              {sending ? <Spinner /> : <Icon name="send" size={16} />} Təsdiqlə və göndər
            </button>
            <button className="btn-secondary w-full" disabled={sending} onClick={() => leaveTo && go(leaveTo)}>Yadda saxla, göndərmə</button>
            <button className="btn-ghost w-full text-bad" disabled={sending} onClick={() => leaveTo && discard(leaveTo)}>Qeyd etmə (şərhləri sil)</button>
          </div>
        }
      >
        <p className="text-sm text-muted">
          Bu kitabçada {drafts} şərh yazmısınız, amma tələbəyə göndərməmisiniz. “Yadda saxla” seçsəniz, sonra qayıdıb qaldığınız yerdən davam edə bilərsiniz.
        </p>
      </Modal>
    </div>
  );
}
