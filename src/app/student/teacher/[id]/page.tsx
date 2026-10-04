"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { api, errMsg, useFetch } from "@/lib/api";
import { minutes } from "@/lib/format";
import TestTaker, { useStartTest, type AttemptStart } from "@/components/TestTaker";
import { PostCard, type PostLite } from "@/components/content";
import {
  Avatar, Empty, ErrorBox, Icon, Img, Modal, SkeletonList, Spinner, StatCard, Tabs, useToast,
} from "@/components/ui";

interface GroupItem {
  id: string;
  name: string;
  description: string | null;
  schedule: string | null;
  photo: string | null;
  coverPhoto: string | null;
  _count: { members: number };
  testPackages: { id: string }[];
  videoPackages: { id: string }[];
}
interface Profile {
  teacher: { id: string; name: string; bio: string | null; photo: string | null; coverPhoto: string | null };
  stats: { groups: number; students: number; tests: number; videos: number };
  groups: GroupItem[];
  myEnrollments: { id: string; status: "PENDING" | "ACCEPTED" | "DECLINED"; groupId: string }[];
  memberGroupIds: string[];
  publicTestPackages: { id: string; name: string; isTimed: boolean; duration: number | null; _count: { questions: number } }[];
  publicVideoPackages: { id: string; name: string; _count: { videos: number } }[];
  publicPosts: (PostLite & { group: { id: string; name: string } })[];
}

