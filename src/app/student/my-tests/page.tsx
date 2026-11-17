"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useFetch } from "@/lib/api";
import { cx, fmtDateTime, minutes, percent } from "@/lib/format";
import { useTestRunner } from "@/components/TestTaker";
import { BankRow, bankEntries, type TestPackageLite } from "@/components/content";
import { Empty, ErrorBox, Icon, Modal, PageHeader, SkeletonList, Spinner, Tabs } from "@/components/ui";

interface Attempt {
  id: string;
  score: number | null;
  totalScore: number | null;
  startedAt: string;
  finishedAt: string | null;
  package: {
    id: string;
    name: string;
    isTimed: boolean;
    duration: number | null;
    allowRetry: boolean;
    isBank?: boolean;
    isMonthly?: boolean;
    group: { id: string; name: string; teacher: { name: string } } | null;
    testPackageGroups: { group: { id: string; name: string } }[];
  };
}

function Ring({ value }: { value: number }) {
  const tone = value >= 70 ? "text-ok" : value >= 40 ? "text-warn" : "text-bad";
  const r = 22;
  const c = 2 * Math.PI * r;
  return (
    <span className={cx("relative inline-flex h-14 w-14 shrink-0 items-center justify-center", tone)}>
      <svg className="-rotate-90" width="56" height="56" viewBox="0 0 56 56">
        <circle cx="28" cy="28" r={r} fill="none" strokeWidth="5" className="stroke-surface-2" />
        <circle cx="28" cy="28" r={r} fill="none" strokeWidth="5" strokeLinecap="round" stroke="currentColor"
          strokeDasharray={c} strokeDashoffset={c - (c * value) / 100} />
      </svg>
      <span className="absolute text-xs font-extrabold">{value}%</span>
    </span>
  );
}

