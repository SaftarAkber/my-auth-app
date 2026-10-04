"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useFetch } from "@/lib/api";
import { cx, fmtDateTime, minutes, percent } from "@/lib/format";
import TestTaker, { useStartTest, type AttemptStart } from "@/components/TestTaker";
import { Empty, ErrorBox, Icon, PageHeader, SkeletonList, Spinner, Tabs } from "@/components/ui";

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
    group: { id: string; name: string; teacher: { name: string } } | null;
    testPackageGroups: { group: { id: string; name: string } }[];
  };
}

function Ring({ value }: { value: number }) {
  const tone = value >= 70 ? "text-ok" : value >= 40 ? "text-warn" : "text-bad";
  const r = 22;
  const c = 2 * Math.PI * r;
  return (
    <span className={cx("relative inline-flex h-14 w-14 items-center justify-center", tone)}>
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
  const { start, starting } = useStartTest();
  const [taking, setTaking] = useState<{ name: string; data: AttemptStart } | null>(null);

  const all = useMemo(() => data ?? [], [data]);
  const list = useMemo(
    () => all.filter((a) => (tab === "all" ? true : tab === "running" ? !a.finishedAt : !!a.finishedAt)),
    [all, tab],
  );

  async function begin(a: Attempt) {
    const d = await start(a.package.id);
    if (d) setTaking({ name: a.package.name, data: d });
  }

  // Hər test üçün ən son cəhd "təkrar" düyməsini göstərir
  const latestByPackage = new Map<string, string>();
  for (const a of all) if (!latestByPackage.has(a.package.id)) latestByPackage.set(a.package.id, a.id);

  return (
    <div className="page-narrow">
      <PageHeader title="Testlərim" subtitle="Bütün cəhdləriniz və nəticələriniz" />

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
              <div key={a.id} className="card flex flex-wrap items-center gap-4 p-4">
                {a.finishedAt ? (
                  <Ring value={pct} />
                ) : (
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-warn/10 text-warn"><Icon name="clock" size={22} /></span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">{a.package.name}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-muted">
                    {groupName && <span>{groupName}</span>}
                    <span>{fmtDateTime(a.finishedAt ?? a.startedAt)}</span>
                    {a.package.isTimed && a.package.duration && <span>⏱ {minutes(a.package.duration)} dəq</span>}
                  </p>
                  {a.finishedAt && (
                    <p className="mt-1 text-sm font-semibold">{a.score} / {a.totalScore} düzgün</p>
                  )}
                </div>
                <div className="flex gap-2">
                  {a.finishedAt ? (
                    <>
                      <Link href={`/student/attempts/${a.id}`} className="btn-secondary btn-sm">Cavablara bax</Link>
                      {a.package.allowRetry && isLatest && (
                        <button className="btn-soft btn-sm" onClick={() => begin(a)} disabled={starting === a.package.id}>
                          {starting === a.package.id ? <Spinner /> : <Icon name="retry" size={14} />} Təkrar
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

      {taking && <TestTaker name={taking.name} data={taking.data} onClose={() => { setTaking(null); reload(); }} />}
    </div>
  );
}
