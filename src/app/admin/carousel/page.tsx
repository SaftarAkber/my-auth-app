"use client";

import { useState } from "react";
import { api, errMsg, useFetch } from "@/lib/api";
import { cx, fmtDate, fmtDateTime, toInputDateTime } from "@/lib/format";
import { Empty, ErrorBox, Field, Icon, ImageUpload, Modal, PageHeader, SkeletonList, Spinner, Toggle, useConfirm, useToast } from "@/components/ui";
import { HeroSlideView, type HeroSlideData } from "@/components/HeroCarousel";

interface Slide extends HeroSlideData {
  order: number;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
}

const TEMPLATES = [
  { id: "exam", label: "Aylıq sınaq", hint: "Spiral fon, divar təqvimi (tarix geri sayımdan götürülür)" },
  { id: "contest", label: "Yarış", hint: "Neon masa, kubok; iri yazı masanın üstündə" },
  { id: "shop", label: "Mağaza endirimi", hint: "Sarı zolaqlar; iri yazı cırılmış etiketdə (məs. 30%)" },
  { id: "live", label: "Canlı dərs / qeydiyyat", hint: "Dəniz-yaşılı ekran, CANLI nişanı" },
] as const;

/** Şablonların hazır nümunə mətnləri (yeni slaydda doldurulur) */
const SAMPLE: Record<string, Partial<Slide>> = {
  exam: { tag: "Aylıq sınaq vaxtıdır!", title: "Noyabr aylıq sınağı", subtitle: "25 sual · 40 dəqiqə", note: "Yalnız 1-ci cəhd cədvələ düşür" },
  contest: { tag: "Yarış", title: "Alqoritm yarışı", subtitle: "1-ci yer 30 coin · 2-ci yer 18 coin · 3-cü yer 10 coin", highlight: "30 COIN", note: "3 gün qalıb" },
  shop: { tag: "Həftə sonu", title: "Mağazada endirim!", subtitle: "Dəftər, qələm dəsti və kitablar", highlight: "30%", note: "Bazar gününədək" },
  live: { tag: "Qeydiyyat başladı", title: "Canlı onlayn qrup", subtitle: "Riyaziyyat · həftədə 2 dəfə", note: "12 yer qalıb" },
};

type Form = {
  kind: "template" | "image";
  template: string;
  tag: string; title: string; subtitle: string; highlight: string; note: string;
  imageUrl: string | null;
  countdownAt: string; timerPos: string;
  isActive: boolean; startsAt: string; endsAt: string;
};

const toForm = (s?: Slide): Form => ({
  kind: s?.kind === "image" ? "image" : "template",
  template: s?.template ?? "exam",
  tag: s?.tag ?? SAMPLE.exam.tag ?? "",
  title: s?.title ?? SAMPLE.exam.title ?? "",
  subtitle: s?.subtitle ?? SAMPLE.exam.subtitle ?? "",
  highlight: s?.highlight ?? "",
  note: s?.note ?? SAMPLE.exam.note ?? "",
  imageUrl: s?.imageUrl ?? null,
  countdownAt: s?.countdownAt ? toInputDateTime(s.countdownAt) : "",
  timerPos: s?.timerPos ?? "bl",
  isActive: s?.isActive ?? true,
  startsAt: s?.startsAt ? toInputDateTime(s.startsAt) : "",
  endsAt: s?.endsAt ? toInputDateTime(s.endsAt) : "",
});

const iso = (v: string) => (v ? new Date(v).toISOString() : null);

