"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useFetch } from "@/lib/api";
import TopicReader from "@/components/topics/TopicReader";
import { useTestRunner } from "@/components/TestTaker";
import { BankRow, TestRow, VideoTile, type TestPackageLite, type VideoLite } from "@/components/content";
import { Empty, ErrorBox, Icon, SkeletonList, Tabs } from "@/components/ui";

interface TopicData {
  owner: false;
  topic: {
    id: string;
    title: string;
    content: string;
    teacher: { id: string; name: string; photo: string | null };
    groups: { id: string; name: string }[];
    tests: TestPackageLite[];
    videos: VideoLite[];
  };
}

/** Tələbə: mövzu açılanda birinci Kitabxana görünür; sonra bağlı testlər və videolar */
export default function StudentTopicPage() {
  const { id } = useParams<{ id: string }>();
  const g = useSearchParams().get("g");
  const { data, loading, error, reload } = useFetch<TopicData>(`/api/topics/${id}`);
  const [tab, setTab] = useState<"library" | "tests" | "videos">("library");
  const { begin: run, starting, node } = useTestRunner(() => reload());

  const t = data?.topic;
  const back = useMemo(() => {
    const grp = (t?.groups ?? []).find((x) => x.id === g) ?? t?.groups[0];
    return grp ? { href: `/student/groups/${grp.id}`, name: grp.name } : { href: "/student/teacher", name: "Qruplar" };
  }, [t, g]);

  const begin = (p: TestPackageLite) => run(p);
  const banks = (t?.tests ?? []).filter((p) => p.isBank);

  if (loading && !data) return <div className="page"><SkeletonList rows={3} className="h-40" /></div>;
  if (error || !t) return <div className="page"><ErrorBox message={error ?? "Mövzu tapılmadı"} onRetry={reload} /></div>;

  return (
    <div className="page">
      <nav className="mb-3 text-sm text-muted" aria-label="Yol">
        <Link href={back.href} className="inline-flex min-h-8 items-center gap-1 hover:text-brand"><Icon name="left" size={15} /> {back.name}</Link>
        <span className="mx-1.5">/</span>Mövzular
      </nav>
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t.title}</h1>
      <p className="mt-1 text-sm text-muted">Müəllim: {t.teacher.name}</p>

      <div className="mt-6">
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { id: "library", label: "Kitabxana" },
            { id: "tests", label: "Testlər", count: t.tests.length },
            { id: "videos", label: "Videolar", count: t.videos.length },
          ]}
        />

        {tab === "library" && (
          <>
            <TopicReader html={t.content} rememberKey={`topic-page:${t.id}`} />
            {/* Oxuduqdan sonra: mövzu üzrə təsadüfi test */}
            {banks.length > 0 && (
              <section className="mt-6 max-w-[760px] space-y-3" aria-label="Mövzu üzrə test">
                <h2 className="text-lg font-bold">Mövzunu oxudunuz? Özünüzü yoxlayın</h2>
                {banks.map((p) => <BankRow key={p.id} pkg={p} title={t.title} onStart={begin} busy={starting === p.id} />)}
              </section>
            )}
          </>
        )}

        {tab === "tests" &&
          (t.tests.length === 0 ? (
            <Empty icon="file" title="Bu mövzuda hələ test yoxdur" />
          ) : (
            <div className="space-y-3">
              {t.tests.map((p) => <TestRow key={p.id} pkg={p} onStart={begin} busy={starting === p.id} />)}
            </div>
          ))}

        {tab === "videos" &&
          (t.videos.length === 0 ? (
            <Empty icon="video" title="Bu mövzuda hələ video yoxdur" />
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {t.videos.map((v) => <VideoTile key={v.id} video={v} />)}
            </div>
          ))}
      </div>

      {node}
    </div>
  );
}
