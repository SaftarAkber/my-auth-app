"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, errMsg } from "@/lib/api";
import { cx, fmtDate, minutes, percent, timeAgo, videoThumb } from "@/lib/format";
import { Avatar, Icon, Img, Modal, Spinner, useToast } from "@/components/ui";
import { CommentThread } from "@/components/VideoComments";
import { useAuth } from "@/context/AuthContext";

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
  collectionId?: string | null;
  description?: string | null;
  isTimed: boolean;
  duration: number | null;
  allowRetry?: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
  _count: { questions: number };
  attempts?: AttemptLite[];
  /** Sual bankı: hər dəfə səviyyələr üzrə təsadüfi suallar */
  isBank?: boolean;
  isMonthly?: boolean;
  drawEasy?: number;
  drawMedium?: number;
  drawHard?: number;
  topicTests?: { topic: { id: string; title: string } }[];
}

export const perTest = (p: TestPackageLite) => (p.drawEasy ?? 0) + (p.drawMedium ?? 0) + (p.drawHard ?? 0);

/**
 * Sual bankı sətri: mövzu adı başlıqda, "Testə başla" (hər dəfə yeni suallar) və reytinq.
 */
export function BankRow({
  pkg, title, onStart, busy, canStart = true,
}: { pkg: TestPackageLite; title?: string; onStart: (p: TestPackageLite) => void; busy?: boolean; canStart?: boolean }) {
  const attempts = pkg.attempts ?? [];
  const finished = attempts.filter((a) => a.finishedAt);
  const inProgress = attempts.find((a) => !a.finishedAt);
  const last = [...finished].sort((a, b) => +new Date(b.finishedAt!) - +new Date(a.finishedAt!))[0];
  const [now] = useState(() => Date.now());
  const notOpen = !!pkg.startsAt && new Date(pkg.startsAt).getTime() > now;
  const closed = !!pkg.endsAt && new Date(pkg.endsAt).getTime() < now;

  return (
    <div className="card-flat flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
          <Icon name="book" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="break-words font-bold [overflow-wrap:anywhere]">{title ?? pkg.name}</p>
          {title && title !== pkg.name && <p className="break-words text-xs text-muted [overflow-wrap:anywhere]">{pkg.name}</p>}
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-muted">
            <span className="badge-brand"><Icon name="retry" size={12} /> Hər dəfə {perTest(pkg)} yeni sual</span>
            {pkg.isTimed && pkg.duration && <span className="badge-muted"><Icon name="clock" size={12} /> {minutes(pkg.duration)} dəq</span>}
            {finished.length > 0 && <span>{finished.length} dəfə işləmisiniz</span>}
            {last && <span>· son nəticə {last.score}/{last.totalScore}</span>}
            <TestWindowBadge pkg={pkg} />
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:shrink-0 sm:justify-end">
        <Link href={`/student/results/${pkg.id}`} className="btn-soft btn-sm"><Icon name="chart" size={14} /> Reytinq</Link>
        <button className="btn-primary btn-sm" disabled={!canStart || busy || notOpen || closed} onClick={() => onStart(pkg)}>
          {busy ? <Spinner /> : <Icon name="play" size={14} />}
          {inProgress ? "Davam et" : finished.length ? "Yenidən işlə" : "Testə başla"}
        </button>
      </div>
    </div>
  );
}

/** Bank paketlərini mövzular üzrə sıralayır: hər mövzu bir sətir (mövzusuz bank öz adı ilə) */
export function bankEntries(list: TestPackageLite[]) {
  const out: { key: string; title: string; pkg: TestPackageLite }[] = [];
  for (const p of list.filter((x) => x.isBank)) {
    const topics = p.topicTests?.map((t) => t.topic) ?? [];
    if (topics.length === 0) out.push({ key: p.id, title: p.name, pkg: p });
    for (const t of topics) out.push({ key: `${t.id}:${p.id}`, title: t.title, pkg: p });
  }
  return out.sort((a, b) => a.title.localeCompare(b.title, "az"));
}
export interface PostLite {
  id: string;
  content: string;
  createdAt: string;
  visibility: "PUBLIC" | "GROUP";
  images: { id: string; url: string }[];
  teacher?: { id: string; name: string; photo: string | null };
  group?: { id: string; name: string };
  /** Bir neçə qrupa birlikdə göndərilibsə: bütün (baxana görünən) qruplar */
  groups?: { id: string; name: string }[];
  /** Kartda birləşmiş bütün sətirlərin ID-ləri (bildirişdən gələn keçid üçün) */
  ids?: string[];
}

