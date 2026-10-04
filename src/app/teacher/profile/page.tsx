"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { api, errMsg, uploadImage, useFetch } from "@/lib/api";
import { cx } from "@/lib/format";
import { ProfileEditor } from "@/components/settings";
import { PostCard, type PostLite } from "@/components/content";
import {
  Avatar, Empty, Icon, Img, SkeletonList, Spinner, StatCard, useConfirm, useToast,
} from "@/components/ui";

interface Profile {
  stats: { groups: number; students: number; tests: number; videos: number };
  groups: { id: string; name: string; description: string | null; coverPhoto: string | null; _count: { members: number } }[];
  publicPosts: (PostLite & { group: { id: string; name: string } })[];
}

export default function TeacherProfilePage() {
  const { user } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const { data, loading, reload } = useFetch<Profile>(user ? `/api/teacher/${user.id}/profile` : null);
  const [edit, setEdit] = useState(false);

  const [groupId, setGroupId] = useState("");
  const [content, setContent] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [isPublic, setIsPublic] = useState(true);
  const [posting, setPosting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!user) return null;
  const groups = data?.groups ?? [];
  const targetGroup = groupId || groups[0]?.id || "";

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
    if (!targetGroup) return toast.error("Əvvəlcə qrup yaradın");
    if (!content.trim()) return;
    setPosting(true);
    try {
      await api(`/api/groups/${targetGroup}/posts`, { body: { content, images, visibility: isPublic ? "PUBLIC" : "GROUP" } });
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
    <div className="pb-8">
      <div className="relative h-40 bg-gradient-to-br from-brand/80 to-brand/30 sm:h-56">
        {user.coverPhoto && <Img src={user.coverPhoto} className="h-full w-full object-cover" />}
      </div>

      <div className="page !pt-0">
        <div className="-mt-12 flex flex-wrap items-end justify-between gap-4 sm:-mt-14">
          <div className="flex items-end gap-4">
            <Avatar src={user.photo} name={user.name} size={104} className="border-4 border-bg shadow-soft" />
            <div className="pb-1">
              <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{user.name}</h1>
              <p className="text-sm text-muted">Müəllim · tələbələr sizi belə görür</p>
            </div>
          </div>
          <button className="btn-secondary btn-sm" onClick={() => setEdit(true)}><Icon name="edit" size={14} /> Profili redaktə et</button>
        </div>
        <p className="mt-4 max-w-3xl whitespace-pre-wrap text-muted">{user.bio || "Haqqınızda qısa məlumat əlavə edin — tələbələr bunu profilinizdə görəcək."}</p>
        {edit && <ProfileEditor open onClose={() => setEdit(false)} withCover />}

        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Qrup" value={data?.stats.groups ?? "—"} icon="users" />
          <StatCard label="Tələbə" value={data?.stats.students ?? "—"} icon="grad" tone="ok" />
          <StatCard label="Test" value={data?.stats.tests ?? "—"} icon="file" tone="info" />
          <StatCard label="Video" value={data?.stats.videos ?? "—"} icon="video" tone="warn" />
        </div>

        {loading ? (
          <div className="mt-8"><SkeletonList /></div>
        ) : (
          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_1.2fr]">
            <section>
              <h2 className="mb-3 text-lg font-bold">Qruplarım</h2>
              {groups.length === 0 ? (
                <Empty icon="users" title="Qrup yoxdur" action={<Link href="/teacher/groups" className="btn-primary">Qrup yarat</Link>} />
              ) : (
                <div className="space-y-3">
                  {groups.map((g) => (
                    <Link key={g.id} href={`/teacher/groups/${g.id}`} className="card flex items-center gap-3 overflow-hidden p-3 transition hover:border-brand/40">
                      <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-brand/10 text-brand">
                        {g.coverPhoto ? <Img src={g.coverPhoto} className="h-full w-full object-cover" /> : <Icon name="users" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-bold">{g.name}</p>
                        <p className="text-xs text-muted">{g._count.members} üzv</p>
                      </div>
                      <Icon name="right" className="text-muted" />
                    </Link>
                  ))}
                </div>
              )}
            </section>

            <section>
              <h2 className="mb-3 text-lg font-bold">Paylaşımlar</h2>
              <div className="card mb-4 p-4">
                <textarea className="input min-h-24 border-0 bg-surface-2" placeholder="Tələbələrə nəsə paylaşın…" value={content} onChange={(e) => setContent(e.target.value)} />
                {images.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {images.map((u) => (
                      <span key={u} className="relative h-20 w-20 overflow-hidden rounded-xl">
                        <Img src={u} className="h-full w-full object-cover" />
                        <button onClick={() => setImages((p) => p.filter((x) => x !== u))} className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white" aria-label="Sil">
                          <Icon name="x" size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <select className="input !w-auto !py-1.5 text-xs" value={targetGroup} onChange={(e) => setGroupId(e.target.value)}>
                    {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                  <button className="btn-ghost btn-sm" onClick={() => fileRef.current?.click()} disabled={uploading || images.length >= 4}>
                    {uploading ? <Spinner /> : <Icon name="image" size={16} />}
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => pickImages(e.target.files)} />
                  <button type="button" onClick={() => setIsPublic((v) => !v)} className={cx("btn btn-sm", isPublic ? "bg-info/10 text-info" : "bg-surface-2 text-muted")}>
                    <Icon name={isPublic ? "globe" : "lock"} size={14} /> {isPublic ? "Hamıya açıq" : "Yalnız qrup"}
                  </button>
                  <button className="btn-primary btn-sm ml-auto" onClick={publish} disabled={posting || !content.trim() || !targetGroup}>
                    {posting ? <Spinner /> : <Icon name="send" size={14} />} Paylaş
                  </button>
                </div>
              </div>

              {(data?.publicPosts ?? []).length === 0 ? (
                <Empty icon="message" title="Açıq paylaşım yoxdur" text="Yalnız “Hamıya açıq” paylaşımlar profildə görünür." />
              ) : (
                <div className="space-y-4">
                  {data!.publicPosts.map((p) => (
                    <PostCard key={p.id} post={{ ...p, teacher: { id: user.id, name: user.name, photo: user.photo } }} showGroup onDelete={() => removePost(p)} />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
