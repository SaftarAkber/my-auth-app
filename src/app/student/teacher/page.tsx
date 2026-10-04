"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useFetch } from "@/lib/api";
import { Avatar, Empty, Icon, Img, PageHeader, SkeletonList } from "@/components/ui";

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
  const [q, setQ] = useState("");

  const list = useMemo(
    () => (data?.teachers ?? []).filter((t) => t.name.toLowerCase().includes(q.trim().toLowerCase())),
    [data, q],
  );

  return (
    <div className="page">
      <PageHeader title="Müəllimlər" subtitle="Müəllimi seçin, qrupa müraciət göndərin" />

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
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((t) => (
            <Link key={t.id} href={`/student/teacher/${t.id}`} className="card group overflow-hidden transition hover:-translate-y-1">
              <div className="relative h-28 bg-gradient-to-br from-brand/80 to-brand/30">
                {t.coverPhoto && <Img src={t.coverPhoto} className="h-full w-full object-cover" />}
              </div>
              <div className="relative px-5 pb-5">
                <Avatar src={t.photo} name={t.name} size={72} className="-mt-9 border-4 border-surface" />
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
