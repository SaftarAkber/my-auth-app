"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api, errMsg } from "@/lib/api";
import { cx } from "@/lib/format";
import { Icon, Spinner, useToast } from "@/components/ui";
import { VideoThumb } from "@/components/content";

interface Card {
  id: string;
  title: string;
  url: string;
  createdAt: string;
  teacher: { id: string; name: string };
  views: number;
  duration: number | null;
  draft?: boolean;
}
interface Pkg { id: string; name: string; videos: Card[] }
interface Side {
  pinned: Card[];
  currentPackage: Pkg | null;
  groupPackages: Pkg[];
  feed: Card[];
  hasMore: boolean;
}

const clock = (sec: number | null) => {
  if (!sec) return null;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = String(sec % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
};

/** Sağ siyahının bir sətri (YouTube kimi): qutusuz, solda miniatür, sağda ad (ən çoxu 2 sətir) və məlumat; üzərinə gələndə rəng dəyişir */
function Row({ v, active, pinned }: { v: Card; active?: boolean; pinned?: boolean }) {
  return (
    <Link
      href={`/watch/${v.id}`}
      aria-current={active ? "true" : undefined}
      className={cx("group flex gap-2.5 rounded-xl p-1.5 transition-colors", active ? "bg-tint" : "hover:bg-tint")}
    >
      <VideoThumb url={v.url} plain badge={clock(v.duration)} className="w-[168px] shrink-0 rounded-lg" />
      <span className="min-w-0 flex-1 py-0.5">
        <span className="line-clamp-2 block h-[2.5rem] text-sm font-bold leading-tight">{v.title}</span>
        <span className="mt-1 block truncate text-xs text-muted">{v.teacher.name}</span>
        <span className="block truncate text-xs text-muted">
          {v.views.toLocaleString("az-AZ")} baxış
          {v.draft && <span className="ml-2 rounded bg-ink px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">Qaralama</span>}
          {pinned && <span className="ml-2 inline-flex items-center gap-1 font-semibold text-ink"><Icon name="pin" size={11} /> Sancılmış</span>}
        </span>
      </span>
    </Link>
  );
}

/** Açılıb-bağlanan paket bloku (ox ilə) */
function PackageBlock({ pkg, activeId, defaultOpen }: { pkg: Pkg; activeId: string; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="rounded-xl border border-line/30 bg-white/60">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left transition-colors hover:bg-tint" aria-expanded={open}>
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-tint"><Icon name="video" size={16} /></span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-extrabold">{pkg.name}</span>
          <span className="block text-xs text-muted">{pkg.videos.length} video</span>
        </span>
        <Icon name="down" size={18} className={cx("shrink-0 transition", open && "rotate-180")} />
      </button>
      {open && (
        <div className="border-t-2 border-line p-1">
          {pkg.videos.map((v) => <Row key={v.id} v={v} active={v.id === activeId} />)}
        </div>
      )}
    </section>
  );
}

export default function WatchSidebar({ videoId }: { videoId: string }) {
  const toast = useToast();
  const [seed] = useState(() => Math.random().toString(36).slice(2, 8));
  const [side, setSide] = useState<Side | null>(null);
  const [feed, setFeed] = useState<Card[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [more, setMore] = useState(false);

  const load = useCallback(async (p: number) => {
    if (p > 0) setMore(true);
    try {
      const d = await api<Side>(`/api/watch/${videoId}/sidebar?page=${p}&seed=${seed}`);
      if (p === 0) setSide(d);
      setFeed((f) => (p === 0 ? d.feed : [...f, ...d.feed]));
      setHasMore(d.hasMore);
      setPage(p);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setLoading(false);
      setMore(false);
    }
  }, [videoId, seed, toast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(0);
  }, [load]);

  if (loading) return <div className="flex justify-center py-10"><Spinner className="text-brand" /></div>;

  return (
    <div className="space-y-2">
      {(side?.pinned ?? []).length > 0 && (
        <div>
          {side!.pinned.map((v) => <Row key={v.id} v={v} pinned />)}
        </div>
      )}
      {side?.currentPackage && <PackageBlock pkg={side.currentPackage} activeId={videoId} defaultOpen />}
      {(side?.groupPackages ?? []).map((p) => (
        <PackageBlock key={p.id} pkg={p} activeId={videoId} defaultOpen={false} />
      ))}
      {feed.length > 0 && (
        <div>
          {feed.map((v) => <Row key={v.id} v={v} />)}
        </div>
      )}
      {hasMore && (
        <button className="btn-secondary w-full" onClick={() => load(page + 1)} disabled={more}>
          {more ? <Spinner /> : <Icon name="down" size={15} />} Daha çox video
        </button>
      )}
    </div>
  );
}
