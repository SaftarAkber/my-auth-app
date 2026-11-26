"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, errMsg, useFetch } from "@/lib/api";
import { cx, fmtDateTime, percent, toInputDateTime } from "@/lib/format";
import { Avatar, Empty, ErrorBox, Field, Icon, Modal, SkeletonList, Spinner, useConfirm, useToast } from "@/components/ui";
import Countdown from "@/components/Countdown";

type Status = "done" | "pending" | "overdue";
interface Assignment {
  id: string;
  packageId: string;
  minAttempts: number;
  deadline: string;
  createdAt: string;
  coinReward: number | null;
  note: string | null;
  package: { id: string; name: string; isBank: boolean };
  groups: { groupId: string; group: { id: string; name: string } }[];
  exempts: { studentId: string }[];
  rows: { student: { id: string; name: string; photo: string | null }; count: number; status: Status }[];
  exempted: { id: string; name: string }[];
  done: number;
  active: boolean;
}

/** Status nişanı: yaşıl ✓ N/N, boz 1/3, qırmızı 1/3 (vaxt bitib) */
export function ProgressChip({ count, min, status }: { count: number; min: number; status: Status }) {
  return (
    <span
      className={cx(
        "inline-flex min-w-[56px] items-center justify-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold tabular-nums",
        status === "done" ? "bg-ok/15 text-ok" : status === "overdue" ? "bg-bad/15 text-bad" : "bg-surface-2 text-muted",
      )}
    >
      {status === "done" && <Icon name="check" size={13} />}
      {Math.min(count, min)}/{min}
    </span>
  );
}

/** Müəllim: qrupun "Tapşırıqlar" bölməsi */
export default function GroupAssignments({ groupId }: { groupId: string }) {
  const toast = useToast();
  const confirm = useConfirm();
  const { data, loading, error, reload } = useFetch<{ assignments: Assignment[] }>(`/api/assignments?groupId=${groupId}`);
  const [editing, setEditing] = useState<Assignment | "new" | null>(null);
  const [who, setWho] = useState<{ a: Assignment; student: Assignment["rows"][number]["student"] } | null>(null);

  async function remove(a: Assignment) {
    if (!(await confirm({ title: "Tapşırıq silinsin?", message: `“${a.package.name}” tapşırığı bütün qruplardan silinəcək. Tələbələrin cəhdləri silinmir.`, confirmText: "Sil", danger: true }))) return;
    try {
      await api(`/api/assignments/${a.id}`, { method: "DELETE" });
      toast.success("Tapşırıq silindi");
      reload();
    } catch (e) {
      toast.error(errMsg(e));
    }
  }

  if (loading && !data) return <SkeletonList rows={3} />;
  if (error || !data) return <ErrorBox message={error ?? "Tapılmadı"} onRetry={reload} />;
  const list = data.assignments;

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button className="btn-primary" onClick={() => setEditing("new")}><Icon name="plus" size={16} /> Tapşırıq ver</button>
      </div>
      {list.length === 0 ? (
        <Empty icon="file" title="Hələ tapşırıq yoxdur" text="Test paketi seçin və son tarix qoyun – tələbələr ana səhifədə görəcək." />
      ) : (
        <div className="space-y-4">
          {list.map((a) => (
            <article key={a.id} className={cx("card p-4 sm:p-5", !a.active && "opacity-90")}>
              <header className="flex flex-wrap items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="break-words font-bold [overflow-wrap:anywhere]">{a.package.name}</p>
                  <p className="mt-0.5 text-sm text-muted">
                    {a.package.isBank ? `Ən azı ${a.minAttempts} dəfə işləsin` : a.minAttempts > 1 ? `${a.minAttempts} dəfə bitirsin` : "Paketi bitirsin"}
                    {" · "}son tarix {fmtDateTime(a.deadline)}
                    {a.coinReward ? ` · bitirənə +${a.coinReward} coin` : ""}
                  </p>
                  {a.note && <p className="mt-1 whitespace-pre-wrap text-sm">{a.note}</p>}
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                    {a.active ? <Countdown to={a.deadline} /> : <span className="font-semibold text-muted">Bitib</span>}
                    <span className="text-muted">{a.done}/{a.rows.length} tələbə bitirib</span>
                    {a.groups.length > 1 && <span className="badge-muted">{a.groups.map((g) => g.group.name).join(", ")}</span>}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button className="btn-icon" onClick={() => setEditing(a)} aria-label="Redaktə et"><Icon name="edit" size={16} /></button>
                  <button className="btn-icon text-bad" onClick={() => remove(a)} aria-label="Sil"><Icon name="trash" size={16} /></button>
                </div>
              </header>
              <ul className="mt-3 divide-y divide-line rounded-lg border border-line">
                {a.rows.map((r) => (
                  <li key={r.student.id}>
                    <button type="button" onClick={() => setWho({ a, student: r.student })} className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-tint">
                      <Avatar src={r.student.photo} name={r.student.name} size={28} />
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold">{r.student.name}</span>
                      <ProgressChip count={r.count} min={a.minAttempts} status={r.status} />
                    </button>
                  </li>
                ))}
                {a.rows.length === 0 && <li className="px-3 py-2 text-sm text-muted">Bu qrupda tələbə yoxdur.</li>}
              </ul>
              {a.exempted.length > 0 && <p className="mt-2 text-xs text-muted">Azad edilib: {a.exempted.map((s) => s.name).join(", ")}</p>}
            </article>
          ))}
        </div>
      )}

      {editing && <AssignmentEditor groupId={groupId} initial={editing === "new" ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload(); }} />}
      {who && <StudentAttempts a={who.a} student={who.student} onClose={() => setWho(null)} />}
    </div>
  );
}

