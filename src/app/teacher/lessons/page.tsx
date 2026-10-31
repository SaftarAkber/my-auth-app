"use client";

import Link from "next/link";
import { useState } from "react";
import { api, errMsg, useFetch } from "@/lib/api";
import { cx } from "@/lib/format";
import { VideoThumb } from "@/components/content";
import {
  ChipSelect, Empty, ErrorBox, Field, Icon, Modal, PageHeader, SkeletonList, Spinner,
  useConfirm, useToast,
} from "@/components/ui";

type State = "draft" | "public" | "groups";

interface Video {
  id: string;
  title: string;
  description: string | null;
  url: string;
  order: number;
  isPublished: boolean;
  visibility: "PUBLIC" | "GROUP_ONLY";
  packageId?: string | null;
  videoGroups: { groupId: string; group: { id: string; name: string } }[];
}
interface Pkg {
  id: string;
  name: string;
  description: string | null;
  videos: Video[];
}

const stateOf = (v: Video): State => (!v.isPublished ? "draft" : v.visibility === "PUBLIC" ? "public" : "groups");
const VID_BLANK = { title: "", url: "", description: "" };
const STATES: { id: State; label: string; hint: string }[] = [
  { id: "draft", label: "Qaralama", hint: "Yalnız siz görürsünüz" },
  { id: "public", label: "Hamıya açıq", hint: "Bütün istifadəçilər görür, profilinizdə və video siyahılarında çıxır" },
  { id: "groups", label: "Seçilmiş qruplar", hint: "Yalnız seçdiyiniz qrupların üzvləri görür" },
];

/** Vəziyyət nişanı (kartda) */
function StateChip({ v, onClick }: { v: Video; onClick: () => void }) {
  const s = stateOf(v);
  const label = s === "draft" ? "Qaralama" : s === "public" ? "Hamıya açıq" : v.videoGroups.map((g) => g.group.name).join(", ") || "Qruplar";
  return (
    <button
      onClick={onClick}
      title="Kimlərin görəcəyini dəyiş"
      className={cx(
        "inline-flex max-w-full items-center gap-1.5 rounded-full border-2 border-ink px-2.5 py-0.5 text-xs font-bold transition hover:bg-sun",
        s === "draft" ? "bg-white text-muted" : s === "public" ? "bg-ok/15" : "bg-iris/30",
      )}
    >
      <Icon name={s === "public" ? "globe" : s === "groups" ? "users" : "lock"} size={12} />
      <span className="truncate">{label}</span>
    </button>
  );
}

type Target = { kind: "video"; video: Video } | { kind: "package"; pkg: Pkg };

