"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useFetch } from "@/lib/api";
import { cx } from "@/lib/format";
import { rankRows } from "@/lib/ranking";
import { Empty, ErrorBox, SkeletonList } from "@/components/ui";
import { AVG_CLASS, NameCell, RankBadge } from "@/components/Leaderboard";

interface Cell { score: number; total: number; attemptId: string | null; practice: number }
interface Row {
  student: { id: string; name: string; photo: string | null };
  groupIds: string[];
  cells: Record<string, Cell | null>;
  total: number;
  taken: number;
  firsts: number;
  avg: number;
  mine: boolean;
}
interface Data {
  packages: { id: string; name: string; total: number }[];
  groups: { id: string; name: string }[];
  rows: Row[];
  staff: boolean;
}

const VIEW_KEY = "monthly-view";
const rank = (rows: Row[]) =>
  rankRows(rows, (r) => r.taken > 0, [(r) => r.total, (r) => r.firsts, (r) => r.avg], (r) => r.student.name);

/**
 * Aylıq sınaq yarış cədvəli. "Ümumi": bütün qrupların tələbələri bir siyahıda;
 * "Qruplar üzrə": hər qrup ayrıca, öz sıralaması ilə. Seçim yadda qalır.
 */
export default function MonthlyTable({ groupId, attemptBase }: { groupId: string; attemptBase: string }) {
  const { data, loading, error, reload } = useFetch<Data>(`/api/groups/${groupId}/monthly`);
  // Son seçilən görünüş yadda qalır (standart: Ümumi)
  const [view, setView] = useState<"all" | "groups">(() => {
    try {
      return typeof window !== "undefined" && localStorage.getItem(VIEW_KEY) === "groups" ? "groups" : "all";
    } catch {
      return "all";
    }
  });
  const pick = (v: "all" | "groups") => {
    setView(v);
    try { localStorage.setItem(VIEW_KEY, v); } catch { /* ignore */ }
  };

  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState === "visible") reload();
    }, 30000);
    return () => clearInterval(t);
  }, [reload]);

  const sections = useMemo(() => {
    if (!data) return [];
    if (view === "all" || data.groups.length < 2) return [{ id: "all", name: "", rows: rank(data.rows) }];
    return data.groups.map((g) => ({ id: g.id, name: g.name, rows: rank(data.rows.filter((r) => r.groupIds.includes(g.id))) }));
  }, [data, view]);

  if (loading && !data) return <SkeletonList rows={5} />;
  if (error || !data) return <ErrorBox message={error ?? "Tapılmadı"} onRetry={reload} />;
  if (data.packages.length === 0) {
    return <Empty icon="award" title="Hələ aylıq sınaq yoxdur" text="Müəllim testi “Aylıq sınaq” kimi işarələyəndə nəticələr burada görünəcək." />;
  }

  return (
    <div>
      {data.groups.length > 1 && (
        <div className="mb-3 inline-flex rounded-lg border border-line bg-surface p-0.5" role="radiogroup" aria-label="Görünüş">
          {([["all", "Ümumi"], ["groups", "Qruplar üzrə"]] as const).map(([v, label]) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={view === v}
              onClick={() => pick(v)}
              className={cx("min-h-9 rounded-md px-3 text-sm font-semibold transition-colors", view === v ? "bg-brand text-white" : "text-muted hover:text-ink")}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-5">
        {sections.map((sec) => (
          <section key={sec.id}>
            {sec.name && <h3 className="mb-2 break-words text-base font-bold [overflow-wrap:anywhere]">{sec.name}</h3>}
            {sec.rows.length === 0 ? (
              <p className="text-sm text-muted">Bu qrupda tələbə yoxdur.</p>
            ) : (
              <div className="card overflow-x-auto overscroll-x-contain">
                <table className="w-full border-separate border-spacing-0 text-[13px] sm:text-sm">
                  <thead>
                    <tr className="bg-surface-2 text-xs text-muted">
                      <th className="sticky left-0 z-20 w-12 min-w-12 bg-surface-2 px-1 py-2 text-center font-bold">Yer</th>
                      <th className="sticky left-12 z-20 min-w-[76px] border-r border-line bg-surface-2 px-1.5 py-2 text-left font-bold">Ad</th>
                      {data.packages.map((p) => (
                        <th key={p.id} className="min-w-[48px] max-w-[96px] px-1 py-2 text-center align-bottom font-bold">
                          <span className="line-clamp-2 break-words leading-tight" title={p.name}>{p.name}</span>
                          <span className="block font-semibold tabular-nums">({p.total})</span>
                        </th>
                      ))}
                      <th className="min-w-[44px] border-l border-line px-1 py-2 text-center font-bold text-ink">Cəmi</th>
                      <th className="min-w-[36px] px-1 py-2 text-center font-bold" title="Neçə sınaqda 1-ci yer">1-ci</th>
                      <th className="min-w-[50px] px-1.5 py-2 text-right font-bold text-[#1d4ed8]">Orta %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sec.rows.map((r) => {
                      const bg = r.mine ? "bg-tint" : "bg-surface";
                      return (
                        <tr key={r.student.id}>
                          <td className={cx("sticky left-0 z-10 w-12 min-w-12 border-t border-line px-1 py-1.5 text-center", bg)}><RankBadge rank={r.rank} /></td>
                          <td className={cx("sticky left-12 z-10 max-w-[120px] border-r border-t border-line px-1.5 py-1.5", bg)}><NameCell student={r.student} /></td>
                          {data.packages.map((p) => {
                            const c = r.cells[p.id];
                            const body = c ? (
                              <>
                                <span className="font-semibold">{c.score}</span>
                                <span className="text-muted">/{c.total}</span>
                              </>
                            ) : (
                              <span className="text-muted">—</span>
                            );
                            return (
                              <td key={p.id} className={cx("border-t border-line px-1 py-1.5 text-center tabular-nums", r.mine && "bg-tint")}>
                                {c?.attemptId ? (
                                  <Link href={`${attemptBase}/${c.attemptId}`} className="hover:underline" title={c.practice ? `+${c.practice} məşq cəhdi` : undefined}>
                                    {body}
                                  </Link>
                                ) : body}
                              </td>
                            );
                          })}
                          <td className={cx("border-l border-t border-line px-1 py-1.5 text-center font-extrabold tabular-nums", r.mine && "bg-tint")}>{r.taken ? r.total : "–"}</td>
                          <td className={cx("border-t border-line px-1 py-1.5 text-center tabular-nums", r.mine && "bg-tint")}>{r.taken ? r.firsts : "–"}</td>
                          <td className={cx("border-t border-line px-1.5 py-1.5 text-right", r.taken ? AVG_CLASS : "text-muted", r.mine && "bg-tint")}>{r.taken ? `${r.avg}%` : "–"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted">
        Hər sınaqda ilk cəhd sayılır. Sıralama: cəmi düz cavab → neçə sınaqda 1-ci yer → orta faiz (yalnız yazılan sınaqlar üzrə). “—” hələ yazılmayıb.
      </p>
    </div>
  );
}
