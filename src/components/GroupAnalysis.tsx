"use client";

import Link from "next/link";
import { useState } from "react";
import { useFetch } from "@/lib/api";
import { cx, fmtDateTime } from "@/lib/format";
import { shortName } from "@/lib/ranking";
import { Empty, ErrorBox, Modal, SkeletonList, Spinner } from "@/components/ui";

interface Col { key: string; title: string; kind: "topic" | "package" }
interface Cell { pct: number | null; correct: number; total: number; attempts: number }
interface Data {
  columns: Col[];
  rows: { student: { id: string; name: string; photo: string | null }; cells: Record<string, Cell | null>; overall: number | null }[];
  average: Record<string, number | null>;
}
interface Detail {
  difficulty: Record<"EASY" | "MEDIUM" | "HARD" | "NONE", { correct: number; answered: number }>;
  missed: { id: string; text: string; packageName: string; wrong: number; seen: number }[];
  attempts: { id: string; package: string; score: number; total: number; finishedAt: string }[];
}

/** Rəng: < 50% qırmızı, 50–75% sarı, > 75% yaşıl */
const tone = (p: number | null) =>
  p === null ? "text-muted" : p < 50 ? "bg-bad/15 text-bad" : p <= 75 ? "bg-warn/20 text-[#8a5a00]" : "bg-ok/15 text-ok";

const DIFF_LABEL = { EASY: "Asan", MEDIUM: "Orta", HARD: "Çətin", NONE: "Səviyyəsiz" } as const;

