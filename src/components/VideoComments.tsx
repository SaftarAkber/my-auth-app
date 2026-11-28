"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { api, errMsg } from "@/lib/api";
import { cx, timeAgo } from "@/lib/format";
import { Avatar, Icon, Spinner, useToast } from "@/components/ui";

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  visibility: "PUBLIC" | "GROUP_ONLY";
  parentId: string | null;
  user: { id: string; name: string; photo: string | null; role: "STUDENT" | "TEACHER" | "ADMIN" };
  replyCount: number;
  /** Yalnız bəyənilə bilən şərhlərdə (paylaşım şərhləri) */
  likes?: number;
  liked?: boolean;
}
interface Page { comments: Comment[]; nextCursor: string | null; total: number }

/** Şərh yazma xanası (əsas şərh və ya cavab) */
function Composer({
  placeholder, autoFocus, onSend, onCancel, canGroupOnly, submitLabel,
}: {
  placeholder: string;
  autoFocus?: boolean;
  onSend: (text: string, groupOnly: boolean) => Promise<void>;
  onCancel?: () => void;
  canGroupOnly?: boolean;
  submitLabel?: string;
}) {
  const [text, setText] = useState("");
  const [groupOnly, setGroupOnly] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || busy) return;
    setBusy(true);
    try {
      await onSend(text.trim(), groupOnly);
      setText("");
      setGroupOnly(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-2">
      <div className="flex gap-2">
        <input
          className="input"
          placeholder={placeholder}
          value={text}
          autoFocus={autoFocus}
          onChange={(e) => setText(e.target.value)}
          maxLength={1000}
        />
        {onCancel && <button type="button" className="btn-ghost btn-sm shrink-0 self-center" onClick={onCancel}>Ləğv et</button>}
        <button className="btn-primary shrink-0" disabled={busy || !text.trim()} aria-label={submitLabel ?? "Göndər"}>
          {busy ? <Spinner /> : <Icon name="send" size={16} />}
        </button>
      </div>
      {canGroupOnly && (
        <label className="flex cursor-pointer items-center gap-2 text-xs text-muted">
          <input type="checkbox" checked={groupOnly} onChange={(e) => setGroupOnly(e.target.checked)} />
          Yalnız qrup üzvləri görsün
        </label>
      )}
    </form>
  );
}

