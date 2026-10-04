"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { api, errMsg, useFetch } from "@/lib/api";
import TestTaker, { useStartTest, type AttemptStart } from "@/components/TestTaker";
import {
  PostCard, TestRow, VideoPackageBlock,
  type PostLite, type TestPackageLite, type VideoLite, type VideoPackageLite,
} from "@/components/content";
import {
  Avatar, Empty, ErrorBox, Icon, Img, SkeletonList, Tabs, useConfirm, useToast,
} from "@/components/ui";
import { VideoPlayer } from "@/components/video";

interface GroupData {
  id: string;
  name: string;
  description: string | null;
  schedule: string | null;
  photo: string | null;
  coverPhoto: string | null;
  teacher: { id: string; name: string; photo: string | null; bio: string | null };
  members: { id: string; studentId: string; student: { id: string; name: string; photo: string | null } }[];
  posts: PostLite[];
  videoPackages: VideoPackageLite[];
  testPackages: TestPackageLite[];
  _count: { members: number };
  isMember: boolean;
  isTeacher: boolean;
  hasAccess: boolean;
  enrollmentStatus: "PENDING" | "ACCEPTED" | "DECLINED" | null;
}

export default function StudentGroupPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const { data: g, loading, error, reload } = useFetch<GroupData>(`/api/groups/${id}`);
  const [tab, setTab] = useState<"feed" | "tests" | "videos" | "members">("feed");
  const [video, setVideo] = useState<VideoLite | null>(null);
  const { start, starting } = useStartTest();
  const [taking, setTaking] = useState<{ name: string; data: AttemptStart } | null>(null);

  async function begin(p: TestPackageLite) {
    const d = await start(p.id);
    if (d) setTaking({ name: p.name, data: d });
  }

  async function leave() {
    const ok = await confirm({
      title: "Qrupdan çıxmaq istəyirsiniz?",
      message: "Yenidən qoşulmaq üçün müəllimə müraciət göndərməli olacaqsınız.",
      confirmText: "Çıx",
      danger: true,
    });
    if (!ok) return;
    try {
      await api(`/api/groups/${id}/members`, { method: "DELETE" });
      toast.success("Qrupdan çıxdınız");
      router.replace("/student");
    } catch (e) {
      toast.error(errMsg(e));
    }
  }

  if (loading) return <div className="page"><SkeletonList rows={3} className="h-40" /></div>;
  if (error || !g) return <div className="page"><ErrorBox message={error ?? "Qrup tapılmadı"} onRetry={reload} /></div>;

  return (
    <div className="pb-8">
      <div className="relative h-36 bg-gradient-to-br from-brand/80 to-brand/30 sm:h-52">
        {g.coverPhoto && <Img src={g.coverPhoto} className="h-full w-full object-cover" />}
      </div>

      <div className="page !pt-0">
        <div className="-mt-10 flex flex-wrap items-end justify-between gap-4">
          <div className="flex items-end gap-4">
            <span className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-3xl border-4 border-bg bg-surface text-brand shadow-soft">
              {g.photo ? <Img src={g.photo} className="h-full w-full object-cover" /> : <Icon name="users" size={36} />}
            </span>
            <div className="pb-1">
              <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{g.name}</h1>
              <Link href={`/student/teacher/${g.teacher.id}`} className="mt-0.5 inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-ink">
                <Avatar src={g.teacher.photo} name={g.teacher.name} size={20} /> {g.teacher.name}
              </Link>
            </div>
          </div>
          {g.isMember && (
            <button className="btn-secondary btn-sm" onClick={leave}><Icon name="logout" size={14} /> Qrupdan çıx</button>
          )}
        </div>

        {g.description && <p className="mt-4 max-w-3xl whitespace-pre-wrap text-muted">{g.description}</p>}
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="badge-muted"><Icon name="users" size={12} /> {g._count.members} üzv</span>
          {g.schedule && <span className="badge-muted"><Icon name="calendar" size={12} /> {g.schedule}</span>}
          {!g.hasAccess && <span className="badge-warn"><Icon name="lock" size={12} /> Üzv deyilsiniz — yalnız açıq məzmun görünür</span>}
        </div>

        {!g.hasAccess && (
          <div className="card mt-6 flex flex-wrap items-center justify-between gap-3 border-brand/30 bg-brand/5 p-5">
            <p className="text-sm font-medium">
              {g.enrollmentStatus === "PENDING"
                ? "Müraciətiniz müəllimin cavabını gözləyir."
                : "Bütün məzmuna çıxış üçün qrupa qoşulun."}
            </p>
            {g.enrollmentStatus !== "PENDING" && (
              <Link href={`/student/teacher/${g.teacher.id}`} className="btn-primary btn-sm">Müraciət et</Link>
            )}
          </div>
        )}

        <div className="mt-8">
          <Tabs
            value={tab}
            onChange={setTab}
            tabs={[
              { id: "feed", label: "Lent", count: g.posts.length },
              { id: "tests", label: "Testlər", count: g.testPackages.length },
              { id: "videos", label: "Videolar", count: g.videoPackages.length },
              { id: "members", label: "Üzvlər", count: g.members.length },
            ]}
          />

          {tab === "feed" &&
            (g.posts.length === 0 ? (
              <Empty icon="message" title="Hələ paylaşım yoxdur" />
            ) : (
              <div className="mx-auto max-w-2xl space-y-4">
                {g.posts.map((p) => <PostCard key={p.id} post={p} />)}
              </div>
            ))}

          {tab === "tests" &&
            (g.testPackages.length === 0 ? (
              <Empty icon="file" title="Hələ test yoxdur" />
            ) : (
              <div className="space-y-3">
                {g.testPackages.map((p) => (
                  <TestRow key={p.id} pkg={p} onStart={begin} busy={starting === p.id} canStart={!g.isTeacher} />
                ))}
              </div>
            ))}

          {tab === "videos" &&
            (g.videoPackages.length === 0 ? (
              <Empty icon="video" title="Hələ video yoxdur" />
            ) : (
              <div className="space-y-4">
                {g.videoPackages.map((p) => <VideoPackageBlock key={p.id} pkg={p} onPlay={setVideo} />)}
              </div>
            ))}

          {tab === "members" &&
            (g.members.length === 0 ? (
              <Empty icon="users" title={g.hasAccess ? "Hələ üzv yoxdur" : "Üzvlər yalnız qrup üzvlərinə görünür"} />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {g.members.map((m) => (
                  <div key={m.id} className="card-flat flex items-center gap-3 p-3.5">
                    <Avatar src={m.student.photo} name={m.student.name} size={40} />
                    <span className="truncate font-semibold">{m.student.name}</span>
                  </div>
                ))}
              </div>
            ))}
        </div>
      </div>

      <VideoPlayer video={video} onClose={() => setVideo(null)} />
      {taking && <TestTaker name={taking.name} data={taking.data} onClose={() => { setTaking(null); reload(); }} />}
    </div>
  );
}
