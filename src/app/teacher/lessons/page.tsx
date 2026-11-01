"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { api, errMsg, useFetch } from "@/lib/api";
import { cx } from "@/lib/format";
import { uploadVideo } from "@/lib/uploadVideo";
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
  publicId?: string | null;
  bytes?: number | null;
  duration?: number | null;
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

/** Hər videonun kimlərə açıq olduğunu seçən 3 düymə (qaralama / hamıya açıq / qruplar) */
function StateSwitch({
  v, busy, onPick,
}: { v: Video; busy: boolean; onPick: (s: State) => void }) {
  const cur = stateOf(v);
  const opts: { id: State; label: string; icon: "lock" | "globe" | "users" }[] = [
    { id: "draft", label: "Qaralama", icon: "lock" },
    { id: "public", label: "Hamıya", icon: "globe" },
    { id: "groups", label: "Qruplar", icon: "users" },
  ];
  return (
    <div>
      <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-muted">Kimlər görsün?</p>
      <div className="grid grid-cols-3 gap-1 rounded-xl border border-line p-0.5" role="group" aria-label="Kimlər görsün?">
        {opts.map((o) => (
          <button
            key={o.id}
            type="button"
            disabled={busy}
            aria-pressed={cur === o.id}
            onClick={() => onPick(o.id)}
            className={cx(
              "inline-flex items-center justify-center gap-1 rounded-lg px-1.5 py-1.5 text-xs font-bold transition",
              cur === o.id ? (o.id === "public" ? "bg-ok/40" : o.id === "groups" ? "bg-iris/40" : "bg-tint") : "hover:bg-tint",
            )}
          >
            <Icon name={o.icon} size={12} /> {o.label}
          </button>
        ))}
      </div>
      {cur === "groups" && (
        <p className="mt-1 truncate text-xs text-muted">{v.videoGroups.map((g) => g.group.name).join(", ") || "Qrup seçilməyib"}</p>
      )}
    </div>
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
  const [stateBusy, setStateBusy] = useState<string | null>(null);
  const [mode, setMode] = useState<"link" | "file">("link");
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const abort = useRef<AbortController | null>(null);

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

  // Düymə ilə dərhal: qaralama və ya hamıya açıq. "Qruplar" qrup seçimi pəncərəsini açır.
  async function pickState(v: Video, st: State) {
    if (st === "groups") return openState({ kind: "video", video: v }, "groups");
    if (stateOf(v) === st) return;
    setStateBusy(v.id);
    try {
      await api(`/api/videos/${v.id}`, { method: "PATCH", body: { state: st, groupIds: [] } });
      reload();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setStateBusy(null);
    }
  }

  function openVid(pkgId: string | null, video?: Video) {
    setMode("link");
    setFile(null);
    setProgress(null);
    setVidEdit({ pkgId, video });
    setVidForm(video ? { title: video.title, url: video.url, description: video.description ?? "" } : VID_BLANK);
  }
  function closeVid() {
    abort.current?.abort();
    setVidEdit(null);
  }

  async function saveVid() {
    if (!vidEdit) return;
    const uploading = !vidEdit.video && mode === "file";
    if (!vidForm.title.trim()) return toast.error("Başlıq məcburidir");
    if (uploading && !file) return toast.error("Video faylı seçin");
    if (!uploading && !vidEdit.video?.publicId && !vidForm.url.trim()) return toast.error("Video linki məcburidir");
    setBusy(true);
    try {
      if (vidEdit.video) {
        const { url, ...rest } = vidForm;
        await api(`/api/videos/${vidEdit.video.id}`, { method: "PATCH", body: vidEdit.video.publicId ? rest : { ...rest, url } });
      } else {
        let body: Record<string, unknown> = { title: vidForm.title, description: vidForm.description, url: vidForm.url };
        if (uploading && file) {
          const ctl = new AbortController();
          abort.current = ctl;
          setProgress(0);
          const publicId = await uploadVideo(file, setProgress, ctl.signal);
          body = { title: vidForm.title, description: vidForm.description, uploadPublicId: publicId };
        }
        if (vidEdit.pkgId) await api(`/api/video-packages/${vidEdit.pkgId}/videos`, { body });
        else await api("/api/videos", { body });
      }
      toast.success(uploading ? "Video yükləndi, işlənir (bir neçə dəqiqə çəkə bilər)" : "Yadda saxlanıldı");
      setVidEdit(null);
      reload();
    } catch (e) {
      if (!(e instanceof Error && e.message.includes("ləğv"))) toast.error(errMsg(e));
    } finally {
      setBusy(false);
      setProgress(null);
      abort.current = null;
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

  function openState(t: Target, force?: State) {
    setTarget(t);
    if (t.kind === "video") setSt({ state: force ?? stateOf(t.video), groupIds: t.video.videoGroups.map((g) => g.groupId) });
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
      <div key={v.id} className="overflow-hidden rounded-xl border border-line/20 bg-white">
        <Link href={`/watch/${v.id}`} className="block"><VideoThumb url={v.url} className="w-full" /></Link>
        <div className="space-y-2 p-3">
          <p className="line-clamp-2 min-h-[2.6rem] text-sm font-bold leading-[1.3]">{v.title}</p>
          <StateSwitch v={v} busy={stateBusy === v.id} onPick={(st) => pickState(v, st)} />
          <div className="flex items-center justify-between gap-1">
            <span className="min-w-0 truncate text-xs text-muted">
              {v.publicId ? <>Yüklənmiş{v.duration ? ` · ${Math.floor(v.duration / 60)}:${String(v.duration % 60).padStart(2, "0")}` : ""}{v.bytes ? ` · ${(v.bytes / 1048576).toFixed(0)} MB` : ""}</> : "YouTube / link"}
            </span>
            <span className="flex shrink-0">
              <button className="btn-icon h-8 w-8" onClick={() => openVid(v.packageId ?? null, v)} aria-label="Redaktə"><Icon name="edit" size={15} /></button>
              <button className="btn-icon h-8 w-8 hover:!text-bad" onClick={() => removeVid(v)} aria-label="Sil"><Icon name="trash" size={15} /></button>
            </span>
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
        onClose={closeVid}
        title={vidEdit?.video ? "Videonu redaktə et" : "Video əlavə et"}
        footer={
          <>
            <button className="btn-secondary" onClick={closeVid}>Ləğv et</button>
            <button className="btn-primary" onClick={saveVid} disabled={busy}>
              {busy ? <Spinner /> : null} {!vidEdit?.video && mode === "file" ? (busy ? "Yüklənir…" : "Yüklə") : "Yadda saxla"}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {!vidEdit?.video && (
            <div className="grid grid-cols-2 gap-1 rounded-xl border border-line p-0.5" role="tablist">
              {([["link", "Link (YouTube)"], ["file", "Fayl yüklə"]] as const).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={mode === id}
                  disabled={busy}
                  onClick={() => setMode(id)}
                  className={cx("rounded-lg py-2 text-sm font-bold transition", mode === id ? "bg-tint" : "hover:bg-tint")}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          <Field label="Başlıq *"><input className="input" value={vidForm.title} onChange={(e) => setVidForm({ ...vidForm, title: e.target.value })} autoFocus={mode === "link"} /></Field>

          {!vidEdit?.video && mode === "file" ? (
            <div>
              <span className="label">Video faylı *</span>
              <label className={cx("flex cursor-pointer flex-col items-center gap-1 rounded-xl border border-dashed border-line-strong bg-surface-2 px-4 py-6 text-center transition hover:bg-tint", busy && "pointer-events-none opacity-70")}>
                <Icon name="upload" size={26} />
                <span className="text-sm font-bold">{file ? file.name : "Telefondan və ya kompüterdən video seçin"}</span>
                <span className="text-xs text-muted">
                  {file ? `${(file.size / 1048576).toFixed(1)} MB` : "MP4, MOV, M4V, WebM, 3GP, MKV, AVI"}
                </span>
                <input
                  type="file"
                  hidden
                  accept="video/*,.mp4,.mov,.m4v,.webm,.3gp,.mkv,.avi"
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null;
                    setFile(f);
                    if (f && !vidForm.title.trim()) setVidForm((x) => ({ ...x, title: f.name.replace(/\.[^.]+$/, "") }));
                  }}
                />
              </label>
              {progress !== null && (
                <div className="mt-3">
                  <div className="h-4 overflow-hidden rounded-full border border-line bg-surface-2">
                    <div className="h-full bg-tint transition-[width] duration-200" style={{ width: `${Math.round(progress * 100)}%` }} />
                  </div>
                  <p className="mt-1 text-xs font-semibold">{Math.round(progress * 100)}%: yükləmə bitənə qədər səhifəni bağlamayın və telefonun ekranını söndürməyin</p>
                </div>
              )}
              <p className="mt-2 text-xs text-muted">Video hər cihazda oynasın deyə MP4 formasına çevrilir (bir neçə dəqiqə çəkə bilər). Yeni video qaralama kimi əlavə olunur.</p>
            </div>
          ) : !vidEdit?.video?.publicId ? (
            <Field label="Video linki *" hint="YouTube linki və ya birbaşa video faylının ünvanı">
              <input className="input" value={vidForm.url} onChange={(e) => setVidForm({ ...vidForm, url: e.target.value })} placeholder="https://youtu.be/…" />
            </Field>
          ) : null}

          <Field label="Təsvir"><textarea className="input min-h-20" value={vidForm.description} onChange={(e) => setVidForm({ ...vidForm, description: e.target.value })} /></Field>
          {!vidEdit?.video && mode === "link" && <p className="text-xs text-muted">Yeni video qaralama kimi əlavə olunur. Sonra kimlərə açıq olacağını seçin.</p>}
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
            <p className="rounded-xl border border-line/20 bg-tint px-3 py-2 text-sm">
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
                "flex w-full items-start gap-3 rounded-xl border border-line p-3 text-left transition",
                st.state === s.id ? "bg-tint" : "bg-white hover:bg-tint",
              )}
            >
              <span className={cx("mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border border-line", st.state === s.id && "bg-ink text-white")}>
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