export default function MyTestsPage() {
  const { data, loading, error, reload } = useFetch<Attempt[]>("/api/attempts");
  const [tab, setTab] = useState<"all" | "running" | "done">("all");
  const banks = useFetch<{ tests: TestPackageLite[] }>("/api/banks");
  const { begin: run, starting, node } = useTestRunner(() => { reload(); banks.reload(); });
  const topics = bankEntries(banks.data?.tests ?? []);
  const [history, setHistory] = useState<string | null>(null);

  const all = useMemo(() => data ?? [], [data]);
  // Sual bankının çoxlu cəhdi bir kartda toplanır (ən son cəhd kartda, qalanı "Keçmiş"də)
  const bankAttempts = useMemo(() => {
    const m = new Map<string, Attempt[]>();
    for (const a of all) if (a.package.isBank) m.set(a.package.id, [...(m.get(a.package.id) ?? []), a]);
    return m;
  }, [all]);
  const list = useMemo(() => {
    const seen = new Set<string>();
    return all
      .filter((a) => (tab === "all" ? true : tab === "running" ? !a.finishedAt : !!a.finishedAt))
      .filter((a) => {
        if (!a.package.isBank) return true;
        if (seen.has(a.package.id)) return false;
        seen.add(a.package.id);
        return true;
      });
  }, [all, tab]);

  const begin = (a: Attempt) => run(a.package);
  const histList = history ? (bankAttempts.get(history) ?? []).filter((a) => a.finishedAt) : [];

  // Hər test üçün ən son cəhd "təkrar" düyməsini göstərir
  const latestByPackage = new Map<string, string>();
  for (const a of all) if (!latestByPackage.has(a.package.id)) latestByPackage.set(a.package.id, a.id);

  return (
    <div className="page-narrow">
      <PageHeader title="Testlərim" subtitle="Bütün cəhdləriniz və nəticələriniz" />

      {topics.length > 0 && (
        <section className="mb-6 space-y-3" aria-label="Mövzu testləri">
          <h2 className="text-base font-bold">Mövzu testləri</h2>
          {topics.map((e) => (
            <BankRow key={e.key} pkg={e.pkg} title={e.title} onStart={(p) => run(p)} busy={starting === e.pkg.id} />
          ))}
        </section>
      )}

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { id: "all", label: "Hamısı", count: all.length },
          { id: "running", label: "Davam edən", count: all.filter((a) => !a.finishedAt).length },
          { id: "done", label: "Tamamlanan", count: all.filter((a) => a.finishedAt).length },
        ]}
      />

      {loading ? (
        <SkeletonList />
      ) : error ? (
        <ErrorBox message={error} onRetry={reload} />
      ) : list.length === 0 ? (
        <Empty
          icon="file"
          title="Burada hələ heç nə yoxdur"
          text="Qrupunuzdakı testləri həll etdikdə nəticələr burada görünəcək."
          action={<Link href="/student" className="btn-primary">Ana səhifə</Link>}
        />
      ) : (
        <div className="space-y-3">
          {list.map((a) => {
            const pct = percent(a.score, a.totalScore);
            const groupName = a.package.group?.name ?? a.package.testPackageGroups[0]?.group.name;
            const isLatest = latestByPackage.get(a.package.id) === a.id;
            return (
              // Mobildə: üstdə nəticə və məlumat (uzun ad alt sətrə keçir), düymələr kartın altında; genişlikdə bir sətir
              <div key={a.id} className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4">
                <div className="flex min-w-0 flex-1 items-center gap-4">
                {a.finishedAt ? (
                  <Ring value={pct} />
                ) : (
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-warn/10 text-warn"><Icon name="clock" size={22} /></span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="break-words font-bold [overflow-wrap:anywhere]">{a.package.name}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-muted">
                    {groupName && <span>{groupName}</span>}
                    <span>{fmtDateTime(a.finishedAt ?? a.startedAt)}</span>
                    {a.package.isTimed && a.package.duration && <span>⏱ {minutes(a.package.duration)} dəq</span>}
                  </p>
                  {a.finishedAt && (
                    <p className="mt-1 text-sm font-semibold">
                      {a.score} / {a.totalScore} düzgün
                      {a.package.isBank && (bankAttempts.get(a.package.id)?.length ?? 0) > 1 && (
                        <span className="font-normal text-muted"> · cəmi {bankAttempts.get(a.package.id)!.filter((x) => x.finishedAt).length} cəhd</span>
                      )}
                    </p>
                  )}
                </div>
                </div>
                <div className="flex flex-wrap gap-2 sm:shrink-0 sm:justify-end">
                  {a.finishedAt ? (
                    <>
                      <Link href={`/student/attempts/${a.id}`} className="btn-secondary btn-sm">Cavablara bax</Link>
                      <Link href={`/student/results/${a.package.id}`} className="btn-soft btn-sm"><Icon name="chart" size={14} /> {a.package.isBank ? "Reytinq" : "Cədvəl"}</Link>
                      {a.package.isBank && (bankAttempts.get(a.package.id)?.filter((x) => x.finishedAt).length ?? 0) > 1 && (
                        <button className="btn-soft btn-sm" onClick={() => setHistory(a.package.id)}><Icon name="calendar" size={14} /> Keçmiş</button>
                      )}
                      {(a.package.allowRetry || a.package.isBank) && isLatest && (
                        <button className="btn-soft btn-sm" onClick={() => begin(a)} disabled={starting === a.package.id}>
                          {starting === a.package.id ? <Spinner /> : <Icon name="retry" size={14} />} {a.package.isBank ? "Yenidən işlə" : "Təkrar"}
                        </button>
                      )}
                    </>
                  ) : (
                    <button className="btn-primary btn-sm" onClick={() => begin(a)} disabled={starting === a.package.id}>
                      {starting === a.package.id ? <Spinner /> : <Icon name="play" size={14} />} Davam et
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {node}

      <Modal open={!!history} onClose={() => setHistory(null)} title={histList[0]?.package.name ?? "Keçmiş"}>
        <ul className="divide-y divide-line">
          {histList.map((a, i) => {
            const pct = percent(a.score, a.totalScore);
            return (
              <li key={a.id}>
                <Link href={`/student/attempts/${a.id}`} className="flex items-center gap-3 py-2.5 hover:bg-tint/50">
                  <span className="w-8 shrink-0 text-center text-sm font-bold text-muted">{histList.length - i}</span>
                  <span className="min-w-0 flex-1 text-sm">
                    <span className="font-semibold">{a.score}/{a.totalScore}</span>
                    <span className="block text-xs text-muted">{fmtDateTime(a.finishedAt)}</span>
                  </span>
                  <span className={cx("badge shrink-0", pct >= 70 ? "bg-ok/10 text-ok" : pct >= 40 ? "bg-warn/10 text-warn" : "bg-bad/10 text-bad")}>{pct}%</span>
                  <Icon name="right" size={16} className="shrink-0 text-muted" />
                </Link>
              </li>
            );
          })}
        </ul>
      </Modal>
    </div>
  );
}
