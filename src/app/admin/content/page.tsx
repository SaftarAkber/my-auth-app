"use client";

import { useEffect, useState } from "react";
import { api, errMsg, useFetch } from "@/lib/api";
import { cx } from "@/lib/format";
import { Empty, ErrorBox, Field, Icon, Modal, PageHeader, SkeletonList, Spinner, useConfirm, useToast } from "@/components/ui";

interface FieldSpec {
  key: string;
  label: string;
  type: "text" | "textarea" | "bool" | "select";
  options?: { value: string; label: string }[];
}
interface Item {
  id: string;
  title: string;
  sub: string;
  owner: string;
  values: Record<string, string | boolean | null>;
}
interface Res { kind: string; label: string; fields: FieldSpec[]; items: Item[] }

const KINDS = [
  ["groups", "Qruplar"],
  ["tests", "Testlər"],
  ["questions", "Test sualları"],
  ["videopacks", "Video paketləri"],
  ["videos", "Videolar"],
  ["posts", "Paylaşımlar"],
  ["requests", "Müraciətlər"],
  ["comments", "Video sualları"],
] as const;

export default function AdminContentPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [kind, setKind] = useState<string>("groups");
  const [q, setQ] = useState("");
  const [dq, setDq] = useState("");
  const [editing, setEditing] = useState<Item | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDq(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);

  const { data, loading, error, reload } = useFetch<Res>(`/api/admin/content?kind=${kind}&q=${encodeURIComponent(dq)}`);

  async function remove(i: Item) {
    const ok = await confirm({
      title: "Silinsin?",
      message: `“${i.title.slice(0, 80)}” və ona bağlı məlumat silinəcək. Bunu geri qaytarmaq olmur.`,
      confirmText: "Sil",
      danger: true,
    });
    if (!ok) return;
    try {
      await api(`/api/admin/content/${kind}/${i.id}`, { method: "DELETE" });
      toast.success("Silindi");
      reload();
    } catch (e) {
      toast.error(errMsg(e));
    }
  }

  return (
    <div className="page">
      <PageHeader title="Məzmun" subtitle="Admin hər şeyi düzəldə və silə bilər" />

      <div className="-mx-1 mb-5 flex gap-2 overflow-x-auto px-1 pb-3 pt-1">
        {KINDS.map(([k, l]) => (
          <button
            key={k}
            onClick={() => setKind(k)}
            className={cx(
              "shrink-0 rounded-full border-[2.5px] border-ink px-4 py-1.5 text-sm font-semibold transition hover:-translate-y-0.5",
              kind === k ? "bg-ink text-white" : "bg-white hover:bg-sun/40",
            )}
          >
            {l}
          </button>
        ))}
      </div>

      <div className="relative mb-5 max-w-md">
        <Icon name="search" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" size={17} />
        <input className="input pl-10" placeholder="Başlıq və ya sahib üzrə axtar" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {loading && !data ? (
        <SkeletonList rows={5} className="h-14" />
      ) : error ? (
        <ErrorBox message={error} onRetry={reload} />
      ) : !data || data.items.length === 0 ? (
        <Empty icon="inbox" title="Burada heç nə yoxdur" />
      ) : (
        <div className="card max-w-[1400px] overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-[2.5px] border-ink bg-surface-2 text-left">
                <th className="px-4 py-3 font-semibold">Başlıq</th>
                <th className="px-4 py-3 font-semibold">Sahibi</th>
                <th className="px-4 py-3 font-semibold">Təfərrüat</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {data.items.map((i) => (
                <tr key={i.id} className="border-b border-line transition last:border-0 hover:bg-sun/20">
                  <td className="max-w-md px-4 py-2.5 font-medium"><span className="line-clamp-2">{i.title}</span></td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-muted">{i.owner}</td>
                  <td className="max-w-sm px-4 py-2.5 text-muted"><span className="line-clamp-2">{i.sub}</span></td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-right">
                    <button className="btn-icon" onClick={() => setEditing(i)} aria-label="Redaktə et"><Icon name="edit" size={16} /></button>
                    <button className="btn-icon hover:!bg-flame hover:!text-white" onClick={() => remove(i)} aria-label="Sil"><Icon name="trash" size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && data && (
        <EditItem key={editing.id} kind={kind} item={editing} fields={data.fields} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload(); }} />
      )}
    </div>
  );
}

function EditItem({
  kind, item, fields, onClose, onSaved,
}: { kind: string; item: Item; fields: FieldSpec[]; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [vals, setVals] = useState<Record<string, string | boolean | null>>(item.values);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      await api(`/api/admin/content/${kind}/${item.id}`, { method: "PATCH", body: vals });
      toast.success("Yadda saxlanıldı");
      onSaved();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Düzəliş et"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>Ləğv et</button>
          <button className="btn-primary" onClick={save} disabled={busy}>{busy ? <Spinner /> : "Yadda saxla"}</button>
        </>
      }
    >
      <div className="grid gap-4">
        {fields.map((f) =>
          f.type === "bool" ? (
            <label key={f.key} className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border-[2.5px] border-ink p-3">
              <span className="text-sm font-semibold">{f.label}</span>
              <input
                type="checkbox"
                className="h-5 w-5 accent-ink"
                checked={!!vals[f.key]}
                onChange={(e) => setVals({ ...vals, [f.key]: e.target.checked })}
              />
            </label>
          ) : (
            <Field key={f.key} label={f.label}>
              {f.type === "textarea" ? (
                <textarea className="input min-h-24" value={(vals[f.key] as string) ?? ""} onChange={(e) => setVals({ ...vals, [f.key]: e.target.value })} />
              ) : f.type === "select" ? (
                <select className="input" value={(vals[f.key] as string) ?? ""} onChange={(e) => setVals({ ...vals, [f.key]: e.target.value })}>
                  {f.options!.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              ) : (
                <input className="input" value={(vals[f.key] as string) ?? ""} onChange={(e) => setVals({ ...vals, [f.key]: e.target.value })} />
              )}
            </Field>
          ),
        )}
      </div>
    </Modal>
  );
}
