"use client";

import { useParams } from "next/navigation";
import { useFetch } from "@/lib/api";
import { cx, fmtDate, fmtDateTime, percent } from "@/lib/format";
import { Avatar, Empty, ErrorBox, Icon, PageHeader, SkeletonList, StatCard } from "@/components/ui";

interface Detail {
  student: { id: string; name: string; email: string | null; phone: string | null; photo: string | null; bio: string | null; createdAt: string };
  enrollments: { id: string; group: { id: string; name: string } }[];
  attempts: {
    id: string;
    score: number | null;
    totalScore: number | null;
    finishedAt: string | null;
    package: { name: string; collection: { name: string } | null };
    answers: { id: string; status: string; question: { type: string } }[];
  }[];
}

export default function TeacherStudentPage() {
  const { id } = useParams<{ id: string }>();
  const { data, loading, error, reload } = useFetch<Detail>(`/api/teacher/student/${id}`);

  if (loading) return <div className="page-narrow"><SkeletonList rows={3} /></div>;
  if (error || !data) return <div className="page-narrow"><ErrorBox message={error ?? "Tapılmadı"} onRetry={reload} /></div>;

  const { student: s, enrollments, attempts } = data;
  const pcts = attempts.map((a) => percent(a.score, a.totalScore));
  const avg = pcts.length ? Math.round(pcts.reduce((x, y) => x + y, 0) / pcts.length) : 0;

  return (
    <div className="page-narrow">
      <PageHeader title="Tələbə" back="/teacher/students" />

      <section className="card flex flex-wrap items-center gap-5 p-5 sm:p-6">
        <Avatar src={s.photo} name={s.name} size={80} />
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-extrabold tracking-tight">{s.name}</h2>
          <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
            {s.phone && <span className="inline-flex items-center gap-1.5"><Icon name="phone" size={14} />{s.phone}</span>}
            {s.email && <span className="inline-flex items-center gap-1.5"><Icon name="mail" size={14} />{s.email}</span>}
            <span className="inline-flex items-center gap-1.5"><Icon name="calendar" size={14} />{fmtDate(s.createdAt)}</span>
          </p>
          {s.bio && <p className="mt-2 text-sm">{s.bio}</p>}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {enrollments.map((e) => <span key={e.id} className="badge-brand">{e.group.name}</span>)}
          </div>
        </div>
      </section>

      <div className="my-5 grid grid-cols-3 gap-3">
        <StatCard label="Test" value={attempts.length} icon="file" />
        <StatCard label="Orta nəticə" value={`${avg}%`} icon="chart" tone="info" />
        <StatCard label="Ən yaxşı" value={`${Math.max(0, ...pcts)}%`} icon="award" tone="ok" />
      </div>

      <h3 className="mb-3 text-lg font-bold">Test nəticələri</h3>
      {attempts.length === 0 ? (
        <Empty icon="file" title="Hələ test həll etməyib" />
      ) : (
        <div className="card divide-y divide-line">
          {attempts.map((a) => {
            const p = percent(a.score, a.totalScore);
            const pend = a.answers.filter((x) => x.status === "PENDING").length;
            return (
              <div key={a.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{a.package.name}</p>
                  <p className="truncate text-xs text-muted">{a.package.collection?.name} · {fmtDateTime(a.finishedAt)}</p>
                </div>
                {pend > 0 && <span className="badge-warn">{pend} yoxlanmamış</span>}
                <span className="text-sm text-muted">{a.score}/{a.totalScore}</span>
                <span className={cx("badge", p >= 70 ? "bg-ok/10 text-ok" : p >= 40 ? "bg-warn/10 text-warn" : "bg-bad/10 text-bad")}>{p}%</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
