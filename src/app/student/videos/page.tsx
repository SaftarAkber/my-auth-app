"use client";

import Link from "next/link";
import { useState } from "react";
import { useFetch } from "@/lib/api";
import { VideoPackageBlock, type VideoLite } from "@/components/content";
import { VideoPlayer } from "@/components/video";
import { Empty, ErrorBox, PageHeader, SkeletonList } from "@/components/ui";

interface Pack {
  id: string;
  name: string;
  description: string | null;
  teacher: { id: string; name: string } | null;
  videoPackageGroups: { group: { id: string; name: string } }[];
  videos: VideoLite[];
}

export default function StudentVideosPage() {
  const { data, loading, error, reload } = useFetch<{ packages: Pack[] }>("/api/student/videos");
  const [video, setVideo] = useState<VideoLite | null>(null);

  return (
    <div className="page">
      <PageHeader title="Videolar" subtitle="Qruplarına açılan video dərslər" />

      {loading ? (
        <SkeletonList rows={3} className="h-28" />
      ) : error ? (
        <ErrorBox message={error} onRetry={reload} />
      ) : (data?.packages ?? []).length === 0 ? (
        <Empty
          icon="video"
          title="Hələ video yoxdur"
          text="Qrupa qoşulduqda və müəllim video paketi açdıqda burada görünəcək."
          action={<Link href="/student/teacher" className="btn-primary">Qruplara bax</Link>}
        />
      ) : (
        <div className="grid items-start gap-5 xl:grid-cols-2">
          {data!.packages.map((p) => (
            <div key={p.id}>
              <p className="mb-2 text-sm font-semibold text-muted">
                {p.teacher && <Link href={`/u/${p.teacher.id}`} className="text-ink hover:underline">{p.teacher.name}</Link>}
                {p.videoPackageGroups.length > 0 && <> · {p.videoPackageGroups.map((g) => g.group.name).join(", ")}</>}
              </p>
              <VideoPackageBlock pkg={p} onPlay={setVideo} />
            </div>
          ))}
        </div>
      )}
      <VideoPlayer video={video} onClose={() => setVideo(null)} />
    </div>
  );
}
