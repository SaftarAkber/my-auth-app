"use client";

import Link from "next/link";
import { CoverArt, COVER_BOX } from "@/components/covers";
import { Avatar, Icon, Img } from "@/components/ui";

interface GroupLite {
  id: string;
  name: string;
  description: string | null;
  schedule: string | null;
  photo: string | null;
  coverPhoto: string | null;
}

/** Qrup səhifəsinin başlığı: istifadəçi profili kimi (divar kağızı, yarısı çıxan şəkil, ad altında). */
export default function GroupHeader({
  group, members, back, teacher, badges, actions,
}: {
  group: GroupLite;
  members: number;
  back?: { href: string; label: string };
  teacher?: { id: string; name: string; photo: string | null };
  badges?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <section className="card overflow-hidden">
      <div className={`relative overflow-hidden border-b-[3px] border-ink bg-surface-2 ${COVER_BOX}`}>
        <CoverArt value={group.coverPhoto} seed={group.id} />
        {back && (
          <Link
            href={back.href}
            className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full border-[2.5px] border-ink bg-white px-3.5 py-1.5 text-sm font-semibold shadow-hard transition hover:bg-sun"
          >
            <Icon name="left" size={15} /> {back.label}
          </Link>
        )}
      </div>

      <div className="relative flow-root px-5 pb-6 sm:px-8">
        {actions && <div className="absolute right-5 top-4 flex gap-2 sm:right-8">{actions}</div>}

        <span className="-mt-[66px] grid h-[132px] w-[132px] place-items-center overflow-hidden rounded-full border-4 border-ink bg-sun text-ink shadow-hard">
          {group.photo ? <Img src={group.photo} className="h-full w-full object-cover" /> : <Icon name="users" size={46} />}
        </span>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{group.name}</h1>
          <span className="badge-brand">Qrup</span>
        </div>

        {group.description && <p className="mt-2 max-w-3xl whitespace-pre-wrap">{group.description}</p>}

        <div className="mt-4 flex flex-wrap items-center gap-x-8 gap-y-2">
          <span className="flex items-baseline gap-1.5">
            <b className="text-xl font-extrabold tabular-nums">{members}</b>
            <span className="text-muted">üzv</span>
          </span>
          {group.schedule && (
            <span className="inline-flex items-center gap-1.5 font-semibold">
              <Icon name="calendar" size={16} /> {group.schedule}
            </span>
          )}
          {teacher && (
            <Link href={`/u/${teacher.id}`} className="inline-flex items-center gap-2 font-semibold hover:underline">
              <Avatar src={teacher.photo} name={teacher.name} size={26} /> {teacher.name}
            </Link>
          )}
          {badges}
        </div>
      </div>
    </section>
  );
}
