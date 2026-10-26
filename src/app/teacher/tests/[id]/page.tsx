"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { api, errMsg, useFetch } from "@/lib/api";
import { fmtDate, minutes, toInputDateTime } from "@/lib/format";
import {
  ChipSelect, Empty, ErrorBox, Field, Icon, Modal, PageHeader, SkeletonList, Spinner, Toggle,
  useConfirm, useToast,
} from "@/components/ui";

interface Pkg {
  id: string;
  name: string;
  description: string | null;
  isPublished: boolean;
  isPublic: boolean;
  isTimed: boolean;
  duration: number | null;
  startsAt: string | null;
  endsAt: string | null;
  allowRetry: boolean;
  rewardEnabled: boolean;
  rewardMinCorrect: number | null;
  rewardCoins: number | null;
  rewardAuto: boolean;
  _count: { questions: number; attempts: number };
  testPackageGroups: { groupId: string; group: { id: string; name: string } }[];
}
interface Collection {
  id: string;
  name: string;
  description: string | null;
  packages: Pkg[];
}

const EMPTY = {
  name: "", description: "", isPublic: false, groupIds: [] as string[],
  isTimed: false, durationMin: "", startsAt: "", endsAt: "", allowRetry: false,
  rewardEnabled: false, rewardMinCorrect: "", rewardCoins: "", rewardAuto: true,
};

