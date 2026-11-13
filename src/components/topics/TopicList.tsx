"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, errMsg, useFetch } from "@/lib/api";
import { Empty, ErrorBox, Field, Icon, Modal, SkeletonList, Spinner, useToast } from "@/components/ui";

interface TopicItem {
  id: string;
  title: string;
  isPublished: boolean;
  order: number;
  _count: { tests: number; videos: number };
}

/** Qrupun “Mövzular” tabı: müəllim yaradır, sıralayır; tələbə dərc olunmuşları görür. */
export default function TopicList({ groupId }: { groupId: string }) {
  const router = useRouter();
  const toast = useToast();
  const { data, loading, error, reload } = useFetch<{ topics: TopicItem[]; owner: boolean }>(`/api/topics?groupId=${groupId}`);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [moving, setMoving] = useState(false);

  const owner = !!data?.owner;
  const topics = data?.topics ?? [];
  const href = (id: string) => `/${owner ? "teacher" : "student"}/topics/${id}?g=${groupId}`;

  async function create() {
    if (!title.trim()) return;
    setBusy(true);
    try {
      const r = await api<{ id: string }>("/api/topics", { body: { title: title.trim(), groupIds: [groupId] } });
      router.push(`/teacher/topics/${r.id}?g=${groupId}`);
    } catch (e) {
      toast.error(errMsg(e));
      setBusy(false);
    }
  }

  async function move(i: number, d: -1 | 1) {
    const ids = topics.map((t) => t.id);
    [ids[i], ids[i + d]] = [ids[i + d], ids[i]];
    setMoving(true);
    try {
      await api("/api/topics/reorder", { method: "PUT", body: { ids } });
      reload();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setMoving(false);
    }
  }

  if (loading && !data) return <SkeletonList rows={2} className="h-36" />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Mövzular</h2>
          <p className="text-sm text-muted">Hər mövzuda müəllimin qeydləri, testləri və videoları bir yerdə</p>
        </div>
        {owner && (
          <button className="btn-primary" onClick={() => { setTitle(""); setCreating(true); }}>
            <Icon name="plus" size={16} /> Yeni mövzu
          </button>
        )}
      </div>

      {topics.length === 0 ? (
        <Empty
          icon="book"
          title="Hələ mövzu yoxdur"
          text={owner ? "Məsələn “Say sistemləri” adlı mövzu yaradın: qeydlərinizi yazın, test və videoları bağlayın." : "Müəllim mövzu əlavə edəndə burada görünəcək."}
        />
      ) : (
        <ol className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {topics.map((t, i) => (
            <li key={t.id} className="card flex flex-col transition-colors hover:border-brand">
              <Link href={href(t.id)} className="flex flex-1 flex-col gap-3 p-5">
                <span className="grid h-9 w-9 place-items-center rounded bg-tint font-bold text-brand">{i + 1}</span>
                <h3 className="text-base font-bold leading-snug">{t.title}</h3>
                <div className="flex flex-wrap gap-1.5">
                  <span className="badge-muted"><Icon name="book" size={12} /> Kitabxana</span>
                  {t._count.tests > 0 && <span className="badge-muted"><Icon name="file" size={12} /> {t._count.tests} test</span>}
                  {t._count.videos > 0 && <span className="badge-muted"><Icon name="video" size={12} /> {t._count.videos} video</span>}
                </div>
              </Link>
              {owner && (
                <div className="flex items-center justify-between gap-2 border-t border-line px-3 py-2">
                  <span className={t.isPublished ? "badge-ok" : "badge-warn"}>{t.isPublished ? "Dərc olunub" : "Qaralama"}</span>
                  <span className="flex gap-1">
                    <button className="btn-icon h-9 w-9" disabled={moving || i === 0} onClick={() => move(i, -1)} aria-label="Yuxarı"><Icon name="up" size={15} /></button>
                    <button className="btn-icon h-9 w-9" disabled={moving || i === topics.length - 1} onClick={() => move(i, 1)} aria-label="Aşağı"><Icon name="down" size={15} /></button>
                  </span>
                </div>
              )}
            </li>
          ))}
        </ol>
      )}

      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="Yeni mövzu"
        size="sm"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setCreating(false)}>Ləğv et</button>
            <button className="btn-primary" onClick={create} disabled={busy || !title.trim()}>{busy ? <Spinner /> : "Yarat"}</button>
          </>
        }
      >
        <Field label="Mövzunun adı" hint="Yaradandan sonra qaralama kimi açılır; hazır olanda dərc edin.">
          <input
            className="input"
            autoFocus
            maxLength={120}
            placeholder="Məsələn: Say sistemləri"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") void create(); }}
          />
        </Field>
      </Modal>
    </div>
  );
}
