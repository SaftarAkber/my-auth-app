"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useRef, useState } from "react";
import { api, errMsg, uploadImage, useFetch } from "@/lib/api";
import { cx, fmtDate, timeAgo } from "@/lib/format";
import {
  PostCard, TestWindowBadge, VideoPackageBlock,
  type PostLite, type TestPackageLite, type VideoLite, type VideoPackageLite,
} from "@/components/content";
import { VideoPlayer } from "@/components/video";
import {
  Avatar, Empty, ErrorBox, Field, Icon, Img, Modal, SkeletonList, Spinner, Tabs, useConfirm, useToast,
} from "@/components/ui";

interface Member {
  id: string;
  studentId: string;
  createdAt: string;
  student: { id: string; name: string; photo: string | null; email: string | null; phone: string | null };
}
interface Req {
  id: string;
  status: "PENDING" | "ACCEPTED" | "DECLINED";
  message: string | null;
  createdAt: string;
  student: { id: string; name: string; photo: string | null; email: string | null; phone: string | null };
}
interface GroupData {
  id: string;
  name: string;
  description: string | null;
  schedule: string | null;
  photo: string | null;
  coverPhoto: string | null;
  isActive: boolean;
  members: Member[];
  posts: PostLite[];
  videoPackages: VideoPackageLite[];
  testPackages: TestPackageLite[];
  enrollmentReqs: Req[];
}

