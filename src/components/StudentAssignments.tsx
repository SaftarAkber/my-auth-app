"use client";

import Link from "next/link";
import { useFetch } from "@/lib/api";
import { cx, fmtDateTime } from "@/lib/format";
import { Empty, ErrorBox, Icon, SkeletonList } from "@/components/ui";
import Countdown from "@/components/Countdown";
import { ProgressChip } from "@/components/GroupAssignments";

export interface MyAssignment {
  id: string;
  package: { id: string; name: string; isBank: boolean };
  minAttempts: number;
  deadline: string;
  coinReward: number | null;
  coinsGot: number;
  note: string | null;
  teacher: string;
  count: number;
  status: "done" | "pending" | "overdue";
  /** son tarix hələ keçməyib (serverdə hesablanır) */
  active: boolean;
  href: string;
}

function Card({ a }: { a: MyAssignment }) {
  const active = a.active;
  return (
    <Link
      href={a.href}
      className={cx(
        "card flex items-start gap-3 border-l-4 p-4 transition-colors hover:bg-tint/50",
        a.status === "done" ? "border-l-ok" : a.status === "overdue" ? "border-l-bad" : "border-l-warn",
      )}
    >
      <span className="min-w-0 flex-1">
        <span className="block break-words font-bold [overflow-wrap:anywhere]">{a.package.name}</span>
        <span className="mt-0.5 block text-sm text-muted">
          {a.package.isBank ? `Ən azı ${a.minAttempts} dəfə işlə` : "Paketi bitir"} · {a.teacher}
        </span>
        {a.note && <span className="mt-1 block whitespace-pre-wrap text-sm">{a.note}</span>}
        <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          {active && a.status !== "done" ? <Countdown to={a.deadline} /> : <span className="text-muted">Son tarix: {fmtDateTime(a.deadline)}</span>}
          {a.coinReward ? (
            a.coinsGot ? <span className="inline-flex items-center gap-1 font-semibold text-ok"><Icon name="coin" size={12} /> +{a.coinsGot} coin alındı</span> : <span className="inline-flex items-center gap-1 text-muted"><Icon name="coin" size={12} /> bitirənə +{a.coinReward}</span>
          ) : null}
        </span>
      </span>
      <span className="flex flex-col items-end gap-1.5">
        <ProgressChip count={a.count} min={a.minAttempts} status={a.status} />
        {a.status === "pending" && <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand">Başla <Icon name="right" size={12} /></span>}
      </span>
    </Link>
  );
}

/** Tələbə: tapşırıqlarım. `compact` – ana səhifə (yalnız aktivlər, boşdursa heç nə göstərilmir) */
export default function StudentAssignments({ compact = false }: { compact?: boolean }) {
  const { data, loading, error, reload } = useFetch<{ assignments: MyAssignment[] }>("/api/student/assignments");
  if (loading && !data) return compact ? null : <SkeletonList rows={3} />;
  if (error || !data) return compact ? null : <ErrorBox message={error ?? "Tapılmadı"} onRetry={reload} />;
  const active = data.assignments.filter((a) => a.active);
  const past = data.assignments.filter((a) => !a.active).reverse();

  if (compact) {
    if (!active.length) return null;
    return (
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">Tapşırıqlar</h2>
          <Link href="/student/assignments" className="text-sm font-semibold text-brand hover:underline">Hamısı</Link>
        </div>
        <div className="space-y-2">{active.map((a) => <Card key={a.id} a={a} />)}</div>
      </section>
    );
  }

  if (!data.assignments.length) return <Empty icon="file" title="Tapşırıq yoxdur" text="Müəllim tapşırıq verəndə burada görünəcək." />;
  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-3 text-base font-bold">Aktiv ({active.length})</h2>
        {active.length ? <div className="space-y-2">{active.map((a) => <Card key={a.id} a={a} />)}</div> : <p className="text-sm text-muted">Aktiv tapşırıq yoxdur.</p>}
      </section>
      {past.length > 0 && (
        <section>
          <h2 className="mb-3 text-base font-bold">Bitmiş ({past.length})</h2>
          <div className="space-y-2">{past.map((a) => <Card key={a.id} a={a} />)}</div>
        </section>
      )}
    </div>
  );
}
