"use client";

import Link from "next/link";
import { useFetch } from "@/lib/api";
import { fmtDate } from "@/lib/format";
import { Avatar, ErrorBox, Icon, PageHeader, SkeletonList, StatCard, type IconName } from "@/components/ui";

interface Stats {
  users: { total: number; teachers: number; students: number; admins: number };
  content: { groups: number; activeGroups: number; tests: number; publishedTests: number; videos: number; posts: number };
  pendingRequests: number;
  attempts: number;
  coinsInCirculation: number;
  recentUsers: { id: string; name: string; role: "STUDENT" | "TEACHER" | "ADMIN"; createdAt: string; photo: string | null }[];
  signups: { date: string; count: number }[];
}

const ROLE = { STUDENT: ["badge-warn", "Tələbə"], TEACHER: ["badge-brand", "Müəllim"], ADMIN: ["badge-bad", "Admin"] } as const;

export default function AdminDashboardPage() {
  const { data, loading, error, reload } = useFetch<Stats>("/api/admin/stats");

  const links: { href: string; icon: IconName; title: string; text: string }[] = [
    { href: "/admin/users", icon: "users", title: "İstifadəçilər", text: "Hesabları axtar, düzəlt, sil" },
    { href: "/admin/content", icon: "file", title: "Məzmun", text: "Qrup, test, video, paylaşım" },
    { href: "/admin/site", icon: "globe", title: "Sayt", text: "Ana səhifənin məzmunu" },
  ];

  const max = Math.max(1, ...(data?.signups ?? []).map((s) => s.count));

  return (
    <div className="page">
      <PageHeader title="Dashboard" subtitle="Platformanın ümumi vəziyyəti" />

      {loading && !data ? (
        <SkeletonList rows={3} className="h-28" />
      ) : error || !data ? (
        <ErrorBox message={error ?? "Yüklənmədi"} onRetry={reload} />
      ) : (
        <div className="space-y-8">
          <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Cəmi hesab" value={data.users.total} icon="users" href="/admin/users" />
            <StatCard label="Müəllim" value={data.users.teachers} icon="grad" tone="ok" href="/admin/users" />
            <StatCard label="Tələbə" value={data.users.students} icon="user" tone="warn" href="/admin/users" />
            <StatCard label="Gözləyən müraciət" value={data.pendingRequests} icon="inbox" tone="bad" href="/admin/content" />
            <StatCard label="Qrup" value={`${data.content.activeGroups}/${data.content.groups}`} icon="users" tone="info" href="/admin/content" />
            <StatCard label="Dərc olunmuş test" value={`${data.content.publishedTests}/${data.content.tests}`} icon="file" href="/admin/content" />
            <StatCard label="Video" value={data.content.videos} icon="video" tone="ok" href="/admin/content" />
            <StatCard label="Tamamlanan cəhd" value={data.attempts} icon="chart" tone="warn" />
          </section>

          <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
            <section className="card p-5">
              <div className="mb-4 flex items-baseline justify-between gap-3">
                <h2 className="text-lg font-bold">Son 14 gündə qeydiyyat</h2>
                <span className="text-sm text-muted">cəmi {data.signups.reduce((s, d) => s + d.count, 0)}</span>
              </div>
              <div className="flex h-44 items-end gap-1.5" role="img" aria-label="Gündəlik qeydiyyat sütun diaqramı">
                {data.signups.map((d, i) => (
                  <div key={d.date} className="group flex h-full flex-1 flex-col items-center justify-end gap-1" title={`${d.date}: ${d.count}`}>
                    <span className="text-xs font-bold tabular-nums">{d.count || ""}</span>
                    <div
                      className={`w-full rounded-t-lg border-[2.5px] border-ink transition ${i === data.signups.length - 1 ? "bg-sun" : "bg-iris"} group-hover:bg-sun`}
                      style={{ height: `${Math.max(d.count ? 8 : 3, (d.count / max) * 100)}%` }}
                    />
                    <span className="text-[10px] text-muted">{d.date.slice(8)}</span>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-sm text-muted">
                Dövriyyədəki coin: <b className="tabular-nums text-ink">{data.coinsInCirculation.toLocaleString("az-AZ")}</b>
                {" · "}Paylaşım: <b className="tabular-nums text-ink">{data.content.posts}</b>
              </p>
            </section>

            <section className="card overflow-hidden">
              <div className="flex items-center justify-between border-b-[2.5px] border-ink px-5 py-3.5">
                <h2 className="text-lg font-bold">Son hesablar</h2>
                <Link href="/admin/users" className="text-sm font-semibold text-brand hover:underline">Hamısı →</Link>
              </div>
              <ul className="divide-y divide-line">
                {data.recentUsers.map((u) => (
                  <li key={u.id}>
                    <Link href={`/u/${u.id}`} className="row-link">
                      <Avatar src={u.photo} name={u.name} size={36} />
                      <span className="min-w-0 flex-1 truncate font-semibold">{u.name}</span>
                      <span className={ROLE[u.role][0]}>{ROLE[u.role][1]}</span>
                      <span className="hidden text-xs text-muted sm:inline">{fmtDate(u.createdAt)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <section className="grid gap-4 sm:grid-cols-3">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="card flex items-center gap-4 p-5 transition hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-sun/25">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full border-[2.5px] border-ink bg-sun"><Icon name={l.icon} size={20} /></span>
                <span>
                  <span className="block font-bold">{l.title}</span>
                  <span className="block text-sm text-muted">{l.text}</span>
                </span>
              </Link>
            ))}
          </section>
        </div>
      )}
    </div>
  );
}
