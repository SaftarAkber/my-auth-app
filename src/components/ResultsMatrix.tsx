"use client";

import Link from "next/link";
import { useState } from "react";
import { useFetch } from "@/lib/api";
import { cx } from "@/lib/format";
import { Avatar, Empty, ErrorBox, Icon, Modal, PageHeader, SkeletonList, Spinner } from "@/components/ui";
import QuestionImage from "@/components/QuestionImage";
import Leaderboard from "@/components/Leaderboard";

type Cell = boolean | "pending" | null;
interface Results {
  bank?: boolean;
  package: { id: string; name: string };
  total: number;
  qids?: string[];
  canOpenAll: boolean;
  rows: {
    attemptId: string;
    student: { id: string; name: string; photo: string | null };
    cells: Cell[];
    correct: number;
    mine: boolean;
  }[];
}

/** Nike işarəsi (swoosh) formasında düzgün cavab nişanı */
function Swoosh() {
  return (
    <svg viewBox="0 0 32 16" width="26" height="13" aria-label="Düzgün" role="img">
      <path d="M1 9.2C4 12.4 6.6 14.4 9 14.4c2.6 0 5-2 9.4-6.6C23 3 27.6 1.4 31 1c-5.4 2.6-9.6 6.4-13.4 10.4C14 15.2 11.8 16 9 16 5.6 16 2.8 13.4 1 9.2z" fill="currentColor" />
    </svg>
  );
}

