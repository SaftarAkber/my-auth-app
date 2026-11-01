"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui";
import { CarouselArrow } from "@/components/ItemCarousel";
import { cx } from "@/lib/format";

/**
 * Ana səhifənin “hekayə” karuseli: platformada baş verən hadisələrin nümunələri (test bitirmə, hədiyyə,
 * şərh və müəllim cavabı, qrupa qoşulma, yarış). Hər hekayənin üstündə vaxt xətti dolur və avtomatik növbətiyə keçir.
 */

const STORY_MS = 4500;
const TICK_MS = 50;

function Avatar({ initials, tone = "tint" }: { initials: string; tone?: "tint" | "brand" }) {
  return (
    <span className={cx("grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-bold", tone === "brand" ? "bg-brand text-white" : "bg-tint text-brand")}>
      {initials}
    </span>
  );
}

function Head({ initials, name, action, time, tone }: { initials: string; name: string; action: string; time: string; tone?: "tint" | "brand" }) {
  return (
    <div className="flex items-center gap-3 border-b border-line px-5 py-4">
      <Avatar initials={initials} tone={tone} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-ink">{name}</p>
        <p className="truncate text-xs text-muted">{action}</p>
      </div>
      <span className="text-xs font-semibold text-muted">{time}</span>
    </div>
  );
}

/* ───── 1. Test bitirdi ───── */
function TestStory() {
  const C = 2 * Math.PI * 52;
  return (
    <>
      <Head initials="NQ" name="Nigar Q." action="testi bitirdi" time="indicə" />
      <div className="grid flex-1 place-items-center px-5 py-4">
        <div className="relative grid h-36 w-36 place-items-center">
          <svg viewBox="0 0 120 120" className="absolute inset-0 -rotate-90" aria-hidden>
            <circle cx="60" cy="60" r="52" fill="none" stroke="rgb(var(--surface-2))" strokeWidth="10" />
            <circle
              cx="60" cy="60" r="52" fill="none" stroke="rgb(var(--brand))" strokeWidth="10" strokeLinecap="round"
              strokeDasharray={C} strokeDashoffset={C * 0.07}
              className="ring-anim" style={{ ["--c" as string]: `${C}` }}
            />
          </svg>
          <div className="text-center">
            <p className="text-3xl font-bold tabular-nums tracking-tight text-ink">28<span className="text-lg text-muted"> / 30</span></p>
            <p className="text-xs font-semibold text-ok">93% · Keçdi</p>
          </div>
        </div>
      </div>
      <div className="space-y-2 px-5 pb-5">
        <p className="text-sm font-semibold text-ink">Riyaziyyat: triqonometriya</p>
        <div className="flex flex-wrap gap-1.5"><span className="badge-ok">28 düz</span><span className="badge-bad">1 səhv</span><span className="badge-muted">1 boş</span></div>
      </div>
    </>
  );
}

/* ───── 2. Hədiyyə qazandı ───── */
function GiftStory() {
  return (
    <>
      <Head initials="RH" name="Rauf H." action="müəllimdən hədiyyə aldı" time="2 dəq" />
      <div className="grid flex-1 place-items-center px-5 py-4">
        <div className="text-center">
          <div className="pop-in relative mx-auto h-28 w-28">
            <span className="absolute inset-0 rounded-full border-[6px] border-tiger bg-sun" />
            <span className="absolute inset-3 rounded-full border-2 border-tiger/70" />
            <span className="absolute inset-0 grid place-items-center text-4xl font-bold text-tiger">$</span>
          </div>
          <p className="mt-4 text-3xl font-bold tabular-nums tracking-tight text-ink">+50 coin</p>
          <p className="mt-1 text-sm text-muted">Həftənin ən yaxşı nəticəsi üçün</p>
        </div>
      </div>
      <div className="mx-5 mb-5 flex items-center justify-between rounded-lg border border-line bg-surface-2 px-4 py-3">
        <div>
          <p className="text-xs font-semibold text-muted">Mağazada</p>
          <p className="text-sm font-bold text-ink">Qələm dəsti · 40 coin</p>
        </div>
        <span className="rounded bg-brand px-3 py-1.5 text-xs font-semibold text-white">Al</span>
      </div>
    </>
  );
}

