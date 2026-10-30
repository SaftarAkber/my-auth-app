"use client";

import { useState } from "react";
import { api, errMsg, useFetch } from "@/lib/api";
import { fmtDateTime } from "@/lib/format";
import { Empty, ErrorBox, Icon, PageHeader, SkeletonList, Spinner, useConfirm, useToast } from "@/components/ui";

interface Item {
  kind: "collection" | "package";
  id: string;
  name: string;
  owner: string;
  deletedAt: string;
  deletedBy: string;
  info: string;
  parent: string | null;
}

export default function AdminDeletedPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const { data, loading, error, reload } = useFetch<{ items: Item[] }>("/api/admin/deleted");
  const [busy, setBusy] = useState<string | null>(null);

  async function restore(i: Item) {
    const ok = await confirm({
      title: `“${i.name}” bərpa edilsin?`,
      message:
        i.kind === "collection"
          ? "Kolleksiya və onunla birlikdə silinmiş testlər müəllimin səhifəsinə qayıdacaq."
          : "Test paketi müəllimin səhifəsinə qayıdacaq.",
      confirmText: "Bərpa et",
    });
    if (!ok) return;
    setBusy(i.id);
    try {
      await api("/api/admin/deleted/restore", { body: { kind: i.kind, id: i.id } });
      toast.success("Bərpa olundu");
      reload();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(null);
    }
  }

  const items = data?.items ?? [];
  return (
    <div className="page">
      <PageHeader
        title="Silinənlər"
        subtitle="Müəllimlərin sildiyi kolleksiya və test paketləri. Yanlışlıqla silinibsə buradan bərpa edin."
      />
      {loading ? (
        <SkeletonList rows={4} />
      ) : error ? (
        <ErrorBox message={error} onRetry={reload} />
      ) : items.length === 0 ? (
        <Empty icon="trash" title="Silinmiş məzmun yoxdur" />
      ) : (
        <div className="space-y-3">
          {items.map((i) => (
            <article key={`${i.kind}${i.id}`} className="card flex flex-wrap items-center gap-4 p-4">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-sun/40">
                <Icon name={i.kind === "collection" ? "folder" : "file"} size={20} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 font-bold">
                  {i.name}
                  <span className="badge-muted">{i.kind === "collection" ? "Kolleksiya" : "Test paketi"}</span>
                  {i.parent && <span className="badge-muted">“{i.parent}” ilə birgə</span>}
                </p>
                <p className="mt-0.5 text-sm text-muted">
                  Sahibi: {i.owner} · Sildi: {i.deletedBy} · {fmtDateTime(i.deletedAt)} · {i.info}
                </p>
              </div>
              <button className="btn-primary btn-sm" onClick={() => restore(i)} disabled={busy === i.id}>
                {busy === i.id ? <Spinner /> : <Icon name="retry" size={14} />} Bərpa et
              </button>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