/** Tələbənin tapşırığa sayılan cəhdləri (aşağıdan açılan pəncərə) */
function StudentAttempts({ a, student, onClose }: { a: Assignment; student: { id: string; name: string }; onClose: () => void }) {
  const { data, loading, error, reload } = useFetch<{ attempts: { id: string; score: number | null; totalScore: number | null; finishedAt: string }[]; coins: number }>(
    `/api/assignments/${a.id}/student/${student.id}`,
  );
  return (
    <Modal open onClose={onClose} title={student.name}>
      <p className="mb-3 text-sm text-muted">
        {a.package.name} · tapşırığa sayılan cəhdlər ({fmtDateTime(a.createdAt)} – {fmtDateTime(a.deadline)})
      </p>
      {loading && !data ? (
        <div className="flex justify-center py-6"><Spinner /></div>
      ) : error || !data ? (
        <ErrorBox message={error ?? "Tapılmadı"} onRetry={reload} />
      ) : data.attempts.length === 0 ? (
        <p className="text-sm text-muted">Bu müddətdə sayılan cəhd yoxdur.</p>
      ) : (
        <ul className="divide-y divide-line">
          {data.attempts.map((t, i) => {
            const p = percent(t.score, t.totalScore);
            return (
              <li key={t.id}>
                <Link href={`/teacher/attempts/${t.id}`} className="flex items-center gap-3 py-2.5 hover:underline">
                  <span className="w-6 text-center text-sm font-bold text-muted">{i + 1}</span>
                  <span className="min-w-0 flex-1 text-sm">
                    <span className="font-semibold">{t.score}/{t.totalScore} düz</span>
                    <span className="block text-xs text-muted">{fmtDateTime(t.finishedAt)}</span>
                  </span>
                  <span className={cx("badge shrink-0", p >= 70 ? "badge-ok" : p >= 40 ? "badge-warn" : "badge-bad")}>{p}%</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      {data && data.coins > 0 && <p className="mt-3 text-sm font-semibold text-ok"><Icon name="coin" size={14} /> +{data.coins} coin verilib</p>}
    </Modal>
  );
}

type Member = { id: string; name: string; photo: string | null };

/** Yaratma / redaktə forması */
function AssignmentEditor({ groupId, initial, onClose, onSaved }: { groupId: string; initial: Assignment | null; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const pkgs = useFetch<{ packages: { id: string; name: string; isBank: boolean; isPublished: boolean; deletedAt: string | null }[] }>("/api/packages");
  const groups = useFetch<{ groups: { id: string; name: string }[] }>("/api/groups");
  const [packageId, setPackageId] = useState(initial?.packageId ?? "");
  const [minAttempts, setMinAttempts] = useState(String(initial?.minAttempts ?? 3));
  const [deadline, setDeadline] = useState(initial ? toInputDateTime(initial.deadline) : "");
  const [coin, setCoin] = useState(initial?.coinReward ? String(initial.coinReward) : "");
  const [note, setNote] = useState(initial?.note ?? "");
  const [picked, setPicked] = useState<string[]>(initial ? initial.groups.map((g) => g.groupId) : [groupId]);
  const [exempt, setExempt] = useState<Set<string>>(new Set(initial?.exempts.map((e) => e.studentId) ?? []));
  const [members, setMembers] = useState<Record<string, Member[]>>({});
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const pkgList = (pkgs.data?.packages ?? []).filter((p) => !p.deletedAt);
  const pkg = pkgList.find((p) => p.id === packageId);

  useEffect(() => {
    if (!openGroup || members[openGroup]) return;
    api<{ members: Member[] }>(`/api/groups/${openGroup}/members`)
      .then((r) => setMembers((m) => ({ ...m, [openGroup]: r.members })))
      .catch((e) => toast.error(errMsg(e)));
  }, [openGroup, members, toast]);

  async function save() {
    if (!packageId) return toast.error("Test paketi seçin");
    if (!deadline) return toast.error("Son tarixi seçin");
    if (!picked.length) return toast.error("Ən azı bir qrup seçin");
    setBusy(true);
    try {
      const body = {
        packageId,
        minAttempts: pkg?.isBank ? Number(minAttempts) : 1,
        deadline: new Date(deadline).toISOString(),
        coinReward: coin.trim() ? Number(coin) : null,
        note,
        groups: picked.map((g) => ({ groupId: g, exempt: (members[g] ?? []).filter((m) => exempt.has(m.id)).map((m) => m.id).concat(
          // açılmamış qrupun əvvəlki azad edilənləri saxlanılsın
          !members[g] && initial ? initial.exempts.map((e) => e.studentId) : [],
        ) })),
      };
      if (initial) await api(`/api/assignments/${initial.id}`, { method: "PATCH", body });
      else await api("/api/assignments", { body });
      toast.success(initial ? "Tapşırıq yeniləndi" : "Tapşırıq verildi");
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
      title={initial ? "Tapşırığı redaktə et" : "Yeni tapşırıq"}
      size="lg"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose} disabled={busy}>Ləğv et</button>
          <button className="btn-primary" onClick={save} disabled={busy}>{busy ? <Spinner /> : initial ? "Yadda saxla" : "Tapşırıq ver"}</button>
        </>
      }
    >
      <div className="grid gap-4">
        <Field label="Test paketi">
          <select className="input" value={packageId} onChange={(e) => setPackageId(e.target.value)}>
            <option value="">{pkgs.loading ? "Yüklənir…" : "Paket seçin"}</option>
            {pkgList.map((p) => (
              <option key={p.id} value={p.id}>{p.name}{p.isBank ? " (sual bankı)" : ""}{p.isPublished ? "" : " – qaralama"}</option>
            ))}
          </select>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          {pkg?.isBank ? (
            <Field label="Ən azı neçə dəfə işləsin" hint="Hər dəfə bankdan yeni test düşür">
              <input className="input tabular-nums" type="number" min={1} max={50} value={minAttempts} onChange={(e) => setMinAttempts(e.target.value)} />
            </Field>
          ) : (
            <Field label="Şərt"><p className="input bg-surface-2 text-muted">Paketi bitirsin (1 dəfə)</p></Field>
          )}
          <Field label="Son tarix və saat">
            <input className="input" type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Bitirənə coin (istəyə görə)" hint="Vaxtında bitirənə balansınızdan avtomatik verilir">
            <input className="input tabular-nums" type="number" min={0} value={coin} onChange={(e) => setCoin(e.target.value)} placeholder="Məs. 10" />
          </Field>
          <Field label="Qeyd (istəyə görə)">
            <input className="input" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder="Məs. 2-ci mövzunu təkrarlayın" />
          </Field>
        </div>

        <div>
          <span className="label">Qruplar və azad edilənlər</span>
          <ul className="divide-y divide-line rounded-lg border border-line">
            {(groups.data?.groups ?? []).map((g) => {
              const on = picked.includes(g.id);
              const list = members[g.id];
              return (
                <li key={g.id} className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-sm font-semibold">
                      <input type="checkbox" checked={on} onChange={(e) => setPicked((p) => (e.target.checked ? [...p, g.id] : p.filter((x) => x !== g.id)))} />
                      <span className="truncate">{g.name}</span>
                    </label>
                    {on && (
                      <button type="button" className="text-xs font-semibold text-brand hover:underline" onClick={() => setOpenGroup(openGroup === g.id ? null : g.id)}>
                        {openGroup === g.id ? "Bağla" : "Azad et…"}
                      </button>
                    )}
                  </div>
                  {on && openGroup === g.id && (
                    <div className="mt-2 rounded-md bg-surface-2 p-2">
                      {!list ? (
                        <Spinner />
                      ) : list.length === 0 ? (
                        <p className="text-xs text-muted">Qrupda tələbə yoxdur.</p>
                      ) : (
                        <>
                          <p className="mb-1 text-xs text-muted">İşarələnən tələbələr tapşırıqdan azad olunur:</p>
                          <div className="grid gap-1 sm:grid-cols-2">
                            {list.map((m) => (
                              <label key={m.id} className="flex cursor-pointer items-center gap-2 text-sm">
                                <input
                                  type="checkbox"
                                  checked={exempt.has(m.id)}
                                  onChange={(e) => setExempt((s) => { const n = new Set(s); if (e.target.checked) n.add(m.id); else n.delete(m.id); return n; })}
                                />
                                <span className="truncate">{m.name}</span>
                              </label>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </Modal>
  );
}
