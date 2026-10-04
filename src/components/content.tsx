"use client";

import Link from "next/link";
import { useState } from "react";
import { cx, fmtDate, minutes, percent, timeAgo, videoThumb } from "@/lib/format";
import { Avatar, Icon, Img, Spinner } from "@/components/ui";

/* ───────── Tiplər (API cavablarının ortaq hissəsi) ───────── */
export interface VideoLite {
  id: string;
  title: string;
  url: string;
  description: string | null;
  order?: number;
}
export interface VideoPackageLite {
  id: string;
  name: string;
  description?: string | null;
  videos: VideoLite[];
}
export interface AttemptLite {
  id: string;
  score: number | null;
  totalScore: number | null;
  finishedAt: string | null;
  startedAt: string;
}
export interface TestPackageLite {
  id: string;
  name: string;
  description?: string | null;
  isTimed: boolean;
  duration: number | null;
  allowRetry?: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
  _count: { questions: number };
  attempts?: AttemptLite[];
}
export interface PostLite {
  id: string;
  content: string;
  createdAt: string;
  visibility: "PUBLIC" | "GROUP";
  images: { id: string; url: string }[];
  teacher?: { id: string; name: string; photo: string | null };
  group?: { id: string; name: string };
}

export const ORDER_STATUS = {
  PENDING: { label: "Gözləyir", cls: "badge-warn" },
  APPROVED: { label: "Təsdiqləndi", cls: "badge-info" },
  DELIVERED: { label: "Təhvil verildi", cls: "badge-ok" },
  REJECTED: { label: "Rədd edildi", cls: "badge-bad" },
} as const;

/* ───────── Video ───────── */
export function VideoTile({ video, onPlay }: { video: VideoLite; onPlay: (v: VideoLite) => void }) {
  const thumb = videoThumb(video.url);
  return (
    <button
      onClick={() => onPlay(video)}
      className="group card-flat flex w-full gap-3 overflow-hidden p-2.5 text-left transition hover:border-brand/40"
    >
      <span className="relative aspect-video w-32 shrink-0 overflow-hidden rounded-xl bg-surface-2 sm:w-40">
        {thumb ? <Img src={thumb} className="h-full w-full object-cover" /> : null}
        <span className="absolute inset-0 flex items-center justify-center bg-black/25 opacity-80 transition group-hover:bg-black/40">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-brand">
            <Icon name="play" size={16} />
          </span>
        </span>
      </span>
      <span className="min-w-0 py-1">
        <span className="line-clamp-2 block font-semibold">{video.title}</span>
        {video.description && <span className="mt-1 line-clamp-2 block text-xs text-muted">{video.description}</span>}
      </span>
    </button>
  );
}

export function VideoPackageBlock({ pkg, onPlay }: { pkg: VideoPackageLite; onPlay: (v: VideoLite) => void }) {
  const [open, setOpen] = useState(true);
  return (
    <section className="card overflow-hidden">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-3 p-4 text-left">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand">
          <Icon name="video" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-bold">{pkg.name}</span>
          <span className="block text-xs text-muted">{pkg.videos.length} video{pkg.description ? ` · ${pkg.description}` : ""}</span>
        </span>
        <Icon name="down" className={cx("text-muted transition", open && "rotate-180")} />
      </button>
      {open && (
        <div className="grid gap-2 border-t border-line p-3 sm:grid-cols-2">
          {pkg.videos.length === 0 ? (
            <p className="p-3 text-sm text-muted">Bu paketdə hələ video yoxdur.</p>
          ) : (
            pkg.videos.map((v) => <VideoTile key={v.id} video={v} onPlay={onPlay} />)
          )}
        </div>
      )}
    </section>
  );
}

/* ───────── Test ───────── */
export function TestWindowBadge({ pkg }: { pkg: Pick<TestPackageLite, "startsAt" | "endsAt"> }) {
  const [now] = useState(() => Date.now());
  if (pkg.startsAt && new Date(pkg.startsAt).getTime() > now)
    return <span className="badge-info">{fmtDate(pkg.startsAt)} tarixində açılır</span>;
  if (pkg.endsAt && new Date(pkg.endsAt).getTime() < now) return <span className="badge-bad">Vaxtı bitib</span>;
  if (pkg.endsAt) return <span className="badge-warn">{fmtDate(pkg.endsAt)}-dək</span>;
  return null;
}