function Editor({ initial, onClose, onSaved }: { initial: Slide | null; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [f, setF] = useState<Form>(() => toForm(initial ?? undefined));
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((x) => ({ ...x, [k]: v }));

  function pickTemplate(id: string) {
    // Yeni slaydda və ya mətn dəyişdirilməyibsə nümunə mətnləri gətir
    const s = SAMPLE[id] ?? {};
    setF((x) => ({ ...x, template: id, tag: s.tag ?? "", title: s.title ?? "", subtitle: s.subtitle ?? "", highlight: s.highlight ?? "", note: s.note ?? "" }));
  }

  const preview: HeroSlideData = {
    id: "preview", kind: f.kind, template: f.template,
    tag: f.tag || null, title: f.title || null, subtitle: f.subtitle || null, highlight: f.highlight || null, note: f.note || null,
    imageUrl: f.imageUrl, countdownAt: iso(f.countdownAt), timerPos: f.timerPos,
  };

  async function save() {
    if (f.kind === "image" && !f.imageUrl) return toast.error("Şəkil yükləyin");
    if (f.kind === "template" && !f.title.trim()) return toast.error("Başlıq yazın");
    setBusy(true);
    try {
      const body = { ...f, countdownAt: iso(f.countdownAt), startsAt: iso(f.startsAt), endsAt: iso(f.endsAt) };
      if (initial) await api(`/api/admin/hero/${initial.id}`, { method: "PATCH", body });
      else await api("/api/admin/hero", { method: "POST", body });
      toast.success(initial ? "Slayd yeniləndi" : "Slayd əlavə olundu");
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
      size="xl"
      onClose={onClose}
      title={initial ? "Slaydı redaktə et" : "Yeni slayd"}
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>Ləğv et</button>
          <button className="btn-primary" onClick={save} disabled={busy}>{busy ? <Spinner /> : "Yadda saxla"}</button>
        </>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Slayd növü">
            {([["template", "Hazır dizayn", "Mətni yaz, dizayn hazırdır"], ["image", "Öz şəklim", "Bitmiş afişa yüklə (16:9)"]] as const).map(([k, l, h]) => (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={f.kind === k}
                onClick={() => set("kind", k)}
                className={cx("rounded-xl border p-3 text-left transition", f.kind === k ? "border-brand bg-tint" : "border-line hover:bg-surface-2")}
              >
                <span className="block text-sm font-extrabold">{l}</span>
                <span className="block text-xs text-muted">{h}</span>
              </button>
            ))}
          </div>

          {f.kind === "template" ? (
            <>
              <Field label="Dizayn">
                <div className="grid grid-cols-2 gap-2">
                  {TEMPLATES.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => pickTemplate(t.id)}
                      className={cx("rounded-xl border px-3 py-2 text-left text-sm font-bold transition", f.template === t.id ? "border-brand bg-tint text-brand" : "border-line hover:bg-surface-2")}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
                <span className="mt-1 block text-xs text-muted">{TEMPLATES.find((t) => t.id === f.template)?.hint}</span>
              </Field>
              <Field label="Etiket (yuxarıdakı kağız)"><input className="input" value={f.tag} maxLength={40} onChange={(e) => set("tag", e.target.value)} /></Field>
              <Field label="Başlıq *"><input className="input" value={f.title} maxLength={120} onChange={(e) => set("title", e.target.value)} /></Field>
              <Field label="Alt mətn"><input className="input" value={f.subtitle} maxLength={200} onChange={(e) => set("subtitle", e.target.value)} /></Field>
              <div className="grid gap-4 sm:grid-cols-2">
                {f.template !== "exam" && f.template !== "live" && (
                  <Field label="İri yazı" hint={f.template === "shop" ? "məs. 30%" : "məs. 30 COIN"}><input className="input" value={f.highlight} maxLength={24} onChange={(e) => set("highlight", e.target.value)} /></Field>
                )}
                <Field label="Kiçik nişan"><input className="input" value={f.note} maxLength={40} onChange={(e) => set("note", e.target.value)} /></Field>
              </div>
            </>
          ) : (
            <>
              <ImageUpload label="Afişa şəkli (16:9, məs. 1920×1080)" value={f.imageUrl} onChange={(u) => set("imageUrl", u)} />
              <Field label="Şəklin adı (ekran oxuyucular üçün)"><input className="input" value={f.title} maxLength={120} onChange={(e) => set("title", e.target.value)} /></Field>
            </>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Geri sayım: bu ana qədər" hint="Boş qalsa taymer görünmür">
              <input className="input" type="datetime-local" value={f.countdownAt} onChange={(e) => set("countdownAt", e.target.value)} />
            </Field>
            {f.kind === "image" && (
              <Field label="Taymerin yeri">
                <select className="input" value={f.timerPos} onChange={(e) => set("timerPos", e.target.value)}>
                  <option value="bl">Aşağı sol</option>
                  <option value="br">Aşağı sağ</option>
                  <option value="tl">Yuxarı sol</option>
                  <option value="tr">Yuxarı sağ</option>
                </select>
              </Field>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Görünmə başlanğıcı" hint="Boş = dərhal"><input className="input" type="datetime-local" value={f.startsAt} onChange={(e) => set("startsAt", e.target.value)} /></Field>
            <Field label="Görünmə sonu" hint="Boş = əl ilə söndürənədək"><input className="input" type="datetime-local" value={f.endsAt} onChange={(e) => set("endsAt", e.target.value)} /></Field>
          </div>
          <Toggle checked={f.isActive} onChange={(v) => set("isActive", v)} label="Aktivdir" hint="Söndürülmüş slayd tələbələrə görünmür" />
        </div>

        <div>
          <span className="label">Önizləmə</span>
          <div className="hero-slide on !cursor-default !p-0"><HeroSlideView s={preview} /></div>
          <p className="mt-2 text-xs text-muted">Tələbənin ana səhifəsində belə görünəcək (hərəkətlər də daxil). Telefonda kart bir az hündür olur.</p>
        </div>
      </div>
    </Modal>
  );
}

export default function AdminCarouselPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const { data, loading, error, reload, setData } = useFetch<{ slides: Slide[] }>("/api/admin/hero");
  const [editing, setEditing] = useState<Slide | "new" | null>(null);
  const slides = data?.slides ?? [];

  async function toggle(s: Slide) {
    try {
      await api(`/api/admin/hero/${s.id}`, { method: "PATCH", body: { isActive: !s.isActive } });
      reload();
    } catch (e) {
      toast.error(errMsg(e));
    }
  }
  async function remove(s: Slide) {
    if (!(await confirm({ title: "Slayd silinsin?", message: s.title ?? "", confirmText: "Sil", danger: true }))) return;
    try {
      await api(`/api/admin/hero/${s.id}`, { method: "DELETE" });
      toast.success("Slayd silindi");
      reload();
    } catch (e) {
      toast.error(errMsg(e));
    }
  }
  async function moveBy(i: number, d: number) {
    const j = i + d;
    if (j < 0 || j >= slides.length) return;
    const next = [...slides];
    [next[i], next[j]] = [next[j], next[i]];
    setData({ slides: next });
    try {
      await api("/api/admin/hero", { method: "PUT", body: { ids: next.map((s) => s.id) } });
    } catch (e) {
      toast.error(errMsg(e));
      reload();
    }
  }

  return (
    <div className="page">
      <PageHeader
        title="Karusel"
        subtitle="Tələbələrin ana səhifəsinin yuxarısındakı elanlar"
        actions={<button className="btn-primary" onClick={() => setEditing("new")}><Icon name="plus" size={16} /> Yeni slayd</button>}
      />
      {loading && !data ? (
        <SkeletonList rows={3} className="h-40" />
      ) : error ? (
        <ErrorBox message={error} onRetry={reload} />
      ) : slides.length === 0 ? (
        <Empty icon="image" title="Hələ slayd yoxdur" text="Aylıq sınaq, yarış, endirim və ya qeydiyyat elanı əlavə edin." action={<button className="btn-primary" onClick={() => setEditing("new")}>Slayd əlavə et</button>} />
      ) : (
        <div className="space-y-3">
          {slides.map((s, i) => (
            <article key={s.id} className={cx("card flex flex-col gap-4 p-3 sm:flex-row sm:items-center", !s.isActive && "opacity-60")}>
              {/* Kiçik önizləmə: slayd 640px enində çəkilir və kiçildilir (əsl görünüşün kopyası) */}
              <div className="pointer-events-none relative h-36 w-64 shrink-0 overflow-hidden rounded-[14px]">
                <div className="hero-slide on absolute left-0 top-0 !p-0" style={{ width: 640, transform: "scale(0.4)", transformOrigin: "top left" }}>
                  <HeroSlideView s={s} />
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-extrabold">{s.title || (s.kind === "image" ? "Şəkil" : "Adsız slayd")}</p>
                <p className="mt-0.5 text-sm text-muted">
                  {s.kind === "image" ? "Öz şəkli" : TEMPLATES.find((t) => t.id === s.template)?.label}
                  {s.countdownAt && ` · taymer: ${fmtDateTime(s.countdownAt)}`}
                  {s.endsAt && ` · ${fmtDate(s.endsAt)} tarixinədək`}
                </p>
                {!s.isActive && <span className="badge-muted mt-1.5">Söndürülüb</span>}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button className="btn-icon" aria-label="Yuxarı" disabled={i === 0} onClick={() => moveBy(i, -1)}><Icon name="up" size={17} /></button>
                <button className="btn-icon" aria-label="Aşağı" disabled={i === slides.length - 1} onClick={() => moveBy(i, 1)}><Icon name="down" size={17} /></button>
                <button className="btn-icon" aria-label={s.isActive ? "Söndür" : "Aktiv et"} onClick={() => toggle(s)}><Icon name={s.isActive ? "eye" : "eyeOff"} size={17} /></button>
                <button className="btn-icon" aria-label="Redaktə" onClick={() => setEditing(s)}><Icon name="edit" size={17} /></button>
                <button className="btn-icon hover:!text-bad" aria-label="Sil" onClick={() => remove(s)}><Icon name="trash" size={17} /></button>
              </div>
            </article>
          ))}
        </div>
      )}
      {editing && <Editor initial={editing === "new" ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload(); }} />}
    </div>
  );
}
