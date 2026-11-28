"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useFetch } from "@/lib/api";
import { fmtDate, percent } from "@/lib/format";
import TestTaker, { useStartTest, type AttemptStart } from "@/components/TestTaker";
import { Avatar, Empty, Icon, SkeletonList, StatStrip } from "@/components/ui";
import { PushPrompt } from "@/components/PushNotifications";
import StudentAssignments from "@/components/StudentAssignments";
import { CardSkeleton, TeacherCard, type TeacherCardData } from "@/components/ProfileCards";
import StudentFeed from "@/components/StudentFeed";
import HeroCarousel, { type HeroSlideData } from "@/components/HeroCarousel";

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
export default function StudentHome() {
  const enrollments = useFetch<{ enrollments: Enrollment[] }>("/api/enrollment/my");
  const attempts = useFetch<Attempt[]>("/api/attempts");
  const teachers = useFetch<{ teachers: TeacherCardData[] }>("/api/teacher/public?mine=1");
  const hero = useFetch<{ slides: HeroSlideData[] }>("/api/hero");

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
      {/* Elanlar karuseli: səhifənin ən yuxarısı, tam en */}
      {(hero.data?.slides.length ?? 0) > 0 && <div className="-mx-4 sm:-mx-6 lg:-mx-8"><HeroCarousel slides={hero.data!.slides} /></div>}
      <PushPrompt />
      <StudentAssignments compact />
      <StatStrip
        loading={!enrollments.data || !attempts.data}
        items={[
          { label: "Qruplarım", value: groups.length, icon: "users", href: "/student/teacher" },
          { label: "Tamamlanan test", value: finished.length, icon: "check", href: "/student/my-tests" },
          { label: "Orta nəticə", value: avg, suffix: "%", icon: "chart", href: "/student/my-tests" },
        ]}
      />

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

      {/* Kompüterdə: solda paylaşımlar lenti, sağda qruplar və müəllimlər; telefonda lent yuxarıda */}
      <div className="grid gap-8 lg:grid-cols-3">
      <div className="min-w-0 lg:col-span-2">
        <Suspense fallback={<SkeletonList rows={2} />}><StudentFeed /></Suspense>
      </div>
      <div className="min-w-0 space-y-8">
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">Qruplarım</h2>
          <Link href="/student/teacher" className="text-sm font-bold text-brand-hover hover:underline">Hamısı →</Link>
        </div>
        {enrollments.loading ? (
          <SkeletonList rows={2} />
        ) : groups.length === 0 ? (
          <Empty
            icon="users"
            title="Hələ heç bir qrupa qoşulmamısınız"
            text="Müəllimin səhifəsinə keçib qrupa müraciət göndərin."
            action={<Link href="/student/teachers" className="btn-primary">Müəllimlərə bax</Link>}
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            {groups.map((e) => (
              <Link key={e.id} href={`/student/groups/${e.group.id}`} className="card group p-5 transition hover:border-brand/40">
                <div className="flex items-center gap-3">
                  <Avatar src={e.teacher.photo} name={e.teacher.name} size={40} />
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 break-words font-bold leading-snug [overflow-wrap:anywhere] group-hover:text-brand" title={e.group.name}>{e.group.name}</p>
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

      {/* Müəllimlərim: profil kartları alt-alta, ilk 5; qalanı "Daha çox bax" ilə ayrı səhifədə (filtrlərlə) */}
      <section>
        <h2 className="mb-3 text-lg font-bold">Müəllimlərim</h2>
        {teachers.loading && !teachers.data ? (
          <div className="space-y-3">{[0, 1].map((i) => <CardSkeleton key={i} compact />)}</div>
        ) : (teachers.data?.teachers ?? []).length === 0 ? (
          <p className="text-sm text-muted">Qrupa qoşulanda müəllimləriniz burada görünəcək.</p>
        ) : (
          <div className="space-y-3">
            {teachers.data!.teachers.slice(0, 5).map((t) => <TeacherCard key={t.id} t={t} compact />)}
          </div>
        )}
        <Link href="/student/teachers" className="btn-secondary mt-3 w-full">
          Daha çox bax <Icon name="right" size={16} />
        </Link>
      </section>
      </div>
      </div>
    </div>
  );
}
