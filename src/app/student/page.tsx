"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useFetch } from "@/lib/api";
import { fmtDate, percent } from "@/lib/format";
import TestTaker, { useStartTest, type AttemptStart } from "@/components/TestTaker";
import { Avatar, CoinPill, Empty, Icon, SkeletonList, StatCard } from "@/components/ui";

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
  name: string;
  bio: string | null;
  photo: string | null;
  _count: { groups: number };
}
interface Entry {
  rank: number;
  student: { id: string; name: string; photo: string | null };
  coins: number;
  isMe: boolean;
}

export default function StudentHome() {
  const { user } = useAuth();
  const enrollments = useFetch<{ enrollments: Enrollment[] }>("/api/enrollment/my");
  const attempts = useFetch<Attempt[]>("/api/attempts");
  const teachers = useFetch<{ teachers: Teacher[] }>("/api/teacher/public");
  const board = useFetch<{ entries: Entry[] }>("/api/leaderboard");

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

  const hour = new Date().getHours();
  const greeting = hour < 6 ? "Gecəniz xeyir" : hour < 12 ? "Sabahınız xeyir" : hour < 18 ? "Günortanız xeyir" : "Axşamınız xeyir";

  return (
    <div className="page space-y-8">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-brand p-6 text-white sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-white/75">{greeting},</p>
            <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{user?.name} 👋</h1>
            <p className="mt-1.5 text-white/80">Bu gün nə öyrənirik?</p>
          </div>
          <CoinPill amount={user?.coinBalance ?? 0} className="!bg-white/20 !px-4 !py-2 !text-base !text-white" />
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Qruplarım" value={groups.length} icon="users" href="/student/teacher" />
        <StatCard label="Tamamlanan test" value={finished.length} icon="check" tone="ok" href="/student/my-tests" />
        <StatCard label="Orta nəticə" value={`${avg}%`} icon="chart" tone="info" />
        <StatCard label="Coin" value={user?.coinBalance ?? 0} icon="coin" tone="warn" href="/student/profil" />
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

      <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <section>
          <h2 className="mb-3 text-lg font-bold">Müəllimlər</h2>
          {teachers.loading ? (
            <SkeletonList rows={2} />
          ) : (teachers.data?.teachers ?? []).length === 0 ? (
            <Empty icon="grad" title="Müəllim tapılmadı" />
          ) : (
            <div className="space-y-3">
              {teachers.data!.teachers.map((t) => (
                <Link key={t.id} href={`/student/teacher/${t.id}`} className="card flex items-center gap-4 p-4 transition hover:border-brand/40">
                  <Avatar src={t.photo} name={t.name} size={52} />
                  <div className="min-w-0 flex-1">
                    <p className="font-bold">{t.name}</p>
                    <p className="line-clamp-1 text-sm text-muted">{t.bio || "Müəllim"}</p>
                  </div>
                  <span className="badge-brand">{t._count.groups} qrup</span>
                  <Icon name="right" className="text-muted" />
                </Link>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-lg font-bold">Liderlər</h2>
          <div className="card divide-y divide-line">
            {board.loading ? (
              <div className="p-4"><SkeletonList rows={4} className="h-10" /></div>
            ) : (board.data?.entries ?? []).length === 0 ? (
              <p className="p-6 text-center text-sm text-muted">Hələ reytinq yoxdur.</p>
            ) : (
              board.data!.entries.slice(0, 5).map((e) => (
                <div key={e.student.id} className={`flex items-center gap-3 px-4 py-3 ${e.isMe ? "bg-brand/5" : ""}`}>
                  <span className={`w-6 text-center text-sm font-extrabold ${e.rank <= 3 ? "text-warn" : "text-muted"}`}>{e.rank}</span>
                  <Avatar src={e.student.photo} name={e.student.name} size={32} />
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold">{e.student.name}{e.isMe && " (siz)"}</span>
                  <span className="inline-flex items-center gap-1 text-sm font-bold text-warn"><Icon name="coin" size={14} />{e.coins}</span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
