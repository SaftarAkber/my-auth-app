"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { api, errMsg, useFetch } from "@/lib/api";
import { cx } from "@/lib/format";
import TopicEditor from "@/components/topics/TopicEditor";
import TopicReader from "@/components/topics/TopicReader";
import { VideoThumb } from "@/components/content";
import {
  ChipSelect, Empty, ErrorBox, Field, Icon, Modal, SkeletonList, Spinner, Tabs, useConfirm, useToast,
} from "@/components/ui";
import TopicAccess from "@/components/topics/TopicAccess";

interface TestItem { id: string; name: string; isPublished: boolean; visibility: "PUBLIC" | "GROUP_ONLY"; _count: { questions: number } }
interface VideoItem { id: string; title: string; url: string; isPublished: boolean; visibility: "PUBLIC" | "GROUP_ONLY" }
interface TopicData {
  owner: true;
  myGroups: { id: string; name: string }[];
  topic: {
    id: string;
    title: string;
    content: string;
    isPublished: boolean;
    visibility: "PUBLIC" | "GROUP_ONLY";
    groups: { id: string; name: string }[];
    tests: TestItem[];
    videos: VideoItem[];
  };
}
interface Options {
  tests: (TestItem & { collection: { name: string } | null })[];
  videos: (VideoItem & { package: { name: string } | null })[];
}

type Tab = "library" | "tests" | "videos" | "settings";

const stateBadge = (x: { isPublished: boolean; visibility: string }) =>
  !x.isPublished ? <span className="badge-warn">Qaralama</span> : x.visibility === "PUBLIC" ? <span className="badge-ok">Hamıya açıq</span> : <span className="badge-info">Qruplara</span>;

