"use client";

import Link from "next/link";
import { useEffect, useId } from "react";
import { useFetch } from "@/lib/api";
import { cx } from "@/lib/format";
import { shortName } from "@/lib/ranking";
import { Empty, ErrorBox, SkeletonList } from "@/components/ui";

/** Orta faiz rəngi: göy və qalın (cədvəlin əsas göstəricisi) */
export const AVG_CLASS = "font-extrabold text-[#1d4ed8] tabular-nums";

/** 1-ci yer: parıldayan qızıl kubok (arxada fırlanan şüalar və halo, üzərindən keçən işıq, ulduzcuqlar) */
function Trophy() {
  const id = useId().replace(/:/g, "");
  return (
    <span className="lb-trophy" role="img" aria-label="1-ci yer">
      <span className="lb-rays" aria-hidden />
      <span className="lb-halo" aria-hidden />
      <svg viewBox="0 0 32 32" width="30" height="30" aria-hidden className="relative">
        <defs>
          <linearGradient id={`g${id}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fff6c2" />
            <stop offset="0.35" stopColor="#ffd84a" />
            <stop offset="0.7" stopColor="#f0a800" />
            <stop offset="1" stopColor="#b97800" />
          </linearGradient>
          <linearGradient id={`s${id}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#fff" stopOpacity="0" />
            <stop offset="0.5" stopColor="#fff" stopOpacity="0.95" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <clipPath id={`c${id}`}>
            <path d="M9 5h14v6a7 7 0 0 1-14 0z" />
            <rect x="14.5" y="17.5" width="3" height="4.5" />
            <rect x="10" y="22" width="12" height="3" rx="1" />
            <rect x="8" y="25" width="16" height="3" rx="1" />
          </clipPath>
        </defs>
        <path d="M9 7.5H6.2a3.2 3.2 0 0 0 3.6 5.6M23 7.5h2.8a3.2 3.2 0 0 1-3.6 5.6" fill="none" stroke={`url(#g${id})`} strokeWidth="2" strokeLinecap="round" />
        <g fill={`url(#g${id})`} stroke="#9a6400" strokeWidth="0.6">
          <path d="M9 5h14v6a7 7 0 0 1-14 0z" />
          <rect x="14.5" y="17.5" width="3" height="4.5" />
          <rect x="10" y="22" width="12" height="3" rx="1" />
          <rect x="8" y="25" width="16" height="3" rx="1" />
        </g>
        <text x="16" y="13.6" textAnchor="middle" fontSize="7.5" fontWeight="900" fill="#7a4d00">1</text>
        <g clipPath={`url(#c${id})`}>
          <rect className="lb-shine" x="-8" y="0" width="7" height="32" fill={`url(#s${id})`} transform="skewX(-20)" />
        </g>
        <path className="lb-spark" d="M27 2.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z" fill="#fff4b0" />
        <path className="lb-spark lb-spark2" d="M4 16l.5 1.3 1.3.5-1.3.5-.5 1.3-.5-1.3-1.3-.5 1.3-.5z" fill="#fff4b0" />
        <path className="lb-spark lb-spark3" d="M28 18l.4 1 1 .4-1 .4-.4 1-.4-1-1-.4 1-.4z" fill="#fff" />
      </svg>
    </span>
  );
}

/** 2-ci / 3-cü yer: lentli parlaq medal (gümüş / bürünc), üzərindən keçən işıq */
function Medal({ place }: { place: 2 | 3 }) {
  const id = useId().replace(/:/g, "");
  const c = place === 2
    ? { a: "#ffffff", b: "#d9dee5", c: "#9aa5b1", edge: "#6b7684", text: "#3a4450", r1: "#3b82f6", r2: "#1d4ed8" }
    : { a: "#ffe2c4", b: "#e7a465", c: "#b36a2e", edge: "#7c4419", text: "#4a2507", r1: "#ef4444", r2: "#b91c1c" };
  return (
    <span className={cx("lb-medal", place === 3 && "lb-medal3")} role="img" aria-label={`${place}-ci yer`}>
      <svg viewBox="0 0 32 32" width="28" height="28" aria-hidden>
        <defs>
          <linearGradient id={`m${id}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={c.a} />
            <stop offset="0.45" stopColor={c.b} />
            <stop offset="1" stopColor={c.c} />
          </linearGradient>
          <linearGradient id={`s${id}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#fff" stopOpacity="0" />
            <stop offset="0.5" stopColor="#fff" stopOpacity="0.9" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <clipPath id={`c${id}`}><circle cx="16" cy="20" r="9.5" /></clipPath>
        </defs>
        <path d="M8 1h6l4.5 10h-6z" fill={c.r1} />
        <path d="M24 1h-6l-4.5 10h6z" fill={c.r2} />
        <circle cx="16" cy="20" r="9.5" fill={`url(#m${id})`} stroke={c.edge} strokeWidth="0.8" />
        <circle cx="16" cy="20" r="7" fill="none" stroke={c.edge} strokeOpacity="0.45" strokeWidth="0.7" />
        <text x="16" y="23.4" textAnchor="middle" fontSize="9.5" fontWeight="900" fill={c.text}>{place}</text>
        <g clipPath={`url(#c${id})`}>
          <rect className="lb-shine" x="-8" y="8" width="6" height="26" fill={`url(#s${id})`} transform="skewX(-20)" />
        </g>
      </svg>
    </span>
  );
}

/** Yer nişanı: 1 – kubok, 2–3 – medal, qalanları – rəqəm */
export function RankBadge({ rank }: { rank: number | null }) {
  if (rank === null) return <span className="text-muted">–</span>;
  if (rank === 1) return <Trophy />;
  if (rank === 2 || rank === 3) return <Medal place={rank} />;
  return <span className="inline-grid h-7 min-w-7 place-items-center rounded-full px-1 text-xs font-extrabold tabular-nums text-muted">{rank}</span>;
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

  return (
    <div>
      {actions && <div className="mb-3 flex justify-end">{actions}</div>}

      {data.rows.length === 0 ? (
        <Empty icon="chart" title="Hələ heç kim yoxdur" text="Testi işləyənlər burada görünəcək." />
      ) : (
        // Mobildə cədvəl sağa sürüşdürülür (sütunlar sıxılmır)
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[460px] table-fixed text-sm">
            <colgroup>
              <col className="w-14" />
              <col />
              <col className="w-16 sm:w-20" />
              <col className="w-16 sm:w-20" />
              <col className="w-16 sm:w-20" />
              <col className="w-20 sm:w-24" />
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
                <tr key={r.student.id} className={cx("border-b border-line last:border-0", r.rank === 1 ? "lb-first" : r.mine && "bg-tint")}>
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
    </div>
  );
}
