"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, errMsg, useFetch } from "@/lib/api";
import { useTestRunner } from "@/components/TestTaker";
import {
  BankRow, PostCard, TestRow, VideoPackageBlock, bankEntries,
  type PostLite, type TestPackageLite, type VideoPackageLite,
} from "@/components/content";
import MonthlyTable from "@/components/MonthlyTable";
import {
  Avatar, Empty, ErrorBox, Icon, SkeletonList, FolderTabs, useConfirm, useToast,
} from "@/components/ui";
import GroupHeader from "@/components/GroupHeader";
import TopicList from "@/components/topics/TopicList";

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
  const [tab, setTab] = useState<"feed" | "topics" | "tests" | "monthly" | "videos" | "members">("feed");
  const { begin: run, starting, node } = useTestRunner(() => reload());
  const begin = (p: TestPackageLite) => run(p);

  // Bildirişdən gələn keçid: ?tab=tests&pkg=<id> – Testlər sekməsi açılır və paket görünənə qədər sürüşdürülür (test başlamır)
  const [lit, setLit] = useState<string | null>(null);
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const t = q.get("tab");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (t === "tests" || t === "topics" || t === "videos" || t === "feed") setTab(t);
  }, []);
  useEffect(() => {
    if (!g) return;
    const pkg = new URLSearchParams(window.location.search).get("pkg");
    if (!pkg) return;
    const t = setTimeout(() => {
      document.getElementById(`pkg-${pkg}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      setLit(pkg);
      setTimeout(() => setLit(null), 2200);
    }, 150);
    return () => clearTimeout(t);
  }, [g]);

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
      <div className="page !pb-0">
        <GroupHeader
          group={g}
          members={g._count.members}
          back={{ href: "/student/teacher", label: "Qruplar" }}
          teacher={g.teacher}
          badges={!g.hasAccess ? <span className="badge-warn"><Icon name="lock" size={12} /> Üzv deyilsiniz, yalnız açıq məzmun görünür</span> : undefined}
          actions={g.isMember ? <button className="btn-secondary btn-sm" onClick={leave}><Icon name="logout" size={14} /> Qrupdan çıx</button> : undefined}
        />
      </div>

      <div className="page !pt-0">
        {!g.hasAccess && (
          <div className="card mt-6 flex flex-wrap items-center justify-between gap-3 border-brand/30 bg-brand/5 p-5">
            <p className="text-sm font-medium">
              {g.enrollmentStatus === "PENDING"
                ? "Müraciətiniz müəllimin cavabını gözləyir."
                : "Bütün məzmuna çıxış üçün qrupa qoşulun."}
            </p>
            {g.enrollmentStatus !== "PENDING" && (
              <Link href={`/u/${g.teacher.id}?tab=groups`} className="btn-primary btn-sm">Müraciət et</Link>
            )}
          </div>
        )}

        <div className="mt-8">
          <FolderTabs
            value={tab}
            onChange={setTab}
            tabs={[
              { id: "feed" as const, label: "Paylaşımlar", count: g.posts.length },
              // Üzv olmayan tələbə yalnız müəllimin hərkəsə açıq mövzularını görür
              { id: "topics" as const, label: "Mövzular" },
              { id: "tests", label: "Testlər", count: g.testPackages.length },
              ...(g.isMember && g.testPackages.some((p) => p.isMonthly) ? [{ id: "monthly" as const, label: "Aylıq sınaq" }] : []),
              { id: "videos", label: "Videolar", count: g.videoPackages.length },
              { id: "members", label: "Üzvlər", count: g.members.length },
            ]}
          >

          {tab === "feed" &&
            (g.posts.length === 0 ? (
              <Empty icon="message" title="Hələ paylaşım yoxdur" />
            ) : (
              <div className="mx-auto max-w-2xl space-y-4">
                {g.posts.map((p) => <PostCard key={p.id} post={p} />)}
              </div>
            ))}

          {tab === "topics" && <TopicList groupId={g.id} />}

          {tab === "tests" &&
            (g.testPackages.length === 0 ? (
              <Empty icon="file" title="Hələ test yoxdur" />
            ) : (
              <div className="space-y-6">
                {/* Mövzu testləri: hər mövzunun qarşısında "Testə başla" (hər dəfə yeni suallar) */}
                {bankEntries(g.testPackages).length > 0 && (
                  <section className="space-y-3">
                    <h2 className="text-base font-bold">Mövzu testləri</h2>
                    {bankEntries(g.testPackages).map((e) => (
                      <div key={e.key} id={`pkg-${e.pkg.id}`} className={`scroll-mt-24 rounded-2xl transition-shadow duration-700 ${lit === e.pkg.id ? "ring-2 ring-ok ring-offset-2" : ""}`}>
                        <BankRow pkg={e.pkg} title={e.title} onStart={begin} busy={starting === e.pkg.id} canStart={!g.isTeacher} />
                      </div>
                    ))}
                  </section>
                )}
                {g.testPackages.some((p) => !p.isBank) && (
                  <section className="space-y-3">
                    {g.testPackages.some((p) => p.isBank) && <h2 className="text-base font-bold">Testlər</h2>}
                    {g.testPackages.filter((p) => !p.isBank).map((p) => (
                      <div key={p.id} id={`pkg-${p.id}`} className={`scroll-mt-24 rounded-2xl transition-shadow duration-700 ${lit === p.id ? "ring-2 ring-ok ring-offset-2" : ""}`}>
                        <TestRow pkg={p} onStart={begin} busy={starting === p.id} canStart={!g.isTeacher} />
                      </div>
                    ))}
                  </section>
                )}
              </div>
            ))}

          {tab === "monthly" && <MonthlyTable groupId={g.id} attemptBase="/student/attempts" />}

          {tab === "videos" &&
            (g.videoPackages.length === 0 ? (
              <Empty icon="video" title="Hələ video yoxdur" />
            ) : (
              <div className="space-y-4">
                {g.videoPackages.map((p) => <VideoPackageBlock key={p.id} pkg={p} />)}
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
          </FolderTabs>
        </div>
      </div>

      {node}
    </div>
  );
}
