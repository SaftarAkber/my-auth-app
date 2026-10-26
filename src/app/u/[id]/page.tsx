"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { api, errMsg, uploadImage, useFetch } from "@/lib/api";
import { cx, fmtDateTime, percent, timeAgo } from "@/lib/format";
import { ContactCard, PasswordCard, ProfileEditor } from "@/components/settings";
import { CoverArt } from "@/components/covers";
import { PostCard, VideoPackageBlock, type PostLite, type VideoLite } from "@/components/content";
import { VideoPlayer } from "@/components/video";
import {
  Avatar, Empty, ErrorBox, Field, Icon, Img, Modal, SkeletonList, Spinner, Tabs, useConfirm, useToast,
  type IconName,
} from "@/components/ui";

interface GroupCard {
  id: string;
  name: string;
  description: string | null;
  schedule: string | null;
  isActive?: boolean;
  members?: number;
  state?: "owner" | "member" | "pending" | "none";
  teacher?: { name: string };
  teacherId?: string;
}
interface TestCard {
  id: string;
  name: string;
  description: string | null;
  isPublished: boolean;
  isPublic: boolean;
  isTimed: boolean;
  duration: number | null;
  rewardEnabled: boolean;
  rewardMinCorrect: number | null;
  rewardCoins: number | null;
  _count: { questions: number };
  member: boolean;
}
interface Profile {
  user: { id: string; name: string; role: "STUDENT" | "TEACHER" | "ADMIN"; bio: string | null; photo: string | null; coverPhoto: string | null; createdAt: string };
  isOwn: boolean;
  stats: { students?: number; groups?: number; posts?: number; attempts?: number };
  groups: GroupCard[];
  posts: (PostLite & { group: { id: string; name: string } })[];
  hiddenPosts: number;
  tests: TestCard[];
  videos: { id: string; name: string; description: string | null; isPublished: boolean; isPublic: boolean; videos: VideoLite[] }[];
}
interface Tx { id: string; amount: number; type: string; reason: string | null; createdAt: string }
interface Attempt { id: string; score: number | null; totalScore: number | null; finishedAt: string | null; package: { name: string } }

const TX_LABEL: Record<string, string> = {
  INITIAL_GRANT: "Başlanğıc bonus",
  TEST_CREATED: "Test yaradıldı",
  CORRECT_ANSWER: "Düzgün cavablar",
  RANK_REWARD: "Reytinq mükafatı",
  PURCHASE: "Alış-veriş",
  ADMIN_ADJUST: "Admin düzəlişi",
  GIFT_SENT: "Göndərilən hədiyyə",
  GIFT_RECEIVED: "Müəllimdən hədiyyə",
  TEST_REWARD: "Test mükafatı",
};

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="page"><SkeletonList rows={3} className="h-40" /></div>}>
      <ProfileInner />
    </Suspense>
  );
}

