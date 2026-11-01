"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui";
import { cx } from "@/lib/format";

/** Ana səhifənin “kart topası” karuseli: kartlar üst-üstə düzülür, öndəki sürüşüb arxaya keçir. Məhsulun real ekranlarının nümunəsidir. */

const RESULTS = [
  { name: "Riyaziyyat: triqonometriya", score: "28 / 30", pct: 93 },
  { name: "İnformatika: say sistemləri", score: "22 / 25", pct: 88 },
  { name: "Ədəbiyyat: orta əsr poeziyası", score: "17 / 20", pct: 85 },
];

function Frame({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border border-line bg-white" style={{ boxShadow: "var(--hard-lg)" }}>
      <div className="flex items-center gap-2 border-b border-line bg-surface-2 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
        <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
        <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
        <span className="ml-2 text-xs font-semibold text-muted">{label}</span>
      </div>
      {children}
    </div>
  );
}

function TestSlide() {
  return (
    <Frame label="Test nəticələri">
      <ul className="divide-y divide-line">
        {RESULTS.map((r) => (
          <li key={r.name} className="px-5 py-3.5">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-sm font-medium text-ink">{r.name}</p>
              <p className="text-sm font-bold tabular-nums text-brand">{r.score}</p>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2">
              <div className="h-full rounded-full bg-brand" style={{ width: `${r.pct}%` }} />
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-auto flex items-center justify-between bg-surface-2 px-5 py-3 text-sm">
        <span className="text-muted">Müəllimdən mükafat</span>
        <span className="inline-flex items-center gap-1.5 font-semibold"><span className="coin-ic !h-4 !w-4" /> +20 coin</span>
      </div>
    </Frame>
  );
}

function VideoSlide() {
  return (
    <Frame label="Video dərs">
      <div className="relative grid aspect-video place-items-center bg-brand">
        <span className="grid h-14 w-14 place-items-center rounded-full bg-white/95 text-brand"><Icon name="video" size={24} /></span>
        <span className="absolute bottom-2 right-2 rounded bg-black/70 px-1.5 py-0.5 text-xs font-semibold text-white">18:24</span>
        <div className="absolute inset-x-0 bottom-0 h-1 bg-white/20"><div className="h-full w-2/5 bg-accent" /></div>
      </div>
      <div className="px-5 py-3.5">
        <p className="text-sm font-semibold text-ink">Hərəkət qanunları: sürət və təcil</p>
        <p className="mt-0.5 text-xs text-muted">Fizika · 12 şərh · yeni dərs</p>
      </div>
      <div className="mt-auto flex gap-2 border-t border-line bg-surface-2 px-5 py-3">
        {["Dərs 2", "Dərs 3", "Dərs 4"].map((x) => (
          <span key={x} className="flex-1 rounded border border-line bg-white px-2 py-1.5 text-center text-xs font-semibold text-muted">{x}</span>
        ))}
      </div>
    </Frame>
  );
}

function GroupSlide() {
  return (
    <Frame label="Qrup">
      <div className="h-14 bg-tint" style={{ backgroundImage: "repeating-linear-gradient(135deg, rgb(var(--brand) / .07) 0 14px, transparent 14px 28px)" }} />
      <div className="px-5 pb-4">
        <span className="-mt-6 grid h-12 w-12 place-items-center rounded-lg border border-line-strong bg-white text-base font-bold text-brand">11A</span>
        <p className="mt-2 font-bold text-ink">11-A hazırlıq qrupu</p>
        <p className="text-xs text-muted">Riyaziyyat · həftədə 3 dərs</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <span className="badge-warn">2 müraciət</span>
          <span className="badge-muted">3 test</span>
          <span className="badge-muted">4 video</span>
        </div>
      </div>
      <div className="mt-auto flex items-center justify-between border-t border-line bg-surface-2 px-5 py-3 text-sm">
        <span className="flex -space-x-2">
          {["AM", "RH", "NQ", "LH"].map((x) => (
            <span key={x} className="grid h-7 w-7 place-items-center rounded-full border-2 border-surface-2 bg-tint text-[10px] font-bold text-brand">{x}</span>
          ))}
        </span>
        <span className="font-semibold text-muted">12 üzv</span>
      </div>
    </Frame>
  );
}

function ContestSlide() {
  const rows = [
    { n: 1, name: "Nigar Q.", pts: "980" },
    { n: 2, name: "Rauf H.", pts: "940" },
    { n: 3, name: "Leyla H.", pts: "905" },
  ];
  return (
    <Frame label="Həftənin yarışı">
      <div className="flex items-center justify-between px-5 pt-4">
        <p className="text-sm font-bold text-ink">Riyaziyyat yarışı</p>
        <span className="badge bg-accent text-white">Tezliklə</span>
      </div>
      <ol className="mt-2 px-5 pb-4">
        {rows.map((r) => (
          <li key={r.n} className="flex items-center gap-3 border-b border-line py-2.5 last:border-0">
            <span className={cx("grid h-7 w-7 place-items-center rounded text-xs font-bold", r.n === 1 ? "bg-accent text-white" : "bg-surface-2 text-muted")}>{r.n}</span>
            <span className="flex-1 text-sm font-medium text-ink">{r.name}</span>
            <span className="text-sm font-bold tabular-nums text-brand">{r.pts}</span>
          </li>
        ))}
      </ol>
      <div className="mt-auto flex items-center justify-between bg-surface-2 px-5 py-3 text-sm">
        <span className="text-muted">Qalibə</span>
        <span className="inline-flex items-center gap-1.5 font-semibold"><span className="coin-ic !h-4 !w-4" /> coin mükafatı</span>
      </div>
    </Frame>
  );
}

const SLIDES = [
  { id: "test", label: "Testlər", title: "Test həll et, nəticəni dərhal gör", text: "Vaxtlı və ya sərbəst testlər, avtomatik yoxlama, hər sualın təhlili.", node: <TestSlide /> },
  { id: "video", label: "Videolar", title: "Dərslər istədiyin vaxt", text: "Müəllimin video paketləri, sual-cavab, şərhlər və növbəti dərsə keçid.", node: <VideoSlide /> },
  { id: "group", label: "Qruplar", title: "Müəllimin qrupu bir yerdə", text: "Paylaşımlar, testlər və videolar yalnız sənin qrupuna açıq olur.", node: <GroupSlide /> },
  { id: "contest", label: "Yarışlar", title: "Yarış və coin", text: "Həftəlik yarışlar və mağazada xərcləmək üçün coin mükafatları.", node: <ContestSlide /> },
] as const;

const AUTO_MS = 6000;

export default function LandingCarousel() {
  const n = SLIDES.length;
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const [reduced, setReduced] = useState(true);
  const touch = useRef<number | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const upd = () => setReduced(mq.matches);
    upd();
    mq.addEventListener("change", upd);
    return () => mq.removeEventListener("change", upd);
  }, []);

  const go = useCallback((d: number) => setI((x) => (x + d + n) % n), [n]);
  const auto = !reduced && !paused && !userPaused;

  useEffect(() => {
    if (!auto) return;
    const t = setInterval(() => setI((x) => (x + 1) % n), AUTO_MS);
    return () => clearInterval(t);
  }, [auto, n]);

  const cur = SLIDES[i];

  return (
    <div
      role="group"
      aria-roledescription="karusel"
      aria-label="Məhsul nümunələri"
      className="w-full min-w-0"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") go(1);
        else if (e.key === "ArrowLeft") go(-1);
      }}
    >
      <div
        className="relative mx-auto h-[340px] w-full max-w-[26rem] touch-pan-y select-none"
        onPointerDown={(e) => { touch.current = e.clientX; }}
        onPointerUp={(e) => {
          if (touch.current === null) return;
          const dx = e.clientX - touch.current;
          touch.current = null;
          if (Math.abs(dx) > 48) go(dx < 0 ? 1 : -1);
        }}
      >
        {SLIDES.map((s, idx) => {
          const k = (idx - i + n) % n;
          return (
            <div
              key={s.id}
              role="group"
              aria-roledescription="slayd"
              aria-label={`${idx + 1} / ${n}: ${s.label}`}
              aria-hidden={k !== 0}
              className="absolute inset-x-0 top-0 h-[300px] transition-[transform,opacity] duration-500 ease-out motion-reduce:transition-none"
              style={{
                transform: `translateY(${k * 26}px) scale(${1 - k * 0.05})`,
                opacity: k === 0 ? 1 : k === 1 ? 0.8 : k === 2 ? 0.45 : 0,
                zIndex: n - k,
                transformOrigin: "top center",
                pointerEvents: k === 0 ? "auto" : "none",
              }}
            >
              <div className="absolute inset-0 rounded-lg border border-line bg-white" style={{ boxShadow: "var(--hard-lg)" }} />
              <div className={cx("relative h-full transition-opacity duration-500", k === 0 ? "opacity-100" : "opacity-0")}>{s.node}</div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 text-center" aria-live={auto ? "off" : "polite"}>
        <p className="text-base font-bold text-ink">{cur.title}</p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted">{cur.text}</p>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-1 sm:gap-2">
        <button type="button" onClick={() => go(-1)} className="btn-icon h-11 w-11 border border-line-strong bg-white" aria-label="Əvvəlki slayd"><Icon name="left" size={18} /></button>
        <div role="tablist" aria-label="Slayd seçimi" className="flex items-center gap-1">
          {SLIDES.map((s, idx) => (
            <button
              key={s.id}
              role="tab"
              aria-selected={idx === i}
              onClick={() => setI(idx)}
              className={cx(
                "h-11 rounded px-1.5 text-xs font-semibold transition-colors sm:px-2.5",
                idx === i ? "text-brand" : "text-muted hover:text-brand",
              )}
            >
              <span className="block">{s.label}</span>
              <span className={cx("mx-auto mt-1 block h-[3px] rounded-full transition-all", idx === i ? "w-6 bg-accent" : "w-2 bg-line-strong")} />
            </button>
          ))}
        </div>
        <button type="button" onClick={() => go(1)} className="btn-icon h-11 w-11 border border-line-strong bg-white" aria-label="Növbəti slayd"><Icon name="right" size={18} /></button>
        {!reduced && (
          <button
            type="button"
            onClick={() => setUserPaused((v) => !v)}
            className="h-11 rounded px-2 text-xs font-semibold text-muted hover:text-brand sm:ml-1"
            aria-label={userPaused ? "Avtomatik keçidi davam etdir" : "Avtomatik keçidi dayandır"}
            aria-pressed={userPaused}
          >
            {userPaused ? "Davam" : "Dayan"}
          </button>
        )}
      </div>
    </div>
  );
}
