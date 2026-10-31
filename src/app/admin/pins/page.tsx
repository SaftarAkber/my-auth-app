"use client";

import { useEffect, useState } from "react";
import { api, errMsg, useFetch } from "@/lib/api";
import { videoThumb } from "@/lib/format";
import { ErrorBox, Icon, Img, PageHeader, SkeletonList, Spinner, useToast } from "@/components/ui";

interface Item {
  id: string;
  title: string;
  url: string;
  teacher: { id: string; name: string };
}

function Row({ v, children }: { v: Item; children: React.ReactNode }) {
  const thumb = videoThumb(v.url);
  return (
    <div className="flex items-center gap-3 rounded-xl border-2 border-ink/15 bg-white p-2.5">
      <span className="relative block aspect-video w-28 shrink-0 overflow-hidden rounded-lg bg-surface-2">
        {thumb && <Img src={thumb} className="h-full w-full object-cover" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-sm font-bold leading-snug">{v.title}</p>
        <p className="mt-0.5 truncate text-xs text-muted">{v.teacher.name}</p>
      </div>
      {children}
    </div>
  );
}

export default function AdminPinsPage() {
  const toast = useToast();
  const [q, setQ] = useState("");
  const [dq, setDq] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setDq(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);

  const { data, loading, error, reload } = useFetch<{ pinned: Item[]; results: Item[] }>(`/api/admin/pins?q=${encodeURIComponent(dq)}`);
  const pinned = data?.pinned ?? [];

  async function save(ids: string[]) {
    setBusy(true);
    try {
      await api("/api/admin/pins", { method: "PUT", body: { videoIds: ids } });
      reload();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  }
  const move = (i: number, d: -1 | 1) => {
    const ids = pinned.map((p) => p.id);
    [ids[i], ids[i + d]] = [ids[i + d], ids[i]];
    void save(ids);
  };

  return (
    <div className="page">
      <PageHeader
        title="Sancılmış videolar"
        subtitle="Ən çoxu 3 video. Hər istifadəçinin video səhifəsinin sağ siyahısında ən yuxarıda göstərilir. Sancılmış video hamıya açıqdır (reklam kimi)."
      />
      {loading ? (
        <SkeletonList rows={3} />
      ) : error ? (
        <ErrorBox message={error} onRetry={reload} />
      ) : (
        <div className="grid gap-8 lg:grid-cols-2">
          <section>
            <h2 className="mb-3 text-lg font-bold">Sancılmış ({pinned.length}/3)</h2>
            {pinned.length === 0 ? (
              <p className="rounded-xl border-2 border-dashed border-ink/30 p-6 text-center text-sm text-muted">Heç nə sancılmayıb.</p>
            ) : (
              <div className="space-y-2">
                {pinned.map((v, i) => (
                  <Row key={v.id} v={v}>
                    <div className="flex shrink-0 gap-1">
                      <button className="btn-icon h-8 w-8" disabled={busy || i === 0} onClick={() => move(i, -1)} aria-label="Yuxarı"><Icon name="up" size={15} /></button>
                      <button className="btn-icon h-8 w-8" disabled={busy || i === pinned.length - 1} onClick={() => move(i, 1)} aria-label="Aşağı"><Icon name="down" size={15} /></button>
                      <button className="btn-icon h-8 w-8 hover:!text-bad" disabled={busy} onClick={() => save(pinned.filter((p) => p.id !== v.id).map((p) => p.id))} aria-label="Sancağı götür"><Icon name="x" size={15} /></button>
                    </div>
                  </Row>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-3 text-lg font-bold">Video əlavə et</h2>
            <input className="input mb-3" placeholder="Video adı və ya müəllim adı (ən azı 2 hərf)" value={q} onChange={(e) => setQ(e.target.value)} />
            <div className="space-y-2">
              {(data?.results ?? []).map((v) => {
                const already = pinned.some((p) => p.id === v.id);
                return (
                  <Row key={v.id} v={v}>
                    <button
                      className="btn-soft btn-sm shrink-0"
                      disabled={busy || already || pinned.length >= 3}
                      onClick={() => save([...pinned.map((p) => p.id), v.id])}
                    >
                      {busy ? <Spinner /> : <Icon name="plus" size={14} />} {already ? "Sancılıb" : "Sanc"}
                    </button>
                  </Row>
                );
              })}
              {dq.length >= 2 && (data?.results ?? []).length === 0 && <p className="text-sm text-muted">Dərc olunmuş video tapılmadı.</p>}
            </div>
            {pinned.length >= 3 && <p className="mt-3 text-xs text-muted">3 video sancılıb. Yenisini əlavə etmək üçün birini götürün.</p>}
          </section>
        </div>
      )}
    </div>
  );
}