/** Şərhin bəyənmə düyməsi */
function CommentLike({ c, likeUrl }: { c: Comment; likeUrl: string }) {
  const toast = useToast();
  const [st, setSt] = useState({ n: c.likes ?? 0, liked: !!c.liked });
  const [busy, setBusy] = useState(false);
  async function toggle() {
    if (busy) return;
    setBusy(true);
    const prev = st;
    setSt({ n: st.n + (st.liked ? -1 : 1), liked: !st.liked });
    try {
      const r = await api<{ liked: boolean; likes: number }>(likeUrl, { method: "POST" });
      setSt({ n: r.likes, liked: r.liked });
    } catch (e) {
      setSt(prev);
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={st.liked}
      aria-label={st.liked ? "Bəyənməni geri al" : "Bəyən"}
      title={st.liked ? "Bəyənməni geri al" : "Bəyən"}
      className={cx("inline-flex items-center gap-1 tabular-nums transition active:scale-90", st.liked ? "text-ok" : "hover:text-ok")}
    >
      <Icon name="thumb" size={15} filled={st.liked} />{st.n > 0 && <span>{st.n}</span>}
    </button>
  );
}

function CommentItem({
  c, base, likeBase, ownerId, groupAccess, onDeleted, onReplyAdded,
}: {
  c: Comment;
  base: string;
  likeBase?: string;
  ownerId: string;
  groupAccess: boolean;
  onDeleted: (id: string, removed: number) => void;
  onReplyAdded: () => void;
}) {
  const { user } = useAuth();
  const toast = useToast();
  const [replying, setReplying] = useState(false);
  const [open, setOpen] = useState(false);
  const [replies, setReplies] = useState<Comment[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [count, setCount] = useState(c.replyCount);

  const canDelete = (x: Comment) => user?.id === x.user.id || user?.id === ownerId || user?.role === "ADMIN";

  const loadReplies = useCallback(async (from: string | null) => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ parentId: c.id, ...(from ? { cursor: from } : {}) });
      const d = await api<Page>(`${base}?${qs}`);
      setReplies((r) => (from ? [...r, ...d.comments] : d.comments));
      setCursor(d.nextCursor);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, [c.id, base, toast]);

  async function sendReply(text: string, groupOnly: boolean) {
    try {
      const d = await api<{ comment: Comment }>(base, {
        body: { content: text, parentId: c.id, visibility: groupOnly ? "GROUP_ONLY" : "PUBLIC" },
      });
      setCount((n) => n + 1);
      setReplies((r) => [...r, d.comment]);
      setOpen(true);
      setReplying(false);
      onReplyAdded();
    } catch (e) {
      toast.error(errMsg(e));
      throw e;
    }
  }

  async function removeComment(x: Comment, isReply: boolean) {
    try {
      await api(`${base}?commentId=${x.id}`, { method: "DELETE" });
      if (isReply) {
        setReplies((r) => r.filter((y) => y.id !== x.id));
        setCount((n) => Math.max(0, n - 1));
        onDeleted(x.id, 1);
      } else {
        onDeleted(x.id, 1 + count);
      }
    } catch (e) {
      toast.error(errMsg(e));
    }
  }

  const renderRow = (x: Comment, reply?: boolean) => (
    <div key={x.id} className="flex gap-3">
      <Link href={`/u/${x.user.id}`} className="shrink-0"><Avatar src={x.user.photo} name={x.user.name} size={reply ? 28 : 36} /></Link>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2 text-sm font-bold">
          <Link href={`/u/${x.user.id}`} className="hover:underline">{x.user.name}</Link>
          {x.user.id === ownerId && <span className="badge-brand !py-0">Müəllim</span>}
          {x.visibility === "GROUP_ONLY" && <span className="badge-muted !py-0"><Icon name="lock" size={11} /> Qrup</span>}
          <span className="text-xs font-normal text-muted">{timeAgo(x.createdAt)}</span>
        </p>
        <p className="mt-0.5 whitespace-pre-wrap break-words text-sm">{x.content}</p>
        <div className="mt-1 flex items-center gap-3 text-xs font-semibold text-muted">
          {likeBase && <CommentLike c={x} likeUrl={`${likeBase}/${x.id}/like`} />}
          {!reply && (
            <button className="hover:text-ink" onClick={() => setReplying((v) => !v)}>Cavab ver</button>
          )}
          {canDelete(x) && (
            <button className="hover:text-bad" onClick={() => removeComment(x, !!reply)}>Sil</button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <li>
      {renderRow(c)}
      {replying && (
        <div className="ml-12 mt-2">
          <Composer
            placeholder={`${c.user.name} adlı istifadəçiyə cavab…`}
            autoFocus
            canGroupOnly={groupAccess && c.visibility === "PUBLIC"}
            onSend={sendReply}
            onCancel={() => setReplying(false)}
          />
        </div>
      )}
      {count > 0 && (
        <div className="ml-12 mt-1.5">
          <button
            className="inline-flex items-center gap-1 text-sm font-bold text-brand hover:underline"
            onClick={() => {
              const next = !open;
              setOpen(next);
              if (next && replies.length === 0) void loadReplies(null);
            }}
          >
            <Icon name="down" size={15} className={cx("transition", open && "rotate-180")} />
            {count} cavab
          </button>
          {open && (
            <div className="mt-2 space-y-3">
              {replies.map((r) => renderRow(r, true))}
              {loading && <Spinner className="text-brand" />}
              {cursor && !loading && (
                <button className="text-sm font-bold text-brand hover:underline" onClick={() => loadReplies(cursor)}>
                  Daha çox cavab
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </li>
  );
}

export default function VideoComments({ videoId, ownerId, groupAccess }: { videoId: string; ownerId: string; groupAccess: boolean }) {
  return <CommentThread base={`/api/videos/${videoId}/comments`} ownerId={ownerId} groupAccess={groupAccess} />;
}

/**
 * Şərh siyahısı + yazma xanası. Video və paylaşım şərhləri eyni görünüşdədir:
 * `base` – şərh API-si, `likeBase` verilibsə hər şərh bəyənilə bilir (`${likeBase}/:id/like`).
 * `compact` – paylaşım kartının içində: başlıq yoxdur, xana yuxarıda.
 */
export function CommentThread({
  base, likeBase, ownerId, groupAccess, compact, onTotal,
}: {
  base: string;
  likeBase?: string;
  ownerId: string;
  groupAccess: boolean;
  compact?: boolean;
  onTotal?: (n: number) => void;
}) {
  const toast = useToast();
  const [items, setItems] = useState<Comment[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [more, setMore] = useState(false);

  const load = useCallback(async (from: string | null) => {
    if (from) setMore(true);
    else setLoading(true);
    try {
      const d = await api<Page>(`${base}${from ? `?cursor=${from}` : ""}`);
      setItems((x) => (from ? [...x, ...d.comments] : d.comments));
      setCursor(d.nextCursor);
      setTotal(d.total);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setLoading(false);
      setMore(false);
    }
  }, [base, toast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(null);
  }, [load]);

  async function send(text: string, groupOnly: boolean) {
    try {
      const d = await api<{ comment: Comment }>(base, {
        body: { content: text, visibility: groupOnly ? "GROUP_ONLY" : "PUBLIC" },
      });
      setItems((x) => [d.comment, ...x]);
      setTotal((t) => t + 1);
    } catch (e) {
      toast.error(errMsg(e));
      throw e;
    }
  }

  useEffect(() => {
    if (!loading) onTotal?.(total);
  }, [total, loading, onTotal]);

  return (
    <section className={compact ? "mt-3" : "mt-6"}>
      {!compact && (
        <h2 className="mb-4 flex items-center gap-2 text-lg font-extrabold">
          <Icon name="message" size={19} /> {total} şərh
        </h2>
      )}

      <div className={compact ? "mb-4" : "mb-6"}>
        <Composer placeholder="Şərh yazın…" autoFocus={compact} canGroupOnly={groupAccess} onSend={send} />
      </div>

      {loading ? (
        <Spinner className="text-brand" />
      ) : items.length === 0 ? (
        <p className="text-sm text-muted">İlk şərhi siz yazın.</p>
      ) : (
        <>
          <ul className="space-y-5">
            {items.map((c) => (
              <CommentItem
                key={c.id}
                c={c}
                base={base}
                likeBase={likeBase}
                ownerId={ownerId}
                groupAccess={groupAccess}
                // Sayğac yalnız əsas şərhləri sayır: cavab əlavə olunanda dəyişmir, əsas şərh silinəndə 1 azalır
                onReplyAdded={() => {}}
                onDeleted={(id) => {
                  setItems((x) => x.filter((y) => y.id !== id));
                  setTotal((t) => Math.max(0, t - 1));
                }}
              />
            ))}
          </ul>
          {cursor && (
            <button className="btn-secondary mt-5" onClick={() => load(cursor)} disabled={more}>
              {more ? <Spinner /> : <Icon name="down" size={15} />} Daha çox şərh
            </button>
          )}
        </>
      )}
    </section>
  );
}