/* ───── 3. Şərh və müəllim cavabı ───── */
function CommentStory() {
  return (
    <>
      <Head initials="LH" name="Leyla H." action="videoya şərh yazdı" time="5 dəq" />
      <div className="flex-1 space-y-3 px-5 py-4">
        <div className="flex items-center gap-3 rounded-lg border border-line p-2">
          <span className="grid h-12 w-20 shrink-0 place-items-center rounded bg-brand text-white"><Icon name="video" size={18} /></span>
          <p className="line-clamp-2 text-xs font-semibold text-ink">Törəmənin həndəsi mənası</p>
        </div>
        <div className="slide-in-l flex gap-2.5">
          <Avatar initials="LH" />
          <div className="rounded-lg rounded-tl-none bg-surface-2 px-3.5 py-2.5">
            <p className="text-xs font-bold text-ink">Leyla H.</p>
            <p className="mt-0.5 text-sm text-ink">Toxunan düz xəttin bucaq əmsalını bir də izah edərsiniz?</p>
          </div>
        </div>
        <div className="slide-in-r ml-8 flex gap-2.5" style={{ animationDelay: "0.9s" }}>
          <Avatar initials="RƏ" tone="brand" />
          <div className="rounded-lg rounded-tl-none border border-brand/20 bg-tint px-3.5 py-2.5">
            <p className="flex items-center gap-2 text-xs font-bold text-ink">Rəşad Əliyev <span className="rounded bg-brand px-1.5 py-0.5 text-[10px] font-semibold text-white">Müəllim</span></p>
            <p className="mt-0.5 text-sm text-ink">Əlbəttə! Sabahkı dərsdə qrafik üzərində göstərəcəyəm.</p>
          </div>
        </div>
      </div>
    </>
  );
}

/* ───── 4. Qrupa qoşuldu ───── */
function GroupStory() {
  return (
    <>
      <Head initials="TM" name="Tural M." action="qrupa müraciət etdi" time="12 dəq" />
      <div className="flex-1 px-5 py-4">
        <div className="overflow-hidden rounded-lg border border-line">
          <div className="h-12 bg-tint" style={{ backgroundImage: "repeating-linear-gradient(135deg, rgb(var(--brand) / .07) 0 14px, transparent 14px 28px)" }} />
          <div className="px-4 pb-4">
            <span className="-mt-5 grid h-10 w-10 place-items-center rounded-lg border border-line-strong bg-white text-sm font-bold text-brand">11A</span>
            <p className="mt-2 font-bold text-ink">11-A hazırlıq qrupu</p>
            <p className="text-xs text-muted">Riyaziyyat · həftədə 3 dərs</p>
            <div className="mt-3 flex items-center justify-between">
              <span className="flex -space-x-2">
                {["AM", "RH", "NQ", "LH"].map((x) => (
                  <span key={x} className="grid h-7 w-7 place-items-center rounded-full border-2 border-white bg-tint text-[10px] font-bold text-brand">{x}</span>
                ))}
              </span>
              <span className="text-xs font-semibold text-muted">12 üzv</span>
            </div>
          </div>
        </div>
        <div className="pop-in mt-4 flex items-center gap-3 rounded-lg border border-ok/30 bg-ok/10 px-4 py-3" style={{ animationDelay: "0.8s" }}>
          <span className="grid h-8 w-8 place-items-center rounded-full bg-ok text-white"><Icon name="check" size={16} /></span>
          <div>
            <p className="text-sm font-bold text-ink">Müəllim qəbul etdi</p>
            <p className="text-xs text-muted">Artıq qrupun testləri və videoları açıqdır</p>
          </div>
        </div>
      </div>
    </>
  );
}

/* ───── 5. Yarış ───── */
function ContestStory() {
  const rows = [
    { n: 1, name: "Nigar Q.", pts: 980 },
    { n: 2, name: "Rauf H.", pts: 940 },
    { n: 3, name: "Aysel M.", pts: 905 },
  ];
  return (
    <>
      <Head initials="AM" name="Aysel M." action="yarışa hazırlaşır" time="bu gün" />
      <div className="flex-1 px-5 py-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-bold text-ink">Həftənin riyaziyyat yarışı</p>
          <span className="badge bg-accent text-white">Tezliklə</span>
        </div>
        <ol className="space-y-2">
          {rows.map((r, i) => (
            <li key={r.n} className="slide-in-l flex items-center gap-3 rounded-lg border border-line px-3 py-2.5" style={{ animationDelay: `${i * 0.18}s` }}>
              <span className={cx("grid h-7 w-7 place-items-center rounded text-xs font-bold", r.n === 1 ? "bg-accent text-white" : "bg-surface-2 text-muted")}>{r.n}</span>
              <span className="flex-1 text-sm font-semibold text-ink">{r.name}</span>
              <span className="text-sm font-bold tabular-nums text-brand">{r.pts}</span>
            </li>
          ))}
        </ol>
        <div className="mt-4 flex items-center justify-between rounded-lg bg-surface-2 px-4 py-3 text-sm">
          <span className="text-muted">Qalibə mükafat</span>
          <span className="inline-flex items-center gap-1.5 font-semibold text-ink"><span className="coin-ic !h-4 !w-4" /> coin</span>
        </div>
      </div>
    </>
  );
}

