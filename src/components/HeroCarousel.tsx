"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { cx } from "@/lib/format";

/* Tələbə ana səhifəsinin yuxarısındakı karusel.
   Slayd ya hazır şablondur (afişa üslubunda çəkilmiş fon + mətn), ya da admin yüklədiyi bitmiş şəkildir.
   Hər ikisinin üzərində canlı geri sayım ola bilər. Düymə/keçid yoxdur — yalnız məlumat. */

export interface HeroSlideData {
  id: string;
  kind: string; // template | image
  template: string | null; // exam | contest | shop | live
  tag: string | null;
  title: string | null;
  subtitle: string | null;
  highlight: string | null;
  note: string | null;
  imageUrl: string | null;
  countdownAt: string | null;
  timerPos: string;
}

const MONTHS = ["YANVAR", "FEVRAL", "MART", "APREL", "MAY", "İYUN", "İYUL", "AVQUST", "SENTYABR", "OKTYABR", "NOYABR", "DEKABR"];

/* ───── Canlı geri sayım (hər saniyə yenilənir) ───── */
export function Countdown({ to, className }: { to: string; className?: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const left = new Date(to).getTime() - now;
  if (left <= 0) return <span className={cx("hero-cd-done", className)}>Başladı!</span>;
  const d = Math.floor(left / 864e5), h = Math.floor(left / 36e5) % 24, m = Math.floor(left / 6e4) % 60, s = Math.floor(left / 1e3) % 60;
  const parts: [number, string][] = [[d, "GÜN"], [h, "SAAT"], [m, "DƏQ"], [s, "SAN"]];
  return (
    <span className={cx("hero-cd", className)} role="timer" aria-label={`${d} gün ${h} saat ${m} dəqiqə qalıb`}>
      {parts.map(([v, l]) => (
        <span key={l}>
          <b suppressHydrationWarning>{String(v).padStart(2, "0")}</b>
          <small>{l}</small>
        </span>
      ))}
    </span>
  );
}

/* ───── Şablon fonları (afişa üslubu) ───── */
function Defs({ p }: { p: string }) {
  return (
    <defs>
      <filter id={`${p}n`}><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" stitchTiles="stitch" /><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .3 0" /><feComposite in2="SourceGraphic" operator="in" /></filter>
      <filter id={`${p}g`}><feTurbulence type="fractalNoise" baseFrequency=".035" numOctaves="4" seed="3" /><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1.4 -.55" /></filter>
      <filter id={`${p}b`} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="16" /></filter>
      <filter id={`${p}t`}><feTurbulence type="fractalNoise" baseFrequency=".08" numOctaves="2" seed="7" /><feDisplacementMap in="SourceGraphic" scale="7" /></filter>
      <filter id={`${p}s`}><feDropShadow dx="0" dy="10" stdDeviation="10" floodOpacity=".45" /></filter>
    </defs>
  );
}

function Art({ s }: { s: HeroSlideData }) {
  const p = useId().replace(/:/g, "");
  const f = (k: string) => `url(#${p}${k})`;
  const t = s.template ?? "exam";
  const d = s.countdownAt ? new Date(s.countdownAt) : null;
  const hl = s.highlight ?? "";
  return (
    <svg viewBox="0 0 960 540" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full" aria-hidden="true">
      <Defs p={p} />
      {t === "exam" && (
        <>
          <rect width="960" height="540" fill="#14213a" />
          <g className="hero-zoom" style={{ transformOrigin: "66% 50%" }}>
            <g className="hero-spin" style={{ transformOrigin: "640px 270px" }}>
              {Array.from({ length: 9 }, (_, i) => (
                <circle key={i} cx="640" cy="270" r={40 + i * 62} fill="none" stroke={i % 2 ? "#1e3a5f" : "#b4433b"} strokeWidth="34" />
              ))}
            </g>
          </g>
          <rect width="960" height="540" filter={f("g")} fill="#000" opacity=".5" />
          <rect width="960" height="540" fill="rgba(0,0,0,.25)" />
          <g className="hero-float" filter={f("s")}>
            <g transform="rotate(3 715 270)">
              <rect x="600" y="110" width="230" height="300" fill="#efeee9" filter={f("t")} />
              <rect x="600" y="110" width="230" height="40" fill="#2a2a2a" />
              <circle cx="650" cy="130" r="7" fill="#888" /><circle cx="780" cy="130" r="7" fill="#888" />
              <text x="715" y="200" textAnchor="middle" className="hero-poster" fontSize="30" fill="#14213a">{d ? MONTHS[d.getMonth()] : "TARİX"}</text>
              <text x="715" y="330" textAnchor="middle" className="hero-poster" fontSize="140" fill="#b4433b">{d ? d.getDate() : hl || "?"}</text>
              <text x="715" y="385" textAnchor="middle" className="hero-poster" fontSize="34" fill="#14213a">
                {d ? `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}` : ""}
              </text>
            </g>
          </g>
        </>
      )}
      {t === "contest" && (
        <>
          <defs>
            <linearGradient id={`${p}dk`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0b0b1a" /><stop offset="1" stopColor="#16122c" /></linearGradient>
            <linearGradient id={`${p}ds`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#26213f" /><stop offset="1" stopColor="#0d0b18" /></linearGradient>
          </defs>
          <rect width="960" height="540" fill={`url(#${p}dk)`} />
          <g className="hero-zoom" style={{ transformOrigin: "75% 40%" }}>
            <ellipse className="hero-glow" cx="760" cy="150" rx="260" ry="140" fill="#8b5cf6" filter={f("b")} opacity=".75" />
            <ellipse className="hero-glow hero-d2" cx="120" cy="330" rx="200" ry="70" fill="#22d3ee" filter={f("b")} opacity=".5" />
            <path d="M0 360 L960 300 L960 540 L0 540Z" fill={`url(#${p}ds)`} />
            <path d="M0 360 L960 300" stroke="#a78bfa" strokeOpacity=".55" strokeWidth="2" />
            <g className="hero-float" filter={f("s")}>
              <path d="M640 150h150v70a75 75 0 0 1-150 0z" fill="#f2c46d" />
              <path d="M640 170h-36a36 36 0 0 0 40 40M790 170h36a36 36 0 0 1-40 40" fill="none" stroke="#f2c46d" strokeWidth="12" />
              <rect x="695" y="290" width="40" height="34" fill="#d99a2b" />
              <rect x="660" y="322" width="110" height="26" rx="6" fill="#d99a2b" />
              <text x="715" y="232" textAnchor="middle" className="hero-poster" fontSize="56" fill="#7a2e3a">1</text>
            </g>
            {hl && (
              <g filter={f("s")}>
                <rect x="520" y="360" width="150" height="54" rx="10" fill="#1d1a33" transform="skewX(-12)" />
                <text x="566" y="396" textAnchor="middle" className="hero-poster" fontSize="24" fill="#c4b5fd">{hl}</text>
              </g>
            )}
          </g>
        </>
      )}
      {t === "shop" && (
        <>
          <rect width="960" height="540" fill="#1c1608" />
          <g className="hero-zoom">
            {Array.from({ length: 14 }, (_, i) => (
              <rect key={i} x={i * 90 - 200} y="-100" width="44" height="800" fill="#e8b33a" opacity=".85" transform="rotate(28 480 270)" />
            ))}
          </g>
          <rect width="960" height="540" filter={f("g")} fill="#000" opacity=".55" />
          <rect width="960" height="540" fill="rgba(0,0,0,.3)" />
          <g className="hero-float" filter={f("s")}>
            <g transform="rotate(4 720 270)">
              <rect x="600" y="100" width="240" height="320" fill="#f1efe8" filter={f("t")} />
              <circle cx="720" cy="132" r="12" fill="#1c1608" />
              <text x="720" y="330" textAnchor="middle" className="hero-poster" fontSize={hl.length > 3 ? 90 : 130} fill="#b4433b">{hl || "%"}</text>
              <text x="720" y="395" textAnchor="middle" className="hero-poster" fontSize="44" fill="#1c1608">ENDİRİM</text>
            </g>
          </g>
        </>
      )}
      {t === "live" && (
        <>
          <defs>
            <linearGradient id={`${p}tl`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#071a1f" /><stop offset="1" stopColor="#0f3b40" /></linearGradient>
          </defs>
          <rect width="960" height="540" fill={`url(#${p}tl)`} />
          <g className="hero-zoom" style={{ transformOrigin: "75% 45%" }}>
            <ellipse className="hero-glow" cx="720" cy="230" rx="250" ry="170" fill="#2dd4bf" filter={f("b")} opacity=".45" />
            <path d="M0 400 L960 380 L960 540 L0 540Z" fill="#06171b" />
            <g className="hero-float" filter={f("s")}>
              <rect x="560" y="120" width="320" height="200" rx="14" fill="#0b2a2e" stroke="#5eead4" strokeOpacity=".5" strokeWidth="2" />
              {[[576, 136], [724, 136], [576, 224], [724, 224]].map(([x, y], i) => (
                <g key={i}>
                  <rect x={x} y={y} width="140" height="80" rx="8" fill="#134e4a" />
                  <circle cx={x + 70} cy={y + 32} r="13" fill="#99f6e4" />
                  <path d={`M${x + 50} ${y + 68}a20 16 0 0 1 40 0z`} fill="#99f6e4" />
                </g>
              ))}
              <rect x="680" y="320" width="80" height="16" rx="4" fill="#0b2a2e" />
              <rect x="640" y="334" width="160" height="10" rx="5" fill="#0b2a2e" />
              <g className="hero-glow">
                <rect x="580" y="100" width="76" height="26" rx="13" fill="#e5484d" />
                <circle cx="596" cy="113" r="5" fill="#fff" />
                <text x="628" y="119" textAnchor="middle" className="hero-poster" fontSize="15" fill="#fff">CANLI</text>
              </g>
            </g>
          </g>
        </>
      )}
      <rect width="960" height="540" filter={f("n")} fill="#fff" opacity=".45" />
    </svg>
  );
}

const STICKER: Record<string, { bg: string; fg: string }> = {
  exam: { bg: "#ffffff", fg: "#14213a" },
  contest: { bg: "#a78bfa", fg: "#16122c" },
  shop: { bg: "#e8b33a", fg: "#1c1608" },
  live: { bg: "#5eead4", fg: "#071a1f" },
};
const NOTE: Record<string, { bg: string; fg: string }> = {
  exam: { bg: "#b4433b", fg: "#fff" },
  contest: { bg: "rgba(167,139,250,.22)", fg: "#fff" },
  shop: { bg: "#b4433b", fg: "#fff" },
  live: { bg: "#5eead4", fg: "#071a1f" },
};

/** Bir slayd (şablon və ya şəkil). Önizləmə üçün admin panelində də istifadə olunur. */
export function HeroSlideView({ s }: { s: HeroSlideData }) {
  const t = s.template ?? "exam";
  if (s.kind === "image") {
    return (
      <div className="hero-card">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {s.imageUrl && <img src={s.imageUrl} alt={s.title ?? ""} className="hero-zoom absolute inset-0 h-full w-full object-cover" draggable={false} />}
        {s.countdownAt && (
          <div className={cx("absolute", { bl: "bottom-[7%] left-[4%]", br: "bottom-[7%] right-[4%]", tl: "left-[4%] top-[7%]", tr: "right-[4%] top-[7%]" }[s.timerPos] ?? "bottom-[7%] left-[4%]")}>
            <Countdown to={s.countdownAt} className="hero-cd-glass" />
          </div>
        )}
      </div>
    );
  }
  return (
    <div className="hero-card">
      <Art s={s} />
      <div className="absolute inset-0 bg-gradient-to-r from-black/45 via-black/10 to-transparent" />
      <div className="hero-text">
        {s.tag && (
          <span className="hero-in hero-sticker" style={{ background: STICKER[t]?.bg, color: STICKER[t]?.fg }}>{s.tag}</span>
        )}
        {s.title && <p className="hero-in hero-d1 hero-title">{s.title}</p>}
        {s.subtitle && <p className="hero-in hero-d2 hero-sub">{s.subtitle}</p>}
        {s.note && (
          <span className="hero-in hero-d2 hero-note" style={{ background: NOTE[t]?.bg, color: NOTE[t]?.fg }}>{s.note}</span>
        )}
        {s.countdownAt && <div className="hero-in hero-d3 mt-[2.2cqw]"><Countdown to={s.countdownAt} className="hero-cd-glass" /></div>}
      </div>
    </div>
  );
}

/* ───── Karusel: sonsuz dövr, qonşu slaydların kənarı görünür, barmaqla/siçanla sürüşür ───── */
export default function HeroCarousel({ slides, interval = 3000 }: { slides: HeroSlideData[]; interval?: number }) {
  const n = slides.length;
  const loop = n > 1;
  const list = loop ? [slides[n - 1], ...slides, slides[0]] : slides;
  const [pos, setPos] = useState(loop ? 1 : 0);
  const [anim, setAnim] = useState(true);
  const track = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; dx: number; moved: boolean } | null>(null);
  const hover = useRef(false);
  const moved = useRef(false);
  const [tick, setTick] = useState(0);

  const W = 88; // aktiv slaydın eni (%), qalan 12% qonşulara
  const baseOf = (p: number) => `calc(${-p * W}% + ${(100 - W) / 2}%)`;
  const base = baseOf(pos);
  const posRef = useRef(pos);
  useEffect(() => { posRef.current = pos; }, [pos]);

  /** Klon üzərindədirsə (0 və ya n+1) hiss olunmadan əsl slayda keçir və həmin mövqeyi qaytarır */
  const normalize = useCallback(() => {
    let cur = posRef.current;
    if (!loop) return cur;
    if (cur <= 0) cur += n;
    else if (cur >= n + 1) cur -= n;
    if (cur !== posRef.current) {
      posRef.current = cur;
      if (track.current) {
        track.current.style.transition = "none";
        track.current.style.transform = `translateX(${baseOf(cur)})`;
        void track.current.offsetWidth; // brauzer yeni mövqeyi animasiyasız qəbul etsin
        track.current.style.transition = "";
      }
    }
    return cur;
  }, [loop, n]);

  /** Bir addım irəli (1) və ya geri (-1): 4-cüdən sonra 1-ci, 1-cidən əvvəl 4-cü gəlir */
  const step = useCallback((d: number) => {
    const cur = normalize();
    const next = Math.max(0, Math.min(n + 1, cur + d));
    posRef.current = next;
    setAnim(true);
    setPos(next);
  }, [normalize, n]);

  const goTo = useCallback((p: number) => {
    normalize();
    posRef.current = p;
    setAnim(true);
    setPos(p);
  }, [normalize]);

  // Avtomatik keçid (siçan üstündə və ya sürüşdürərkən dayanır; səhifə gizlidirsə də)
  useEffect(() => {
    if (!loop) return;
    const id = setTimeout(() => {
      if (!hover.current && !drag.current && document.visibilityState === "visible") step(1);
      else setTick((t) => t + 1);
    }, interval);
    return () => clearTimeout(id);
  }, [pos, tick, loop, interval, step]);

  // Kənardakı klona çatanda hiss olunmadan əsl slayda tullanır
  function onEnd(e: React.TransitionEvent) {
    if (e.target !== track.current || !loop) return;
    if (pos === n + 1 || pos === 0) {
      const real = pos === 0 ? n : 1;
      posRef.current = real;
      setAnim(false);
      setPos(real);
    }
  }

  function down(e: React.PointerEvent) {
    if (!loop) return;
    normalize();
    drag.current = { x: e.clientX, dx: 0, moved: false };
    moved.current = false;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }
  function move(e: React.PointerEvent) {
    if (!drag.current || !track.current) return;
    drag.current.dx = e.clientX - drag.current.x;
    if (Math.abs(drag.current.dx) > 6) { drag.current.moved = true; moved.current = true; }
    track.current.style.transition = "none";
    track.current.style.transform = `translateX(calc(${baseOf(posRef.current)} + ${drag.current.dx}px))`;
  }
  function up() {
    if (!drag.current || !track.current) return;
    const { dx } = drag.current;
    drag.current = null;
    const w = track.current.parentElement?.clientWidth ?? 600;
    const d = Math.abs(dx) > Math.min(80, w * 0.12) ? (dx < 0 ? 1 : -1) : 0;
    const next = Math.max(0, Math.min(n + 1, posRef.current + d));
    // Mövqeyi birbaşa yazırıq: eyni slayda qayıdanda React yenidən çəkmir, köhnə sürüşmə izi qalmasın
    track.current.style.transition = "";
    track.current.style.transform = `translateX(${baseOf(next)})`;
    posRef.current = next;
    setAnim(true);
    setPos(next);
  }

  if (!n) return null;

  return (
    <section aria-roledescription="karusel" aria-label="Elanlar" className="select-none">
      <div
        className="relative overflow-hidden"
        onMouseEnter={() => { hover.current = true; }}
        onMouseLeave={() => { hover.current = false; setTick((t) => t + 1); }}
      >
        <div
          ref={track}
          className={cx("flex touch-pan-y", anim ? "transition-transform duration-[900ms] ease-[cubic-bezier(.22,.8,.24,1)]" : "transition-none")}
          style={{ transform: `translateX(${base})` }}
          onTransitionEnd={onEnd}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
        >
          {list.map((s, i) => (
            <div
              key={`${s.id}-${i}`}
              className={cx("hero-slide", i === pos && "on", !anim && "no-anim")}
              style={{ flex: `0 0 ${W}%` }}
              aria-hidden={i !== pos}
              onClick={() => { if (i !== pos && !moved.current) goTo(i); }}
            >
              <HeroSlideView s={s} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