/** Müəllim: qrupun zəif mövzuları — tələbə × mövzu cədvəli, xanaya klik → təfərrüat */
export default function GroupAnalysis({ groupId }: { groupId: string }) {
  const { data, loading, error, reload } = useFetch<Data>(`/api/groups/${groupId}/analysis`);
  const [open, setOpen] = useState<{ student: Data["rows"][number]["student"]; col: Col; cell: Cell } | null>(null);

  if (loading && !data) return <SkeletonList rows={5} />;
  if (error || !data) return <ErrorBox message={error ?? "Tapılmadı"} onRetry={reload} />;
  if (data.columns.length === 0) {
    return <Empty icon="chart" title="Hələ analiz üçün nəticə yoxdur" text="Qrup üzvləri testlərinizi bitirdikcə burada mövzular üzrə nəticələr görünəcək." />;
  }

  return (
    <div>
      <p className="mb-3 text-sm text-muted">
        Hər xanada tələbənin həmin mövzudakı bütün testlər üzrə düzgün cavab faizi. Xanaya klikləyin: çətinlik üzrə nəticə və ən çox səhv edilən suallar.
      </p>
      <div className="mb-3 flex flex-wrap gap-2 text-xs">
        <span className="rounded px-2 py-0.5 font-semibold bg-bad/15 text-bad">&lt; 50%</span>
        <span className="rounded px-2 py-0.5 font-semibold bg-warn/20 text-[#8a5a00]">50–75%</span>
        <span className="rounded px-2 py-0.5 font-semibold bg-ok/15 text-ok">&gt; 75%</span>
      </div>
      <div className="card overflow-x-auto overscroll-x-contain">
        <table className="w-full border-separate border-spacing-0 text-[13px] sm:text-sm">
          <thead>
            <tr className="bg-surface-2 text-xs text-muted">
              <th className="sticky left-0 z-20 min-w-[96px] border-r border-line bg-surface-2 px-2 py-2 text-left font-bold">Tələbə</th>
              {data.columns.map((c) => (
                <th key={c.key} className="min-w-[64px] max-w-[110px] px-1 py-2 text-center align-bottom font-bold">
                  <span className="line-clamp-2 break-words leading-tight" title={c.title}>{c.title}</span>
                  {c.kind === "package" && <span className="block font-normal">(test)</span>}
                </th>
              ))}
              <th className="min-w-[56px] border-l border-line px-1.5 py-2 text-center font-bold text-ink">Ümumi</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((r) => (
              <tr key={r.student.id}>
                <td className="sticky left-0 z-10 max-w-[140px] border-r border-t border-line bg-surface px-2 py-1.5">
                  <Link href={`/u/${r.student.id}?tab=history`} className="block truncate font-bold hover:underline" title={r.student.name}>
                    {shortName(r.student.name)}
                  </Link>
                </td>
                {data.columns.map((c) => {
                  const cell = r.cells[c.key];
                  return (
                    <td key={c.key} className="border-t border-line p-1 text-center">
                      {cell ? (
                        <button
                          type="button"
                          onClick={() => setOpen({ student: r.student, col: c, cell })}
                          className={cx("w-full rounded-md px-1 py-1.5 font-bold tabular-nums transition hover:ring-2 hover:ring-line-strong", tone(cell.pct))}
                          title={`${cell.correct}/${cell.total} düz · ${cell.attempts} cəhd`}
                        >
                          {cell.pct}%
                        </button>
                      ) : (
                        <span className="text-muted">–</span>
                      )}
                    </td>
                  );
                })}
                <td className="border-l border-t border-line px-1.5 py-1.5 text-center font-extrabold tabular-nums">
                  {r.overall === null ? <span className="text-muted">–</span> : `${r.overall}%`}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-surface-2 text-xs">
              <td className="sticky left-0 z-10 border-r border-t border-line bg-surface-2 px-2 py-2 font-bold">Qrup ortası</td>
              {data.columns.map((c) => (
                <td key={c.key} className="border-t border-line p-1 text-center">
                  <span className={cx("inline-block min-w-[44px] rounded-md px-1 py-1 font-bold tabular-nums", tone(data.average[c.key]))}>
                    {data.average[c.key] === null ? "–" : `${data.average[c.key]}%`}
                  </span>
                </td>
              ))}
              <td className="border-l border-t border-line" />
            </tr>
          </tfoot>
        </table>
      </div>

      {open && <CellDetail groupId={groupId} {...open} onClose={() => setOpen(null)} />}
    </div>
  );
}

function CellDetail({
  groupId, student, col, cell, onClose,
}: { groupId: string; student: { id: string; name: string }; col: Col; cell: Cell; onClose: () => void }) {
  const { data, loading, error, reload } = useFetch<Detail>(
    `/api/groups/${groupId}/analysis?studentId=${student.id}&key=${encodeURIComponent(col.key)}`,
  );
  return (
    <Modal open onClose={onClose} size="lg" title={`${student.name} — ${col.title}`}>
      <p className="text-sm text-muted">
        Ümumi: <b className="text-ink">{cell.pct}%</b> ({cell.correct}/{cell.total} düz, {cell.attempts} cəhd)
      </p>
      {loading && !data ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : error || !data ? (
        <ErrorBox message={error ?? "Tapılmadı"} onRetry={reload} />
      ) : (
        <div className="mt-4 space-y-5">
          <section>
            <h3 className="mb-2 text-sm font-bold">Çətinlik üzrə</h3>
            <div className="grid grid-cols-3 gap-2">
              {(["EASY", "MEDIUM", "HARD"] as const).map((d) => {
                const x = data.difficulty[d];
                const p = x.answered ? Math.round((x.correct / x.answered) * 100) : null;
                return (
                  <div key={d} className={cx("rounded-lg p-2.5 text-center", tone(p))}>
                    <p className="text-xs font-semibold">{DIFF_LABEL[d]}</p>
                    <p className="text-lg font-extrabold tabular-nums">{p === null ? "–" : `${p}%`}</p>
                    <p className="text-[11px] opacity-80">{x.correct}/{x.answered} cavab</p>
                  </div>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-muted">Burada yalnız cavablanan suallar sayılır; ümumi faizdə cavabsızlar da səhv sayılır.</p>
            {data.difficulty.NONE.answered > 0 && (
              <p className="mt-2 text-xs text-muted">
                Səviyyəsi qeyd olunmayan suallar: {data.difficulty.NONE.correct}/{data.difficulty.NONE.answered} düz
              </p>
            )}
          </section>

          <section>
            <h3 className="mb-2 text-sm font-bold">Ən çox səhv edilən suallar</h3>
            {data.missed.length === 0 ? (
              <p className="text-sm text-muted">Səhv cavab yoxdur.</p>
            ) : (
              <ol className="space-y-2">
                {data.missed.map((m) => (
                  <li key={m.id} className="rounded-lg border border-line p-2.5 text-sm">
                    <p className="line-clamp-3 whitespace-pre-wrap break-words">{m.text}</p>
                    <p className="mt-1 text-xs text-muted">
                      <b className="text-bad">{m.wrong} dəfə səhv</b> / {m.seen} dəfə rast gəlib · {m.packageName}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section>
            <h3 className="mb-2 text-sm font-bold">Cəhdlər</h3>
            <ul className="divide-y divide-line rounded-lg border border-line">
              {data.attempts.map((a) => (
                <li key={a.id}>
                  <Link href={`/teacher/attempts/${a.id}`} className="flex items-center gap-3 px-3 py-2 text-sm hover:bg-tint">
                    <span className="min-w-0 flex-1 truncate">{a.package}</span>
                    <span className="text-xs text-muted">{fmtDateTime(a.finishedAt)}</span>
                    <span className="font-bold tabular-nums">{a.score}/{a.total}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </Modal>
  );
}
