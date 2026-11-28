"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api, errMsg, useFetch } from "@/lib/api";
import { PostCard, type PostLite } from "@/components/content";
import { Empty, ErrorBox, SkeletonList, Spinner, useToast } from "@/components/ui";

interface Page { posts: PostLite[]; hasMore: boolean }

/**
 * Tələbənin ana səhifəsindəki lent: qruplarının müəllimlərinin paylaşımları (profildə gördüyünün eynisi).
 * Əvvəlcə 10 paylaşım, "Daha çox göstər" ilə növbəti 10.
 */
export default function StudentFeed() {
  const toast = useToast();
  const first = useFetch<Page>("/api/student/feed");
  const [more, setMore] = useState<PostLite[]>([]);
  const [hasMore, setHasMore] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  const posts = [...(first.data?.posts ?? []), ...more];
  const canMore = hasMore ?? first.data?.hasMore ?? false;

  // Bildirişdən gələn keçid (?post=<id>): paylaşım tapılana qədər növbəti səhifələr yüklənir, sonra ora sürüşdürülür
  const target = useSearchParams().get("post");
  const [lit, setLit] = useState<string | null>(null);
  const tries = useRef(0);
  const found = target ? posts.find((p) => (p.ids ?? [p.id]).includes(target)) : undefined;
  useEffect(() => { tries.current = 0; }, [target]);

  async function loadMore() {
    const last = posts[posts.length - 1];
    if (!last) return;
    setBusy(true);
    try {
      const r = await api<Page>(`/api/student/feed?before=${encodeURIComponent(last.createdAt)}`);
      setMore((m) => [...m, ...r.posts]);
      setHasMore(r.hasMore);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!target || !first.data) return;
    if (found) {
      const el = document.getElementById(`post-${found.id}`);
      const id = found.id;
      const t1 = setTimeout(() => { el?.scrollIntoView({ behavior: "smooth", block: "center" }); setLit(id); }, 60);
      const t2 = setTimeout(() => setLit(null), 2300);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
    if (canMore && !busy && tries.current < 15) {
      tries.current += 1;
      const t = setTimeout(loadMore, 0);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, found?.id, first.data, canMore, busy]);

  return (
    <section aria-label="Paylaşımlar">
      <h2 className="mb-3 text-lg font-bold">Paylaşımlar</h2>
      {first.loading && !first.data ? (
        <SkeletonList rows={2} />
      ) : first.error ? (
        <ErrorBox message={first.error} onRetry={first.reload} />
      ) : posts.length === 0 ? (
        <Empty
          icon="message"
          title="Hələ paylaşım yoxdur"
          text="Qoşulduğunuz qrupların müəllimləri paylaşım edəndə burada görünəcək."
          action={<Link href="/student/teachers" className="btn-secondary">Müəllimlərə bax</Link>}
        />
      ) : (
        <div className="space-y-4">
          {posts.map((p) => <PostCard key={p.id} post={p} highlight={lit === p.id} />)}
          {canMore && (
            <div className="flex justify-center">
              <button className="btn-secondary" onClick={loadMore} disabled={busy}>
                {busy && <Spinner />} Daha çox göstər
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
