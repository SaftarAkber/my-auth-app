"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, errMsg } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { cx, fmtClock, percent } from "@/lib/format";
import { Icon, ProgressBar, Spinner, useConfirm, useToast } from "@/components/ui";

export interface TakeQuestion {
  id: string;
  text: string;
  type: "MULTIPLE_CHOICE" | "OPEN_ENDED";
  options: string[] | null;
  order: number;
}

export interface AttemptStart {
  attemptId: string;
  questions: TakeQuestion[];
  isTimed: boolean;
  duration: number | null;
  startedAt: string;
}

interface Result {
  score: number | null;
  totalScore: number | null;
  coinsEarned?: number;
}

/** Testi başladır. Uğurlu olarsa `AttemptStart` qaytarır, əks halda toast göstərir və null qaytarır. */
export function useStartTest() {
  const toast = useToast();
  const [starting, setStarting] = useState<string | null>(null);

  const start = useCallback(
    async (packageId: string): Promise<AttemptStart | null> => {
      setStarting(packageId);
      try {
        return await api<AttemptStart>("/api/attempts", { body: { packageId } });
      } catch (e) {
        toast.error(errMsg(e));
        return null;
      } finally {
        setStarting(null);
      }
    },
    [toast],
  );

  return { start, starting };
}

export default function TestTaker({
  name, data, onClose,
}: {
  name: string;
  data: AttemptStart;
  /** Test bağlananda çağırılır (bitmiş və ya yarımçıq). */
  onClose: (finished: boolean) => void;
}) {
  const { refreshUser } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();

  const questions = useMemo(() => [...data.questions].sort((a, b) => a.order - b.order), [data.questions]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [index, setIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  // Qalan vaxt serverdəki startedAt-dan hesablanır (səhifə yenilənəndə də düzgün qalır)
  const deadline = useMemo(
    () => (data.isTimed && data.duration ? new Date(data.startedAt).getTime() + data.duration * 1000 : null),
    [data],
  );
  const [left, setLeft] = useState<number | null>(() => (deadline ? Math.max(0, (deadline - Date.now()) / 1000) : null));

  const answersRef = useRef(answers);
  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);
  const doneRef = useRef(false);

  const submit = useCallback(async () => {
    if (doneRef.current) return;
    doneRef.current = true;
    setSubmitting(true);
    try {
      const payload = Object.entries(answersRef.current).map(([questionId, answer]) => ({ questionId, answer }));
      const res = await api<Result>(`/api/attempts/${data.attemptId}`, { body: { answers: payload } });
      setResult(res);
      refreshUser();
    } catch (e) {
      doneRef.current = false;
      toast.error(errMsg(e));
    } finally {
      setSubmitting(false);
    }
  }, [data.attemptId, refreshUser, toast]);

  useEffect(() => {
    if (!deadline || result) return;
    const t = setInterval(() => {
      const s = Math.max(0, (deadline - Date.now()) / 1000);
      setLeft(s);
      if (s <= 0) {
        clearInterval(t);
        submit();
      }
    }, 500);
    return () => clearInterval(t);
  }, [deadline, result, submit]);

  // Təsadüfən bağlanmanın qarşısı
  useEffect(() => {
    if (result) return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [result]);

  const answered = questions.filter((q) => answers[q.id]?.trim()).length;
  const q = questions[index];

  async function finish() {
    const missing = questions.length - answered;
    if (missing > 0) {
      const ok = await confirm({
        title: "Testi bitirmək istəyirsiniz?",
        message: `${missing} sual cavablandırılmayıb. Bitirdikdən sonra dəyişiklik edə bilməyəcəksiniz.`,
        confirmText: "Bitir",
      });
      if (!ok) return;
    }
    submit();
  }

  async function leave() {
    const ok = await confirm({
      title: "Testdən çıxmaq istəyirsiniz?",
      message: "Cavablarınız saxlanmayacaq. Test sonradan davam etdirilə bilər, amma vaxt işləməyə davam edir.",
      confirmText: "Çıx",
      danger: true,
    });
    if (ok) onClose(false);
  }

  /* ─────── Nəticə ekranı ─────── */
  if (result) {
    const pct = percent(result.score, result.totalScore);
    const tone = pct >= 70 ? "ok" : pct >= 40 ? "warn" : "bad";
    const hasOpen = questions.some((x) => x.type === "OPEN_ENDED");
    return (
      <Overlay>
        <div className="mx-auto flex min-h-full max-w-md flex-col items-center justify-center px-4 py-10 text-center">
          <div
            className={cx(
              "flex h-32 w-32 items-center justify-center rounded-full border-8 text-4xl font-extrabold",
              tone === "ok" && "border-ok/30 text-ok",
              tone === "warn" && "border-warn/30 text-warn",
              tone === "bad" && "border-bad/30 text-bad",
            )}
          >
            {pct}%
          </div>
          <h2 className="mt-6 text-2xl font-extrabold">{pct >= 70 ? "Əla nəticə!" : pct >= 40 ? "Pis deyil!" : "Davam edin!"}</h2>
          <p className="mt-1 text-muted">{name}</p>
          <p className="mt-4 text-lg font-semibold">
            {result.score} / {result.totalScore} düzgün cavab
          </p>
          {!!result.coinsEarned && (
            <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-warn/10 px-4 py-1.5 font-bold text-warn">
              <Icon name="coin" size={16} /> +{result.coinsEarned} coin qazandınız
            </p>
          )}
          {hasOpen && (
            <p className="mt-4 text-sm text-muted">Açıq sualları müəllim yoxladıqdan sonra bal yenilənəcək.</p>
          )}
          <div className="mt-8 flex w-full flex-col gap-3 sm:flex-row">
            <Link href={`/student/attempts/${data.attemptId}`} className="btn-primary flex-1">Cavablara bax</Link>
            <button className="btn-secondary flex-1" onClick={() => onClose(true)}>Bağla</button>
          </div>
        </div>
      </Overlay>
    );
  }

  if (!q) {
    return (
      <Overlay>
        <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
          <p className="text-muted">Bu testdə sual yoxdur.</p>
          <button className="btn-secondary" onClick={() => onClose(false)}>Bağla</button>
        </div>
      </Overlay>
    );
  }

  const danger = left !== null && left < 60;

  return (
    <Overlay>
      <header className="sticky top-0 z-10 border-b border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <button className="btn-icon -ml-2" onClick={leave} aria-label="Çıx"><Icon name="x" /></button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">{name}</p>
            <p className="text-xs text-muted">{answered}/{questions.length} cavablandı</p>
          </div>
          {left !== null && (
            <span
              className={cx(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-mono text-sm font-bold",
                danger ? "animate-pulse bg-bad/10 text-bad" : "bg-brand/10 text-brand",
              )}
            >
              <Icon name="clock" size={15} /> {fmtClock(left)}
            </span>
          )}
        </div>
        <ProgressBar value={((index + 1) / questions.length) * 100} />
      </header>

      <div className="mx-auto max-w-3xl px-4 py-6">
        <div className="card animate-fade-up p-5 sm:p-7" key={q.id}>
          <div className="mb-4 flex items-center justify-between">
            <span className="badge-brand">Sual {index + 1} / {questions.length}</span>
            <span className="badge-muted">{q.type === "MULTIPLE_CHOICE" ? "Test" : "Açıq sual"}</span>
          </div>
          <h2 className="whitespace-pre-wrap text-lg font-bold leading-relaxed sm:text-xl">{q.text}</h2>

          <div className="mt-6 space-y-3">
            {q.type === "MULTIPLE_CHOICE" ? (
              (q.options ?? []).map((opt, i) => {
                const on = answers[q.id] === opt;
                return (
                  <button
                    key={i}
                    onClick={() => setAnswers((a) => ({ ...a, [q.id]: opt }))}
                    className={cx(
                      "flex w-full items-center gap-3 rounded-xl border-2 p-4 text-left transition",
                      on ? "border-brand bg-brand/5" : "border-line hover:border-brand/40",
                    )}
                  >
                    <span
                      className={cx(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold",
                        on ? "bg-brand text-white" : "bg-surface-2 text-muted",
                      )}
                    >
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span className="font-medium">{opt}</span>
                  </button>
                );
              })
            ) : (
              <textarea
                className="input min-h-40"
                placeholder="Cavabınızı yazın…"
                value={answers[q.id] ?? ""}
                onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
              />
            )}
          </div>
        </div>

        {/* Sual naviqasiyası */}
        <div className="mt-5 flex flex-wrap gap-2">
          {questions.map((x, i) => (
            <button
              key={x.id}
              onClick={() => setIndex(i)}
              className={cx(
                "h-9 w-9 rounded-lg text-sm font-bold transition",
                i === index
                  ? "bg-brand text-white"
                  : answers[x.id]?.trim()
                    ? "bg-ok/15 text-ok"
                    : "bg-surface-2 text-muted hover:text-ink",
              )}
            >
              {i + 1}
            </button>
          ))}
        </div>

        <div className="mt-6 flex items-center justify-between gap-3">
          <button className="btn-secondary" disabled={index === 0} onClick={() => setIndex((i) => i - 1)}>
            <Icon name="left" size={16} /> Əvvəlki
          </button>
          {index < questions.length - 1 ? (
            <button className="btn-primary" onClick={() => setIndex((i) => i + 1)}>
              Növbəti <Icon name="right" size={16} />
            </button>
          ) : (
            <button className="btn-primary" onClick={finish} disabled={submitting}>
              {submitting ? <Spinner /> : <Icon name="check" size={16} />} Testi bitir
            </button>
          )}
        </div>
      </div>
    </Overlay>
  );
}

function Overlay({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);
  return <div className="fixed inset-0 z-[150] overflow-y-auto bg-bg">{children}</div>;
}