export function TestRow({
  pkg, onStart, busy, canStart = true,
}: { pkg: TestPackageLite; onStart: (p: TestPackageLite) => void; busy?: boolean; canStart?: boolean }) {
  const attempts = pkg.attempts ?? [];
  const finished = attempts.filter((a) => a.finishedAt);
  const inProgress = attempts.find((a) => !a.finishedAt);
  const best = finished.reduce<AttemptLite | null>(
    (b, a) => (!b || (a.score ?? 0) > (b.score ?? 0) ? a : b),
    null,
  );
  const [now] = useState(() => Date.now());
  const notOpen = !!pkg.startsAt && new Date(pkg.startsAt).getTime() > now;
  const closed = !!pkg.endsAt && new Date(pkg.endsAt).getTime() < now;
  const canRetry = finished.length > 0 && !inProgress && pkg.allowRetry;
  const disabled = !canStart || busy || notOpen || closed || (finished.length > 0 && !inProgress && !pkg.allowRetry);

  return (
    <div className="card-flat flex flex-wrap items-center gap-4 p-4">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
        <Icon name="file" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-bold">{pkg.name}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-muted">
          <span>{pkg._count.questions} sual</span>
          {pkg.isTimed && pkg.duration && (
            <span className="badge-muted"><Icon name="clock" size={12} /> {minutes(pkg.duration)} dəq</span>
          )}
          {pkg.allowRetry && <span className="badge-muted"><Icon name="retry" size={12} /> Təkrar olar</span>}
          <TestWindowBadge pkg={pkg} />
        </div>
      </div>
      <div className="flex items-center gap-3">
        {best && (
          <span className="badge-ok">
            <Icon name="award" size={13} /> {best.score}/{best.totalScore} · {percent(best.score, best.totalScore)}%
          </span>
        )}
        {finished.length > 0 && !inProgress && (
          <Link href={`/student/attempts/${finished[0].id}`} className="btn-ghost btn-sm">Nəticə</Link>
        )}
        <button className="btn-primary btn-sm" disabled={disabled} onClick={() => onStart(pkg)}>
          {busy ? <Spinner /> : <Icon name={canRetry ? "retry" : "play"} size={14} />}
          {inProgress ? "Davam et" : canRetry ? "Təkrar" : finished.length ? "Tamamlanıb" : "Başla"}
        </button>
      </div>
    </div>
  );
}

/* ───────── Paylaşım ───────── */
export function PostCard({
  post, onDelete, showGroup,
}: { post: PostLite; onDelete?: (p: PostLite) => void; showGroup?: boolean }) {
  return (
    <article className="card p-5">
      <header className="flex items-center gap-3">
        <Avatar src={post.teacher?.photo} name={post.teacher?.name ?? "Müəllim"} size={40} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold">{post.teacher?.name ?? "Müəllim"}</p>
          <p className="text-xs text-muted">
            {timeAgo(post.createdAt)}
            {showGroup && post.group ? ` · ${post.group.name}` : ""}
          </p>
        </div>
        <span className={post.visibility === "PUBLIC" ? "badge-info" : "badge-muted"}>
          <Icon name={post.visibility === "PUBLIC" ? "globe" : "lock"} size={12} />
          {post.visibility === "PUBLIC" ? "Açıq" : "Qrup"}
        </span>
        {onDelete && (
          <button className="btn-icon text-bad" onClick={() => onDelete(post)} aria-label="Sil">
            <Icon name="trash" size={17} />
          </button>
        )}
      </header>
      <p className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed">{post.content}</p>
      {post.images.length > 0 && (
        <div className={cx("mt-3 grid gap-2", post.images.length > 1 && "grid-cols-2")}>
          {post.images.map((im) => (
            <a key={im.id} href={im.url} target="_blank" rel="noreferrer" className="overflow-hidden rounded-xl bg-surface-2">
              <Img src={im.url} className="max-h-96 w-full object-cover" />
            </a>
          ))}
        </div>
      )}
    </article>
  );
}
