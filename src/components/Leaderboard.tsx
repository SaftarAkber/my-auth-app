"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useFetch } from "@/lib/api";
import { cx, minutes } from "@/lib/format";
import { shortName } from "@/lib/ranking";
import { Empty, ErrorBox, Icon, SkeletonList } from "@/components/ui";

/** Orta faiz rəngi: göy və qalın (cədvəlin əsas göstəricisi) */
export const AVG_CLASS = "font-extrabold text-[#1d4ed8] tabular-nums";

/** Yer nişanı: ilk üç yer qızıl / gümüş / bürünc */
export function RankBadge({ rank }: { rank: number | null }) {
  if (rank === null) return <span className="text-muted">–</span>;
  const medal = rank === 1 ? "bg-[#f5c542] text-[#4a3500]" : rank === 2 ? "bg-[#cfd6de] text-[#2b333d]" : rank === 3 ? "bg-[#e0a46e] text-[#4a2a0c]" : "";
  return (
    <span className={cx("inline-grid h-7 min-w-7 place-items-center rounded-full px-1 text-xs font-extrabold tabular-nums", medal || "text-muted")}>
      {rank}
    </span>
  );
}

/** Ad: qısaldılmış ("Aysel M."), profilə keçid */
export function NameCell({ student, mine }: { student: { id: string; name: string }; mine?: boolean }) {
  return (
    <Link href={`/u/${student.id}`} className="block min-w-0 truncate font-bold hover:underline" title={student.name}>
      {shortName(student.name)}
      {mine && <span className="font-semibold text-muted"> (siz)</span>}
    </Link>
  );
}

interface Data {
  package: {
    id: string; name: string; isBank: boolean; perTest: number; isTimed: boolean; duration: number | null;
    groups: { id: string; name: string }[];
    topics: { id: string; title: string }[];
  };
  rows: {
    student: { id: string; name: string; photo: string | null };
    attempts: number; totalCorrect: number; perfect: number; avg: number; mine: boolean; rank: number | null;
  }[];
  staff: boolean;
}

/**
 * Sual bankının reytinqi (yarış cədvəli). Sıra: toplam düz → orta faiz → 100% sayı.
 * Hər 30 saniyədən bir yenilənir.
 */
export default function Leaderboard({ packageId, actions }: { packageId: string; actions?: React.ReactNode }) {
  const { data, loading, error, reload } = useFetch<Data>(`/api/packages/${packageId}/leaderboard`);

  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState === "visible") reload();
    }, 30000);
    return () => clearInterval(t);
  }, [reload]);

  if (loading && !data) return <SkeletonList rows={5} />;
  if (error || !data) return <ErrorBox message={error ?? "Tapılmadı"} onRetry={reload} />;

  const p = data.package;
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
        <span>Hər testdə {p.perTest} təsadüfi sual</span>
        {p.isTimed && p.duration && <span className="inline-flex items-center gap-1"><Icon name="clock" size={13} /> {minutes(p.duration)} dəq</span>}
        {p.topics.length > 0 && <span>Mövzu: {p.topics.map((t) => t.title).join(", ")}</span>}
        {actions && <span className="ml-auto">{actions}</span>}
      </div>

      {data.rows.length === 0 ? (
        <Empty icon="chart" title="Hələ heç kim yoxdur" text="Testi işləyənlər burada görünəcək." />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full table-fixed text-sm">
            <colgroup>
              <col className="w-10 sm:w-14" />
              <col />
              <col className="w-11 sm:w-20" />
              <col className="w-12 sm:w-20" />
              <col className="w-11 sm:w-20" />
              <col className="w-16 sm:w-24" />
            </colgroup>
            <thead>
              <tr className="border-b border-line bg-surface-2 text-xs text-muted">
                <th className="px-1 py-2 text-center font-bold sm:px-2">Yer</th>
                <th className="px-1 py-2 text-left font-bold sm:px-2">Ad</th>
                <th className="px-1 py-2 text-center font-bold sm:px-2">Cəhd</th>
                <th className="px-1 py-2 text-center font-bold sm:px-2">Düz</th>
                <th className="px-1 py-2 text-center font-bold sm:px-2">100%</th>
                <th className="px-1 py-2 text-right font-bold text-[#1d4ed8] sm:px-3">Orta %</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((r) => (
                <tr key={r.student.id} className={cx("border-b border-line last:border-0", r.mine && "bg-tint")}>
                  <td className="px-1 py-2 text-center sm:px-2"><RankBadge rank={r.rank} /></td>
                  <td className="px-1 py-2 sm:px-2"><NameCell student={r.student} mine={r.mine} /></td>
                  <td className="px-1 py-2 text-center tabular-nums sm:px-2">{r.attempts || "–"}</td>
                  <td className="px-1 py-2 text-center font-semibold tabular-nums sm:px-2">{r.attempts ? r.totalCorrect : "–"}</td>
                  <td className="px-1 py-2 text-center tabular-nums sm:px-2">{r.attempts ? r.perfect : "–"}</td>
                  <td className={cx("px-1 py-2 text-right sm:px-3", r.attempts ? AVG_CLASS : "text-muted")}>{r.attempts ? `${r.avg}%` : "–"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-2 text-xs text-muted">
        Sıralama toplam düz cavab sayına görədir (bərabər olanda orta faiz, sonra 100% sayı). Sualların yarısından azı cavablanan cəhdlər sayılmır. Cədvəl avtomatik yenilənir.
      </p>
    </div>
  );
}