/** Bağlanacaq test/videoların seçimi */
function LinkPicker<T extends { id: string }>({
  open, onClose, title, items, selected, label, sub, onSave,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  items: T[];
  selected: string[];
  label: (x: T) => string;
  sub: (x: T) => React.ReactNode;
  onSave: (ids: string[]) => Promise<void>;
}) {
  const [pick, setPick] = useState<string[]>(selected);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (open) { setPick(selected); setQ(""); }
  }, [open, selected]);
  const shown = items.filter((x) => label(x).toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="lg"
      footer={
        <>
          <span className="mr-auto self-center text-sm text-muted">{pick.length} seçilib</span>
          <button className="btn-secondary" onClick={onClose}>Ləğv et</button>
          <button
            className="btn-primary"
            disabled={busy}
            onClick={async () => { setBusy(true); try { await onSave(pick); onClose(); } finally { setBusy(false); } }}
          >
            {busy ? <Spinner /> : "Yadda saxla"}
          </button>
        </>
      }
    >
      <input className="input mb-3" placeholder="Axtar…" value={q} onChange={(e) => setQ(e.target.value)} />
      {shown.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">Heç nə tapılmadı.</p>
      ) : (
        <ul className="divide-y divide-line rounded-lg border border-line">
          {shown.map((x) => {
            const on = pick.includes(x.id);
            return (
              <li key={x.id}>
                <label className="flex min-h-14 cursor-pointer items-center gap-3 px-3 py-2 hover:bg-tint/50">
                  <input
                    type="checkbox"
                    className="h-5 w-5 accent-[rgb(var(--brand))]"
                    checked={on}
                    onChange={() => setPick((p) => (on ? p.filter((i) => i !== x.id) : [...p, x.id]))}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{label(x)}</span>
                    <span className="flex flex-wrap items-center gap-1.5 text-xs text-muted">{sub(x)}</span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      )}
    </Modal>
  );
}

export default function TeacherTopicPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const g = useSearchParams().get("g");
  const toast = useToast();
  const confirm = useConfirm();
  const { data, loading, error, reload } = useFetch<TopicData>(`/api/topics/${id}`);
  const [tab, setTab] = useState<Tab>("library");
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [content, setContent] = useState<string | null>(null);
  const [initial, setInitial] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [picker, setPicker] = useState<"tests" | "videos" | null>(null);
  const [opts, setOpts] = useState<Options | null>(null);
  const [title, setTitle] = useState("");
  const [groupIds, setGroupIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const t = data?.topic;
  useEffect(() => {
    if (!t) return;
    // Redaktor bir dəfə yüklənir; sonrakı yeniləmələr onu sıfırlamasın
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setInitial((x) => x ?? t.content);
    setContent((x) => x ?? t.content);
    setTitle(t.title);
    setGroupIds(t.groups.map((x) => x.id));
  }, [t]);

  const back = useMemo(() => {
    const grp = (t?.groups ?? []).find((x) => x.id === g) ?? t?.groups[0];
    return grp ? { href: `/teacher/groups/${grp.id}`, name: grp.name } : { href: "/teacher/groups", name: "Qruplar" };
  }, [t, g]);

  async function patch(body: Record<string, unknown>, ok?: string) {
    await api(`/api/topics/${id}`, { method: "PATCH", body });
    if (ok) toast.success(ok);
    reload();
  }

  async function openPicker(kind: "tests" | "videos") {
    setPicker(kind);
    if (!opts) {
      try {
        setOpts(await api<Options>(`/api/topics/${id}/options`));
      } catch (e) {
        toast.error(errMsg(e));
        setPicker(null);
      }
    }
  }

  async function moveItem(kind: "tests" | "videos", i: number, d: -1 | 1) {
    const ids = (kind === "tests" ? t!.tests : t!.videos).map((x) => x.id);
    [ids[i], ids[i + d]] = [ids[i + d], ids[i]];
    try { await patch(kind === "tests" ? { testIds: ids } : { videoIds: ids }); } catch (e) { toast.error(errMsg(e)); }
  }
  async function unlink(kind: "tests" | "videos", itemId: string) {
    const ids = (kind === "tests" ? t!.tests : t!.videos).map((x) => x.id).filter((x) => x !== itemId);
    try { await patch(kind === "tests" ? { testIds: ids } : { videoIds: ids }, "Mövzudan çıxarıldı"); } catch (e) { toast.error(errMsg(e)); }
  }

  async function saveSettings() {
    setBusy(true);
    try {
      await patch({ title, groupIds }, "Yadda saxlandı");
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    const ok = await confirm({
      title: `“${t?.title}” silinsin?`,
      message: "Kitabxana qeydləri silinəcək. Bağlı test paketləri və videolar yerində qalır.",
      confirmText: "Sil",
      danger: true,
    });
    if (!ok) return;
    try {
      await api(`/api/topics/${id}`, { method: "DELETE" });
      toast.success("Mövzu silindi");
      router.replace(back.href);
    } catch (e) {
      toast.error(errMsg(e));
    }
  }

  if (loading && !data) return <div className="page"><SkeletonList rows={3} className="h-40" /></div>;
  if (error || !t) return <div className="page"><ErrorBox message={error ?? "Mövzu tapılmadı"} onRetry={reload} /></div>;

  return (
    <div className="page">
      <nav className="mb-3 text-sm text-muted" aria-label="Yol">
        <Link href={back.href} className="inline-flex min-h-8 items-center gap-1 hover:text-brand"><Icon name="left" size={15} /> {back.name}</Link>
        <span className="mx-1.5">/</span>Mövzular
      </nav>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {t.isPublished && t.visibility === "GROUP_ONLY" && t.groups.map((x) => <span key={x.id} className="badge-muted"><Icon name="users" size={12} /> {x.name}</span>)}
          </div>
        </div>
        <TopicAccess
          size="md"
          topic={{ id: t.id, isPublished: t.isPublished, visibility: t.visibility, groupIds: t.groups.map((x) => x.id) }}
          groups={data!.myGroups}
          onChanged={reload}
        />
      </div>

      <div className="mt-6">
        <Tabs
          value={tab}
          onChange={(v) => setTab(v)}
          tabs={[
            { id: "library", label: dirty ? "Kitabxana •" : "Kitabxana" },
            { id: "tests", label: "Testlər", count: t.tests.length },
            { id: "videos", label: "Videolar", count: t.videos.length },
            { id: "settings", label: "Ayarlar" },
          ]}
        />

        {/* Kitabxana: redaktor hər zaman yüklü qalır ki, tab dəyişəndə yazılan itməsin */}
        <section className={cx(tab !== "library" && "hidden")}>
          <div className="mb-4 inline-flex overflow-hidden rounded border border-line-strong bg-white" role="group" aria-label="Rejim">
            {(["edit", "preview"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                aria-pressed={mode === m}
                className={cx("min-h-10 px-4 text-sm font-semibold transition-colors", mode === m ? "bg-brand text-white" : "text-muted hover:bg-tint hover:text-brand")}
              >
                {m === "edit" ? "Redaktə" : "Tələbə kimi bax"}
              </button>
            ))}
          </div>
          {initial !== null && (
            <div className={cx(mode !== "edit" && "hidden")}>
              <TopicEditor
                initialHtml={initial}
                onDirtyChange={setDirty}
                importUrl={`/api/topics/${id}/import`}
                onSave={async (html) => {
                  const r = await api<{ topic: { content: string } }>(`/api/topics/${id}`, { method: "PATCH", body: { content: html } });
                  setContent(r.topic.content);
                  toast.success("Kitabxana yadda saxlandı");
                }}
              />
            </div>
          )}
          {mode === "preview" && (
            <>
              {dirty && <p className="mb-3 text-sm text-warn">Saxlanmamış dəyişikliklər var: önizləmə son yadda saxlanmış versiyanı göstərir.</p>}
              <TopicReader html={content ?? ""} />
            </>
          )}
        </section>

        {tab === "tests" && (
          <section>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted">Tələbə yalnız ona açıq (dərc olunmuş) test paketlərini görür.</p>
              <button className="btn-primary btn-sm" onClick={() => openPicker("tests")}><Icon name="link" size={14} /> Test paketi bağla</button>
            </div>
            {t.tests.length === 0 ? (
              <Empty icon="file" title="Bağlı test yoxdur" text="Mövcud test paketlərinizdən seçib bu mövzuya bağlayın." />
            ) : (
              <ul className="card divide-y divide-line">
                {t.tests.map((x, i) => (
                  <li key={x.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded bg-tint text-brand"><Icon name="file" size={18} /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">{x.name}</span>
                      <span className="flex flex-wrap items-center gap-1.5 text-xs text-muted">{x._count.questions} sual {stateBadge(x)}</span>
                    </span>
                    <button className="btn-icon" disabled={i === 0} onClick={() => moveItem("tests", i, -1)} aria-label="Yuxarı"><Icon name="up" size={15} /></button>
                    <button className="btn-icon" disabled={i === t.tests.length - 1} onClick={() => moveItem("tests", i, 1)} aria-label="Aşağı"><Icon name="down" size={15} /></button>
                    <button className="btn-icon hover:!text-bad" onClick={() => unlink("tests", x.id)} aria-label="Mövzudan çıxar" title="Mövzudan çıxar"><Icon name="x" size={16} /></button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {tab === "videos" && (
          <section>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted">Tələbə yalnız ona açıq (dərc olunmuş) videoları görür.</p>
              <button className="btn-primary btn-sm" onClick={() => openPicker("videos")}><Icon name="link" size={14} /> Video bağla</button>
            </div>
            {t.videos.length === 0 ? (
              <Empty icon="video" title="Bağlı video yoxdur" text="Yüklədiyiniz və ya link ilə əlavə etdiyiniz videolardan seçin." />
            ) : (
              <ul className="card divide-y divide-line">
                {t.videos.map((x, i) => (
                  <li key={x.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <VideoThumb url={x.url} plain className="w-24 shrink-0 rounded" />
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">{x.title}</span>
                      <span className="text-xs">{stateBadge(x)}</span>
                    </span>
                    <button className="btn-icon" disabled={i === 0} onClick={() => moveItem("videos", i, -1)} aria-label="Yuxarı"><Icon name="up" size={15} /></button>
                    <button className="btn-icon" disabled={i === t.videos.length - 1} onClick={() => moveItem("videos", i, 1)} aria-label="Aşağı"><Icon name="down" size={15} /></button>
                    <button className="btn-icon hover:!text-bad" onClick={() => unlink("videos", x.id)} aria-label="Mövzudan çıxar" title="Mövzudan çıxar"><Icon name="x" size={16} /></button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {tab === "settings" && (
          <section className="grid max-w-2xl gap-5">
            <div className="card grid gap-4 p-5">
              <Field label="Mövzunun adı">
                <input className="input" maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} />
              </Field>
              <div>
                <span className="label">Hansı qruplarda görünsün</span>
                <ChipSelect options={data!.myGroups.map((x) => ({ id: x.id, label: x.name }))} value={groupIds} onChange={setGroupIds} empty="Hələ qrupunuz yoxdur" />
                <p className="mt-1.5 text-xs text-muted">Eyni mövzunu bir neçə qrupla paylaşa bilərsiniz.</p>
              </div>
              <div className="flex justify-end">
                <button className="btn-primary" onClick={saveSettings} disabled={busy || !title.trim()}>{busy ? <Spinner /> : "Yadda saxla"}</button>
              </div>
            </div>
            <div className="card flex flex-wrap items-center justify-between gap-3 p-5">
              <div>
                <p className="font-bold">Mövzunu sil</p>
                <p className="text-sm text-muted">Test paketləri və videolar silinmir, yalnız bu mövzu və qeydləri.</p>
              </div>
              <button className="btn-danger" onClick={remove}><Icon name="trash" size={15} /> Sil</button>
            </div>
          </section>
        )}
      </div>

      <LinkPicker
        open={picker === "tests" && !!opts}
        onClose={() => setPicker(null)}
        title="Test paketlərini seçin"
        items={opts?.tests ?? []}
        selected={t.tests.map((x) => x.id)}
        label={(x) => x.name}
        sub={(x) => <>{x.collection?.name && <span>{x.collection.name} ·</span>} {x._count.questions} sual {stateBadge(x)}</>}
        onSave={async (ids) => {
          // Əvvəlki sıra saxlanılır, yenilər sona əlavə olunur
          const keep = t.tests.map((x) => x.id).filter((x) => ids.includes(x));
          try { await patch({ testIds: [...keep, ...ids.filter((x) => !keep.includes(x))] }, "Testlər yeniləndi"); } catch (e) { toast.error(errMsg(e)); }
        }}
      />
      <LinkPicker
        open={picker === "videos" && !!opts}
        onClose={() => setPicker(null)}
        title="Videoları seçin"
        items={opts?.videos ?? []}
        selected={t.videos.map((x) => x.id)}
        label={(x) => x.title}
        sub={(x) => <>{x.package?.name && <span>{x.package.name} ·</span>} {stateBadge(x)}</>}
        onSave={async (ids) => {
          const keep = t.videos.map((x) => x.id).filter((x) => ids.includes(x));
          try { await patch({ videoIds: [...keep, ...ids.filter((x) => !keep.includes(x))] }, "Videolar yeniləndi"); } catch (e) { toast.error(errMsg(e)); }
        }}
      />
    </div>
  );
}
