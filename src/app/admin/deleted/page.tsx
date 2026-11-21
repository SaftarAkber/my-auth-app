"use client";

import { useState } from "react";
import { api, errMsg, useFetch } from "@/lib/api";
import { fmtDateTime } from "@/lib/format";
import { Empty, ErrorBox, Icon, PageHeader, SkeletonList, Spinner, useConfirm, useToast } from "@/components/ui";

interface Item {
  kind: "collection" | "package" | "user";
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
          : i.kind === "user"
            ? "Hesab yenidən açılacaq: telefon/email, qrup üzvlükləri qayıdacaq, cədvəllərdə yenidən görünəcək."
            : "Test paketi müəllimin səhifəsinə qayıdacaq.",
      confirmText: "Bərpa et",
    });
    if (!ok) return;
    setBusy(i.id);
    try {
      const r = await api<{ warning?: string | null }>("/api/admin/deleted/restore", { body: { kind: i.kind, id: i.id } });
      if (r.warning) toast.error(r.warning);
      else toast.success("Bərpa olundu");
      reload();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(null);
    }
  }

  async function destroy(i: Item) {
    const ok = await confirm({
      title: `“${i.name}” birdəfəlik silinsin?`,
      message: "Hesab bütün coin tarixçəsi, test nəticələri və şərhləri ilə birlikdə silinəcək. Bu geri qaytarıla bilməz.",
      confirmText: "Birdəfəlik sil",
      danger: true,
    });
    if (!ok) return;
    setBusy(i.id);
    try {
      await api(`/api/admin/users/${i.id}?permanent=1`, { method: "DELETE" });
      toast.success("Birdəfəlik silindi");
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
        subtitle="Silinmiş kolleksiya, test paketləri və istifadəçi hesabları. Yanlışlıqla silinibsə buradan bərpa edin."
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
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-tint">
                <Icon name={i.kind === "collection" ? "folder" : i.kind === "user" ? "user" : "file"} size={20} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 font-bold">
                  {i.name}
                  <span className="badge-muted">{i.kind === "collection" ? "Kolleksiya" : i.kind === "user" ? "Hesab" : "Test paketi"}</span>
                  {i.parent && <span className="badge-muted">“{i.parent}” ilə birgə</span>}
                </p>
                <p className="mt-0.5 text-sm text-muted">
                  {i.kind === "user" ? `Əlaqə: ${i.owner}` : `Sahibi: ${i.owner}`} · Sildi: {i.deletedBy} · {fmtDateTime(i.deletedAt)} · {i.info}
                </p>
              </div>
              <button className="btn-primary btn-sm" onClick={() => restore(i)} disabled={busy === i.id}>
                {busy === i.id ? <Spinner /> : <Icon name="retry" size={14} />} Bərpa et
              </button>
              {i.kind === "user" && (
                <button className="btn-ghost btn-sm text-bad" onClick={() => destroy(i)} disabled={busy === i.id}>
                  <Icon name="trash" size={14} /> Birdəfəlik sil
                </button>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
