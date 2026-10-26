"use client";

import Link from "next/link";
import { useFetch } from "@/lib/api";
import { cx } from "@/lib/format";
import { Avatar, Empty, ErrorBox, Icon, PageHeader, SkeletonList } from "@/components/ui";

type Cell = boolean | "pending" | null;
interface Results {
  package: { id: string; name: string };
  total: number;
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

  if (loading) return <div className="page"><SkeletonList rows={4} /></div>;
  if (error || !data) return <div className="page"><ErrorBox message={error ?? "Tapılmadı"} onRetry={reload} /></div>;

  const nums = Array.from({ length: data.total }, (_, i) => i + 1);

  return (
    <div className="page">
      <PageHeader title={data.package.name} subtitle="Nəticə cədvəli" back={back} />

      {data.rows.length === 0 ? (
        <Empty icon="chart" title="Hələ heç kim testi bitirməyib" />
      ) : (
        <>
          <div className="card overflow-x-auto">
            <table className="w-full border-collapse text-center text-sm">
              <thead>
                <tr className="border-b-[3px] border-ink bg-sun/40">
                  <th className="sticky left-0 z-10 min-w-[200px] bg-sun/40 px-4 py-3 text-left font-extrabold">İştirakçı</th>
                  {nums.map((n) => (
                    <th key={n} className="min-w-[38px] px-2 py-3 font-extrabold tabular-nums">{n}</th>
                  ))}
                  <th className="min-w-[80px] border-l-[3px] border-ink px-3 py-3 font-extrabold">Düzgün</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((r) => {
                  const clickable = data.canOpenAll || r.mine;
                  const name = (
                    <span className="flex items-center gap-2.5">
                      <Avatar src={r.student.photo} name={r.student.name} size={30} />
                      <span className="truncate font-bold">{r.student.name}{r.mine && " (siz)"}</span>
                    </span>
                  );
                  return (
                    <tr key={r.attemptId} className={cx("group border-b-2 border-ink/15 last:border-b-0", clickable && "hover:bg-sun/25", r.mine && "bg-iris/10")}>
                      <td className="sticky left-0 z-10 bg-inherit px-4 py-2.5 text-left">
                        {clickable ? (
                          <Link href={`${attemptBase}/${r.attemptId}`} className="block hover:underline">{name}</Link>
                        ) : name}
                      </td>
                      {r.cells.map((c, i) => (
                        <td key={i} className="px-2 py-2.5">
                          {clickable ? (
                            <Link href={`${attemptBase}/${r.attemptId}`} className="inline-flex h-6 items-center justify-center" aria-label={`Sual ${i + 1}`}>
                              <CellMark c={c} />
                            </Link>
                          ) : <CellMark c={c} />}
                        </td>
                      ))}
                      <td className="border-l-[3px] border-ink px-3 py-2.5 font-extrabold tabular-nums">
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
            {data.canOpenAll ? <span>Sətrə klikləyin: şagirdin cavab kitabçası açılır.</span> : <span>Öz sətrinizə klikləyib cavablarınıza baxa bilərsiniz.</span>}
          </p>
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