export default function CollectionPage() {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const confirm = useConfirm();
  const col = useFetch<{ collection: Collection }>(`/api/collections/${id}`);
  const groups = useFetch<{ groups: { id: string; name: string }[] }>("/api/groups");
  const [editing, setEditing] = useState<Pkg | "new" | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [now] = useState(() => Date.now());

  function open(p: Pkg | "new") {
    setEditing(p);
    setForm(
      p === "new"
        ? EMPTY
        : {
            name: p.name,
            description: p.description ?? "",
            isPublic: p.isPublic,
            groupIds: p.testPackageGroups.map((g) => g.groupId),
            isTimed: p.isTimed,
            durationMin: p.duration ? String(minutes(p.duration)) : "",
            startsAt: toInputDateTime(p.startsAt),
            endsAt: toInputDateTime(p.endsAt),
            allowRetry: p.allowRetry,
            rewardEnabled: p.rewardEnabled,
            rewardMinCorrect: p.rewardMinCorrect ? String(p.rewardMinCorrect) : "",
            rewardCoins: p.rewardCoins ? String(p.rewardCoins) : "",
            rewardAuto: p.rewardAuto,
          },
    );
  }

  async function save() {
    if (!form.name.trim()) return toast.error("Test adı məcburidir");
    if (form.isTimed && !(parseInt(form.durationMin) > 0)) return toast.error("Müddəti dəqiqə ilə daxil edin");
    if (form.rewardEnabled) {
      if (!(parseInt(form.rewardMinCorrect) >= 1)) return toast.error("Mükafat üçün minimum düz cavab sayını yazın");
      if (!(parseInt(form.rewardCoins) >= 1)) return toast.error("Mükafat coin sayını yazın");
      const total = editing && editing !== "new" ? editing._count.questions : 0;
      if (total > 0 && parseInt(form.rewardMinCorrect) > total) return toast.error(`Testdə cəmi ${total} sual var, minimum düz cavab ondan çox ola bilməz`);
    }
    setBusy(true);
    try {
      const common = {
        name: form.name.trim(),
        description: form.description,
        isTimed: form.isTimed,
        duration: form.isTimed ? parseInt(form.durationMin) * 60 : null,
        startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
        endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
        allowRetry: form.allowRetry,
        rewardEnabled: form.rewardEnabled,
        rewardMinCorrect: form.rewardEnabled ? parseInt(form.rewardMinCorrect) : null,
        rewardCoins: form.rewardEnabled ? parseInt(form.rewardCoins) : null,
        rewardAuto: form.rewardAuto,
      };
      const links = {
        isPublic: form.isPublic,
        groupIds: form.groupIds,
        visibility: form.groupIds.length > 0 ? "GROUP_ONLY" : "PUBLIC",
      };
      if (editing === "new") {
        const { package: created } = await api<{ package: { id: string } }>("/api/packages", {
          body: { ...common, collectionId: id },
        });
        await api(`/api/packages/${created.id}`, { method: "PATCH", body: links });
      } else if (editing) {
        await api(`/api/packages/${editing.id}`, { method: "PATCH", body: { ...common, ...links } });
      }
      toast.success("Yadda saxlanıldı");
      setEditing(null);
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
      toast.success(p.isPublished ? "Dərcdən çıxarıldı" : "Dərc edildi (+5 coin)");
      col.reload();
    } catch (e) {
      toast.error(errMsg(e));
    }
  }

  async function remove(p: Pkg) {
    const ok = await confirm({
      title: `“${p.name}” testi silinsin?`,
      message: "Suallar və tələbə cəhdləri də silinəcək.",
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
        actions={<button className="btn-primary" onClick={() => open("new")}><Icon name="plus" size={16} /> Yeni test</button>}
      />

      {c.packages.length === 0 ? (
        <Empty icon="file" title="Bu kolleksiyada test yoxdur" action={<button className="btn-primary" onClick={() => open("new")}>Test yarat</button>} />
      ) : (
        <div className="space-y-3">
          {c.packages.map((p) => {
            const upcoming = p.startsAt && new Date(p.startsAt).getTime() > now;
            const ended = p.endsAt && new Date(p.endsAt).getTime() < now;
            return (
              <article key={p.id} className="card p-4 sm:p-5">
                <div className="flex flex-wrap items-start gap-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand/10 text-brand"><Icon name="file" size={22} /></span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/teacher/tests/${id}/${p.id}`} className="text-lg font-bold hover:text-brand">{p.name}</Link>
                      {p.isPublished ? <span className="badge-ok">Dərc olunub</span> : <span className="badge-muted">Qaralama</span>}
                      {p.isPublic && <span className="badge-info"><Icon name="globe" size={12} /> Açıq</span>}
                      {upcoming && <span className="badge-info">Tezliklə</span>}
                      {ended && <span className="badge-bad">Bitib</span>}
                    </div>
                    {p.description && <p className="mt-1 line-clamp-2 text-sm text-muted">{p.description}</p>}
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <span className="badge-muted">{p._count.questions} sual</span>
                      <span className="badge-muted">{p._count.attempts} cəhd</span>
                      {p.isTimed && p.duration && <span className="badge-muted"><Icon name="clock" size={12} /> {minutes(p.duration)} dəq</span>}
                      {p.allowRetry && <span className="badge-muted"><Icon name="retry" size={12} /> Təkrar</span>}
                      {p.rewardEnabled && p.rewardCoins && <span className="badge-warn"><Icon name="coin" size={12} /> {p.rewardMinCorrect}+ düz = {p.rewardCoins}</span>}
                      {p.startsAt && <span className="badge-muted"><Icon name="calendar" size={12} /> {fmtDate(p.startsAt)}</span>}
                      {p.testPackageGroups.map((g) => <span key={g.groupId} className="badge-brand">{g.group.name}</span>)}
                    </div>
                  </div>
                  <div className="flex w-full items-center gap-1 sm:w-auto">
                    <Link href={`/teacher/tests/${id}/${p.id}`} className="btn-secondary btn-sm">Suallar</Link>
                    <Link href={`/teacher/results/${p.id}`} className="btn-soft btn-sm">Nəticələr</Link>
                    <button className={p.isPublished ? "btn-ghost btn-sm" : "btn-primary btn-sm"} onClick={() => togglePublish(p)}>
                      {p.isPublished ? "Dərcdən çıxar" : "Dərc et"}
                    </button>
                    <button className="btn-icon" onClick={() => open(p)} title="Redaktə"><Icon name="edit" size={17} /></button>
                    <button className="btn-icon hover:!text-bad" onClick={() => remove(p)} title="Sil"><Icon name="trash" size={17} /></button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing === "new" ? "Yeni test" : "Testi redaktə et"}
        size="lg"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setEditing(null)}>Ləğv et</button>
            <button className="btn-primary" onClick={save} disabled={busy}>{busy ? <Spinner /> : "Yadda saxla"}</button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Ad *"><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus /></Field>
          <Field label="Təsvir"><textarea className="input min-h-20" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>

          <div>
            <span className="label">Hansı qruplar görsün?</span>
            <ChipSelect
              options={(groups.data?.groups ?? []).map((g) => ({ id: g.id, label: g.name }))}
              value={form.groupIds}
              onChange={(v) => setForm({ ...form, groupIds: v })}
              empty="Əvvəlcə qrup yaradın"
            />
            <p className="mt-1.5 text-xs text-muted">
              {form.groupIds.length ? "Yalnız seçilmiş qrupların üzvləri həll edə bilər." : "Qrup seçilməsə, hamı həll edə bilər."}
            </p>
          </div>

          <Toggle checked={form.isPublic} onChange={(v) => setForm({ ...form, isPublic: v })} label="Müəllim profilində açıq göstər" hint="Qrupda olmayan tələbələr də profilinizdə testi görə bilər" />
          <Toggle checked={form.isTimed} onChange={(v) => setForm({ ...form, isTimed: v })} label="Vaxt məhdudiyyəti" hint="Vaxt bitdikdə test avtomatik təhvil verilir" />
          {form.isTimed && (
            <Field label="Müddət (dəqiqə)">
              <input className="input" type="number" min={1} value={form.durationMin} onChange={(e) => setForm({ ...form, durationMin: e.target.value })} placeholder="30" />
            </Field>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Başlama vaxtı"><input className="input" type="datetime-local" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} /></Field>
            <Field label="Bitmə vaxtı"><input className="input" type="datetime-local" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} /></Field>
          </div>
          <Toggle checked={form.allowRetry} onChange={(v) => setForm({ ...form, allowRetry: v })} label="Təkrar həll icazəsi" hint="Tələbə testi bir neçə dəfə həll edə bilər (coin yalnız ilk dəfə verilir)" />

          <div className="rounded-2xl border-[2.5px] border-ink bg-sun/25 p-4">
            <Toggle
              checked={form.rewardEnabled}
              onChange={(v) => setForm({ ...form, rewardEnabled: v })}
              label="Coin mükafatı"
              hint="Şərti ödəyən tələbəyə öz balansınızdan coin göndərilir (istəyə bağlı)"
            />
            {form.rewardEnabled && (
              <div className="mt-4 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Minimum düz cavab" hint={editing && editing !== "new" ? `Testdə ${editing._count.questions} sual var` : "Məsələn: 30 sualdan 28"}>
                    <input className="input tabular-nums" type="number" min={1} value={form.rewardMinCorrect} onChange={(e) => setForm({ ...form, rewardMinCorrect: e.target.value })} placeholder="28" />
                  </Field>
                  <Field label="Hər tələbəyə (coin)">
                    <input className="input tabular-nums" type="number" min={1} value={form.rewardCoins} onChange={(e) => setForm({ ...form, rewardCoins: e.target.value })} placeholder="20" />
                  </Field>
                </div>
                <Field label="Necə verilsin">
                  <select className="input" value={form.rewardAuto ? "auto" : "manual"} onChange={(e) => setForm({ ...form, rewardAuto: e.target.value === "auto" })}>
                    <option value="auto">Avtomatik, test bitəndə</option>
                    <option value="manual">Mən təsdiq edim (Nəticələrdən “Coin ver”)</option>
                  </select>
                </Field>
                <p className="text-xs text-muted">Hər tələbə bu testdən bir dəfə mükafat alır. Balansınız çatmasa, mükafat “gözləyir” statusunda qalır və sonra əl ilə verə bilərsiniz.</p>
              </div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
