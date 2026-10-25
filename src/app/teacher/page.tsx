"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useFetch } from "@/lib/api";
import { fmtDateTime, percent, timeAgo } from "@/lib/format";
import { useState } from "react";
import GiftModal from "@/components/GiftModal";
import { Avatar, Empty, Icon, PageHeader, SkeletonList, StatCard } from "@/components/ui";

interface Stats {
  students: number;
  videos: number;
  packages: number;
  attempts: number;
  pendingRequests: number;
  groups: number;
}
interface Enrollment {
  id: string;
  status: string;
  message: string | null;
  createdAt: string;
  student: { id: string; name: string; photo: string | null };
  group: { id: string; name: string };
}
interface Attempt {
  id: string;
  score: number | null;
  totalScore: number | null;
  finishedAt: string | null;
  student: { id: string; name: string; photo: string | null };
  package: { name: string };
}

export default function TeacherDashboard() {
  const { user } = useAuth();
  const [gift, setGift] = useState(false);
  const stats = useFetch<Stats>("/api/teacher/stats");
  const reqs = useFetch<{ enrollments: Enrollment[] }>("/api/enrollment/my");
  const attempts = useFetch<{ attempts: Attempt[] }>("/api/teacher/attempts");

  const pending = (reqs.data?.enrollments ?? []).filter((e) => e.status === "PENDING").slice(0, 4);
  const recent = (attempts.data?.attempts ?? []).slice(0, 5);
  const s = stats.data;

  const actions = [
    { href: "/teacher/groups", icon: "users", label: "Yeni qrup" },
    { href: "/teacher/tests", icon: "file", label: "Test yarat" },
    { href: "/teacher/lessons", icon: "video", label: "Video əlavə et" },
    { href: "/teacher/profile", icon: "message", label: "Paylaşım" },
  ] as const;

  return (
    <div className="page space-y-8">
      <PageHeader
        title="Ana səhifə"
        actions={
          <button className="btn-primary" onClick={() => setGift(true)}>
            <Icon name="coin" size={16} /> Coin hədiyyə et
          </button>
        }
      />
      <GiftModal open={gift} onClose={() => setGift(false)} />

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.loading || !s ? (
          Array.from({ length: 7 }).map((_, i) => <div key={i} className="skeleton h-[84px]" />)
        ) : (
          <>
            <StatCard label="Coin balansım" value={user?.coinBalance ?? 0} icon="coin" tone="warn" href={`/u/${user?.id}?tab=coins`} />
            <StatCard label="Qrup" value={s.groups} icon="users" href="/teacher/groups" />
            <StatCard label="Tələbə" value={s.students} icon="grad" tone="ok" href="/teacher/students" />
            <StatCard label="Dərc olunmuş test" value={s.packages} icon="file" tone="info" href="/teacher/tests" />
            <StatCard label="Video" value={s.videos} icon="video" tone="warn" href="/teacher/lessons" />
            <StatCard label="Tamamlanan cəhd" value={s.attempts} icon="chart" href="/teacher/attempts" />
            <StatCard label="Yeni müraciət" value={s.pendingRequests} icon="inbox" tone="bad" href="/teacher/requests" />
          </>
        )}
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {actions.map((a) => (
          <Link key={a.href} href={a.href} className="card flex flex-col items-center gap-2 p-4 text-center transition hover:-translate-y-0.5 hover:border-brand/40">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand/10 text-brand"><Icon name={a.icon} /></span>
            <span className="text-sm font-semibold">{a.label}</span>
          </Link>
        ))}
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold">Gözləyən müraciətlər</h2>
            <Link href="/teacher/requests" className="text-sm font-semibold text-brand hover:underline">Hamısı →</Link>
          </div>
          {reqs.loading ? (
            <SkeletonList rows={2} className="h-16" />
          ) : pending.length === 0 ? (
            <Empty icon="inbox" title="Yeni müraciət yoxdur" />
          ) : (
            <div className="card divide-y divide-line">
              {pending.map((e) => (
                <Link key={e.id} href="/teacher/requests" className="flex items-center gap-3 px-4 py-3 transition hover:bg-surface-2">
                  <Avatar src={e.student.photo} name={e.student.name} size={38} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{e.student.name}</p>
                    <p className="truncate text-xs text-muted">{e.group.name} · {timeAgo(e.createdAt)}</p>
                  </div>
                  <Icon name="right" className="text-muted" />
                </Link>
              ))}
            </div>
          )}
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold">Son nəticələr</h2>
            <Link href="/teacher/attempts" className="text-sm font-semibold text-brand hover:underline">Hamısı →</Link>
          </div>
          {attempts.loading ? (
            <SkeletonList rows={2} className="h-16" />
          ) : recent.length === 0 ? (
            <Empty icon="chart" title="Hələ nəticə yoxdur" />
          ) : (
            <div className="card divide-y divide-line">
              {recent.map((a) => (
                <div key={a.id} className="flex items-center gap-3 px-4 py-3">
                  <Avatar src={a.student.photo} name={a.student.name} size={38} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{a.student.name}</p>
                    <p className="truncate text-xs text-muted">{a.package.name} · {fmtDateTime(a.finishedAt)}</p>
                  </div>
                  <span className="badge-brand">{percent(a.score, a.totalScore)}%</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
