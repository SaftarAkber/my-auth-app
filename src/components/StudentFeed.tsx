"use client";

import Link from "next/link";
import { useState } from "react";
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
          action={<Link href="/student/teacher" className="btn-secondary">Müəllimlərə bax</Link>}
        />
      ) : (
        <div className="space-y-4">
          {posts.map((p) => <PostCard key={p.id} post={p} />)}
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