function ProfileInner() {
  const { id } = useParams<{ id: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const { user: me, logout } = useAuth();
  const toast = useToast();
  const { data, loading, error, reload } = useFetch<Profile>(`/api/users/${id}`);
  const [edit, setEdit] = useState(false);
  const [join, setJoin] = useState<GroupCard | null>(null);
  const [video, setVideo] = useState<VideoLite | null>(null);

  if (loading) return <div className="page"><SkeletonList rows={3} className="h-40" /></div>;
  if (error || !data) return <div className="page"><ErrorBox message={error ?? "Profil tapılmadı"} onRetry={reload} /></div>;

  const { user, isOwn } = data;
  const isTeacher = user.role === "TEACHER";
  const viewerStudent = me?.role === "STUDENT";

  const tabs: { id: string; label: string; count?: number }[] = isTeacher
    ? [
        { id: "posts", label: "Paylaşımlar", count: data.stats.posts },
        { id: "groups", label: "Qruplar", count: data.groups.length },
        { id: "tests", label: "Testlər", count: data.tests.length },
        { id: "videos", label: "Videolar", count: data.videos.length },
      ]
    : user.role === "STUDENT"
      ? [{ id: "groups", label: "Qruplar", count: data.groups.length }]
      : [];
  if (isOwn && me?.role === "STUDENT") tabs.push({ id: "results", label: "Nəticələr" });
  if (isOwn && me?.role !== "ADMIN") tabs.push({ id: "coins", label: "Coin tarixçəsi" });
  if (isOwn) tabs.push({ id: "settings", label: "Tənzimləmələr" });

  const wanted = search.get("tab");
  const tab = tabs.some((t) => t.id === wanted) ? (wanted as string) : tabs[0]?.id;
  const setTab = (t: string) => router.replace(`/u/${id}?tab=${t}`, { scroll: false });

  const quick: { href: string; icon: IconName; label: string }[] = !isOwn
    ? []
    : me?.role === "TEACHER"
      ? [
          { href: "/teacher/groups", icon: "users", label: "Qruplarım" },
          { href: "/teacher/tests", icon: "file", label: "Testlərim" },
          { href: "/teacher/lessons", icon: "video", label: "Videolarım" },
          { href: "/teacher/students", icon: "grad", label: "Tələbələrim" },
        ]
      : me?.role === "STUDENT"
        ? [
            { href: "/student/teacher", icon: "users", label: "Qruplarım" },
            { href: "/student/my-tests", icon: "file", label: "Testlərim" },
            { href: "/student/videos", icon: "video", label: "Videolarım" },
            { href: "/student/market", icon: "bag", label: "Mağaza" },
          ]
        : [];

  return (
    <div className="page space-y-6">
      <section className="card overflow-hidden">
        <div className="relative h-44 overflow-hidden border-b-[3px] border-ink bg-surface-2 sm:h-64">
          <CoverArt value={user.coverPhoto} seed={user.id} />
          {isOwn && me?.role !== "ADMIN" && (
            <button
              onClick={() => setEdit(true)}
              aria-label="Divar kağızını dəyiş"
              className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full border-[2.5px] border-ink bg-white shadow-hard transition hover:bg-sun"
            >
              <Icon name="image" size={18} />
            </button>
          )}
        </div>
        <div className="relative flow-root px-5 pb-6 sm:px-8">
          {isOwn && me?.role !== "ADMIN" && (
            <button
              onClick={() => setEdit(true)}
              aria-label="Profili redaktə et"
              className="absolute right-5 top-4 grid h-10 w-10 place-items-center rounded-full border-[2.5px] border-ink bg-white shadow-hard transition hover:bg-sun sm:right-8"
            >
              <Icon name="edit" size={17} />
            </button>
          )}
          <Avatar src={user.photo} name={user.name} size={132} className="-mt-[66px] border-4 border-ink bg-sun text-ink shadow-hard" />
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{user.name}</h1>
            <span className={user.role === "TEACHER" ? "badge-brand" : user.role === "ADMIN" ? "badge-bad" : "badge-warn"}>
              {user.role === "TEACHER" ? "Müəllim" : user.role === "ADMIN" ? "Admin" : "Tələbə"}
            </span>
          </div>
          {user.bio ? (
            <p className="mt-2 max-w-3xl whitespace-pre-wrap">{user.bio}</p>
          ) : isOwn && me?.role !== "ADMIN" ? (
            <p className="mt-2 text-muted">Haqqında bir şey yaz: qələmə bas.</p>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-x-8 gap-y-2">
            {isTeacher && (
              <>
                <Stat n={data.stats.students ?? 0} l="tələbə" />
                <Stat n={data.stats.groups ?? 0} l="qrup" />
                <Stat n={data.stats.posts ?? 0} l="paylaşım" />
              </>
            )}
            {user.role === "STUDENT" && (
              <>
                <Stat n={data.stats.groups ?? 0} l="qrup" />
                <Stat n={data.stats.attempts ?? 0} l="həll edilən test" />
              </>
            )}
            {isOwn && me?.role !== "ADMIN" && <Stat n={me?.coinBalance ?? 0} l="coin" />}
          </div>
        </div>
      </section>
      {edit && <ProfileEditor open withCover onClose={() => { setEdit(false); reload(); }} />}

      {quick.length > 0 && (
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {quick.map((q) => (
            <Link key={q.href} href={q.href} className="card flex items-center gap-3 p-3.5 transition hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-sun/25">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-ink bg-sun"><Icon name={q.icon} size={18} /></span>
              <span className="font-bold">{q.label}</span>
            </Link>
          ))}
        </section>
      )}

      {tabs.length > 0 && <Tabs tabs={tabs} value={tab} onChange={setTab} />}

      {tab === "posts" && <PostsTab data={data} isOwn={isOwn && me?.role === "TEACHER"} reload={reload} />}

      {tab === "groups" && (
        data.groups.length === 0 ? (
          <Empty icon="users" title="Qrup yoxdur" />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {data.groups.map((g) => (
              <article key={g.id} className="card flex flex-col gap-3 p-5">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-lg font-bold">{g.name}</h3>
                  {g.state === "member" && <span className="badge-ok">Qrupdasan</span>}
                  {g.state === "pending" && <span className="badge-warn">Gözlənilir</span>}
                  {g.isActive === false && <span className="badge-muted">Deaktiv</span>}
                </div>
                {g.description && <p className="text-sm text-muted">{g.description}</p>}
                <div className="flex flex-wrap gap-2">
                  {g.schedule && <span className="badge-brand"><Icon name="calendar" size={12} /> {g.schedule}</span>}
                  {g.members !== undefined && <span className="badge-muted"><Icon name="users" size={12} /> {g.members} üzv</span>}
                  {g.teacher && <span className="badge-muted">{g.teacher.name}</span>}
                </div>
                <div className="mt-auto flex justify-end pt-1">
                  {g.state === "owner" && me?.role === "TEACHER" && <Link href={`/teacher/groups/${g.id}`} className="btn-secondary btn-sm">İdarə et</Link>}
                  {g.state === "member" && <Link href={`/student/groups/${g.id}`} className="btn-primary btn-sm">Qrupa keç</Link>}
                  {g.state === "none" && viewerStudent && <button className="btn-primary btn-sm" onClick={() => setJoin(g)}>Müraciət et</button>}
                </div>
              </article>
            ))}
          </div>
        )
      )}

      {tab === "tests" && (
        data.tests.length === 0 ? (
          <Empty icon="file" title="Açıq test yoxdur" text="Müəllim testləri profilində açıq göstərəndə burada görünür." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {data.tests.map((t) => (
              <article key={t.id} className="card flex flex-col gap-3 p-5">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-bold">{t.name}</h3>
                  {isOwn && <span className={t.isPublished ? "badge-ok" : "badge-muted"}>{t.isPublished ? "Dərc olunub" : "Qaralama"}</span>}
                </div>
                {t.description && <p className="line-clamp-2 text-sm text-muted">{t.description}</p>}
                <div className="flex flex-wrap gap-2">
                  <span className="badge-brand">{t._count.questions} sual</span>
                  {t.isTimed && t.duration && <span className="badge-muted"><Icon name="clock" size={12} /> {Math.round(t.duration / 60)} dəq</span>}
                  {t.rewardEnabled && t.rewardCoins && (
                    <span className="badge-warn"><Icon name="coin" size={12} /> {t.rewardMinCorrect}+ düz = {t.rewardCoins} coin</span>
                  )}
                </div>
                <div className="mt-auto flex justify-end pt-1">
                  {isOwn && me?.role === "TEACHER" ? (
                    <Link href="/teacher/tests" className="btn-secondary btn-sm">İdarə et</Link>
                  ) : t.member ? (
                    <Link href="/student/my-tests" className="btn-primary btn-sm">Testlərə keç</Link>
                  ) : (
                    <span className="badge-muted"><Icon name="lock" size={12} /> Qrup üzvləri üçün</span>
                  )}
                </div>
              </article>
            ))}
          </div>
        )
      )}

      {tab === "videos" && (
        data.videos.length === 0 ? (
          <Empty icon="video" title="Açıq video yoxdur" />
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {data.videos.map((p) => <VideoPackageBlock key={p.id} pkg={p} onPlay={setVideo} />)}
          </div>
        )
      )}
      <VideoPlayer video={video} onClose={() => setVideo(null)} />

      {tab === "results" && <ResultsTab />}
      {tab === "coins" && <CoinsTab />}
      {tab === "settings" && (
        <div className="grid max-w-3xl gap-5">
          <ContactCard />
          <PasswordCard />
          <section className="card flex items-center justify-between gap-4 p-5 sm:p-6">
            <div>
              <h2 className="text-lg font-bold">Hesabdan çıxış</h2>
              <p className="text-sm text-muted">Bu cihazda sessiyanı bitirin.</p>
            </div>
            <button className="btn-secondary" onClick={logout}><Icon name="logout" size={16} /> Çıxış</button>
          </section>
        </div>
      )}

      <JoinModal group={join} onClose={() => setJoin(null)} onDone={() => { setJoin(null); toast.success("Müraciət göndərildi"); reload(); }} />
    </div>
  );
}

function Stat({ n, l }: { n: number; l: string }) {
  return (
    <span className="flex items-baseline gap-1.5">
      <b className="text-xl font-extrabold tabular-nums">{n.toLocaleString("az-AZ")}</b>
      <span className="text-muted">{l}</span>
    </span>
  );
}

function JoinModal({ group, onClose, onDone }: { group: GroupCard | null; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function send() {
    if (!group) return;
    setBusy(true);
    try {
      await api("/api/enrollment/request", { body: { groupId: group.id, message } });
      setMessage("");
      onDone();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={!!group}
      onClose={onClose}
      title={`“${group?.name ?? ""}” qrupuna müraciət`}
      size="sm"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>Ləğv et</button>
          <button className="btn-primary" onClick={send} disabled={busy}>{busy ? <Spinner /> : "Göndər"}</button>
        </>
      }
    >
      <Field label="Müəllimə mesaj (istəyə bağlı)">
        <textarea className="input min-h-24" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Müəllimə bir şey yazmaq istəyirsinizsə…" />
      </Field>
    </Modal>
  );
}

/* ───── Paylaşımlar: müəllimin öz profilində yazma sahəsi var ───── */
function PostsTab({ data, isOwn, reload }: { data: Profile; isOwn: boolean; reload: () => void }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [groupId, setGroupId] = useState("");
  const [content, setContent] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [isPublic, setIsPublic] = useState(true);
  const [posting, setPosting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const groups = data.groups;
  const target = groupId || groups[0]?.id || "";

  async function pickImages(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    try {
      const urls = await Promise.all([...files].slice(0, 4 - images.length).map(uploadImage));
      setImages((p) => [...p, ...urls].slice(0, 4));
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function publish() {
    if (!target) return toast.error("Əvvəlcə qrup yaradın");
    if (!content.trim()) return;
    setPosting(true);
    try {
      await api(`/api/groups/${target}/posts`, { body: { content, images, visibility: isPublic ? "PUBLIC" : "GROUP" } });
      setContent("");
      setImages([]);
      toast.success("Paylaşıldı");
      reload();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setPosting(false);
    }
  }

  async function removePost(p: PostLite & { group: { id: string } }) {
    if (!(await confirm({ title: "Paylaşım silinsin?", confirmText: "Sil", danger: true }))) return;
    try {
      await api(`/api/groups/${p.group.id}/posts?postId=${p.id}`, { method: "DELETE" });
      reload();
    } catch (e) {
      toast.error(errMsg(e));
    }
  }

  return (
    <div className="grid max-w-4xl gap-4">
      {isOwn && (
        <div className="card p-4">
          <textarea className="input min-h-24" placeholder="Tələbələrə nəsə paylaşın…" value={content} onChange={(e) => setContent(e.target.value)} />
          {images.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {images.map((u) => (
                <span key={u} className="relative h-20 w-20 overflow-hidden rounded-xl border-2 border-ink">
                  <Img src={u} className="h-full w-full object-cover" />
                  <button onClick={() => setImages((p) => p.filter((x) => x !== u))} className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-ink text-white" aria-label="Şəkli sil">
                    <Icon name="x" size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <select className="input !w-auto !py-1.5 text-xs" value={target} onChange={(e) => setGroupId(e.target.value)} aria-label="Qrup">
              {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
            <button className="btn-ghost btn-sm" onClick={() => fileRef.current?.click()} disabled={uploading || images.length >= 4} aria-label="Şəkil əlavə et">
              {uploading ? <Spinner /> : <Icon name="image" size={16} />}
            </button>
            <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => pickImages(e.target.files)} />
            <button type="button" onClick={() => setIsPublic((v) => !v)} className={cx("btn-secondary btn-sm", isPublic && "!bg-iris/30")}>
              <Icon name={isPublic ? "globe" : "lock"} size={14} /> {isPublic ? "Hamıya açıq" : "Yalnız qrup"}
            </button>
            <button className="btn-primary btn-sm ml-auto" onClick={publish} disabled={posting || !content.trim() || !target}>
              {posting ? <Spinner /> : <Icon name="send" size={14} />} Paylaş
            </button>
          </div>
        </div>
      )}

      {data.posts.length === 0 ? (
        <Empty icon="message" title="Hələ paylaşım yoxdur" />
      ) : (
        data.posts.map((p) => (
          <PostCard key={p.id} post={{ ...p, teacher: { id: data.user.id, name: data.user.name, photo: data.user.photo } }} showGroup onDelete={isOwn ? () => removePost(p) : undefined} />
        ))
      )}

      {data.hiddenPosts > 0 && (
        <div className="card-flat flex items-center gap-3 border-dashed bg-sun/30 p-4 text-sm font-semibold">
          <Icon name="lock" size={18} /> {data.hiddenPosts} paylaşım yalnız qrup üzvlərinə görünür.
        </div>
      )}
    </div>
  );
}

function ResultsTab() {
  const attempts = useFetch<Attempt[]>("/api/attempts");
  const done = (attempts.data ?? []).filter((a) => a.finishedAt);
  if (attempts.loading) return <SkeletonList />;
  if (done.length === 0) return <Empty icon="file" title="Hələ tamamlanmış test yoxdur" />;
  return (
    <div className="card max-w-3xl divide-y-2 divide-line overflow-hidden">
      {done.map((a) => {
        const p = percent(a.score, a.totalScore);
        return (
          <Link key={a.id} href={`/student/attempts/${a.id}`} className="row-link">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{a.package.name}</p>
              <p className="text-xs text-muted">{fmtDateTime(a.finishedAt)}</p>
            </div>
            <span className="text-sm text-muted">{a.score}/{a.totalScore}</span>
            <span className={p >= 70 ? "badge-ok" : p >= 40 ? "badge-warn" : "badge-bad"}>{p}%</span>
          </Link>
        );
      })}
    </div>
  );
}

function CoinsTab() {
  const coins = useFetch<{ balance: number; transactions: Tx[] }>("/api/coins");
  if (coins.loading) return <SkeletonList />;
  const list = coins.data?.transactions ?? [];
  if (list.length === 0) {
    return <Empty icon="coin" title="Hələ coin əməliyyatı yoxdur" text="Coin müəllimlərdən hədiyyə və ya test mükafatı kimi gəlir." />;
  }
  return (
    <div className="card max-w-3xl divide-y-2 divide-line overflow-hidden">
      {list.map((t) => (
        <div key={t.id} className="flex items-center gap-3 px-4 py-3">
          <span className={cx("grid h-9 w-9 place-items-center rounded-full border-2 border-ink", t.amount > 0 ? "bg-ok/25" : "bg-flame/30")}>
            <Icon name={t.amount > 0 ? "plus" : "coin"} size={16} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{TX_LABEL[t.type] ?? t.type}</p>
            <p className="truncate text-xs text-muted">{t.reason ?? "—"} · {timeAgo(t.createdAt)}</p>
          </div>
          <span className={cx("font-extrabold tabular-nums", t.amount > 0 ? "text-ok" : "text-bad")}>{t.amount > 0 ? "+" : ""}{t.amount}</span>
        </div>
      ))}
    </div>
  );
}