export const ORDER_STATUS = {
  PENDING: { label: "Gözləyir", cls: "badge-warn" },
  APPROVED: { label: "Təsdiqləndi", cls: "badge-info" },
  DELIVERED: { label: "Təhvil verildi", cls: "badge-ok" },
  REJECTED: { label: "Rədd edildi", cls: "badge-bad" },
} as const;

/* ───────── Video ───────── */
/** Video miniatürü: YouTube/Cloudinary şəkli, yoxdursa rəngli fon; üstündə oynat işarəsi */
export function VideoThumb({
  url, className, plain, badge,
}: { url: string; className?: string; plain?: boolean; badge?: string | null }) {
  const thumb = videoThumb(url);
  return (
    <span className={cx("group/thumb relative block aspect-video overflow-hidden bg-ink/90", className)}>
      {thumb ? <Img src={thumb} className="h-full w-full object-cover" /> : <span className="absolute inset-0 bg-gradient-to-br from-iris/60 to-tint" />}
      {!plain && (
        <span className="absolute inset-0 flex items-center justify-center bg-black/20 transition group-hover/thumb:bg-black/35">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-brand">
            <Icon name="play" size={16} />
          </span>
        </span>
      )}
      {badge && (
        <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1.5 py-0.5 text-[11px] font-bold leading-none text-white">{badge}</span>
      )}
    </span>
  );
}

/** Video kartı: yeni "baxış" səhifəsinə aparır */
export function VideoTile({ video }: { video: VideoLite; onPlay?: (v: VideoLite) => void }) {
  return (
    <Link
      href={`/watch/${video.id}`}
      className="group card-flat flex w-full gap-3 overflow-hidden p-2.5 text-left transition hover:border-brand/40"
    >
      <VideoThumb url={video.url} className="w-32 shrink-0 rounded-xl sm:w-40" />
      <span className="min-w-0 py-1">
        <span className="line-clamp-2 block font-semibold">{video.title}</span>
        {video.description && <span className="mt-1 line-clamp-2 block text-xs text-muted">{video.description}</span>}
      </span>
    </Link>
  );
}

export function VideoPackageBlock({ pkg }: { pkg: VideoPackageLite; onPlay?: (v: VideoLite) => void }) {
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
            pkg.videos.map((v) => <VideoTile key={v.id} video={v} />)
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
  if (pkg.isBank) return <BankRow pkg={pkg} onStart={onStart} busy={busy} canStart={canStart} />;
  return <PlainTestRow pkg={pkg} onStart={onStart} busy={busy} canStart={canStart} />;
}

