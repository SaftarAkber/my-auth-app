"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, errMsg, useFetch } from "@/lib/api";
import { fmtDate, videoEmbed, videoThumb } from "@/lib/format";
import { Avatar, Empty, ErrorBox, Icon, SkeletonList, Spinner, useToast } from "@/components/ui";
import { SubjectBadges } from "@/components/Subjects";
import VideoComments from "@/components/VideoComments";
import WatchSidebar from "@/components/WatchSidebar";

interface Detail {
  id: string;
  title: string;
  description: string | null;
  url: string;
  createdAt: string;
  teacher: { id: string; name: string; photo: string | null; subjects: string[] };
  package: { id: string; name: string } | null;
  state: "draft" | "public" | "groups";
  pinned: boolean;
  views: number;
  likes: number;
  liked: boolean;
  isOwner: boolean;
  groupAccess: boolean;
  uploaded: boolean;
  ready: boolean;
  duration: number | null;
}

function WatchView({ id }: { id: string }) {
  const toast = useToast();
  const router = useRouter();
  const { data, loading, error, reload } = useFetch<{ video: Detail }>(`/api/watch/${id}`);
  const v = data?.video;
  const processing = !!v && v.uploaded && !v.ready;

  // Yüklənmiş video hələ çevrilirsə, hazır olana qədər 10 saniyədən bir yoxla
  useEffect(() => {
    if (!processing) return;
    const t = setInterval(reload, 10_000);
    return () => clearInterval(t);
  }, [processing, reload]);
  const [views, setViews] = useState<number | null>(null);
  const [likes, setLikes] = useState<{ n: number; liked: boolean } | null>(null);
  const [more, setMore] = useState(false);

  // Baxışı qeyd et (hər istifadəçidən bir dəfə sayılır)
  useEffect(() => {
    if (!v) return;
    api<{ views: number }>(`/api/videos/${id}/view`, { method: "POST" }).then((d) => setViews(d.views)).catch(() => {});
  }, [v, id]);

  async function like() {
    try {
      const d = await api<{ liked: boolean; likes: number }>(`/api/videos/${id}/like`, { method: "POST" });
      setLikes({ n: d.likes, liked: d.liked });
    } catch (e) {
      toast.error(errMsg(e));
    }
  }

  if (loading) return <div className="page"><SkeletonList rows={3} className="h-48" /></div>;
  if (error || !v) {
    const denied = (error ?? "").includes("İcazə");
    return (
      <div className="page">
        {denied ? (
          <Empty
            icon="lock"
            title="Bu video sizə açıq deyil"
            text="Video yalnız müəyyən qrupların üzvlərinə və ya hamıya açıq olduqda görünür."
            action={<button className="btn-primary" onClick={() => router.back()}>Geri qayıt</button>}
          />
        ) : (
          <ErrorBox message={error ?? "Video tapılmadı"} />
        )}
      </div>
    );
  }

  const embed = videoEmbed(v.url);
  const likeCount = likes?.n ?? v.likes;
  const liked = likes?.liked ?? v.liked;
  const viewCount = views ?? v.views;
  const longDesc = (v.description ?? "").length > 220;

  return (
    <div className="mx-auto w-full max-w-[1700px] px-4 py-5 lg:px-8 lg:py-6">
      {/* Telefonda sıra: video → siyahı → şərhlər; geniş ekranda sol sütun (video + şərhlər), sağda siyahı */}
      <div className="grid gap-x-6 gap-y-6 xl:grid-cols-[minmax(0,1fr)_430px]">
        <div className="min-w-0 xl:col-start-1 xl:row-start-1">
          <div className="aspect-video w-full overflow-hidden rounded-xl border border-line bg-black shadow-soft">
            {v.uploaded ? (
              processing ? (
                <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-ink px-6 text-center text-white">
                  <Spinner className="text-sun" />
                  <p className="text-lg font-extrabold">Video işlənir</p>
                  <p className="max-w-md text-sm text-white/80">Hər cihazda oynasın deyə video çevrilir. Bir neçə dəqiqə çəkə bilər, səhifə avtomatik yenilənəcək.</p>
                </div>
              ) : (
                <video
                  src={v.url}
                  poster={videoThumb(v.url) ?? undefined}
                  controls
                  playsInline
                  preload="metadata"
                  // Telefonlarda səsli avtomatik oynatma bloklanır, orada istifadəçi özü başladır
                  autoPlay={typeof window !== "undefined" && !window.matchMedia("(pointer: coarse)").matches}
                  className="h-full w-full bg-black"
                />
              )
            ) : embed ? (
              <iframe
                src={embed}
                className="h-full w-full"
                allowFullScreen
                allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
                title={v.title}
              />
            ) : (
              <video src={v.url} controls playsInline className="h-full w-full" />
            )}
          </div>

          <h1 className="mt-4 text-xl font-extrabold leading-snug sm:text-2xl">{v.title}</h1>
          {v.isOwner && v.state === "draft" && (
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-line bg-tint px-3 py-1 text-xs font-bold">
              <Icon name="lock" size={12} /> Qaralama, yalnız siz görürsünüz
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Link href={`/u/${v.teacher.id}`} className="flex min-w-0 items-center gap-2.5 hover:underline">
              <Avatar src={v.teacher.photo} name={v.teacher.name} size={42} />
              <span className="min-w-0">
                <span className="block truncate font-bold">{v.teacher.name}</span>
                <span className="mt-0.5 flex flex-wrap gap-1"><SubjectBadges subjects={v.teacher.subjects} /></span>
              </span>
            </Link>
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={like}
                aria-pressed={liked}
                className={`inline-flex items-center gap-2 rounded-md border border-line px-4 py-2 text-sm font-bold transition ${liked ? "bg-tint" : "bg-white hover:bg-tint"}`}
              >
                <Icon name="thumb" size={16} /> {likeCount.toLocaleString("az-AZ")}
              </button>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-line bg-white p-4">
            <p className="text-sm font-bold">
              {viewCount.toLocaleString("az-AZ")} baxış · {fmtDate(v.createdAt)}
              {v.package && <span className="ml-2 font-semibold text-muted">· {v.package.name}</span>}
            </p>
            {v.description ? (
              <>
                <p className={`mt-2 whitespace-pre-wrap text-sm ${longDesc && !more ? "line-clamp-3" : ""}`}>{v.description}</p>
                {longDesc && (
                  <button className="mt-1 text-sm font-bold text-brand hover:underline" onClick={() => setMore((m) => !m)}>
                    {more ? "Daha az" : "Daha çox"}
                  </button>
                )}
              </>
            ) : (
              <p className="mt-2 text-sm text-muted">Təsvir yoxdur.</p>
            )}
          </div>

        </div>

        <aside className="min-w-0 xl:sticky xl:top-[88px] xl:col-start-2 xl:row-span-2 xl:row-start-1 xl:max-h-[calc(100dvh-104px)] xl:self-start xl:overflow-y-auto xl:pr-1">
          <WatchSidebar videoId={v.id} />
        </aside>

        <div className="min-w-0 xl:col-start-1 xl:row-start-2">
          <VideoComments videoId={v.id} ownerId={v.teacher.id} groupAccess={v.groupAccess} />
        </div>
      </div>
    </div>
  );
}

export default function WatchPage() {
  const { id } = useParams<{ id: string }>();
  // key: başqa videoya keçəndə bütün vəziyyət (şərhlər, siyahı) təzədən başlasın
  return <WatchView key={id} id={id} />;
}
