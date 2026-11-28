"use client";

import Link from "next/link";
import { cx } from "@/lib/format";
import { subjectLabel } from "@/lib/subjects";
import { Avatar, Icon, Img } from "@/components/ui";
import { CoverArt } from "@/components/covers";

/* Profil stilli kartlar: üstdə örtük şəkli, onun kənarına oturan avatar / qrup ikonu, altda yaşıl düymə */

export interface TeacherCardData {
  id: string;
  name: string;
  photo: string | null;
  coverPhoto: string | null;
  subjects?: string[];
  experienceYears?: number | null;
  liveOnline?: boolean;
  students?: string | null;
}

/** Müəllim kartı. `compact` — ana səhifənin dar sağ sütunu üçün (alt-alta, kiçik) */
export function TeacherCard({ t, compact }: { t: TeacherCardData; compact?: boolean }) {
  return (
    <Link
      href={`/u/${t.id}`}
      className="group block overflow-hidden rounded-2xl border border-line bg-surface shadow-soft transition hover:-translate-y-0.5 hover:border-line-strong"
    >
      <div className={compact ? "h-14" : "h-20"}>
        <CoverArt value={t.coverPhoto} seed={t.id} />
      </div>
      <div className={cx("relative", compact ? "px-3.5 pb-3.5" : "px-4 pb-4")}>
        <Avatar
          src={t.photo}
          name={t.name}
          size={compact ? 44 : 56}
          className={cx("relative border-[3px] !border-surface bg-tint", compact ? "-mt-6" : "-mt-8")}
        />
        <p className={cx("mt-1.5 truncate font-extrabold group-hover:text-brand-hover", compact ? "text-[15px]" : "text-base")}>{t.name}</p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {(t.subjects ?? []).map((s) => <span key={s} className="badge-muted">{subjectLabel(s)}</span>)}
          {t.students != null && <span className="badge-muted"><Icon name="grad" size={12} /> {t.students} tələbə</span>}
          {t.experienceYears != null && t.experienceYears > 0 && <span className="badge-muted"><Icon name="briefcase" size={12} /> {t.experienceYears} il</span>}
          {t.liveOnline && <span className="badge-info"><Icon name="live" size={12} /> Canlı</span>}
        </div>
        {!compact && <span className="btn-primary btn-sm mt-3.5 w-full">Profilə bax</span>}
      </div>
    </Link>
  );
}

export interface GroupCardData {
  id: string;
  name: string;
  description?: string | null;
  schedule: string | null;
  photo?: string | null;
  coverPhoto?: string | null;
  members?: number;
  teacher: { id: string; name: string; photo: string | null };
}

/** Tələbənin "Qruplarım" kartı */
export function GroupCard({ g, href }: { g: GroupCardData; href: string }) {
  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-soft transition hover:-translate-y-0.5 hover:border-line-strong">
      <Link href={href} className="block h-24 bg-gradient-to-br from-brand/70 to-brand/25">
        {g.coverPhoto && <Img src={g.coverPhoto} className="h-full w-full object-cover" />}
      </Link>
      <div className="relative flex flex-1 flex-col px-4 pb-4">
        <span className="-mt-7 grid h-14 w-14 place-items-center overflow-hidden rounded-2xl border-[3px] border-surface bg-tint text-brand-hover">
          {g.photo ? <Img src={g.photo} className="h-full w-full object-cover" /> : <Icon name="users" size={24} />}
        </span>
        <Link href={href} className="mt-2 line-clamp-2 break-words text-lg font-extrabold leading-snug [overflow-wrap:anywhere] hover:text-brand-hover">
          {g.name}
        </Link>
        <Link href={`/u/${g.teacher.id}`} className="mt-1 flex w-fit items-center gap-1.5 text-sm text-muted hover:text-ink">
          <Avatar src={g.teacher.photo} name={g.teacher.name} size={20} />
          <span className="truncate">{g.teacher.name}</span>
        </Link>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {g.members !== undefined && <span className="badge-muted"><Icon name="users" size={12} /> {g.members} üzv</span>}
          {g.schedule && <span className="badge-muted"><Icon name="calendar" size={12} /> {g.schedule}</span>}
        </div>
        <div className="flex-1" />
        <Link href={href} className="btn-primary btn-sm mt-4 w-full">Aç</Link>
      </div>
    </article>
  );
}

/** Kart yüklənərkən boz "kölgə" (parıldayır) */
export function CardSkeleton({ compact }: { compact?: boolean }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface">
      <div className={cx("skeleton !rounded-none", compact ? "h-14" : "h-20")} />
      <div className={compact ? "px-3.5 pb-3.5" : "px-4 pb-4"}>
        <div className={cx("skeleton rounded-full border-[3px] border-surface", compact ? "-mt-6 h-11 w-11" : "-mt-8 h-14 w-14")} />
        <div className="skeleton mt-2 h-4 w-2/3 rounded-full" />
        <div className="mt-2 flex gap-1.5"><div className="skeleton h-5 w-16 rounded-full" /><div className="skeleton h-5 w-12 rounded-full" /></div>
        {!compact && <div className="skeleton mt-3.5 h-8 rounded-full" />}
      </div>
    </div>
  );
}
