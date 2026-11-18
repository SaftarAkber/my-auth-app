"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { api, errMsg, useFetch } from "@/lib/api";
import { fmtDate, minutes } from "@/lib/format";
import {
  ChipSelect, Empty, ErrorBox, Icon, Modal, PageHeader, SkeletonList, Spinner,
  useConfirm, useToast,
} from "@/components/ui";
import PackageSettings from "@/components/PackageSettings";

interface Pkg {
  id: string;
  name: string;
  description: string | null;
  isPublished: boolean;
  isPublic: boolean;
  visibility: "PUBLIC" | "GROUP_ONLY";
  isTimed: boolean;
  duration: number | null;
  startsAt: string | null;
  endsAt: string | null;
  allowRetry: boolean;
  shareAnswers: boolean;
  rewardEnabled: boolean;
  rewardMinCorrect: number | null;
  rewardCoins: number | null;
  rewardAuto: boolean;
  isBank: boolean;
  isMonthly: boolean;
  drawEasy: number;
  drawMedium: number;
  drawHard: number;
  _count: { questions: number; attempts: number };
  testPackageGroups: { groupId: string; group: { id: string; name: string } }[];
}
interface Collection {
  id: string;
  name: string;
  description: string | null;
  packages: Pkg[];
  groups: { groupId: string; group: { id: string; name: string } }[];
}