export default function TeacherGroupPage() {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const confirm = useConfirm();
  const { data: g, loading, error, reload } = useFetch<GroupData>(`/api/groups/${id}`);
  const [tab, setTab] = useState<"feed" | "members" | "tests" | "videos" | "requests">("feed");
  const [video, setVideo] = useState<VideoLite | null>(null);

  // Post yazma
  const [content, setContent] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [isPublic, setIsPublic] = useState(false);
  const [posting, setPosting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Video paketi / video
  const [pkgModal, setPkgModal] = useState(false);
  const [pkgForm, setPkgForm] = useState({ name: "", description: "" });
  const [videoModal, setVideoModal] = useState<string | null>(null);
  const [videoForm, setVideoForm] = useState({ title: "", url: "", description: "" });
  const [busy, setBusy] = useState(false);

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
    if (!content.trim()) return;
    setPosting(true);
    try {
      await api(`/api/groups/${id}/posts`, { body: { content, images, visibility: isPublic ? "PUBLIC" : "GROUP" } });
      setContent("");
      setImages([]);
      setIsPublic(false);
      toast.success("Paylaşıldı");
      reload();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setPosting(false);
    }
  }

  async function deletePost(p: PostLite) {
    if (!(await confirm({ title: "Paylaşım silinsin?", confirmText: "Sil", danger: true }))) return;
    try {
      await api(`/api/groups/${id}/posts?postId=${p.id}`, { method: "DELETE" });
      reload();
    } catch (e) {
      toast.error(errMsg(e));
    }
  }

  async function removeMember(m: Member) {
    const ok = await confirm({
      title: `${m.student.name} qrupdan çıxarılsın?`,
      message: "Tələbə sonradan yenidən müraciət göndərə bilər.",
      confirmText: "Çıxar",
      danger: true,
    });
    if (!ok) return;
    try {
      await api(`/api/groups/${id}/members?studentId=${m.studentId}`, { method: "DELETE" });
      toast.success("Çıxarıldı");
      reload();
    } catch (e) {
      toast.error(errMsg(e));
    }
  }

  async function respond(r: Req, action: "ACCEPTED" | "DECLINED") {
    try {
      await api("/api/enrollment/respond", { body: { enrollmentId: r.id, action } });
      toast.success(action === "ACCEPTED" ? "Qəbul edildi" : "Rədd edildi");
      reload();
    } catch (e) {
      toast.error(errMsg(e));
    }
  }

  async function createPackage() {
    if (!pkgForm.name.trim()) return toast.error("Paket adı məcburidir");
    setBusy(true);
    try {
      const { package: pkg } = await api<{ package: { id: string } }>(`/api/groups/${id}/video-packages`, { body: pkgForm });
      await api(`/api/video-packages/${pkg.id}`, { method: "PATCH", body: { isPublished: true } });
      toast.success("Video paketi yaradıldı");
      setPkgModal(false);
      setPkgForm({ name: "", description: "" });
      reload();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  async function addVideo() {
    if (!videoModal) return;
    if (!videoForm.title.trim() || !videoForm.url.trim()) return toast.error("Başlıq və link məcburidir");
    setBusy(true);
    try {
      await api(`/api/video-packages/${videoModal}/videos`, { body: videoForm });
      toast.success("Video əlavə edildi");
      setVideoModal(null);
      setVideoForm({ title: "", url: "", description: "" });
      reload();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="page"><SkeletonList rows={3} className="h-40" /></div>;
  if (error || !g) return <div className="page"><ErrorBox message={error ?? "Qrup tapılmadı"} onRetry={reload} /></div>;

  const pending = g.enrollmentReqs.filter((r) => r.status === "PENDING");

  return (
    <div className="pb-8">
      <div className="relative h-36 bg-gradient-to-br from-brand/80 to-brand/30 sm:h-48">
        {g.coverPhoto && <Img src={g.coverPhoto} className="h-full w-full object-cover" />}
      </div>
      <div className="page !pt-0">
        <div className="-mt-10 flex flex-wrap items-end gap-4">
          <span className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-3xl border-4 border-bg bg-surface text-brand shadow-soft">
            {g.photo ? <Img src={g.photo} className="h-full w-full object-cover" /> : <Icon name="users" size={36} />}
          </span>
          <div className="pb-1">
            <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{g.name}</h1>
            <Link href="/teacher/groups" className="text-sm font-medium text-muted hover:text-ink">← Qruplar</Link>
          </div>
        </div>
        {g.description && <p className="mt-4 max-w-3xl whitespace-pre-wrap text-muted">{g.description}</p>}
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="badge-muted"><Icon name="users" size={12} /> {g.members.length} üzv</span>
          {g.schedule && <span className="badge-muted"><Icon name="calendar" size={12} /> {g.schedule}</span>}
          {!g.isActive && <span className="badge-warn">Deaktiv</span>}
        </div>

        <div className="mt-8">
          <Tabs
            value={tab}
            onChange={setTab}
            tabs={[
              { id: "feed", label: "Lent", count: g.posts.length },
              { id: "members", label: "Üzvlər", count: g.members.length },
              { id: "requests", label: "Müraciətlər", count: pending.length },
              { id: "tests", label: "Testlər", count: g.testPackages.length },
              { id: "videos", label: "Videolar", count: g.videoPackages.length },
            ]}
          />

          {tab === "feed" && (
            <div className="mx-auto max-w-2xl space-y-4">
              <div className="card p-4">
                <textarea className="input min-h-24 border-0 bg-surface-2" placeholder="Qrupa nəsə paylaşın…" value={content} onChange={(e) => setContent(e.target.value)} />
                {images.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {images.map((u) => (
                      <span key={u} className="group relative h-20 w-20 overflow-hidden rounded-xl">
                        <Img src={u} className="h-full w-full object-cover" />
                        <button onClick={() => setImages((p) => p.filter((x) => x !== u))} className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white" aria-label="Sil">
                          <Icon name="x" size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <button className="btn-ghost btn-sm" onClick={() => fileRef.current?.click()} disabled={uploading || images.length >= 4}>
                      {uploading ? <Spinner /> : <Icon name="image" size={16} />} Şəkil
                    </button>
                    <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => pickImages(e.target.files)} />
                    <button
                      type="button"
                      onClick={() => setIsPublic((v) => !v)}
                      className={cx("btn-sm btn", isPublic ? "bg-info/10 text-info" : "bg-surface-2 text-muted")}
                      title="Açıq paylaşımlar qrupdan kənar hər kəsə görünür"
                    >
                      <Icon name={isPublic ? "globe" : "lock"} size={14} /> {isPublic ? "Hamıya açıq" : "Yalnız qrup"}
                    </button>
                  </div>
                  <button className="btn-primary btn-sm" onClick={publish} disabled={posting || !content.trim()}>
                    {posting ? <Spinner /> : <Icon name="send" size={14} />} Paylaş
                  </button>
                </div>
              </div>

              {g.posts.length === 0 ? (
                <Empty icon="message" title="Hələ paylaşım yoxdur" />
              ) : (
                g.posts.map((p) => <PostCard key={p.id} post={p} onDelete={deletePost} />)
              )}
            </div>
          )}

          {tab === "members" &&
            (g.members.length === 0 ? (
              <Empty icon="users" title="Hələ üzv yoxdur" text="Tələbələr müraciət göndərdikdə burada görünəcək." />
            ) : (
              <div className="card divide-y divide-line">
                {g.members.map((m) => (
                  <div key={m.id} className="flex items-center gap-3 px-4 py-3">
                    <Avatar src={m.student.photo} name={m.student.name} size={40} />
                    <div className="min-w-0 flex-1">
                      <Link href={`/teacher/students/${m.student.id}`} className="block truncate font-semibold hover:text-brand">{m.student.name}</Link>
                      <p className="truncate text-xs text-muted">{m.student.phone ?? m.student.email ?? "—"} · {fmtDate(m.createdAt)}</p>
                    </div>
                    <button className="btn-icon hover:!text-bad" title="Qrupdan çıxar" onClick={() => removeMember(m)}><Icon name="logout" size={17} /></button>
                  </div>
                ))}
              </div>
            ))}

          {tab === "requests" &&
            (g.enrollmentReqs.length === 0 ? (
              <Empty icon="inbox" title="Müraciət yoxdur" />
            ) : (
              <div className="card divide-y divide-line">
                {g.enrollmentReqs.map((r) => (
                  <div key={r.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <Avatar src={r.student.photo} name={r.student.name} size={40} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{r.student.name}</p>
                      <p className="truncate text-xs text-muted">{r.message || "Mesaj yoxdur"} · {timeAgo(r.createdAt)}</p>
                    </div>
                    {r.status === "PENDING" ? (
                      <div className="flex gap-2">
                        <button className="btn-primary btn-sm" onClick={() => respond(r, "ACCEPTED")}>Qəbul et</button>
                        <button className="btn-secondary btn-sm" onClick={() => respond(r, "DECLINED")}>Rədd et</button>
                      </div>
                    ) : (
                      <span className={r.status === "ACCEPTED" ? "badge-ok" : "badge-bad"}>{r.status === "ACCEPTED" ? "Qəbul edilib" : "Rədd edilib"}</span>
                    )}
                  </div>
                ))}
              </div>
            ))}

          {tab === "tests" &&
            (g.testPackages.length === 0 ? (
              <Empty
                icon="file"
                title="Bu qrupa test bağlanmayıb"
                text="Test yaradarkən qrupu seçin və testi dərc edin."
                action={<Link href="/teacher/tests" className="btn-primary">Testlərə keç</Link>}
              />
            ) : (
              <div className="space-y-3">
                {g.testPackages.map((p) => (
                  <div key={p.id} className="card-flat flex flex-wrap items-center gap-3 p-4">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand/10 text-brand"><Icon name="file" /></span>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold">{p.name}</p>
                      <p className="text-xs text-muted">{p._count.questions} sual</p>
                    </div>
                    <TestWindowBadge pkg={p} />
                  </div>
                ))}
              </div>
            ))}

          {tab === "videos" && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <button className="btn-primary btn-sm" onClick={() => setPkgModal(true)}><Icon name="plus" size={14} /> Video paketi</button>
              </div>
              {g.videoPackages.length === 0 ? (
                <Empty icon="video" title="Dərc olunmuş video paketi yoxdur" />
              ) : (
                g.videoPackages.map((p) => (
                  <div key={p.id}>
                    <VideoPackageBlock pkg={p} onPlay={setVideo} />
                    <button className="btn-ghost btn-sm mt-1" onClick={() => setVideoModal(p.id)}><Icon name="plus" size={14} /> “{p.name}” paketinə video əlavə et</button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      <VideoPlayer video={video} onClose={() => setVideo(null)} />

      <Modal
        open={pkgModal}
        onClose={() => setPkgModal(false)}
        title="Yeni video paketi"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setPkgModal(false)}>Ləğv et</button>
            <button className="btn-primary" onClick={createPackage} disabled={busy}>{busy ? <Spinner /> : "Yarat"}</button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Ad *"><input className="input" value={pkgForm.name} onChange={(e) => setPkgForm({ ...pkgForm, name: e.target.value })} /></Field>
          <Field label="Təsvir"><textarea className="input min-h-20" value={pkgForm.description} onChange={(e) => setPkgForm({ ...pkgForm, description: e.target.value })} /></Field>
        </div>
      </Modal>

      <Modal
        open={!!videoModal}
        onClose={() => setVideoModal(null)}
        title="Video əlavə et"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setVideoModal(null)}>Ləğv et</button>
            <button className="btn-primary" onClick={addVideo} disabled={busy}>{busy ? <Spinner /> : "Əlavə et"}</button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Başlıq *"><input className="input" value={videoForm.title} onChange={(e) => setVideoForm({ ...videoForm, title: e.target.value })} /></Field>
          <Field label="Video linki *" hint="YouTube linki və ya birbaşa video faylının ünvanı">
            <input className="input" value={videoForm.url} onChange={(e) => setVideoForm({ ...videoForm, url: e.target.value })} placeholder="https://youtu.be/…" />
          </Field>
          <Field label="Təsvir"><textarea className="input min-h-20" value={videoForm.description} onChange={(e) => setVideoForm({ ...videoForm, description: e.target.value })} /></Field>
        </div>
      </Modal>
    </div>
  );
}
