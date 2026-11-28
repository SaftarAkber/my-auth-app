"use client";

import Link from "next/link";
import { useFetch } from "@/lib/api";
import { Empty, PageHeader } from "@/components/ui";
import { CardSkeleton, GroupCard } from "@/components/ProfileCards";

interface Enrollment {
  id: string;
  status: "PENDING" | "ACCEPTED" | "DECLINED";
  group: {
    id: string; name: string; description: string | null; schedule: string | null;
    photo: string | null; coverPhoto: string | null; _count?: { members: number };
  };
  teacher: { id: string; name: string; photo: string | null };
}

/** Tələbə: yalnız üzv olduğu qruplar (bir cərgədə ən çox 3 kart) */
export default function MyGroupsPage() {
  const enr = useFetch<{ enrollments: Enrollment[] }>("/api/enrollment/my");
  const mine = (enr.data?.enrollments ?? []).filter((e) => e.status === "ACCEPTED");
  const waiting = (enr.data?.enrollments ?? []).filter((e) => e.status === "PENDING");

  return (
    <div className="page">
      <PageHeader
        title="Qruplarım"
        subtitle="Üzv olduğunuz qruplar"
        actions={<Link href="/student/teachers" className="btn-secondary">Müəllimlərə bax</Link>}
      />

      {waiting.length > 0 && (
        <p className="mb-5 flex flex-wrap items-center gap-2 text-sm text-muted">
          <span className="badge-warn">{waiting.length}</span>
          müraciət cavab gözləyir: {waiting.map((p) => p.group.name).join(", ")}
        </p>
      )}

      {enr.loading && !enr.data ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => <CardSkeleton key={i} />)}
        </div>
      ) : mine.length === 0 ? (
        <Empty
          icon="users"
          title="Hələ heç bir qrupa qoşulmamısınız"
          text="Müəllimi seçin, profilindən qrupa müraciət göndərin."
          action={<Link href="/student/teachers" className="btn-primary">Müəllimlərə bax</Link>}
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {mine.map((e) => (
            <GroupCard
              key={e.id}
              href={`/student/groups/${e.group.id}`}
              g={{ ...e.group, members: e.group._count?.members, teacher: e.teacher }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
