"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useFetch } from "@/lib/api";
import { CoverArt } from "@/components/covers";
import { Avatar, Empty, Icon, PageHeader, SkeletonList } from "@/components/ui";

interface Enrollment {
  id: string;
  status: "PENDING" | "ACCEPTED" | "DECLINED";
  group: { id: string; name: string; description: string | null; schedule: string | null };
  teacher: { id: string; name: string; photo: string | null };
}

interface Teacher {
  id: string;
  name: string;
  bio: string | null;
  photo: string | null;
  coverPhoto: string | null;
  _count: { groups: number };
}

export default function TeachersPage() {
  const { data, loading, error } = useFetch<{ teachers: Teacher[] }>("/api/teacher/public");
  const enr = useFetch<{ enrollments: Enrollment[] }>("/api/enrollment/my");
  const [q, setQ] = useState("");
  const mine = (enr.data?.enrollments ?? []).filter((e) => e.status === "ACCEPTED");
  const waiting = (enr.data?.enrollments ?? []).filter((e) => e.status === "PENDING");

  const list = useMemo(
    () => (data?.teachers ?? []).filter((t) => t.name.toLowerCase().includes(q.trim().toLowerCase())),
    [data, q],
  );

  return (
    <div className="page">
      <PageHeader title="Qruplar" subtitle="Qruplarınız və müəllimlər" />

      <section className="mb-10">
        <h2 className="mb-3 text-lg font-bold">Qruplarım</h2>
        {enr.loading ? (
          <SkeletonList rows={2} className="h-24" />
        ) : mine.length === 0 ? (
          <Empty icon="users" title="Hələ heç bir qrupa qoşulmamısınız" text="Aşağıdan müəllimi seçib qrupa müraciət göndərin." />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {mine.map((e) => (
              <Link key={e.id} href={`/student/groups/${e.group.id}`} className="card group flex items-center gap-4 p-5 transition hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-sun/20">
                <Avatar src={e.teacher.photo} name={e.teacher.name} size={48} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">{e.group.name}</p>
                  <p className="truncate text-sm text-muted">{e.teacher.name}{e.group.schedule ? ` · ${e.group.schedule}` : ""}</p>
                </div>
                <Icon name="right" className="text-muted" />
              </Link>
            ))}
          </div>
        )}
        {waiting.length > 0 && (
          <p className="mt-3 text-sm text-muted">
            <span className="badge-warn mr-2">{waiting.length}</span>
            müraciət cavab gözləyir: {waiting.map((p) => p.group.name).join(", ")}
          </p>
        )}
      </section>

      <h2 className="mb-3 text-lg font-bold">Müəllimlər</h2>

      <div className="relative mb-6 max-w-md">
        <Icon name="search" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" size={17} />
        <input className="input pl-10" placeholder="Müəllim axtar…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {loading ? (
        <SkeletonList rows={3} className="h-48" />
      ) : error ? (
        <Empty icon="alert" title="Yüklənmədi" text={error} />
      ) : list.length === 0 ? (
        <Empty icon="grad" title="Müəllim tapılmadı" />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((t) => (
            <Link key={t.id} href={`/u/${t.id}`} className="card group overflow-hidden transition hover:-translate-x-0.5 hover:-translate-y-0.5">
              <div className="relative h-28 border-b-[2.5px] border-ink bg-surface-2">
                <CoverArt value={t.coverPhoto} seed={t.id} />
              </div>
              <div className="relative px-5 pb-5">
                <Avatar src={t.photo} name={t.name} size={72} className="-mt-9 border-4 border-ink bg-sun" />
                <h3 className="mt-3 text-lg font-bold group-hover:text-brand">{t.name}</h3>
                <p className="mt-1 line-clamp-2 min-h-10 text-sm text-muted">{t.bio || "Haqqında məlumat yoxdur."}</p>
                <div className="mt-4 flex items-center justify-between">
                  <span className="badge-brand"><Icon name="users" size={13} /> {t._count.groups} qrup</span>
                  <span className="text-sm font-semibold text-brand">Profilə bax →</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