export default function ResultsMatrix({ packageId, back, attemptBase }: { packageId: string; back: string; attemptBase: string }) {
  const { data, loading, error, reload } = useFetch<Results>(`/api/packages/${packageId}/results`);
  const [openQ, setOpenQ] = useState<string | null>(null);

  if (loading) return <div className="page"><SkeletonList rows={4} /></div>;
  if (error || !data) return <div className="page"><ErrorBox message={error ?? "Tapılmadı"} onRetry={reload} /></div>;

  if (data.bank) {
    return (
      <div className="page-narrow">
        <PageHeader title={data.package.name} subtitle="Reytinq" back={back} />
        <Leaderboard packageId={packageId} />
      </div>
    );
  }

  const nums = Array.from({ length: data.total }, (_, i) => i + 1);

  return (
    <div className="page">
      <PageHeader title={data.package.name} subtitle="Nəticə cədvəli" back={back} />

      {data.rows.length === 0 ? (
        <Empty icon="chart" title="Hələ heç kim testi bitirməyib" />
      ) : (
        <>
          <div className="card overflow-x-auto">
            <table className="w-full border-separate border-spacing-0 text-center text-sm">
              <thead>
                <tr className="bg-[#fbe5a1]">
                  <th className="sticky left-0 z-20 w-[118px] min-w-[118px] border-b border-r border-b-ink border-r-ink bg-[#fbe5a1] px-3 py-3 text-left font-extrabold sm:min-w-[200px] sm:px-4">İştirakçı</th>
                  {nums.map((n) => (
                    <th key={n} className="min-w-[38px] border-b border-line p-0 font-extrabold tabular-nums">
                      {data.qids?.[n - 1] ? (
                        <button
                          type="button"
                          onClick={() => setOpenQ(data.qids![n - 1])}
                          className="h-full w-full px-2 py-3 underline-offset-4 transition-colors hover:bg-[#f7d77a] hover:underline"
                          aria-label={`Sual ${n}: hamının cavabı`}
                        >
                          {n}
                        </button>
                      ) : <span className="block px-2 py-3">{n}</span>}
                    </th>
                  ))}
                  <th className="min-w-[80px] border-b border-l border-line px-3 py-3 font-extrabold">Düzgün</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((r) => {
                  const clickable = data.canOpenAll || r.mine;
                  const name = (
                    <span className="flex w-[94px] items-center gap-2.5 sm:w-auto">
                      <Avatar src={r.student.photo} name={r.student.name} size={28} className="hidden sm:inline-flex" />
                      <span className="min-w-0 truncate text-sm font-bold">{r.student.name}{r.mine && " (siz)"}</span>
                    </span>
                  );
                  return (
                    <tr key={r.attemptId} className="group">
                      <td className={cx("sticky left-0 z-10 border-b-2 border-r border-b-ink/15 border-r-ink px-3 py-2.5 text-left sm:px-4", r.mine ? "bg-[#ecebfc]" : "bg-white", clickable && "group-hover:bg-[#fdf1c6]")}>
                        {clickable ? (
                          <Link href={`${attemptBase}/${r.attemptId}`} className="block hover:underline">{name}</Link>
                        ) : name}
                      </td>
                      {r.cells.map((c, i) => (
                        <td key={i} className="border-b-2 border-line px-2 py-2.5">
                          {clickable ? (
                            <Link href={`${attemptBase}/${r.attemptId}${data.qids?.[i] ? `?q=${data.qids[i]}` : ""}`} className="inline-flex h-6 items-center justify-center" aria-label={`Sual ${i + 1}`}>
                              <CellMark c={c} />
                            </Link>
                          ) : <CellMark c={c} />}
                        </td>
                      ))}
                      <td className="border-b-2 border-l border-b-ink/15 border-l-ink px-3 py-2.5 font-extrabold tabular-nums">
                        {r.correct} <span className="font-semibold text-muted">/ {data.total}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-muted">
            <span className="inline-flex items-center gap-1.5 text-ok"><Swoosh /> <span className="text-muted">düzgün</span></span>
            <span className="inline-flex items-center gap-1.5 text-bad"><Icon name="x" size={14} /> <span className="text-muted">yanlış</span></span>
            <span className="inline-flex items-center gap-1.5"><Icon name="clock" size={13} /> yoxlanılır</span>
            <span>— cavabsız</span>
            {data.canOpenAll ? <span>Xanaya klikləyin: şagirdin cavab kitabçası həmin sualda açılır.</span> : <span>Öz sətrinizə klikləyib cavablarınıza baxa bilərsiniz.</span>}
            <span>Sual nömrəsinə klikləyin: hamının cavabı.</span>
          </p>
          {openQ && <QuestionPicks packageId={packageId} questionId={openQ} attemptBase={attemptBase} onClose={() => setOpenQ(null)} />}
        </>
      )}
    </div>
  );
}

function CellMark({ c }: { c: Cell }) {
  if (c === true) return <span className="text-ok"><Swoosh /></span>;
  if (c === false) return <span className="text-bad"><Icon name="x" size={16} /></span>;
  if (c === "pending") return <span className="text-warn"><Icon name="clock" size={14} /></span>;
  return <span className="text-muted">—</span>;
}

type Pick = {
  attemptId: string | null;
  student: { id: string; name: string; photo: string | null } | null;
  mine: boolean;
  answer: string | null;
  state: "ok" | "bad" | "pending" | "blank";
};
interface QView {
  number: number;
  total: number;
  canSeeNames: boolean;
  question: { id: string; text: string; type: "MULTIPLE_CHOICE" | "OPEN_ENDED"; options: string[] | null; correctAnswer: string | null; imageUrl: string | null };
  picks: Pick[];
}

const canHover = () => typeof window !== "undefined" && window.matchMedia("(hover: hover)").matches;

/** Bir sual üzrə vahid görünüş: hər variantı neçə nəfər seçib; üzərinə gələndə (telefonda toxunanda) kimlər seçib */
function QuestionPicks({ packageId, questionId, attemptBase, onClose }: { packageId: string; questionId: string; attemptBase: string; onClose: () => void }) {
  const { data, loading, error, reload } = useFetch<QView>(`/api/packages/${packageId}/results/${questionId}`);
  const [shown, setShown] = useState<number | null>(null);

  const names = (list: Pick[]) => (
    <ul className="max-h-56 space-y-0.5 overflow-y-auto">
      {list.map((p, k) => (
        <li key={p.attemptId ?? `anon-${k}`}>
          {p.student && p.attemptId ? (
            <Link href={`${attemptBase}/${p.attemptId}?q=${questionId}`} className="flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-tint">
              <Avatar src={p.student.photo} name={p.student.name} size={22} />
              <span className="truncate text-sm">{p.student.name}{p.mine && " (siz)"}</span>
            </Link>
          ) : (
            <span className="block px-1.5 py-1 text-sm text-muted">Gizli iştirakçı</span>
          )}
        </li>
      ))}
    </ul>
  );

  let body: React.ReactNode;
  if (loading && !data) {
    body = <div className="flex justify-center py-10"><Spinner /></div>;
  } else if (error || !data) {
    body = <ErrorBox message={error ?? "Tapılmadı"} onRetry={reload} />;
  } else {
    const q = data.question;
    const all = data.picks;
    const answered = all.filter((p) => p.state !== "blank");
    const blank = all.filter((p) => p.state === "blank");
    body = (
      <div>
        <p className="whitespace-pre-wrap break-words font-semibold">{q.text}</p>
        <QuestionImage src={q.imageUrl} />
        {q.type === "MULTIPLE_CHOICE" ? (
          <ul className="mt-4 space-y-2">
            {(q.options ?? []).map((opt, k) => {
              const who = all.filter((p) => p.answer === opt);
              const right = q.correctAnswer === opt;
              const pct = all.length ? Math.round((who.length / all.length) * 100) : 0;
              const open = shown === k && who.length > 0;
              return (
                <li
                  key={k}
                  className="relative"
                  onMouseEnter={() => { if (canHover()) setShown(k); }}
                  onMouseLeave={() => { if (canHover()) setShown(null); }}
                >
                  <button
                    type="button"
                    onClick={() => setShown(open ? null : k)}
                    aria-expanded={open}
                    className={cx(
                      "relative flex w-full items-center gap-3 overflow-hidden rounded-xl border px-3.5 py-2.5 text-left text-sm",
                      right ? "border-ok/50" : "border-line",
                    )}
                  >
                    <span className={cx("absolute inset-y-0 left-0 transition-[width] duration-500", right ? "bg-ok/15" : "bg-surface-2")} style={{ width: `${pct}%` }} aria-hidden="true" />
                    <span className="relative shrink-0 font-bold text-muted">{String.fromCharCode(65 + k)}</span>
                    <span className="relative min-w-0 flex-1 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{opt}</span>
                    {right && <Icon name="check" size={16} className="relative shrink-0 text-ok" />}
                    <span className="relative shrink-0 whitespace-nowrap text-xs font-bold tabular-nums">{who.length} nəfər</span>
                  </button>
                  {open && (
                    <div className="absolute left-2 right-2 top-full z-20 mt-1 animate-slide-in rounded-lg border border-line bg-white p-2 shadow-soft sm:left-auto sm:w-72">
                      <p className="mb-1 px-1.5 text-xs font-semibold text-muted">{String.fromCharCode(65 + k)} variantını seçənlər</p>
                      {names(who)}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <ul className="mt-4 space-y-2">
            {answered.map((p, k) => (
              <li key={p.attemptId ?? `a-${k}`} className={cx("rounded-xl border px-3.5 py-2.5 text-sm", p.state === "ok" ? "border-ok/50 bg-ok/5" : p.state === "bad" ? "border-bad/50 bg-bad/5" : "border-warn/50")}>
                <p className="text-xs font-semibold text-muted">{p.student ? `${p.student.name}${p.mine ? " (siz)" : ""}` : "Gizli iştirakçı"}{p.state === "pending" && " · yoxlanılır"}</p>
                <p className="mt-0.5 whitespace-pre-wrap break-words">{p.answer ?? "—"}</p>
              </li>
            ))}
            {answered.length === 0 && <p className="text-sm text-muted">Hələ cavab yoxdur.</p>}
          </ul>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
          <span>{all.length} iştirakçı</span>
          <span className="text-ok">{all.filter((p) => p.state === "ok").length} düzgün</span>
          <span className="text-bad">{all.filter((p) => p.state === "bad").length} yanlış</span>
          {blank.length > 0 && (
            <span className="relative">
              <button type="button" className="underline-offset-2 hover:underline" onClick={() => setShown(shown === -1 ? null : -1)}>{blank.length} cavabsız</button>
              {shown === -1 && (
                <div className="absolute bottom-full left-0 z-20 mb-1 w-64 rounded-lg border border-line bg-white p-2 text-ink shadow-soft">{names(blank)}</div>
              )}
            </span>
          )}
          {!data.canSeeNames && <span>Başqalarının adı yalnız müəllimə görünür.</span>}
        </div>
      </div>
    );
  }

  return (
    <Modal open onClose={onClose} size="lg" title={data ? `Sual ${data.number} — hamının cavabı` : "Sual"}>
      {body}
    </Modal>
  );
}