export default function TeacherLessonsPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const pkgs = useFetch<{ packages: Pkg[] }>("/api/video-packages");
  const singles = useFetch<{ videos: Video[] }>("/api/videos");
  const groups = useFetch<{ groups: { id: string; name: string }[] }>("/api/groups");

  const [pkgEdit, setPkgEdit] = useState<Pkg | "new" | null>(null);
  const [pkgForm, setPkgForm] = useState({ name: "", description: "" });
  const [vidEdit, setVidEdit] = useState<{ pkgId: string | null; video?: Video } | null>(null);
  const [vidForm, setVidForm] = useState(VID_BLANK);
  const [target, setTarget] = useState<Target | null>(null);
  const [st, setSt] = useState<{ state: State; groupIds: string[] }>({ state: "draft", groupIds: [] });
  const [busy, setBusy] = useState(false);

  const reload = () => { pkgs.reload(); singles.reload(); };

  function openPkg(p: Pkg | "new") {
    setPkgEdit(p);
    setPkgForm(p === "new" ? { name: "", description: "" } : { name: p.name, description: p.description ?? "" });
  }
  async function savePkg() {
    if (!pkgForm.name.trim()) return toast.error("Paket adı məcburidir");
    setBusy(true);
    try {
      const body = { name: pkgForm.name.trim(), description: pkgForm.description };
      if (pkgEdit === "new") await api("/api/video-packages", { body });
      else if (pkgEdit) await api(`/api/video-packages/${pkgEdit.id}`, { method: "PATCH", body });
      toast.success("Yadda saxlanıldı");
      setPkgEdit(null);
      reload();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  }
  async function removePkg(p: Pkg) {
    const ok = await confirm({
      title: `“${p.name}” paketi silinsin?`,
      message: "Paketdəki videolar paketsiz qalacaq (silinməyəcək).",
      confirmText: "Sil",
      danger: true,
    });
    if (!ok) return;
    try {
      await api(`/api/video-packages/${p.id}`, { method: "DELETE" });
      reload();
    } catch (e) {
      toast.error(errMsg(e));
    }
  }

  function openVid(pkgId: string | null, video?: Video) {
    setVidEdit({ pkgId, video });
    setVidForm(video ? { title: video.title, url: video.url, description: video.description ?? "" } : VID_BLANK);
  }
  async function saveVid() {
    if (!vidEdit) return;
    if (!vidForm.title.trim() || !vidForm.url.trim()) return toast.error("Başlıq və link məcburidir");
    setBusy(true);
    try {
      if (vidEdit.video) await api(`/api/videos/${vidEdit.video.id}`, { method: "PATCH", body: vidForm });
      else if (vidEdit.pkgId) await api(`/api/video-packages/${vidEdit.pkgId}/videos`, { body: vidForm });
      else await api("/api/videos", { body: vidForm });
      toast.success("Yadda saxlanıldı");
      setVidEdit(null);
      reload();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  }
  async function removeVid(v: Video) {
    if (!(await confirm({ title: `“${v.title}” silinsin?`, confirmText: "Sil", danger: true }))) return;
    try {
      await api(`/api/videos/${v.id}`, { method: "DELETE" });
      reload();
    } catch (e) {
      toast.error(errMsg(e));
    }
  }

  function openState(t: Target) {
    setTarget(t);
    if (t.kind === "video") setSt({ state: stateOf(t.video), groupIds: t.video.videoGroups.map((g) => g.groupId) });
    else setSt({ state: "public", groupIds: [] });
  }
  async function saveState() {
    if (!target) return;
    if (st.state === "groups" && st.groupIds.length === 0) return toast.error("Ən azı bir qrup seçin");
    setBusy(true);
    try {
      const body = { state: st.state, groupIds: st.state === "groups" ? st.groupIds : [] };
      if (target.kind === "video") await api(`/api/videos/${target.video.id}`, { method: "PATCH", body });
      else await api(`/api/video-packages/${target.pkg.id}/publish`, { body });
      toast.success(target.kind === "package" ? "Paketdəki bütün videolar yeniləndi" : "Yadda saxlanıldı");
      setTarget(null);
      reload();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  const list = pkgs.data?.packages ?? [];
  const loose = (singles.data?.videos ?? []).filter((v) => !v.packageId);

  const videoCard = (v: Video) => (
      <div key={v.id} className="overflow-hidden rounded-xl border-2 border-ink/20 bg-white">
        <Link href={`/watch/${v.id}`} className="block"><VideoThumb url={v.url} className="w-full" /></Link>
        <div className="space-y-2 p-3">
          <p className="line-clamp-2 min-h-[2.6rem] text-sm font-bold leading-[1.3]">{v.title}</p>
          <div className="flex items-center gap-1">
            <div className="min-w-0 flex-1"><StateChip v={v} onClick={() => openState({ kind: "video", video: v })} /></div>
            <button className="btn-icon h-8 w-8" onClick={() => openVid(v.packageId ?? null, v)} aria-label="Redaktə"><Icon name="edit" size={15} /></button>
            <button className="btn-icon h-8 w-8 hover:!text-bad" onClick={() => removeVid(v)} aria-label="Sil"><Icon name="trash" size={15} /></button>
          </div>
        </div>
      </div>
  );

  return (
    <div className="page">
      <PageHeader
        title="Videodərslər"
        subtitle="Hər videonun kimlərə açıq olduğunu ayrıca seçin: qaralama, hamıya açıq və ya seçilmiş qruplar"
        actions={
          <div className="flex flex-wrap gap-2">
            <button className="btn-secondary" onClick={() => openVid(null)}><Icon name="plus" size={16} /> Ayrıca video</button>
            <button className="btn-primary" onClick={() => openPkg("new")}><Icon name="plus" size={16} /> Yeni paket</button>
          </div>
        }
      />

      {pkgs.loading ? (
        <SkeletonList rows={2} className="h-48" />
      ) : pkgs.error ? (
        <ErrorBox message={pkgs.error} onRetry={pkgs.reload} />
      ) : list.length === 0 && loose.length === 0 ? (
        <Empty
          icon="video"
          title="Hələ video yoxdur"
          text="Paket yaradın, sonra içinə YouTube linki ilə videolar əlavə edin."
          action={<button className="btn-primary" onClick={() => openPkg("new")}>Paket yarat</button>}
        />
      ) : (
        <div className="space-y-5">
          {list.map((p) => {
            const pub = p.videos.filter((v) => stateOf(v) === "public").length;
            const grp = p.videos.filter((v) => stateOf(v) === "groups").length;
            const draft = p.videos.length - pub - grp;
            return (
              <section key={p.id} className="card overflow-hidden">
                <header className="flex flex-wrap items-center gap-3 border-b border-line p-4 sm:p-5">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-warn/10 text-warn"><Icon name="video" /></span>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg font-bold">{p.name}</h3>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      <span className="badge-muted">{p.videos.length} video</span>
                      {pub > 0 && <span className="badge-ok">{pub} hamıya açıq</span>}
                      {grp > 0 && <span className="badge-brand">{grp} qruplara</span>}
                      {draft > 0 && <span className="badge-muted">{draft} qaralama</span>}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1">
                    <button className="btn-soft btn-sm" onClick={() => openVid(p.id)}><Icon name="plus" size={14} /> Video</button>
                    {p.videos.length > 0 && (
                      <button className="btn-ghost btn-sm" onClick={() => openState({ kind: "package", pkg: p })} title="Paketdəki bütün videoları birdən dərc et">
                        <Icon name="globe" size={14} /> Hamısını dərc et
                      </button>
                    )}
                    <button className="btn-icon" onClick={() => openPkg(p)} title="Redaktə"><Icon name="edit" size={17} /></button>
                    <button className="btn-icon hover:!text-bad" onClick={() => removePkg(p)} title="Sil"><Icon name="trash" size={17} /></button>
                  </div>
                </header>

                {p.videos.length === 0 ? (
                  <p className="p-6 text-center text-sm text-muted">Bu paketdə video yoxdur.</p>
                ) : (
                  <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {p.videos.map((v) => videoCard(v))}
                  </div>
                )}
              </section>
            );
          })}

          {loose.length > 0 && (
            <section className="card overflow-hidden">
              <header className="flex items-center gap-3 border-b border-line p-4 sm:p-5">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-iris/20"><Icon name="video" /></span>
                <div className="flex-1">
                  <h3 className="text-lg font-bold">Ayrıca videolar</h3>
                  <p className="text-xs text-muted">Heç bir paketə daxil olmayan videolar</p>
                </div>
              </header>
              <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {loose.map((v) => videoCard(v))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Paket yaratma / redaktə */}
      <Modal
        open={!!pkgEdit}
        onClose={() => setPkgEdit(null)}
        title={pkgEdit === "new" ? "Yeni video paketi" : "Paketi redaktə et"}
        footer={
          <>
            <button className="btn-secondary" onClick={() => setPkgEdit(null)}>Ləğv et</button>
            <button className="btn-primary" onClick={savePkg} disabled={busy}>{busy ? <Spinner /> : "Yadda saxla"}</button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Ad *"><input className="input" value={pkgForm.name} onChange={(e) => setPkgForm({ ...pkgForm, name: e.target.value })} autoFocus /></Field>
          <Field label="Təsvir"><textarea className="input min-h-20" value={pkgForm.description} onChange={(e) => setPkgForm({ ...pkgForm, description: e.target.value })} /></Field>
          <p className="text-xs text-muted">Paket yalnız videoları qruplaşdırır. Kimlərin görəcəyini hər videonun üzərindəki nişanla, ya da paketin “Hamısını dərc et” düyməsi ilə seçirsiniz.</p>
        </div>
      </Modal>

      {/* Video əlavə / redaktə */}
      <Modal
        open={!!vidEdit}
        onClose={() => setVidEdit(null)}
        title={vidEdit?.video ? "Videonu redaktə et" : "Video əlavə et"}
        footer={
          <>
            <button className="btn-secondary" onClick={() => setVidEdit(null)}>Ləğv et</button>
            <button className="btn-primary" onClick={saveVid} disabled={busy}>{busy ? <Spinner /> : "Yadda saxla"}</button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Başlıq *"><input className="input" value={vidForm.title} onChange={(e) => setVidForm({ ...vidForm, title: e.target.value })} autoFocus /></Field>
          <Field label="Video linki *" hint="YouTube linki və ya birbaşa video faylının ünvanı">
            <input className="input" value={vidForm.url} onChange={(e) => setVidForm({ ...vidForm, url: e.target.value })} placeholder="https://youtu.be/…" />
          </Field>
          <Field label="Təsvir"><textarea className="input min-h-20" value={vidForm.description} onChange={(e) => setVidForm({ ...vidForm, description: e.target.value })} /></Field>
          {!vidEdit?.video && <p className="text-xs text-muted">Yeni video qaralama kimi əlavə olunur. Sonra kimlərə açıq olacağını seçin.</p>}
        </div>
      </Modal>

      {/* Vəziyyət: video və ya bütün paket */}
      <Modal
        open={!!target}
        onClose={() => setTarget(null)}
        title={target?.kind === "package" ? `“${target.pkg.name}”: bütün videolar` : "Bu video kimlərə açıq olsun?"}
        footer={
          <>
            <button className="btn-secondary" onClick={() => setTarget(null)}>Ləğv et</button>
            <button className="btn-primary" onClick={saveState} disabled={busy}>{busy ? <Spinner /> : "Tətbiq et"}</button>
          </>
        }
      >
        <div className="space-y-3">
          {target?.kind === "package" && (
            <p className="rounded-xl border-2 border-ink/20 bg-sun/20 px-3 py-2 text-sm">
              Seçim paketdəki {target.pkg.videos.length} videonun hamısına tətbiq olunacaq. Sonra hər birini ayrıca dəyişə bilərsiniz.
            </p>
          )}
          {STATES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSt({ ...st, state: s.id })}
              aria-pressed={st.state === s.id}
              className={cx(
                "flex w-full items-start gap-3 rounded-xl border-[2.5px] border-ink p-3 text-left transition",
                st.state === s.id ? "bg-sun" : "bg-white hover:bg-sun/30",
              )}
            >
              <span className={cx("mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 border-ink", st.state === s.id && "bg-ink text-white")}>
                {st.state === s.id && <Icon name="check" size={12} />}
              </span>
              <span>
                <span className="block text-sm font-bold">{s.label}</span>
                <span className="block text-xs text-muted">{s.hint}</span>
              </span>
            </button>
          ))}
          {st.state === "groups" && (
            <div>
              <span className="label">Hansı qruplar görsün?</span>
              <ChipSelect
                options={(groups.data?.groups ?? []).map((g) => ({ id: g.id, label: g.name }))}
                value={st.groupIds}
                onChange={(v) => setSt({ ...st, groupIds: v })}
                empty="Əvvəlcə qrup yaradın"
              />
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
