"use client";

import { Children, useCallback, useEffect, useRef, useState } from "react";

/** Çərçivəsiz, yumşaq dairəvi fonlu ox düyməsi (karusellər üçün ortaq). */
export function CarouselArrow({ dir, onClick, className = "" }: { dir: "prev" | "next"; onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={dir === "prev" ? "Əvvəlki" : "Növbəti"}
      className={`grid h-11 w-11 place-items-center rounded-full text-ink/70 transition-colors hover:bg-ink/5 hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-iris ${className}`}
    >
      <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d={dir === "prev" ? "M14.5 5.5 8 12l6.5 6.5" : "M9.5 5.5 16 12l-6.5 6.5"} />
      </svg>
    </button>
  );
}

/**
 * Kartlar sırası: eyni anda 4 (geniş), 2 (orta), 1 (dar) kart görünür; hər 3 saniyədən bir bir kart sola sürüşür.
 * Sonsuz dövrə üçün ilk kartların klonları sona əlavə olunur (klonlar oxucuya və klaviaturaya bağlıdır).
 * Kart sayı görünənlərdən çox deyilsə adi şəbəkə kimi göstərilir.
 */
const STEP_MS = 3000;
const SLIDE_MS = 600;
const MAX_VIEW = 4;

export default function ItemCarousel({ children, label }: { children: React.ReactNode; label: string }) {
  const items = Children.toArray(children);
  const n = items.length;
  const slides = n > MAX_VIEW;
  const [idx, setIdx] = useState(0);
  const [anim, setAnim] = useState(true);
  const [hold, setHold] = useState(false);
  const wrap = useRef<ReturnType<typeof setTimeout> | null>(null);

  const step = useCallback((d: number) => {
    setAnim(true);
    setIdx((x) => {
      if (d > 0) return x + 1;
      if (x === 0) return x; // geriyə: dövrə başında dayanır
      return x - 1;
    });
  }, []);

  // Avtomatik keçid
  useEffect(() => {
    if (!slides || hold) return;
    const t = setInterval(() => step(1), STEP_MS);
    return () => clearInterval(t);
  }, [slides, hold, step]);

  // Klon bölməsinə çatanda animasiyasız başa qayıt
  useEffect(() => {
    if (idx < n) return;
    wrap.current = setTimeout(() => {
      setAnim(false);
      setIdx(0);
    }, SLIDE_MS + 30);
    return () => { if (wrap.current) clearTimeout(wrap.current); };
  }, [idx, n]);

  if (!slides) {
    return <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4" aria-label={label}>{items.map((c, k) => <li key={k}>{c}</li>)}</ul>;
  }

  const clones = items.slice(0, MAX_VIEW);
  const cell = "shrink-0 basis-full px-2 sm:basis-1/2 lg:basis-1/4";

  return (
    <div
      role="group"
      aria-roledescription="karusel"
      aria-label={label}
      onMouseEnter={() => setHold(true)}
      onMouseLeave={() => setHold(false)}
      onFocus={() => setHold(true)}
      onBlur={() => setHold(false)}
    >
      <div className="relative">
        <CarouselArrow dir="prev" onClick={() => step(-1)} className="absolute -left-2 top-1/2 z-10 -translate-y-1/2 bg-white/85 shadow-sm lg:-left-12 lg:bg-transparent lg:shadow-none" />
        <CarouselArrow dir="next" onClick={() => step(1)} className="absolute -right-2 top-1/2 z-10 -translate-y-1/2 bg-white/85 shadow-sm lg:-right-12 lg:bg-transparent lg:shadow-none" />
      <div className="-mx-2 overflow-hidden">
        <ul
          className="flex [--pv:1] sm:[--pv:2] lg:[--pv:4]"
          style={{
            transform: `translateX(calc(${-idx} * 100% / var(--pv)))`,
            transition: anim ? `transform ${SLIDE_MS}ms cubic-bezier(0.22, 0.8, 0.24, 1)` : "none",
          }}
        >
          {items.map((c, k) => <li key={k} className={cell}>{c}</li>)}
          {clones.map((c, k) => <li key={`c${k}`} className={cell} aria-hidden inert>{c}</li>)}
        </ul>
      </div>
      </div>

    </div>
  );
}
