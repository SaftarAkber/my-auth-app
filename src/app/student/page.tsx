"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useFetch } from "@/lib/api";
import { fmtDate, percent } from "@/lib/format";
import TestTaker, { useStartTest, type AttemptStart } from "@/components/TestTaker";
import { Avatar, Empty, Icon, PageHeader, SkeletonList, StatCard } from "@/components/ui";
import { SubjectBadges } from "@/components/Subjects";

interface Enrollment {
  id: string;
  status: "PENDING" | "ACCEPTED" | "DECLINED";
  group: { id: string; name: string; description: string | null; schedule: string | null };
  teacher: { id: string; name: string; photo: string | null };
}
interface Attempt {
  id: string;
  score: number | null;
  totalScore: number | null;
  startedAt: string;
  finishedAt: string | null;
  package: { id: string; name: string };
}
interface Teacher {
  id: string;
  subjects?: string[];
  name: string;
  bio: string | null;
  photo: string | null;
  _count: { groups: number };
}

export default function StudentHome() {
  const { user } = useAuth();
  const enrollments = useFetch<{ enrollments: Enrollment[] }>("/api/enrollment/my");
  const attempts = useFetch<Attempt[]>("/api/attempts");
  const teachers = useFetch<{ teachers: Teacher[] }>("/api/teacher/public");

  const { start, starting } = useStartTest();
  const [taking, setTaking] = useState<{ name: string; data: AttemptStart } | null>(null);

  const groups = (enrollments.data?.enrollments ?? []).filter((e) => e.status === "ACCEPTED");
  const pending = (enrollments.data?.enrollments ?? []).filter((e) => e.status === "PENDING");
  const all = attempts.data ?? [];
  const finished = all.filter((a) => a.finishedAt);
  const running = all.filter((a) => !a.finishedAt);
  const avg = finished.length
    ? Math.round(finished.reduce((s, a) => s + percent(a.score, a.totalScore), 0) / finished.length)
    : 0;

  async function resume(a: Attempt) {
    const data = await start(a.package.id);
    if (data) setTaking({ name: a.package.name, data });
  }

  return (
    <div className="page space-y-8">
      <PageHeader title="Ana səhifə" />

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Coin" value={user?.coinBalance ?? 0} icon="coin" tone="warn" href={`/u/${user?.id}?tab=coins`} />
        <StatCard label="Qruplarım" value={groups.length} icon="users" tone="ok" href="/student/teacher" />
        <StatCard label="Tamamlanan test" value={finished.length} icon="check" tone="info" href="/student/my-tests" />
        <StatCard label="Orta nəticə" value={`${avg}%`} icon="chart" />
      </section>

      {taking && (
        <TestTaker
          name={taking.name}
          data={taking.data}
          onClose={() => { setTaking(null); attempts.reload(); }}
        />
      )}

      {running.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-bold">Davam edən testlər</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {running.map((a) => (
              <div key={a.id} className="card flex items-center gap-4 border-warn/40 p-4">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-warn/10 text-warn"><Icon name="clock" /></span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">{a.package.name}</p>
                  <p className="text-xs text-muted">Başlanıb: {fmtDate(a.startedAt)}</p>
                </div>
                <button className="btn-primary btn-sm" onClick={() => resume(a)} disabled={starting === a.package.id}>Davam et</button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">Qruplarım</h2>
          <Link href="/student/teacher" className="text-sm font-semibold text-brand hover:underline">Qrup tap →</Link>
        </div>
        {enrollments.loading ? (
          <SkeletonList rows={2} />
        ) : groups.length === 0 ? (
          <Empty
            icon="users"
            title="Hələ heç bir qrupa qoşulmamısınız"
            text="Müəllimin səhifəsinə keçib qrupa müraciət göndərin."
            action={<Link href="/student/teacher" className="btn-primary">Müəllimlərə bax</Link>}
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {groups.map((e) => (
              <Link key={e.id} href={`/student/groups/${e.group.id}`} className="card group p-5 transition hover:-translate-y-0.5 hover:border-brand/40">
                <div className="flex items-center gap-3">
                  <Avatar src={e.teacher.photo} name={e.teacher.name} size={40} />
                  <div className="min-w-0">
                    <p className="truncate font-bold group-hover:text-brand">{e.group.name}</p>
                    <p className="truncate text-xs text-muted">{e.teacher.name}</p>
                  </div>
                </div>
                {e.group.schedule && (
                  <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted"><Icon name="calendar" size={13} /> {e.group.schedule}</p>
                )}
              </Link>
            ))}
          </div>
        )}
        {pending.length > 0 && (
          <p className="mt-3 text-sm text-muted">
            <span className="badge-warn mr-2">{pending.length}</span>
            müraciət cavab gözləyir: {pending.map((p) => p.group.name).join(", ")}
          </p>
        )}
      </section>

      <div>
        <section>
          <h2 className="mb-3 text-lg font-bold">Müəllimlər</h2>
          {teachers.loading ? (
            <SkeletonList rows={2} />
          ) : (teachers.data?.teachers ?? []).length === 0 ? (
            <Empty icon="grad" title="Müəllim tapılmadı" />
          ) : (
            <div className="flex flex-wrap gap-3">
              {teachers.data!.teachers.map((t) => (
                <Link
                  key={t.id}
                  href={`/u/${t.id}`}
                  className="card group flex items-center gap-3 py-2.5 pl-2.5 pr-4 transition hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-sun/25"
                >
                  <Avatar src={t.photo} name={t.name} size={56} className="bg-sun" />
                  <span className="flex min-h-[56px] flex-col justify-between py-0.5">
                    <span className="text-sm font-bold leading-tight group-hover:underline">{t.name}</span>
                    <span className="flex flex-wrap gap-1.5"><SubjectBadges subjects={t.subjects} /></span>
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>

      </div>
    </div>
  );
}