function PlainTestRow({
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
/* ───────── Paylaşım bəyənmələri ───────── */
type LikeState = { n: number; liked: boolean; c?: number };
/** Eyni anda görünən kartların bəyənmə sayları bir sorğuda yığılır */
const likeQueue = new Map<string, ((s: LikeState) => void)[]>();
let likeTimer: ReturnType<typeof setTimeout> | null = null;
function loadLikes(id: string, cb: (s: LikeState) => void) {
  likeQueue.set(id, [...(likeQueue.get(id) ?? []), cb]);
  if (likeTimer) return;
  likeTimer = setTimeout(async () => {
    const batch = new Map(likeQueue);
    likeQueue.clear();
    likeTimer = null;
    const ids = [...batch.keys()];
    for (let i = 0; i < ids.length; i += 50) {
      const part = ids.slice(i, i + 50);
      try {
        const r = await api<{ likes: Record<string, LikeState> }>(`/api/posts/likes?ids=${part.join(",")}`);
        for (const pid of part) for (const f of batch.get(pid) ?? []) f(r.likes[pid] ?? { n: 0, liked: false, c: 0 });
      } catch { /* sayğac görünməsin, kart işləsin */ }
    }
  }, 30);
}

/** "Aysel Məmmədova" → "Aysel M." */
export const shortName = (name: string) => {
  const p = name.trim().split(/\s+/);
  return p.length > 1 ? `${p[0]} ${p[1][0]?.toUpperCase()}.` : p[0] ?? "";
};

type Liker = { id: string; name: string; photo: string | null };

function PostLikes({ postId, ownerId }: { postId: string; ownerId: string }) {
  const toast = useToast();
  const [st, setSt] = useState<LikeState | null>(null);
  const [talk, setTalk] = useState(false);
  const [cn, setCn] = useState<number | null>(null);
  const onTotal = useCallback((t: number) => setCn(t), []);
  const [busy, setBusy] = useState(false);
  const [pop, setPop] = useState(false);
  const [all, setAll] = useState(false);
  const [users, setUsers] = useState<Liker[] | null>(null);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    loadLikes(postId, (s) => alive && setSt(s));
    return () => { alive = false; };
  }, [postId]);

  // Kiçik panel kənara klikləyəndə və ya Esc ilə bağlanır
  useEffect(() => {
    if (!pop) return;
    const out = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setPop(false); };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setPop(false);
    document.addEventListener("mousedown", out);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", out); document.removeEventListener("keydown", esc); };
  }, [pop]);

  async function fetchUsers() {
    setUsers(null);
    try {
      const r = await api<{ users: Liker[] }>(`/api/posts/${postId}/likes`);
      setUsers(r.users);
    } catch (e) {
      toast.error(errMsg(e));
      setPop(false);
    }
  }

  async function toggle() {
    setBusy(true);
    try {
      const r = await api<{ liked: boolean; likes: number }>(`/api/posts/${postId}/like`, { method: "POST" });
      setSt((o) => ({ ...o, n: r.likes, liked: r.liked }));
      if (pop) fetchUsers();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  const n = st?.n ?? 0;
  const comments = cn ?? st?.c ?? 0;
  return (
    <>
    <div ref={box} className="relative mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-line pt-3">
      <button
        type="button"
        onClick={toggle}
        disabled={busy || !st}
        aria-pressed={!!st?.liked}
        aria-label={st?.liked ? "Bəyənməni geri al" : "Bəyən"}
        title={st?.liked ? "Bəyənməni geri al" : "Bəyən"}
        className={cx(
          "-ml-1 inline-flex items-center p-1 transition active:scale-90",
          st?.liked ? "text-ok" : "text-ink hover:text-ok",
        )}
      >
        <Icon name="thumb" size={20} filled={!!st?.liked} />
      </button>
      <button
        type="button"
        onClick={() => { if (n === 0) return; const o = !pop; setPop(o); if (o) fetchUsers(); }}
        disabled={n === 0}
        aria-expanded={pop}
        aria-label={`${n} bəyənmə — kimlər bəyənib`}
        className={cx("-ml-2 min-w-[1.5rem] px-1 text-left text-sm tabular-nums", n > 0 ? "font-semibold text-ink hover:underline" : "text-muted")}
      >
        {n.toLocaleString("az-AZ")}
      </button>
      <button
        type="button"
        onClick={() => setTalk((v) => !v)}
        aria-controls={`comments-${postId}`}
        className={cx(
          "ml-auto inline-flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-semibold transition hover:bg-tint",
          talk ? "text-ink" : "text-muted",
        )}
      >
        <Icon name="message" size={16} /> {comments > 0 ? `${comments.toLocaleString("az-AZ")} şərh` : "Şərh yaz"}
      </button>

      {pop && (
        <div className="absolute left-0 top-full z-30 mt-2 w-[min(18rem,calc(100vw-3rem))] animate-slide-in rounded-lg border border-line bg-white p-3 text-sm shadow-soft">
          {users === null ? (
            <span className="flex items-center gap-2 text-muted"><Spinner /> Yüklənir…</span>
          ) : users.length === 0 ? (
            <span className="text-muted">Hələ bəyənən yoxdur</span>
          ) : (
            <>
              <p className="leading-relaxed">
                {users.slice(0, 3).map((u) => shortName(u.name)).join(", ")}
                {users.length > 3 && <span className="text-muted"> və daha {users.length - 3} nəfər</span>}
              </p>
              <button type="button" className="mt-2 text-sm font-semibold text-brand hover:underline" onClick={() => { setPop(false); setAll(true); }}>
                Daha çox bax
              </button>
            </>
          )}
        </div>
      )}

      <Modal open={all} onClose={() => setAll(false)} title={`Bəyənənlər (${users?.length ?? n})`} size="sm">
        {users === null ? (
          <div className="flex justify-center py-6"><Spinner /></div>
        ) : (
          <ul className="-mx-2 divide-y divide-line">
            {users.map((u) => (
              <li key={u.id}>
                <Link href={`/u/${u.id}`} className="flex items-center gap-3 rounded-md px-2 py-2.5 transition hover:bg-tint">
                  <Avatar src={u.photo} name={u.name} size={36} />
                  <span className="min-w-0 truncate text-sm font-semibold">{u.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Modal>
    </div>
    {talk && (
      <div id={`comments-${postId}`}>
        <CommentThread
          base={`/api/posts/${postId}/comments`}
          likeBase="/api/posts/comments"
          ownerId={ownerId}
          groupAccess={false}
          compact
          onTotal={onTotal}
        />
      </div>
    )}
    </>
  );
}

export function PostCard({
  post, onDelete, showGroup, highlight,
}: { post: PostLite; onDelete?: (p: PostLite) => void; showGroup?: boolean; highlight?: boolean }) {
  const { user } = useAuth();
  // Görünmə nişanı (Açıq / Qrup) yalnız müəllim və admin üçündür; tələbə görmür
  const showVisibility = !!user && user.role !== "STUDENT";
  const author = post.teacher?.id ? `/u/${post.teacher.id}` : null;
  return (
    <article id={`post-${post.id}`} data-post-ids={(post.ids ?? [post.id]).join(",")} className={cx("card relative scroll-mt-24 p-5 transition-shadow duration-700 [&:has([aria-expanded=true])]:z-30", highlight && "ring-2 ring-ok ring-offset-2")}>
      <header className="flex items-center gap-3">
        {author ? (
          <Link href={author} className="shrink-0" aria-label={post.teacher?.name ?? "Müəllim"}><Avatar src={post.teacher?.photo} name={post.teacher?.name ?? "Müəllim"} size={40} /></Link>
        ) : (
          <Avatar src={post.teacher?.photo} name={post.teacher?.name ?? "Müəllim"} size={40} />
        )}
        <div className="min-w-0 flex-1">
          {author ? (
            <Link href={author} className="block truncate text-sm font-bold hover:underline">{post.teacher?.name ?? "Müəllim"}</Link>
          ) : (
            <p className="truncate text-sm font-bold">{post.teacher?.name ?? "Müəllim"}</p>
          )}
          <p className="break-words text-xs text-muted [overflow-wrap:anywhere]">
            {timeAgo(post.createdAt)}
            {showGroup && (post.groups?.length || post.group) ? ` · ${post.groups?.length ? post.groups.map((g) => g.name).join(", ") : post.group!.name}` : ""}
          </p>
        </div>
        {showVisibility && (
          <span className={post.visibility === "PUBLIC" ? "badge-info" : "badge-muted"}>
            <Icon name={post.visibility === "PUBLIC" ? "globe" : "lock"} size={12} />
            {post.visibility === "PUBLIC" ? "Açıq" : "Qrup"}
          </span>
        )}
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
      <PostLikes postId={post.id} ownerId={post.teacher?.id ?? ""} />
    </article>
  );
}
