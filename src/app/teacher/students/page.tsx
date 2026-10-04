"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useFetch } from "@/lib/api";
import { fmtDate } from "@/lib/format";
import { Avatar, Empty, ErrorBox, Icon, PageHeader, SkeletonList } from "@/components/ui";

interface Enrollment {
  id: string;
  status: "PENDING" | "ACCEPTED" | "DECLINED";
  updatedAt: string;
  student: { id: string; name: string; photo: string | null; email: string | null; phone: string | null };
  group: { id: string; name: string };
}

export default function TeacherStudentsPage() {
  const { data, loading, error, reload } = useFetch<{ enrollments: Enrollment[] }>("/api/enrollment/my");
  const [q, setQ] = useState("");
  const [groupId, setGroupId] = useState("");

  const accepted = useMemo(() => (data?.enrollments ?? []).filter((e) => e.status === "ACCEPTED"), [data]);

  const groups = useMemo(() => {
    const m = new Map<string, string>();
    accepted.forEach((e) => m.set(e.group.id, e.group.name));
    return [...m.entries()];
  }, [accepted]);

  const students = useMemo(() => {
    const m = new Map<string, { student: Enrollment["student"]; groups: Enrollment["group"][]; since: string }>();
    for (const e of accepted) {
      if (groupId && e.group.id !== groupId) continue;
      const cur = m.get(e.student.id);
      if (cur) cur.groups.push(e.group);
      else m.set(e.student.id, { student: e.student, groups: [e.group], since: e.updatedAt });
    }
    const term = q.trim().toLowerCase();
    return [...m.values()]
      .filter((s) => !term || s.student.name.toLowerCase().includes(term) || s.student.phone?.includes(term) || s.student.email?.toLowerCase().includes(term))
      .sort((a, b) => a.student.name.localeCompare(b.student.name));
  }, [accepted, q, groupId]);

  return (
    <div className="page">
      <PageHeader title="Tələbələr" subtitle={`${students.length} tələbə`} />

      <div className="mb-5 flex flex-wrap gap-3">
        <div className="relative min-w-60 flex-1 sm:max-w-sm">
          <Icon name="search" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" size={17} />
          <input className="input pl-10" placeholder="Ad, telefon və ya email…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="input !w-auto" value={groupId} onChange={(e) => setGroupId(e.target.value)}>
          <option value="">Bütün qruplar</option>
          {groups.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
        </select>
      </div>

      {loading ? (
        <SkeletonList rows={4} className="h-20" />
      ) : error ? (
        <ErrorBox message={error} onRetry={reload} />
      ) : students.length === 0 ? (
        <Empty icon="grad" title="Tələbə tapılmadı" text="Qəbul etdiyiniz tələbələr burada görünəcək." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {students.map(({ student: s, groups: gs, since }) => (
            <Link key={s.id} href={`/teacher/students/${s.id}`} className="card flex items-center gap-4 p-4 transition hover:border-brand/40">
              <Avatar src={s.photo} name={s.name} size={52} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">{s.name}</p>
                <p className="truncate text-xs text-muted">{s.phone ?? s.email ?? "—"} · {fmtDate(since)}</p>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {gs.map((g) => <span key={g.id} className="badge-brand">{g.name}</span>)}
                </div>
              </div>
              <Icon name="right" className="text-muted" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
