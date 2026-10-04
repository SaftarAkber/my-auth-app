"use client";

import { useState } from "react";
import { api, errMsg, useFetch } from "@/lib/api";
import { videoThumb } from "@/lib/format";
import { VideoPlayer } from "@/components/video";
import {
  ChipSelect, Empty, ErrorBox, Field, Icon, Img, Modal, PageHeader, SkeletonList, Spinner, Toggle,
  useConfirm, useToast,
} from "@/components/ui";

interface Video {
  id: string;
  title: string;
  description: string | null;
  url: string;
  order: number;
}
interface Pkg {
  id: string;
  name: string;
  description: string | null;
  isPublished: boolean;
  isPublic: boolean;
  videos: Video[];
  videoPackageGroups: { groupId: string; group: { id: string; name: string } }[];
}

const PKG_BLANK = { name: "", description: "", isPublic: false, isPublished: true, groupIds: [] as string[] };
const VID_BLANK = { title: "", url: "", description: "" };

export default function TeacherLessonsPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const pkgs = useFetch<{ packages: Pkg[] }>("/api/video-packages");
  const groups = useFetch<{ groups: { id: string; name: string }[] }>("/api/groups");

  const [pkgEdit, setPkgEdit] = useState<Pkg | "new" | null>(null);
  const [pkgForm, setPkgForm] = useState(PKG_BLANK);
  const [vidEdit, setVidEdit] = useState<{ pkgId: string; video?: Video } | null>(null);
  const [vidForm, setVidForm] = useState(VID_BLANK);
  const [watch, setWatch] = useState<Video | null>(null);
  const [busy, setBusy] = useState(false);

  function openPkg(p: Pkg | "new") {
    setPkgEdit(p);
    setPkgForm(
      p === "new"
        ? PKG_BLANK
        : { name: p.name, description: p.description ?? "", isPublic: p.isPublic, isPublished: p.isPublished, groupIds: p.videoPackageGroups.map((g) => g.groupId) },
    );
  }

  async function savePkg() {
    if (!pkgForm.name.trim()) return toast.error("Paket adı məcburidir");
    setBusy(true);
    try {
      const body = {
        name: pkgForm.name.trim(),
        description: pkgForm.description,
        isPublic: pkgForm.isPublic,
        isPublished: pkgForm.isPublished,
        groupIds: pkgForm.groupIds,
        visibility: pkgForm.groupIds.length ? "GROUP_ONLY" : "PUBLIC",
      };
      if (pkgEdit === "new") {
        const { package: created } = await api<{ package: { id: string } }>("/api/video-packages", { body });
        // POST isPublished qəbul etmir — ayrıca yeniləyirik
        await api(`/api/video-packages/${created.id}`, { method: "PATCH", body: { isPublished: body.isPublished } });
      } else if (pkgEdit) {
        await api(`/api/video-packages/${pkgEdit.id}`, { method: "PATCH", body });
      }
      toast.success("Yadda saxlanıldı");
      setPkgEdit(null);
      pkgs.reload();
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
      pkgs.reload();
    } catch (e) {
      toast.error(errMsg(e));
    }
  }

  async function togglePublish(p: Pkg) {
    try {
      await api(`/api/video-packages/${p.id}`, { method: "PATCH", body: { isPublished: !p.isPublished } });
      pkgs.reload();
    } catch (e) {
      toast.error(errMsg(e));
    }
  }

  function openVid(pkgId: string, video?: Video) {
    setVidEdit({ pkgId, video });
    setVidForm(video ? { title: video.title, url: video.url, description: video.description ?? "" } : VID_BLANK);
  }

  async function saveVid() {
    if (!vidEdit) return;
    if (!vidForm.title.trim() || !vidForm.url.trim()) return toast.error("Başlıq və link məcburidir");
    setBusy(true);
    try {
      if (vidEdit.video) await api(`/api/videos/${vidEdit.video.id}`, { method: "PATCH", body: vidForm });
      else await api(`/api/video-packages/${vidEdit.pkgId}/videos`, { body: vidForm });
      toast.success("Yadda saxlanıldı");
      setVidEdit(null);
      pkgs.reload();
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
      pkgs.reload();
    } catch (e) {
      toast.error(errMsg(e));
    }
  }

  const list = pkgs.data?.packages ?? [];

  return (
    <div className="page">
      <PageHeader
        title="Videodərslər"
        subtitle="Videoları paketlərə yığın, qruplara açın"
        actions={<button className="btn-primary" onClick={() => openPkg("new")}><Icon name="plus" size={16} /> Yeni paket</button>}
      />

      {pkgs.loading ? (
        <SkeletonList rows={2} className="h-48" />
      ) : pkgs.error ? (
        <ErrorBox message={pkgs.error} onRetry={pkgs.reload} />
      ) : list.length === 0 ? (
        <Empty
          icon="video"
          title="Hələ video paketi yoxdur"
          text="Paket yaradın, sonra içinə YouTube linki ilə videolar əlavə edin."
          action={<button className="btn-primary" onClick={() => openPkg("new")}>Paket yarat</button>}
        />
      ) : (
        <div className="space-y-5">
          {list.map((p) => (
            <section key={p.id} className="card overflow-hidden">
              <header className="flex flex-wrap items-center gap-3 border-b border-line p-4 sm:p-5">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-warn/10 text-warn"><Icon name="video" /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-bold">{p.name}</h3>
                    {p.isPublished ? <span className="badge-ok">Dərc olunub</span> : <span className="badge-muted">Qaralama</span>}
                    {p.isPublic && <span className="badge-info"><Icon name="globe" size={12} /> Açıq</span>}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    <span className="badge-muted">{p.videos.length} video</span>
                    {p.videoPackageGroups.map((g) => <span key={g.groupId} className="badge-brand">{g.group.name}</span>)}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button className="btn-soft btn-sm" onClick={() => openVid(p.id)}><Icon name="plus" size={14} /> Video</button>
                  <button className="btn-ghost btn-sm" onClick={() => togglePublish(p)}>{p.isPublished ? "Gizlət" : "Dərc et"}</button>
                  <button className="btn-icon" onClick={() => openPkg(p)} title="Redaktə"><Icon name="edit" size={17} /></button>
                  <button className="btn-icon hover:!text-bad" onClick={() => removePkg(p)} title="Sil"><Icon name="trash" size={17} /></button>
                </div>
              </header>

              {p.videos.length === 0 ? (
                <p className="p-6 text-center text-sm text-muted">Bu paketdə video yoxdur.</p>
              ) : (
                <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
                  {p.videos.map((v) => {
                    const thumb = videoThumb(v.url);
                    return (
                      <div key={v.id} className="group overflow-hidden rounded-xl border border-line">
                        <button onClick={() => setWatch(v)} className="relative block aspect-video w-full bg-surface-2">
                          {thumb && <Img src={thumb} className="h-full w-full object-cover" />}
                          <span className="absolute inset-0 flex items-center justify-center bg-black/25 transition group-hover:bg-black/40">
                            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-brand"><Icon name="play" size={18} /></span>
                          </span>
                        </button>
                        <div className="flex items-center gap-1 p-3">
                          <p className="min-w-0 flex-1 truncate text-sm font-semibold">{v.title}</p>
                          <button className="btn-icon h-8 w-8" onClick={() => openVid(p.id, v)}><Icon name="edit" size={15} /></button>
                          <button className="btn-icon h-8 w-8 hover:!text-bad" onClick={() => removeVid(v)}><Icon name="trash" size={15} /></button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          ))}
        </div>
      )}

      <VideoPlayer video={watch} onClose={() => setWatch(null)} />

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
          <div>
            <span className="label">Hansı qruplar izləsin?</span>
            <ChipSelect options={(groups.data?.groups ?? []).map((g) => ({ id: g.id, label: g.name }))} value={pkgForm.groupIds} onChange={(v) => setPkgForm({ ...pkgForm, groupIds: v })} empty="Əvvəlcə qrup yaradın" />
            <p className="mt-1.5 text-xs text-muted">{pkgForm.groupIds.length ? "Yalnız seçilmiş qrupların üzvləri görəcək." : "Qrup seçilməsə, açıq məzmun hesab olunur."}</p>
          </div>
          <Toggle checked={pkgForm.isPublished} onChange={(v) => setPkgForm({ ...pkgForm, isPublished: v })} label="Dərc olunub" hint="Dərc olunmayan paketləri tələbələr görmür" />
          <Toggle checked={pkgForm.isPublic} onChange={(v) => setPkgForm({ ...pkgForm, isPublic: v })} label="Profilimdə açıq göstər" />
        </div>
      </Modal>

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
        </div>
      </Modal>
    </div>
  );
}
