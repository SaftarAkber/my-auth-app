"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useFetch } from "@/lib/api";
import { cx } from "@/lib/format";
import { Avatar, Empty, Icon, PageHeader, SkeletonList } from "@/components/ui";
import { HIT_ICON, Mark, saveRecent, type Hit } from "@/components/AppShell";

const LABEL: Record<string, string> = { people: "İnsanlar", groups: "Qruplar", tests: "Testlər", videos: "Videolar", posts: "Paylaşımlar" };

function Results() {
  const router = useRouter();
  const sp = useSearchParams();
  const q = (sp.get("q") ?? "").trim();
  const [kind, setKind] = useState<string>("all");
  const { data, loading } = useFetch<{ results: Hit[] }>(q.length >= 2 ? `/api/search?all=1&q=${encodeURIComponent(q)}` : null);
  useEffect(() => { saveRecent(q); }, [q]);

  const hits = data?.results ?? [];
  const kinds = [...new Set(hits.map((h) => h.kind))];
  const shown = kind === "all" ? hits : hits.filter((h) => h.kind === kind);

  return (
    <div className="page-narrow">
      <PageHeader title={q ? `“${q}”` : "Axtarış"} subtitle={data ? `${hits.length} nəticə` : undefined} back />
      {q.length < 2 ? (
        <Empty icon="search" title="Axtarmaq üçün ən azı 2 hərf yazın" />
      ) : loading && !data ? (
        <SkeletonList rows={5} className="h-14" />
      ) : hits.length === 0 ? (
        <Empty icon="search" title="Heç nə tapılmadı" text="Başqa söz yoxlayın." action={<button className="btn-secondary" onClick={() => router.back()}>Geri qayıt</button>} />
      ) : (
        <>
          {kinds.length > 1 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {["all", ...kinds].map((k) => (
                <button key={k} type="button" onClick={() => setKind(k)} className={cx("fpill", kind === k && "on")}>
                  {k === "all" ? "Hamısı" : LABEL[k] ?? k}
                  <span className="text-xs opacity-70">{k === "all" ? hits.length : hits.filter((h) => h.kind === k).length}</span>
                </button>
              ))}
            </div>
          )}
          <ul className="card divide-y divide-line overflow-hidden">
            {shown.map((h) => (
              <li key={`${h.kind}${h.id}`}>
                <Link href={h.href} className="row-link">
                  {h.kind === "people" ? (
                    <Avatar src={h.photo} name={h.title} size={36} />
                  ) : (
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-surface-2 text-muted"><Icon name={HIT_ICON[h.kind] ?? "file"} size={16} /></span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold"><Mark text={h.title} q={q} /></span>
                    <span className="block truncate text-xs text-muted">{h.sub}</span>
                  </span>
                  <Icon name="right" size={16} className="text-muted" />
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="page-narrow"><SkeletonList rows={5} className="h-14" /></div>}>
      <Results />
    </Suspense>
  );
}
