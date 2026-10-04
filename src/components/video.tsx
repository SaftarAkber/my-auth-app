"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { api, errMsg, useFetch } from "@/lib/api";
import { timeAgo, videoEmbed } from "@/lib/format";
import { Avatar, Icon, Modal, Spinner, useToast } from "@/components/ui";
import type { VideoLite } from "@/components/content";

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  visibility: "PUBLIC" | "GROUP_ONLY";
  user: { id: string; name: string; photo: string | null; role: "STUDENT" | "TEACHER" };
}

function VideoComments({ videoId }: { videoId: string }) {
  const { user } = useAuth();
  const toast = useToast();
  const { data, loading, reload } = useFetch<{ comments: Comment[] }>(`/api/videos/${videoId}/comments`);
  const [text, setText] = useState("");
  const [groupOnly, setGroupOnly] = useState(false);
  const [busy, setBusy] = useState(false);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    try {
      await api(`/api/videos/${videoId}/comments`, {
        body: { content: text, visibility: groupOnly ? "GROUP_ONLY" : "PUBLIC" },
      });
      setText("");
      reload();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  }

  async function remove(c: Comment) {
    try {
      await api(`/api/videos/${videoId}/comments?commentId=${c.id}`, { method: "DELETE" });
      reload();
    } catch (err) {
      toast.error(errMsg(err));
    }
  }

  const comments = data?.comments ?? [];
  return (
    <div className="mt-5 border-t border-line pt-5">
      <h3 className="mb-3 flex items-center gap-2 font-bold">
        <Icon name="message" size={17} /> Şərhlər <span className="text-sm font-normal text-muted">({comments.length})</span>
      </h3>

      <form onSubmit={send} className="mb-4 space-y-2">
        <div className="flex gap-2">
          <input className="input" placeholder="Şərh yazın…" value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} />
          <button className="btn-primary" disabled={busy || !text.trim()} aria-label="Göndər">
            {busy ? <Spinner /> : <Icon name="send" size={16} />}
          </button>
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-xs text-muted">
          <input type="checkbox" checked={groupOnly} onChange={(e) => setGroupOnly(e.target.checked)} />
          Yalnız qrup üzvləri görsün
        </label>
      </form>

      {loading ? (
        <Spinner className="text-brand" />
      ) : comments.length === 0 ? (
        <p className="text-sm text-muted">İlk şərhi siz yazın.</p>
      ) : (
        <ul className="space-y-3">
          {comments.map((c) => (
            <li key={c.id} className="flex gap-3">
              <Avatar src={c.user.photo} name={c.user.name} size={32} />
              <div className="min-w-0 flex-1 rounded-xl bg-surface-2 px-3.5 py-2.5">
                <p className="flex flex-wrap items-center gap-2 text-sm font-bold">
                  {c.user.name}
                  {c.user.role === "TEACHER" && <span className="badge-brand !py-0">Müəllim</span>}
                  {c.visibility === "GROUP_ONLY" && (
                    <span className="badge-muted !py-0"><Icon name="lock" size={11} /> Qrup</span>
                  )}
                  <span className="text-xs font-normal text-muted">{timeAgo(c.createdAt)}</span>
                  {(user?.id === c.user.id || user?.role === "TEACHER") && (
                    <button onClick={() => remove(c)} className="ml-auto text-muted hover:text-bad" aria-label="Sil">
                      <Icon name="trash" size={14} />
                    </button>
                  )}
                </p>
                <p className="mt-0.5 whitespace-pre-wrap text-sm">{c.content}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Video pleyer (YouTube və ya birbaşa fayl) + şərhlər */
export function VideoPlayer({ video, onClose }: { video: VideoLite | null; onClose: () => void }) {
  const embed = video ? videoEmbed(video.url) : null;
  return (
    <Modal open={!!video} onClose={onClose} title={video?.title} size="xl">
      {video && (
        <>
          <div className="aspect-video w-full overflow-hidden rounded-xl bg-black">
            {embed ? (
              <iframe
                src={embed}
                className="h-full w-full"
                allowFullScreen
                allow="autoplay; fullscreen; picture-in-picture"
                title={video.title}
              />
            ) : (
              <video src={video.url} controls autoPlay className="h-full w-full" />
            )}
          </div>
          {video.description && <p className="mt-4 whitespace-pre-wrap text-sm text-muted">{video.description}</p>}
          <VideoComments videoId={video.id} />
        </>
      )}
    </Modal>
  );
}