const STORIES = [
  { id: "test", label: "Test", node: <TestStory /> },
  { id: "gift", label: "Hədiyyə", node: <GiftStory /> },
  { id: "comment", label: "Şərh", node: <CommentStory /> },
  { id: "group", label: "Qrup", node: <GroupStory /> },
  { id: "contest", label: "Yarış", node: <ContestStory /> },
] as const;

export default function LandingCarousel() {
  const n = STORIES.length;
  const [i, setI] = useState(0);
  const [progress, setProgress] = useState(0);
  const [focused, setFocused] = useState(false);
  const [holding, setHolding] = useState(false);
  const touch = useRef<number | null>(null);

  const go = useCallback((d: number) => {
    setI((x) => (x + d + n) % n);
    setProgress(0);
  }, [n]);

  // Dayandırma düyməsi yoxdur: klaviatura fokusunda və ya basıb saxlayanda (Instagram kimi) hekayə durur
  const running = !focused && !holding;

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setProgress((p) => Math.min(1, p + TICK_MS / STORY_MS)), TICK_MS);
    return () => clearInterval(t);
  }, [running]);

  useEffect(() => {
    if (progress < 1) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setI((x) => (x + 1) % n);
    setProgress(0);
  }, [progress, n]);

  return (
    <div
      role="group"
      aria-roledescription="karusel"
      aria-label="Platformadan nümunələr"
      className="relative mx-auto w-full min-w-0 max-w-[24rem]"
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") go(1);
        else if (e.key === "ArrowLeft") go(-1);
      }}
    >
      <div
        className="relative flex h-[460px] touch-pan-y select-none flex-col overflow-hidden rounded-xl border border-line bg-white"
        style={{ boxShadow: "var(--hard-lg)" }}
        onPointerDown={(e) => { touch.current = e.clientX; setHolding(true); }}
        onPointerCancel={() => { touch.current = null; setHolding(false); }}
        onPointerLeave={() => setHolding(false)}
        onPointerUp={(e) => {
          setHolding(false);
          if (touch.current === null) return;
          const dx = e.clientX - touch.current;
          touch.current = null;
          if (Math.abs(dx) > 48) go(dx < 0 ? 1 : -1);
        }}
      >
        {/* Vaxt xətləri: həm irəliləyiş göstəricisi, həm də hekayəyə keçid (klik) */}
        <div className="flex gap-1.5 px-3 pt-1" role="tablist" aria-label="Hekayə seçimi">
          {STORIES.map((s, idx) => (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={idx === i}
              aria-label={s.label}
              title={s.label}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => { setI(idx); setProgress(0); }}
              className="group relative z-10 flex h-8 flex-1 items-center focus-visible:outline-none"
            >
              <span className="block h-1 w-full overflow-hidden rounded-full bg-surface-2 transition-all group-hover:h-1.5 group-focus-visible:ring-2 group-focus-visible:ring-iris">
                <span className="block h-full rounded-full bg-accent" style={{ width: idx < i ? "100%" : idx === i ? `${progress * 100}%` : "0%" }} />
              </span>
            </button>
          ))}
        </div>

        <div key={STORIES[i].id} className="story-in flex min-h-0 flex-1 flex-col" aria-live={running ? "off" : "polite"}>
          {STORIES[i].node}
        </div>

        {/* Toxunma sahələri: sol/sağ */}
        <button type="button" className="absolute inset-y-14 left-0 w-1/4 cursor-w-resize" onClick={() => go(-1)} aria-label="Əvvəlki hekayə" tabIndex={-1} />
        <button type="button" className="absolute inset-y-14 right-0 w-1/4 cursor-e-resize" onClick={() => go(1)} aria-label="Növbəti hekayə" tabIndex={-1} />
      </div>

      <CarouselArrow dir="prev" onClick={() => go(-1)} className="absolute -left-14 top-1/2 hidden -translate-y-1/2 sm:grid" />
      <CarouselArrow dir="next" onClick={() => go(1)} className="absolute -right-14 top-1/2 hidden -translate-y-1/2 sm:grid" />
    </div>
  );
}
