"use client";

import { useRef, useState } from "react";
import { api, errMsg, uploadImage, useFetch } from "@/lib/api";
import { shrinkImage } from "@/lib/imageShrink";
import { cx, fmtDateTime, videoThumb, youtubeId } from "@/lib/format";
import { Icon, Spinner, useConfirm, useToast } from "@/components/ui";
import MediaViewer, { type MediaItem } from "@/components/MediaViewer";

export interface ReviewComment {
  id: string;
  attemptId: string;
  questionId: string;
  teacherId: string;
  scope: "ATTEMPT" | "WRONG_ALL";
  text: string;
  images: string[];
  youtubeUrl: string | null;
  sentAt: string | null;
  createdAt: string;
  video: { id: string; title: string; url: string } | null;
  teacher: { id: string; name: string; photo: string | null };
}

const MAX_IMAGES = 10;
const URL_RE = /(https?:\/\/[^\s<>"']+[^\s<>"'.,;:!?)\]])/g;

/** Mətndəki linklər kliklənir və yeni tabda açılır */
function Linkified({ text }: { text: string }) {
  const parts = text.split(URL_RE);
  return (
    <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
      {parts.map((p, k) =>
        k % 2 === 1 ? (
          <a key={k} href={p} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand underline underline-offset-2 hover:no-underline">{p}</a>
        ) : (
          <span key={k}>{p}</span>
        ),
      )}
    </p>
  );
}

/** Bir şərhin görünüşü: mətn, 30×30 şəkillər, video */
function CommentView({ c, children }: { c: ReviewComment; children?: React.ReactNode }) {
  const [open, setOpen] = useState<number | null>(null);
  const videoUrl = c.video?.url ?? c.youtubeUrl;
  const media: MediaItem[] = [
    ...c.images.map((src) => ({ type: "image" as const, src })),
    ...(videoUrl ? [{ type: "video" as const, url: videoUrl, title: c.video?.title ?? "Video izah" }] : []),
  ];
  const thumb = videoUrl ? videoThumb(videoUrl) : null;
  return (
    <div className="text-sm">
      {c.text && <Linkified text={c.text} />}
      {(c.images.length > 0 || videoUrl) && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {c.images.map((src, k) => (
            <button key={src + k} type="button" onClick={() => setOpen(k)} className="h-[30px] w-[30px] overflow-hidden rounded border border-line bg-surface-2 hover:ring-2 hover:ring-brand/40" aria-label={`Şəkil ${k + 1}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
          {videoUrl && (
            <button type="button" onClick={() => setOpen(c.images.length)} className="flex h-[30px] items-center gap-1.5 rounded border border-line bg-surface-2 pr-2 text-xs font-semibold hover:ring-2 hover:ring-brand/40" title={c.video?.title ?? "Video"}>
              {thumb ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={thumb} alt="" className="h-full w-[40px] rounded-l object-cover" />
              ) : (
                <span className="grid h-full w-[30px] place-items-center bg-ink text-white"><Icon name="play" size={12} /></span>
              )}
              <Icon name="play" size={12} /> {c.video?.title ? <span className="max-w-[140px] truncate">{c.video.title}</span> : "Video"}
            </button>
          )}
        </div>
      )}
      {children}
      {open !== null && <MediaViewer items={media} start={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

type Draft = { text: string; images: string[]; scope: "ATTEMPT" | "WRONG_ALL"; videoId: string; youtubeUrl: string };
const empty = (wrong: boolean): Draft => ({ text: "", images: [], scope: wrong ? "WRONG_ALL" : "ATTEMPT", videoId: "", youtubeUrl: "" });

/** Müəllim: şərh yazma / redaktə forması */
function Editor({ initial, wrong, onSave, onCancel }: { initial: Draft; wrong: boolean; onSave: (d: Draft) => Promise<void>; onCancel: () => void }) {
  const toast = useToast();
  const [d, setD] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(0);
  const [videoMode, setVideoMode] = useState<"none" | "site" | "yt">(initial.videoId ? "site" : initial.youtubeUrl ? "yt" : "none");
  const file = useRef<HTMLInputElement>(null);
  const videos = useFetch<{ videos: { id: string; title: string; url: string }[] }>(videoMode === "site" ? "/api/videos" : null);

  async function addImages(list: FileList | null) {
    if (!list?.length) return;
    const room = MAX_IMAGES - d.images.length;
    const files = [...list].slice(0, room);
    if (list.length > room) toast.error(`Ən çox ${MAX_IMAGES} şəkil əlavə etmək olar`);
    setUploading((n) => n + files.length);
    for (const f of files) {
      try {
        const url = await uploadImage(await shrinkImage(f, { max: 1800 }));
        setD((x) => ({ ...x, images: [...x.images, url].slice(0, MAX_IMAGES) }));
      } catch (e) {
        toast.error(errMsg(e));
      } finally {
        setUploading((n) => n - 1);
      }
    }
    if (file.current) file.current.value = "";
  }

  async function save() {
    if (!d.text.trim() && !d.images.length && !d.videoId && !d.youtubeUrl.trim()) return toast.error("Şərh boşdur");
    if (videoMode === "yt" && d.youtubeUrl.trim() && !youtubeId(d.youtubeUrl)) return toast.error("YouTube linki tanınmadı");
    setBusy(true);
    try {
      await onSave({ ...d, videoId: videoMode === "site" ? d.videoId : "", youtubeUrl: videoMode === "yt" ? d.youtubeUrl.trim() : "" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2 rounded-lg border border-line bg-surface p-2.5">
      <textarea
        className="input min-h-20 text-sm"
        value={d.text}
        onChange={(e) => setD({ ...d, text: e.target.value })}
        placeholder="Məs.: Klasterlərin sayını yuxarı yuvarlaqlaşdır. Kitab, səh. 45. Link də yaza bilərsiniz."
        maxLength={2000}
        autoFocus
      />
      {d.images.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {d.images.map((src, k) => (
            <span key={src + k} className="relative h-[30px] w-[30px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="h-full w-full rounded border border-line object-cover" />
              <button type="button" onClick={() => setD({ ...d, images: d.images.filter((_, j) => j !== k) })} className="absolute -right-1.5 -top-1.5 grid h-4 w-4 place-items-center rounded-full bg-bad text-white" aria-label="Şəkli sil">
                <Icon name="x" size={10} />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <input ref={file} type="file" accept="image/*" multiple hidden onChange={(e) => addImages(e.target.files)} />
        <button type="button" className="btn-ghost btn-sm" onClick={() => file.current?.click()} disabled={d.images.length >= MAX_IMAGES || uploading > 0}>
          {uploading ? <Spinner /> : <Icon name="image" size={14} />} Şəkil ({d.images.length}/{MAX_IMAGES})
        </button>
        <select className="input h-8 w-auto py-0 text-xs" value={videoMode} onChange={(e) => setVideoMode(e.target.value as typeof videoMode)} aria-label="Video">
          <option value="none">Video yoxdur</option>
          <option value="site">Saytdakı videom</option>
          <option value="yt">YouTube linki</option>
        </select>
      </div>
      {videoMode === "site" && (
        <select className="input text-sm" value={d.videoId} onChange={(e) => setD({ ...d, videoId: e.target.value })}>
          <option value="">{videos.loading ? "Yüklənir…" : "Video seçin"}</option>
          {(videos.data?.videos ?? []).map((v) => <option key={v.id} value={v.id}>{v.title}</option>)}
        </select>
      )}
      {videoMode === "yt" && (
        <input className="input text-sm" value={d.youtubeUrl} onChange={(e) => setD({ ...d, youtubeUrl: e.target.value })} placeholder="https://www.youtube.com/watch?v=…" />
      )}
      <div className="flex flex-col gap-1 text-xs">
        <label className="flex items-center gap-2"><input type="radio" checked={d.scope === "ATTEMPT"} onChange={() => setD({ ...d, scope: "ATTEMPT" })} /> Yalnız bu tələbəyə</label>
        <label className={cx("flex items-center gap-2", !wrong && "opacity-80")}>
          <input type="radio" checked={d.scope === "WRONG_ALL"} onChange={() => setD({ ...d, scope: "WRONG_ALL" })} /> Bu sualı səhv edən hamıya
        </label>
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" className="btn-ghost btn-sm" onClick={onCancel} disabled={busy}>Ləğv et</button>
        <button type="button" className="btn-primary btn-sm" onClick={save} disabled={busy || uploading > 0}>{busy ? <Spinner /> : "Yadda saxla"}</button>
      </div>
    </div>
  );
}

/**
 * Bir sualın şərhləri (kitabçada sualın sağında / telefonda altında).
 * Müəllim: yazır, redaktə edir, silir (qaralama kimi saxlanır); tələbə: yalnız göndərilmişləri görür.
 */
export default function QuestionComments({
  attemptId, questionId, comments, canEdit, wrong, onChanged,
}: { attemptId: string; questionId: string; comments: ReviewComment[]; canEdit: boolean; wrong: boolean; onChanged: () => void }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);

  async function create(d: Draft) {
    try {
      await api(`/api/attempts/${attemptId}/comments`, { body: { questionId, ...d } });
      setAdding(false);
      onChanged();
    } catch (e) {
      toast.error(errMsg(e));
    }
  }
  async function update(id: string, d: Draft) {
    try {
      await api(`/api/review-comments/${id}`, { method: "PATCH", body: d });
      setEditing(null);
      onChanged();
    } catch (e) {
      toast.error(errMsg(e));
    }
  }
  async function remove(c: ReviewComment) {
    if (!(await confirm({ title: "Şərh silinsin?", message: c.sentAt ? "Tələbə artıq bu şərhi görüb; silinəndən sonra görməyəcək." : undefined, confirmText: "Sil", danger: true }))) return;
    try {
      await api(`/api/review-comments/${c.id}`, { method: "DELETE" });
      onChanged();
    } catch (e) {
      toast.error(errMsg(e));
    }
  }

  if (!canEdit && comments.length === 0) return null;

  return (
    <aside className="space-y-2">
      {comments.map((c) =>
        editing === c.id ? (
          <Editor
            key={c.id}
            wrong={wrong}
            initial={{ text: c.text, images: c.images, scope: c.scope, videoId: c.video?.id ?? "", youtubeUrl: c.youtubeUrl ?? "" }}
            onSave={(d) => update(c.id, d)}
            onCancel={() => setEditing(null)}
          />
        ) : (
          <div key={c.id} className={cx("rounded-lg border p-2.5", c.sentAt ? "border-brand/20 bg-brand/5" : "border-dashed border-warn/60 bg-warn/5")}>
            <p className="mb-1 flex flex-wrap items-center gap-1.5 text-[11px] font-semibold text-muted">
              <Icon name="message" size={12} className="text-brand" />
              <span className="text-brand">Müəllim şərhi</span>
              {canEdit && <span className="badge-muted !py-0">{c.scope === "WRONG_ALL" ? "Səhv edən hamıya" : "Yalnız bu tələbəyə"}</span>}
              {canEdit && !c.sentAt && <span className="badge-warn !py-0">Göndərilməyib</span>}
              {canEdit && c.attemptId !== attemptId && <span className="badge-muted !py-0">başqa kitabçadan</span>}
              <span className="ml-auto font-normal">{fmtDateTime(c.sentAt ?? c.createdAt)}</span>
            </p>
            <CommentView c={c}>
              {canEdit && (
                <div className="mt-2 flex gap-3 text-xs font-semibold text-muted">
                  <button type="button" className="inline-flex items-center gap-1 hover:text-ink" onClick={() => setEditing(c.id)}><Icon name="edit" size={12} /> Redaktə</button>
                  <button type="button" className="inline-flex items-center gap-1 hover:text-bad" onClick={() => remove(c)}><Icon name="trash" size={12} /> Sil</button>
                </div>
              )}
            </CommentView>
          </div>
        ),
      )}
      {canEdit && (adding ? (
        <Editor initial={empty(wrong)} wrong={wrong} onSave={create} onCancel={() => setAdding(false)} />
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className={cx("flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed px-3 py-2 text-sm font-semibold transition hover:bg-tint", wrong ? "border-bad/50 text-bad" : "border-line text-muted")}
        >
          <Icon name="plus" size={14} /> Şərh
        </button>
      ))}
    </aside>
  );
}