export default function CollectionPage() {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const confirm = useConfirm();
  const col = useFetch<{ collection: Collection }>(`/api/collections/${id}`);
  const groups = useFetch<{ groups: { id: string; name: string }[] }>("/api/groups");
  const [settings, setSettings] = useState<{ id: string | null; total?: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [now] = useState(() => Date.now());
  const [colOpen, setColOpen] = useState(false);
  const [colGroups, setColGroups] = useState<string[]>([]);
  const [pubBusy, setPubBusy] = useState<string | null>(null);

  const shared = col.data?.collection.groups ?? [];
  const restricted = shared.length > 0;

  function openColSettings() {
    setColGroups(shared.map((g) => g.groupId));
    setColOpen(true);
  }

  async function saveColSettings() {
    setBusy(true);
    try {
      await api(`/api/collections/${id}`, { method: "PATCH", body: { groupIds: colGroups } });
      toast.success("Kolleksiyanın qrupları yadda saxlanıldı");
      setColOpen(false);
      col.reload();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  // Məhdud kolleksiyada: testi bir qrup üçün dərc et / dərcdən çıxar (hamıya açıq olubsa, əvvəlcə həmin qrupa keçir)
  async function togglePublishFor(p: Pkg, groupId: string) {
    const current = p.isPublished && p.visibility === "PUBLIC" ? [] : p.testPackageGroups.map((g) => g.groupId);
    const next = current.includes(groupId) ? current.filter((x) => x !== groupId) : [...current, groupId];
    setPubBusy(p.id + groupId);
    try {
      await api(`/api/packages/${p.id}`, {
        method: "PATCH",
        body: next.length ? { state: "groups", groupIds: next } : { state: "draft" },
      });
      col.reload();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setPubBusy(null);
    }
  }

  // Testi hamıya açıq et / geri qaytar
  async function togglePublic(p: Pkg) {
    const isPub = p.isPublished && p.visibility === "PUBLIC";
    setPubBusy(p.id + "*");
    try {
      await api(`/api/packages/${p.id}`, { method: "PATCH", body: { state: isPub ? "draft" : "public" } });
      col.reload();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setPubBusy(null);
    }
  }

  // Qısayol: kolleksiyadakı bütün testlər üçün eyni vəziyyət
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulk, setBulk] = useState<{ state: "draft" | "public" | "groups"; groupIds: string[] }>({ state: "public", groupIds: [] });
  async function applyBulk() {
    if (bulk.state === "groups" && bulk.groupIds.length === 0) return toast.error("Ən azı bir qrup seçin");
    setBusy(true);
    try {
      const r = await api<{ updated: number; skipped: number }>(`/api/collections/${id}/publish`, {
        body: { state: bulk.state, groupIds: bulk.state === "groups" ? bulk.groupIds : [] },
      });
      toast.success(`${r.updated} test yeniləndi${r.skipped ? `, ${r.skipped} sualsız test atlandı` : ""}`);
      setBulkOpen(false);
      col.reload();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  async function togglePublish(p: Pkg) {
    try {
      await api(`/api/packages/${p.id}`, { method: "PATCH", body: { isPublished: !p.isPublished } });
      toast.success(p.isPublished ? "Dərcdən çıxarıldı" : "Dərc edildi");
      col.reload();
    } catch (e) {
      toast.error(errMsg(e));
    }
  }

  async function remove(p: Pkg) {
    const ok = await confirm({
      title: `“${p.name}” testi silinsin?`,
      message: "Test hər yerdən silinəcək (suallar və tələbə cəhdləri də görünməyəcək). Yanlışlıqla silsəniz, admin bərpa edə bilər.",
      confirmText: "Sil",
      danger: true,
    });
    if (!ok) return;
    try {
      await api(`/api/packages/${p.id}`, { method: "DELETE" });
      col.reload();
    } catch (e) {
      toast.error(errMsg(e));
    }
  }

  if (col.loading) return <div className="page"><SkeletonList rows={3} className="h-32" /></div>;
  if (col.error || !col.data) return <div className="page"><ErrorBox message={col.error ?? "Tapılmadı"} onRetry={col.reload} /></div>;

  const c = col.data.collection;
  return (
    <div className="page">
      <PageHeader
        title={c.name}
        subtitle={c.description || "Bu kolleksiyadakı testlər"}
        back="/teacher/tests"
        actions={
          <div className="flex flex-wrap gap-2">
            <button className="btn-secondary" onClick={openColSettings}><Icon name="users" size={16} /> Qruplar</button>
            {c.packages.length > 0 && (
              <button className="btn-secondary" onClick={() => { setBulk({ state: "public", groupIds: [] }); setBulkOpen(true); }} title="Kolleksiyadakı bütün testləri birdən dərc et">
                <Icon name="globe" size={16} /> Hamısını dərc et
              </button>
            )}
            <button className="btn-primary" onClick={() => setSettings({ id: null })}><Icon name="plus" size={16} /> Yeni test</button>
          </div>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-2 text-sm">
        {restricted ? (
          <>
            <span className="font-semibold">Bu kolleksiya yalnız bu qruplarda:</span>
            {shared.map((g) => <span key={g.groupId} className="badge-brand">{g.group.name}</span>)}
          </>
        ) : (
          <span className="text-muted">Kolleksiya qruplarla məhdudlaşdırılmayıb. “Qruplar” düyməsi ilə yalnız seçilmiş qruplara açıq edə bilərsiniz.</span>
        )}
      </div>

      {c.packages.length === 0 ? (
        <Empty icon="file" title="Bu kolleksiyada test yoxdur" action={<button className="btn-primary" onClick={() => setSettings({ id: null })}>Test yarat</button>} />
      ) : (
        <div className="space-y-3">
          {c.packages.map((p) => {
            const upcoming = p.startsAt && new Date(p.startsAt).getTime() > now;
            const ended = p.endsAt && new Date(p.endsAt).getTime() < now;
            return (
              <article key={p.id} className="card p-4 sm:p-5">
                <div className="flex flex-wrap items-start gap-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand"><Icon name="file" size={22} /></span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/teacher/tests/${id}/${p.id}`} className="text-lg font-bold hover:text-brand">{p.name}</Link>
                      {restricted ? (
                        p.isPublished && p.visibility === "PUBLIC" ? <span className="badge-info"><Icon name="globe" size={12} /> Hamıya açıq</span>
                          : p.isPublished && p.testPackageGroups.length > 0 ? <span className="badge-ok">{p.testPackageGroups.length} qrupa dərc olunub</span>
                          : <span className="badge-muted">Qaralama</span>
                      ) : p.isPublished ? <span className="badge-ok">Dərc olunub</span> : <span className="badge-muted">Qaralama</span>}
                      {!restricted && p.isPublic && <span className="badge-info"><Icon name="globe" size={12} /> Açıq</span>}
                      {upcoming && <span className="badge-info">Tezliklə</span>}
                      {ended && <span className="badge-bad">Bitib</span>}
                    </div>
                    {p.description && <p className="mt-1 line-clamp-2 text-sm text-muted">{p.description}</p>}
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <span className="badge-muted">{p._count.questions} sual</span>
                      <span className="badge-muted">{p._count.attempts} cəhd</span>
                      {p.isTimed && p.duration && <span className="badge-muted"><Icon name="clock" size={12} /> {minutes(p.duration)} dəq</span>}
                      {p.isBank && <span className="badge-brand"><Icon name="retry" size={12} /> Sual bankı · hər dəfə {p.drawEasy + p.drawMedium + p.drawHard} sual</span>}
                      {p.isMonthly && <span className="badge-brand"><Icon name="award" size={12} /> Aylıq sınaq</span>}
                      {p.allowRetry && !p.isBank && <span className="badge-muted"><Icon name="retry" size={12} /> Təkrar</span>}
                      {p.rewardEnabled && p.rewardCoins && <span className="badge-warn"><Icon name="coin" size={12} /> {p.rewardMinCorrect}+ düz = {p.rewardCoins}</span>}
                      {p.startsAt && <span className="badge-muted"><Icon name="calendar" size={12} /> {fmtDate(p.startsAt)}</span>}
                      {!restricted && p.testPackageGroups.map((g) => <span key={g.groupId} className="badge-brand">{g.group.name}</span>)}
                    </div>
                    {restricted && (
                      <div className="mt-3">
                        <p className="mb-1.5 text-xs font-semibold text-muted">Kimlər görsün? (toxunaraq aç / bağla):</p>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={pubBusy === p.id + "*"}
                            aria-pressed={p.isPublished && p.visibility === "PUBLIC"}
                            onClick={() => togglePublic(p)}
                            className={`inline-flex items-center gap-1.5 rounded-md border border-line px-3 py-1 text-sm font-semibold transition ${p.isPublished && p.visibility === "PUBLIC" ? "bg-ok/30" : "bg-white hover:bg-tint"}`}
                          >
                            <Icon name="globe" size={13} /> Hamıya açıq
                          </button>
                          {shared.map((g) => {
                            const on = p.isPublished && p.visibility !== "PUBLIC" && p.testPackageGroups.some((x) => x.groupId === g.groupId);
                            return (
                              <button
                                key={g.groupId}
                                type="button"
                                disabled={pubBusy === p.id + g.groupId}
                                aria-pressed={on}
                                onClick={() => togglePublishFor(p, g.groupId)}
                                className={`inline-flex items-center gap-1.5 rounded-md border border-line px-3 py-1 text-sm font-semibold transition ${on ? "bg-tint" : "bg-white hover:bg-tint"}`}
                              >
                                {on && <Icon name="check" size={13} />} {g.group.name}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex w-full items-center gap-1 sm:w-auto">
                    <Link href={`/teacher/tests/${id}/${p.id}`} className="btn-secondary btn-sm">Suallar</Link>
                    <Link href={`/teacher/results/${p.id}`} className="btn-soft btn-sm">Nəticələr</Link>
                    {!restricted && (
                      <button className={p.isPublished ? "btn-ghost btn-sm" : "btn-primary btn-sm"} onClick={() => togglePublish(p)}>
                        {p.isPublished ? "Dərcdən çıxar" : "Dərc et"}
                      </button>
                    )}
                    <button className="btn-icon" onClick={() => setSettings({ id: p.id, total: p._count.questions })} title="Ayarlar" aria-label="Ayarlar"><Icon name="settings" size={17} /></button>
                    <button className="btn-icon hover:!text-bad" onClick={() => remove(p)} title="Sil"><Icon name="trash" size={17} /></button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <Modal
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        title="Bütün testləri dərc et"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setBulkOpen(false)}>Ləğv et</button>
            <button className="btn-primary" onClick={applyBulk} disabled={busy}>{busy ? <Spinner /> : "Tətbiq et"}</button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="rounded-xl border border-line/20 bg-tint px-3 py-2 text-sm">
            Seçim kolleksiyadakı bütün testlərə tətbiq olunacaq (sualı olmayan testlər dərc olunmur). Sonra hər birini ayrıca dəyişə bilərsiniz.
          </p>
          {([["draft", "Qaralama", "Heç kim görmür"], ["public", "Hamıya açıq", "Bütün istifadəçilər həll edə bilər"], ["groups", "Seçilmiş qruplar", "Yalnız seçdiyiniz qrupların üzvləri"]] as const).map(([sid, label, hint]) => (
            <button
              key={sid}
              type="button"
              onClick={() => setBulk({ ...bulk, state: sid })}
              aria-pressed={bulk.state === sid}
              className={`flex w-full items-start gap-3 rounded-xl border border-line p-3 text-left transition ${bulk.state === sid ? "bg-tint" : "bg-white hover:bg-tint"}`}
            >
              <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border border-line ${bulk.state === sid ? "bg-ink text-white" : ""}`}>
                {bulk.state === sid && <Icon name="check" size={12} />}
              </span>
              <span><span className="block text-sm font-bold">{label}</span><span className="block text-xs text-muted">{hint}</span></span>
            </button>
          ))}
          {bulk.state === "groups" && (
            <div>
              <span className="label">Hansı qruplar görsün?</span>
              <ChipSelect
                options={(restricted ? shared.map((g) => ({ id: g.groupId, label: g.group.name })) : (groups.data?.groups ?? []).map((g) => ({ id: g.id, label: g.name })))}
                value={bulk.groupIds}
                onChange={(v) => setBulk({ ...bulk, groupIds: v })}
                empty="Qrup yoxdur"
              />
            </div>
          )}
        </div>
      </Modal>

      <Modal
        open={colOpen}
        onClose={() => setColOpen(false)}
        title="Kolleksiya hansı qruplara açıqdır?"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setColOpen(false)}>Ləğv et</button>
            <button className="btn-primary" onClick={saveColSettings} disabled={busy}>{busy ? <Spinner /> : "Yadda saxla"}</button>
          </>
        }
      >
        <div className="space-y-3">
          <ChipSelect
            options={(groups.data?.groups ?? []).map((g) => ({ id: g.id, label: g.name }))}
            value={colGroups}
            onChange={setColGroups}
            empty="Əvvəlcə qrup yaradın"
          />
          <p className="text-xs text-muted">
            {colGroups.length
              ? "Kolleksiya yalnız seçilmiş qruplarda olacaq. Testlər qrup üzrə ayrıca dərc olunur: məsələn A qrupu 3 testi görür, B qrupu isə başqa sayda. Qrupdan çıxarsanız, o qrup üçün dərc olunan testlər də gizlənir."
              : "Qrup seçilməsə, kolleksiya məhdudiyyətsizdir və testlərin hər biri öz ayarı ilə dərc olunur."}
          </p>
          {colGroups.length > 0 && !restricted && (
            <p className="rounded-xl border border-line/20 bg-tint px-3 py-2 text-sm">
              Diqqət: hamıya açıq testlər hamıya açıq qalır. Qrupa bağlı olmayan dərc olunmuş testlər isə qaralamaya keçir, onları qrup üzrə yenidən dərc edin.
            </p>
          )}
        </div>
      </Modal>

      <PackageSettings
        open={!!settings}
        onClose={() => setSettings(null)}
        onSaved={() => col.reload()}
        packageId={settings?.id ?? null}
        collectionId={id}
        totalQuestions={settings?.total}
      />
    </div>
  );
}