export default function TeacherProfilePage() {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const { data, loading, error, reload } = useFetch<Profile>(`/api/teacher/${id}/profile`);
  const [tab, setTab] = useState<"groups" | "public" | "posts">("groups");
  const [joining, setJoining] = useState<GroupItem | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const { start, starting } = useStartTest();
  const [taking, setTaking] = useState<{ name: string; data: AttemptStart } | null>(null);

  async function sendRequest() {
    if (!joining) return;
    setBusy(true);
    try {
      await api("/api/enrollment/request", { body: { groupId: joining.id, message: message.trim() || undefined } });
      toast.success("Müraciət göndərildi");
      setJoining(null);
      setMessage("");
      reload();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="page"><SkeletonList rows={3} className="h-40" /></div>;
  if (error || !data) return <div className="page"><ErrorBox message={error ?? "Tapılmadı"} onRetry={reload} /></div>;

  const { teacher, stats } = data;
  const statusOf = (gid: string) => data.myEnrollments.find((e) => e.groupId === gid)?.status;

  return (
    <div className="pb-8">
      <div className="relative h-40 bg-gradient-to-br from-brand/80 to-brand/30 sm:h-56">
        {teacher.coverPhoto && <Img src={teacher.coverPhoto} className="h-full w-full object-cover" />}
      </div>

      <div className="page !pt-0">
        <div className="-mt-12 flex flex-wrap items-end gap-4 sm:-mt-14">
          <Avatar src={teacher.photo} name={teacher.name} size={104} className="border-4 border-bg shadow-soft" />
          <div className="pb-1">
            <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{teacher.name}</h1>
            <Link href="/student/teacher" className="text-sm font-medium text-muted hover:text-ink">← Bütün müəllimlər</Link>
          </div>
        </div>
        {teacher.bio && <p className="mt-4 max-w-3xl whitespace-pre-wrap text-muted">{teacher.bio}</p>}

        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Qrup" value={stats.groups} icon="users" />
          <StatCard label="Tələbə" value={stats.students} icon="grad" tone="ok" />
          <StatCard label="Test" value={stats.tests} icon="file" tone="info" />
          <StatCard label="Video" value={stats.videos} icon="video" tone="warn" />
        </div>

        <div className="mt-8">
          <Tabs
            value={tab}
            onChange={setTab}
            tabs={[
              { id: "groups", label: "Qruplar", count: data.groups.length },
              { id: "public", label: "Açıq məzmun", count: data.publicTestPackages.length + data.publicVideoPackages.length },
              { id: "posts", label: "Paylaşımlar", count: data.publicPosts.length },
            ]}
          />

          {tab === "groups" &&
            (data.groups.length === 0 ? (
              <Empty icon="users" title="Aktiv qrup yoxdur" />
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {data.groups.map((g) => {
                  const member = data.memberGroupIds.includes(g.id);
                  const st = statusOf(g.id);
                  return (
                    <article key={g.id} className="card overflow-hidden">
                      <div className="h-20 bg-gradient-to-br from-brand/30 to-brand/10">
                        {g.coverPhoto && <Img src={g.coverPhoto} className="h-full w-full object-cover" />}
                      </div>
                      <div className="p-5">
                        <h3 className="text-lg font-bold">{g.name}</h3>
                        {g.description && <p className="mt-1 line-clamp-2 text-sm text-muted">{g.description}</p>}
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          <span className="badge-muted"><Icon name="users" size={12} /> {g._count.members} üzv</span>
                          <span className="badge-muted"><Icon name="file" size={12} /> {g.testPackages.length} test</span>
                          <span className="badge-muted"><Icon name="video" size={12} /> {g.videoPackages.length} paket</span>
                          {g.schedule && <span className="badge-muted"><Icon name="calendar" size={12} /> {g.schedule}</span>}
                        </div>
                        <div className="mt-4">
                          {member ? (
                            <Link href={`/student/groups/${g.id}`} className="btn-primary w-full">Qrupa keç</Link>
                          ) : st === "PENDING" ? (
                            <span className="badge-warn !px-4 !py-2">Müraciət gözləyir…</span>
                          ) : (
                            <button className="btn-soft w-full" onClick={() => setJoining(g)}>
                              {st === "DECLINED" ? "Yenidən müraciət et" : "Qrupa qoşul"}
                            </button>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            ))}

          {tab === "public" && (
            <div className="space-y-6">
              <div>
                <h3 className="mb-3 font-bold">Açıq testlər</h3>
                {data.publicTestPackages.length === 0 ? (
                  <p className="text-sm text-muted">Açıq test yoxdur.</p>
                ) : (
                  <div className="space-y-3">
                    {data.publicTestPackages.map((t) => (
                      <div key={t.id} className="card-flat flex items-center gap-4 p-4">
                        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand/10 text-brand"><Icon name="file" /></span>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold">{t.name}</p>
                          <p className="text-xs text-muted">
                            {t._count.questions} sual{t.isTimed && t.duration ? ` · ${minutes(t.duration)} dəq` : ""}
                          </p>
                        </div>
                        <button
                          className="btn-primary btn-sm"
                          disabled={starting === t.id}
                          onClick={async () => {
                            const d = await start(t.id);
                            if (d) setTaking({ name: t.name, data: d });
                          }}
                        >
                          {starting === t.id ? <Spinner /> : <Icon name="play" size={14} />} Başla
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <h3 className="mb-3 font-bold">Açıq video paketlər</h3>
                {data.publicVideoPackages.length === 0 ? (
                  <p className="text-sm text-muted">Açıq video paketi yoxdur.</p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {data.publicVideoPackages.map((p) => (
                      <div key={p.id} className="card-flat flex items-center gap-3 p-4">
                        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-warn/10 text-warn"><Icon name="video" /></span>
                        <div>
                          <p className="font-bold">{p.name}</p>
                          <p className="text-xs text-muted">{p._count.videos} video</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === "posts" &&
            (data.publicPosts.length === 0 ? (
              <Empty icon="message" title="Açıq paylaşım yoxdur" />
            ) : (
              <div className="mx-auto max-w-2xl space-y-4">
                {data.publicPosts.map((p) => (
                  <PostCard key={p.id} post={{ ...p, teacher: { id: teacher.id, name: teacher.name, photo: teacher.photo } }} showGroup />
                ))}
              </div>
            ))}
        </div>
      </div>

      <Modal
        open={!!joining}
        onClose={() => setJoining(null)}
        title={`“${joining?.name}” qrupuna müraciət`}
        footer={
          <>
            <button className="btn-secondary" onClick={() => setJoining(null)}>Ləğv et</button>
            <button className="btn-primary" onClick={sendRequest} disabled={busy}>{busy ? <Spinner /> : "Göndər"}</button>
          </>
        }
      >
        <label className="block">
          <span className="label">Müəllimə mesaj (istəyə bağlı)</span>
          <textarea
            className="input min-h-28"
            placeholder="Özünüz haqqında qısa məlumat yazın…"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={500}
          />
        </label>
      </Modal>

      {taking && <TestTaker name={taking.name} data={taking.data} onClose={() => { setTaking(null); reload(); }} />}
    </div>
  );
}
