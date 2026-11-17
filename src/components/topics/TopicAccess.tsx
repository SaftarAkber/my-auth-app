"use client";

import { useState } from "react";
import { api, errMsg } from "@/lib/api";
import { cx } from "@/lib/format";
import { Icon, Modal, Spinner, useToast } from "@/components/ui";

export interface TopicAccessValue {
  id: string;
  isPublished: boolean;
  visibility: "PUBLIC" | "GROUP_ONLY";
  groupIds: string[];
}

type Mode = "draft" | "public" | "groups";
const modeOf = (t: TopicAccessValue): Mode => (!t.isPublished ? "draft" : t.visibility === "PUBLIC" ? "public" : "groups");

/**
 * Mövzunun kimə görünəcəyi: Qaralama / Hərkəsə açıq / Qruplar.
 * «Qruplar» seçiləndə müəllimin qrupları açılır və istədiklərini seçir.
 */
export default function TopicAccess({
  topic, groups, onChanged, size = "sm",
}: {
  topic: TopicAccessValue;
  groups: { id: string; name: string }[];
  onChanged: () => void;
  size?: "sm" | "md";
}) {
  const toast = useToast();
  const [busy, setBusy] = useState<Mode | null>(null);
  const [picking, setPicking] = useState(false);
  const [sel, setSel] = useState<string[]>([]);
  const mode = modeOf(topic);

  async function save(next: Mode, groupIds?: string[]) {
    setBusy(next);
    try {
      const body =
        next === "draft" ? { isPublished: false }
        : next === "public" ? { isPublished: true, visibility: "PUBLIC" }
        : { isPublished: true, visibility: "GROUP_ONLY", groupIds };
      await api(`/api/topics/${topic.id}`, { method: "PATCH", body });
      toast.success(next === "draft" ? "Qaralama: yalnız siz görürsünüz" : next === "public" ? "Mövzu hərkəsə açıqdır" : "Mövzu seçilmiş qruplara açıqdır");
      setPicking(false);
      onChanged();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(null);
    }
  }

  function openGroups() {
    setSel(topic.groupIds.filter((g) => groups.some((x) => x.id === g)));
    setPicking(true);
  }

  const opts: { id: Mode; label: string; icon: "eyeOff" | "eye" | "users" }[] = [
    { id: "draft", label: "Qaralama", icon: "eyeOff" },
    { id: "public", label: "Hərkəsə açıq", icon: "eye" },
    { id: "groups", label: mode === "groups" ? `Qruplar (${topic.groupIds.length})` : "Qruplar", icon: "users" },
  ];

  return (
    <>
      <div role="radiogroup" aria-label="Kimə görünsün" className="flex flex-wrap gap-1">
        {opts.map((o) => {
          const on = mode === o.id;
          return (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={on}
              disabled={!!busy}
              onClick={() => (o.id === "groups" ? openGroups() : !on && save(o.id))}
              className={cx(
                "inline-flex items-center gap-1 rounded-md border font-semibold transition-colors",
                size === "sm" ? "min-h-8 px-2 text-xs" : "min-h-10 px-3 text-sm",
                on
                  ? o.id === "draft" ? "border-warn/40 bg-warn/10 text-warn" : "border-ok/40 bg-ok/10 text-ok"
                  : "border-line bg-surface text-muted hover:bg-tint/60 hover:text-brand",
              )}
            >
              {busy === o.id ? <Spinner /> : <Icon name={o.icon} size={size === "sm" ? 12 : 14} />} {o.label}
            </button>
          );
        })}
      </div>

      <Modal
        open={picking}
        onClose={() => setPicking(false)}
        title="Hansı qruplara açıq olsun?"
        size="sm"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setPicking(false)}>Ləğv et</button>
            <button className="btn-primary" onClick={() => save("groups", sel)} disabled={!!busy || sel.length === 0}>
              {busy === "groups" ? <Spinner /> : "Yadda saxla"}
            </button>
          </>
        }
      >
        {groups.length === 0 ? (
          <p className="text-sm text-muted">Hələ qrupunuz yoxdur.</p>
        ) : (
          <div className="grid gap-2">
            {groups.map((g) => {
              const on = sel.includes(g.id);
              return (
                <label key={g.id} className={cx("flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 transition-colors", on ? "border-brand bg-tint" : "border-line hover:bg-tint/50")}>
                  <input
                    type="checkbox"
                    className="h-4 w-4 shrink-0 accent-[rgb(var(--brand))]"
                    checked={on}
                    onChange={() => setSel((s) => (on ? s.filter((x) => x !== g.id) : [...s, g.id]))}
                  />
                  <span className="min-w-0 break-words font-semibold [overflow-wrap:anywhere]">{g.name}</span>
                </label>
              );
            })}
            <p className="text-xs text-muted">Mövzunu yalnız seçilmiş qrupların üzvləri görəcək.</p>
          </div>
        )}
      </Modal>
    </>
  );
}
