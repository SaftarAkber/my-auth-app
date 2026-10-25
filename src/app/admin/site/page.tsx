"use client";

import { useEffect, useState } from "react";
import { api, errMsg, useFetch } from "@/lib/api";
import { DEFAULT_SITE, type SiteContent } from "@/lib/siteDefaults";
import Landing from "@/components/Landing";
import { ErrorBox, Field, Icon, PageHeader, SkeletonList, Spinner, Toggle, useToast } from "@/components/ui";

export default function AdminSitePage() {
  const toast = useToast();
  const { data, loading, error, reload } = useFetch<{ site: SiteContent }>("/api/admin/site");
  const [s, setS] = useState<SiteContent>(DEFAULT_SITE);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (data) setS(data.site);
  }, [data]);

  const set = <K extends keyof SiteContent>(k: K, v: SiteContent[K]) => {
    setS((p) => ({ ...p, [k]: v }));
    setDirty(true);
  };
  const setItem = (key: "features" | "steps", i: number, f: "title" | "text", v: string) =>
    set(key, s[key].map((x, j) => (j === i ? { ...x, [f]: v } : x)));

  async function save() {
    setBusy(true);
    try {
      const r = await api<{ site: SiteContent }>("/api/admin/site", { method: "PUT", body: s });
      setS(r.site);
      setDirty(false);
      toast.success("Sayt yeniləndi: ziyarətçilər dərhal görəcək");
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  if (loading && !data) return <div className="page"><SkeletonList rows={4} className="h-32" /></div>;
  if (error) return <div className="page"><ErrorBox message={error} onRetry={reload} /></div>;

  const list = (key: "features" | "steps", label: string, max: number) => (
    <section className="card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-bold">{label}</h2>
        <button
          className="btn-secondary btn-sm"
          disabled={s[key].length >= max}
          onClick={() => set(key, [...s[key], { title: "Yeni", text: "Qısa izah yazın." }])}
        >
          <Icon name="plus" size={14} /> Əlavə et
        </button>
      </div>
      <div className="grid gap-3">
        {s[key].map((x, i) => (
          <div key={i} className="grid gap-2 rounded-xl border-2 border-line p-3">
            <div className="flex gap-2">
              <input className="input" value={x.title} onChange={(e) => setItem(key, i, "title", e.target.value)} aria-label="Başlıq" />
              <button className="btn-icon shrink-0 hover:!bg-flame hover:!text-white" onClick={() => set(key, s[key].filter((_, j) => j !== i))} aria-label="Sil"><Icon name="trash" size={16} /></button>
            </div>
            <textarea className="input min-h-16" value={x.text} onChange={(e) => setItem(key, i, "text", e.target.value)} aria-label="Mətn" />
          </div>
        ))}
        {s[key].length === 0 && <p className="text-sm text-muted">Siyahı boşdur.</p>}
      </div>
    </section>
  );

  return (
    <div className="page">
      <PageHeader
        title="Sayt"
        subtitle="Giriş etməmiş ziyarətçilərin gördüyü ana səhifə"
        actions={
          <>
            {dirty && <span className="badge-warn">Yadda saxlanmayıb</span>}
            <button className="btn-secondary" onClick={() => { setS(DEFAULT_SITE); setDirty(true); }}>Susmaya görə</button>
            <button className="btn-primary" onClick={save} disabled={busy || !dirty}>{busy ? <Spinner /> : "Yadda saxla"}</button>
          </>
        }
      />

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(340px,480px)_1fr]">
        <div className="grid gap-5">
          <section className="card p-5">
            <h2 className="mb-3 font-bold">Giriş bölməsi</h2>
            <div className="grid gap-3">
              <Field label="Brend adı"><input className="input" value={s.brand} onChange={(e) => set("brand", e.target.value)} /></Field>
              <Field label="Əsas başlıq"><input className="input" value={s.heroTitle} onChange={(e) => set("heroTitle", e.target.value)} /></Field>
              <Field label="Alt mətn"><textarea className="input min-h-24" value={s.heroText} onChange={(e) => set("heroText", e.target.value)} /></Field>
              <Field label="Düymə mətni"><input className="input" value={s.heroBtn} onChange={(e) => set("heroBtn", e.target.value)} /></Field>
            </div>
          </section>

          {list("features", "Xüsusiyyət kartları", 8)}

          <section className="card p-5">
            <h2 className="mb-3 font-bold">Addımlar və yekun</h2>
            <div className="grid gap-3">
              <Field label="Addımlar başlığı"><input className="input" value={s.stepsTitle} onChange={(e) => set("stepsTitle", e.target.value)} /></Field>
            </div>
          </section>
          {list("steps", "Addımlar", 6)}

          <section className="card p-5">
            <h2 className="mb-3 font-bold">Yekun çağırış və alt yazı</h2>
            <div className="grid gap-3">
              <Field label="Başlıq"><input className="input" value={s.closeTitle} onChange={(e) => set("closeTitle", e.target.value)} /></Field>
              <Field label="Mətn"><textarea className="input min-h-20" value={s.closeText} onChange={(e) => set("closeText", e.target.value)} /></Field>
              <Field label="Alt yazı"><input className="input" value={s.footer} onChange={(e) => set("footer", e.target.value)} /></Field>
            </div>
          </section>

          <section className="card grid gap-2 p-5">
            <h2 className="mb-1 font-bold">Bölmələri göstər</h2>
            <Toggle checked={s.show.features} onChange={(v) => set("show", { ...s.show, features: v })} label="Xüsusiyyət kartları" />
            <Toggle checked={s.show.steps} onChange={(v) => set("show", { ...s.show, steps: v })} label="Addımlar" />
            <Toggle checked={s.show.close} onChange={(v) => set("show", { ...s.show, close: v })} label="Yekun çağırış" />
          </section>
        </div>

        <div className="xl:sticky xl:top-24">
          <p className="mb-2 font-bold">Canlı önizləmə</p>
          <div className="card max-h-[80vh] overflow-y-auto bg-bg">
            <Landing site={s} preview />
          </div>
        </div>
      </div>
    </div>
  );
}
