"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, {
  createContext, Fragment, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from "react";
import { createPortal } from "react-dom";
import { cx, initials } from "@/lib/format";
import { errMsg, uploadImage } from "@/lib/api";

/* ───────────────────────── Icon ───────────────────────── */
const ICONS = {
  home: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
  user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  book: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>',
  bag: '<path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>',
  settings: '<line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
  plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  check: '<polyline points="20 6 9 17 4 12"/>',
  trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  play: '<polygon points="5 3 19 12 5 21 5 3"/>',
  video: '<polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/>',
  clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  menu: '<line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>',
  right: '<polyline points="9 18 15 12 9 6"/>',
  left: '<polyline points="15 18 9 12 15 6"/>',
  down: '<polyline points="6 9 12 15 18 9"/>',
  up: '<polyline points="18 15 12 9 6 15"/>',
  thumb: '<path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"/>',
  pin: '<line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/>',
  eye2: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
  bell: '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
  award: '<circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/>',
  coin: '<circle cx="12" cy="12" r="9"/><path d="M14.5 9a3 3 0 0 0-2.5-1.2c-1.7 0-3 1-3 2.4s1.3 1.8 3 2.1 3 .8 3 2.2-1.3 2.4-3 2.4A3 3 0 0 1 9.5 15"/><line x1="12" y1="6" x2="12" y2="7.8"/><line x1="12" y1="16.2" x2="12" y2="18"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>',
  lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  globe: '<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
  folder: '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>',
  chart: '<line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/>',
  message: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  send: '<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
  mail: '<path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/><polyline points="22,6 12,13 2,6"/>',
  phone: '<rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>',
  eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
  eyeOff: '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>',
  alert: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>',
  retry: '<polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
  star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
  grad: '<path d="M22 10L12 5 2 10l10 5 10-5z"/><path d="M6 12v5c0 1.5 3 3 6 3s6-1.5 6-3v-5"/>',
  info: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
  news: '<path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8V6Z"/>',
  checklist: '<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
  trophy: '<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>',
  briefcase: '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
  live: '<circle cx="12" cy="12" r="2"/><path d="M16.24 7.76a6 6 0 0 1 0 8.49"/><path d="M7.76 16.24a6 6 0 0 1 0-8.49"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M4.93 19.07a10 10 0 0 1 0-14.14"/>',
  filter: '<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>',
  inbox: '<polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
} as const;

export type IconName = keyof typeof ICONS;

export function Icon({ name, className, size = 18, stroke = 2, filled }: { name: IconName; className?: string; size?: number; stroke?: number; filled?: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cx("shrink-0", className)}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: ICONS[name] }}
    />
  );
}

/* ───────────────────────── Primitivlər ───────────────────────── */
export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cx("inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent", className)}
      role="status"
      aria-label="Yüklənir"
    />
  );
}

export function FullPageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg">
      <Spinner className="h-7 w-7 text-brand" />
    </div>
  );
}

export function Avatar({
  src, name, size = 40, className,
}: { src?: string | null; name?: string | null; size?: number; className?: string }) {
  const style = { width: size, height: size, fontSize: Math.max(11, size * 0.38) };
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={name ?? ""} style={style} className={cx("shrink-0 rounded-full border border-line object-cover", className)} />;
  }
  return (
    <span
      style={style}
      className={cx("inline-flex shrink-0 items-center justify-center rounded-full border border-line bg-tint font-bold text-brand", className)}
    >
      {initials(name)}
    </span>
  );
}

export function Img({ src, alt = "", className, style }: { src: string; alt?: string; className?: string; style?: React.CSSProperties }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} loading="lazy" className={className} style={style} />;
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx("skeleton", className)} />;
}

export function SkeletonList({ rows = 3, className = "h-24" }: { rows?: number; className?: string }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className={className} />
      ))}
    </div>
  );
}

export function ProgressBar({ value, tone = "brand" }: { value: number; tone?: "brand" | "ok" | "bad" | "warn" }) {
  const color = { brand: "bg-brand", ok: "bg-ok", bad: "bg-bad", warn: "bg-warn" }[tone];
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
      <div className={cx("h-full rounded-full transition-all duration-500", color)} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

export function CoinPill({ amount, className }: { amount: number; className?: string }) {
  return (
    <span className={cx("inline-flex items-center gap-1.5 rounded-md border border-[#f1dd9a] bg-[#fff7dc] px-2.5 py-1 text-sm font-semibold text-[#7a5a00]", className)}>
      <Icon name="coin" size={15} />
      {amount.toLocaleString("az-AZ")}
    </span>
  );
}

export function PageHeader({
  title, subtitle, actions, back,
}: { title: React.ReactNode; subtitle?: React.ReactNode; actions?: React.ReactNode; back?: string | true }) {
  const router = useRouter();
  return (
    <div className="mb-6 animate-fade-up">
      {back && (
        <button
          // data-nav: səhifədən çıxmazdan əvvəl soruşan yerlər (məs. göndərilməmiş şərhlər) bu keçidi tuta bilsin
          data-nav={back === true ? "back" : back}
          onClick={() => (back === true ? router.back() : router.push(back))}
          className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-muted transition hover:text-ink"
        >
          <Icon name="left" size={16} /> Geri
        </button>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-muted sm:text-base">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

const TONES = {
  brand: "text-brand",
  ok: "text-ok",
  warn: "text-warn",
  bad: "text-bad",
  info: "text-iris",
} as const;

export function StatCard({
  label, value, icon, tone = "brand", href,
}: { label: string; value: React.ReactNode; icon: IconName; tone?: keyof typeof TONES; href?: string }) {
  const body = (
    <div className="card h-full p-4 transition-colors hover:border-line-strong sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-muted">{label}</p>
        <span className={TONES[tone]}><Icon name={icon} size={18} /></span>
      </div>
      <p className="mt-2 text-3xl font-bold leading-none tracking-tight tabular-nums text-ink sm:text-4xl">{value}</p>
    </div>
  );
  return href ? <Link href={href} className="block">{body}</Link> : body;
}

/** Rəqəm 0-dan hədəfə qədər sayılaraq qalxır (~1.2 s, ease-out); azaldılmış hərəkət seçilibsə birbaşa göstərilir */
export function CountUp({ to, suffix = "", duration = 1200 }: { to: number; suffix?: string; duration?: number }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    if (reduce || to === 0) { raf = requestAnimationFrame(() => setN(to)); return () => cancelAnimationFrame(raf); }
    const t0 = performance.now();
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / duration);
      setN(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [to, duration]);
  return <>{n.toLocaleString("az-AZ")}{suffix}</>;
}

/** Statistika: çərçivəsiz ikon + rəqəm + ad; 3 sütun (telefonda 2), rəqəmlər sayılaraq qalxır */
export function StatStrip({
  items, loading,
}: { items: { label: string; value: number; suffix?: string; icon: IconName; href?: string }[]; loading?: boolean }) {
  return (
    <section className="grid grid-cols-2 gap-x-5 gap-y-7 sm:grid-cols-3">
      {loading
        ? items.map((it) => <div key={it.label} className="skeleton h-14" />)
        : items.map((it) => {
            const body = (
              <>
                <Icon name={it.icon} size={26} stroke={2.2} className="mt-1 text-ink" />
                <span className="min-w-0">
                  <span className="block text-[34px] font-semibold leading-none tracking-tight tabular-nums text-ink">
                    <CountUp to={it.value} suffix={it.suffix} />
                  </span>
                  <span className="mt-1.5 block text-[13px] text-muted">{it.label}</span>
                </span>
              </>
            );
            return it.href ? (
              <Link key={it.label} href={it.href} className="group flex items-start gap-3 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ok">
                {body}
              </Link>
            ) : (
              <div key={it.label} className="flex items-start gap-3">{body}</div>
            );
          })}
    </section>
  );
}

/** Sürətli əməliyyatlar: çərçivəsiz ikon + söz; üzərinə gələndə yaşıl axın sözü «Başla →» ilə əvəz edir.
 *  Toxunuş sahəsi həmişə əvvəlki söz qədər qalır (titrəmə olmasın), xətt isə ikon + «Başla →» qədərdir. */
export function QuickActions({ items }: { items: { href: string; icon: IconName; label: string }[] }) {
  return (
    <section className="grid grid-cols-2 gap-x-5 gap-y-2 sm:grid-cols-4">
      {items.map((a) => (
        <Link key={a.href} href={a.href} className="qa">
          <Icon name={a.icon} size={24} stroke={2.4} className="qa-ic" />
          <span className="qa-sw">
            <span className="qa-a">{a.label}</span>
            <span className="qa-b" aria-hidden="true">Başla →</span>
            <span className="qa-line" aria-hidden="true">Başla →</span>
          </span>
        </Link>
      ))}
    </section>
  );
}

/** Boş səhifə: kiçik rəngli səhnə (kitablar, qələm) + mövzunun ikonu, başlıq, qısa yazı və düymə */
export function EmptyArt({ icon = "inbox" }: { icon?: IconName }) {
  return (
    <span className="relative mb-3 inline-block" aria-hidden="true">
      <svg width="132" height="84" viewBox="0 0 132 84">
        <ellipse cx="62" cy="77" rx="54" ry="6" fill="rgb(var(--surface-2))" />
        <rect x="22" y="56" width="70" height="14" rx="3" fill="#fbbf24" />
        <rect x="22" y="56" width="70" height="4" rx="2" fill="#f59e0b" />
        <rect x="28" y="42" width="60" height="14" rx="3" fill="#86efac" />
        <rect x="80" y="42" width="5" height="14" fill="#4ade80" />
        <rect x="32" y="28" width="54" height="14" rx="3" fill="rgb(var(--brand))" />
        <rect x="38" y="33" width="26" height="3" rx="1.5" fill="#fff" opacity=".7" />
        <g transform="rotate(24 103 40)">
          <rect x="99" y="12" width="9" height="50" rx="2" fill="#60a5fa" />
          <rect x="99" y="12" width="9" height="7" rx="2" fill="#f472b6" />
          <polygon points="99,62 108,62 103.5,72" fill="#fde68a" />
          <polygon points="101.8,68 105.2,68 103.5,72" fill="#1f2937" />
        </g>
        <circle cx="16" cy="22" r="3" fill="#fbbf24" />
        <circle cx="120" cy="14" r="2.5" fill="#86efac" />
        <path d="M10 44l3 3m0-3l-3 3" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <span className="absolute -right-1 top-0 grid h-9 w-9 place-items-center rounded-full border-4 border-surface bg-tint text-brand-hover">
        <Icon name={icon} size={16} stroke={2.4} />
      </span>
    </span>
  );
}

export function Empty({
  icon = "inbox", title, text, action,
}: { icon?: IconName; title: string; text?: string; action?: React.ReactNode }) {
  return (
    <div className="card-flat flex flex-col items-center justify-center px-6 py-12 text-center">
      <EmptyArt icon={icon} />
      <h3 className="text-base font-extrabold">{title}</h3>
      {text && <p className="mt-1 max-w-sm text-sm text-muted">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-bad/30 bg-bad/10 p-4 text-sm font-semibold text-bad">
      <span className="flex items-center gap-2"><Icon name="alert" /> {message}</span>
      {onRetry && <button className="btn-secondary btn-sm" onClick={onRetry}>Yenilə</button>}
    </div>
  );
}

/** Tab id-sinə görə ikon (ikon verilməyibsə) */
const TAB_ICON: Record<string, IconName> = {
  feed: "news", posts: "news", topics: "book", members: "users", students: "users", tests: "file", packages: "file",
  assignments: "checklist", monthly: "trophy", analysis: "chart", results: "chart", videos: "video", requests: "inbox",
  coins: "coin", settings: "settings", about: "info", groups: "users", attempts: "clock", history: "clock", lessons: "video",
  bank: "folder", leaderboard: "trophy", comments: "message", likes: "thumb", orders: "bag", products: "bag", shop: "bag",
};

/** İkonlu tablar: üstdə ikon, altda kiçik ad; ağ zolaq, aktiv tab açıq yaşıl fonda; çox tab olanda barmaqla sürüşür */
export function Tabs<T extends string>({
  tabs, value, onChange,
}: { tabs: { id: T; label: string; count?: number; own?: boolean; icon?: IconName }[]; value: T; onChange: (v: T) => void }) {
  const bar = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = bar.current?.querySelector<HTMLElement>('[aria-selected="true"]');
    el?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [value]);
  return (
    <div ref={bar} className="tabs-ic mb-5" role="tablist">
      {tabs.map((t, i) => {
        const icon = t.icon ?? TAB_ICON[t.id];
        const on = value === t.id;
        return (
          <Fragment key={t.id}>
            {t.own && !tabs[i - 1]?.own && i > 0 && <span className="mx-1 my-2 w-px shrink-0 bg-line" aria-hidden />}
            <button role="tab" type="button" onClick={() => onChange(t.id)} aria-selected={on} className={cx("tab-ic", on && "on")}>
              {icon && <Icon name={icon} size={20} />}
              <span className="flex items-center gap-1">
                {t.label}
                {t.count !== undefined && <span className={cx("rounded-full px-1.5 text-[10px] leading-4", on ? "bg-brand text-white" : "bg-surface-2 text-muted")}>{t.count}</span>}
              </span>
            </button>
          </Fragment>
        );
      })}
    </div>
  );
}

/* ───────────────────────── Formlar ───────────────────────── */
export function Field({
  label, hint, children, className,
}: { label?: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={cx("block", className)}>
      {label && <span className="label">{label}</span>}
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

/** Üzən etiketli sahə (giriş, qeydiyyat, profil məlumatları) */
export function FloatInput({ label, className, ...rest }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className={cx("ff", className)}>
      <input {...rest} placeholder=" " />
      <span className="ff-l">{label}</span>
    </label>
  );
}

export function FloatPassword({ label, className, ...rest }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const [show, setShow] = useState(false);
  return (
    <label className={cx("ff", className)}>
      <input {...rest} type={show ? "text" : "password"} placeholder=" " className="!pr-11" />
      <span className="ff-l">{label}</span>
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setShow((s) => !s)}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-muted hover:text-ink"
        aria-label={show ? "Şifrəni gizlət" : "Şifrəni göstər"}
      >
        <Icon name={show ? "eyeOff" : "eye"} size={18} />
      </button>
    </label>
  );
}

export function FloatPhone({
  label, value, onChange, className, ...rest
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> & { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className={cx("ff ff-up", className)}>
      <PhoneInput {...rest} value={value} onChange={onChange} className="ff-box !pb-2 !pt-6" />
      <span className="ff-l">{label}</span>
    </label>
  );
}

export function Toggle({
  checked, onChange, label, hint,
}: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 rounded-lg border border-line bg-surface p-3.5 text-left transition-colors hover:bg-tint/60"
    >
      <span>
        <span className="block text-sm font-semibold">{label}</span>
        {hint && <span className="mt-0.5 block text-xs text-muted">{hint}</span>}
      </span>
      <span className={cx("relative h-6 w-11 shrink-0 rounded-full transition-colors", checked ? "bg-brand" : "bg-line-strong")}>
        <span className={cx("absolute top-[2px] h-5 w-5 rounded-full bg-white shadow-soft transition-all", checked ? "left-[22px]" : "left-[2px]")} />
      </span>
    </button>
  );
}

export function ChipSelect({
  options, value, onChange, empty = "Seçim yoxdur",
}: { options: { id: string; label: string }[]; value: string[]; onChange: (v: string[]) => void; empty?: string }) {
  if (!options.length) return <p className="text-sm text-muted">{empty}</p>;
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = value.includes(o.id);
        return (
          <button
            type="button"
            key={o.id}
            onClick={() => onChange(on ? value.filter((v) => v !== o.id) : [...value, o.id])}
            className={cx(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors",
              on ? "border-brand bg-tint text-brand" : "border-line-strong bg-white text-muted hover:bg-tint/60 hover:text-brand",
            )}
          >
            {on && <Icon name="check" size={14} />} {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function PasswordInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input {...props} type={show ? "text" : "password"} className={cx("input pr-11", props.className)} />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setShow((s) => !s)}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-muted hover:text-ink"
        aria-label={show ? "Şifrəni gizlət" : "Şifrəni göstər"}
      >
        <Icon name={show ? "eyeOff" : "eye"} size={18} />
      </button>
    </div>
  );
}

/**
 * Azərbaycan nömrəsi: "+994" sabit yazılıb, istifadəçi yalnız qalanını yazır (50 123 45 67).
 * `value`/`onChange` yalnız yerli 9 rəqəmlə işləyir; tam nömrə üçün `fullPhone(value)`.
 * Başqa ölkə nömrəsi lazım olsa, xanaya "+" ilə tam yazmaq da olur.
 */
export function PhoneInput({
  value, onChange, className, ...rest
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> & { value: string; onChange: (v: string) => void }) {
  const intl = value.startsWith("+");
  function change(raw: string) {
    let v = raw.replace(/[^\d+]/g, "");
    if (v.startsWith("+")) {
      // Tam nömrə yapışdırılıbsa: +994… → yerli hissə
      if (v.startsWith("+994")) v = v.slice(4);
      else return onChange("+" + v.slice(1).replace(/\+/g, "").slice(0, 15));
    }
    v = v.replace(/\+/g, "");
    if (v.startsWith("994") && v.length > 9) v = v.slice(3);
    if (v.startsWith("0")) v = v.slice(1);
    onChange(v.slice(0, 9));
  }
  const shown = intl ? value : value.replace(/^(\d{2})(\d{0,3})(\d{0,2})(\d{0,2}).*/, (_, a, b, c, d) => [a, b, c, d].filter(Boolean).join(" "));
  return (
    <div className={cx("input flex items-center gap-2 focus-within:[border-color:rgb(var(--brand))] focus-within:[box-shadow:0_0_0_3px_rgb(var(--brand)/0.22)]", className)}>
      {!intl && <span className="select-none font-semibold text-muted">+994</span>}
      <input
        {...rest}
        type="tel"
        inputMode="tel"
        value={shown}
        onChange={(e) => change(e.target.value)}
        placeholder={rest.placeholder ?? "50 123 45 67"}
        className="w-full min-w-0 border-0 bg-transparent p-0 outline-none focus:ring-0"
      />
    </div>
  );
}
/** PhoneInput dəyərindən bazadakı format: "501234567" → "+994501234567" */
export const fullPhone = (local: string) => (!local ? "" : local.startsWith("+") ? local : `+994${local}`);

export function ImageUpload({
  value, onChange, label, shape = "wide", className,
}: {
  value?: string | null;
  onChange: (url: string | null) => void;
  label?: string;
  shape?: "wide" | "square" | "round";
  className?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  async function pick(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Yalnız şəkil faylı seçin");
    if (file.size > 5 * 1024 * 1024) return toast.error("Şəkil maksimum 5MB ola bilər");
    setBusy(true);
    try {
      onChange(await uploadImage(file));
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = "";
    }
  }

  const box = {
    wide: "aspect-[16/6] w-full rounded-xl",
    square: "aspect-square w-32 rounded-xl",
    round: "h-28 w-28 rounded-full",
  }[shape];

  return (
    <div className={className}>
      {label && <span className="label">{label}</span>}
      <div className={cx("group relative overflow-hidden border border-dashed border-line-strong bg-surface-2", box)}>
        {value && <Img src={value} className="h-full w-full object-cover" />}
        <button
          type="button"
          onClick={() => ref.current?.click()}
          className={cx(
            "absolute inset-0 flex flex-col items-center justify-center gap-1 text-xs font-semibold text-muted transition",
            value ? "bg-black/0 opacity-0 group-hover:bg-black/50 group-hover:text-white group-hover:opacity-100" : "hover:text-ink",
          )}
        >
          {busy ? <Spinner /> : <Icon name={value ? "edit" : "upload"} size={20} />}
          {busy ? "Yüklənir…" : value ? "Dəyiş" : "Şəkil yüklə"}
        </button>
        {value && !busy && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition group-hover:opacity-100"
            aria-label="Şəkli sil"
          >
            <Icon name="x" size={14} />
          </button>
        )}
      </div>
      <input ref={ref} type="file" accept="image/*" hidden onChange={(e) => pick(e.target.files?.[0])} />
    </div>
  );
}

/* ───────────────────────── Modal / Confirm / Toast ───────────────────────── */
export function Modal({
  open, onClose, title, children, footer, size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const sheet = useRef<HTMLDivElement>(null);
  const drag = useRef<{ y: number; dy: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;
  const width = { sm: "sm:max-w-sm", md: "sm:max-w-lg", lg: "sm:max-w-2xl", xl: "sm:max-w-4xl" }[size];

  // Telefonda: aşağıdan qalxan vərəq; tutacaqdan və ya başlıqdan aşağı çəkəndə bağlanır
  const isPhone = () => window.matchMedia("(max-width: 639px)").matches;
  const down = (e: React.PointerEvent) => {
    if (!isPhone() || (e.target as HTMLElement).closest("button")) return;
    drag.current = { y: e.clientY, dy: 0 };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const move = (e: React.PointerEvent) => {
    if (!drag.current || !sheet.current) return;
    drag.current.dy = Math.max(0, e.clientY - drag.current.y);
    sheet.current.style.transition = "none";
    sheet.current.style.transform = `translateY(${drag.current.dy}px)`;
  };
  const up = () => {
    if (!drag.current || !sheet.current) return;
    const far = drag.current.dy > 110;
    drag.current = null;
    sheet.current.style.transition = "transform .2s ease";
    sheet.current.style.transform = far ? "translateY(100%)" : "";
    if (far) setTimeout(onClose, 180);
  };

  // Portal: yuxarı səviyyəli qatda açılır ki, naviqasiya paneli pəncərənin üstünə çıxmasın
  return createPortal(
    <div className="fixed inset-0 z-[500] flex items-end justify-center sm:items-center sm:p-8" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-ink/50 animate-[fade-in_.15s_ease]" onClick={onClose} />
      <div
        ref={sheet}
        className={cx(
          "relative flex max-h-[calc(100dvh-3rem)] w-full flex-col rounded-t-[22px] border border-line bg-surface shadow-hard-lg animate-sheet sm:max-h-[calc(100dvh-4rem)] sm:animate-pop sm:rounded-[22px]",
          width,
        )}
      >
        <div onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} className="touch-none sm:touch-auto">
          <div className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-line-strong sm:hidden" aria-hidden />
          {title && (
            <div className="flex items-center justify-between gap-3 border-b border-line px-5 pb-3.5 pt-2.5 sm:pt-4">
              <h2 className="text-lg font-extrabold">{title}</h2>
              <button className="btn-icon -mr-2" onClick={onClose} aria-label="Bağla"><Icon name="x" /></button>
            </div>
          )}
        </div>
        <div className="overflow-y-auto overscroll-contain px-5 py-5">{children}</div>
        {footer && <div className="modal-foot flex justify-end gap-2 border-t border-line px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

type ToastKind = "success" | "error" | "info";
interface ToastItem { id: number; kind: ToastKind; text: string }
interface ConfirmOpts { title: string; message?: string; confirmText?: string; danger?: boolean }

interface UiCtx {
  toast: { success: (t: string) => void; error: (t: string) => void; info: (t: string) => void };
  confirm: (o: ConfirmOpts) => Promise<boolean>;
}
const Ctx = createContext<UiCtx | null>(null);

export function UiProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [dialog, setDialog] = useState<(ConfirmOpts & { resolve: (v: boolean) => void }) | null>(null);
  const counter = useRef(0);

  const push = useCallback((kind: ToastKind, text: string) => {
    const id = ++counter.current;
    setToasts((t) => [...t, { id, kind, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);

  const value = useMemo<UiCtx>(() => ({
    toast: {
      success: (t) => push("success", t),
      error: (t) => push("error", t),
      info: (t) => push("info", t),
    },
    confirm: (o) => new Promise<boolean>((resolve) => setDialog({ ...o, resolve })),
  }), [push]);

  const close = (v: boolean) => {
    dialog?.resolve(v);
    setDialog(null);
  };

  const toastIc: Record<ToastKind, string> = { success: "text-green-400", error: "text-red-400", info: "text-sky-300" };
  const toastIcon: Record<ToastKind, IconName> = { success: "check", error: "alert", info: "info" };

  return (
    <Ctx.Provider value={value}>
      {children}
      {/* Bildiriş: yuxarı ortada tünd hap */}
      <div className="pointer-events-none fixed inset-x-0 top-3 z-[600] flex flex-col items-center gap-2 px-4" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.kind === "error" ? "alert" : "status"}
            className="pointer-events-auto flex max-w-md animate-toast items-center gap-2.5 rounded-full bg-[#1f2937] px-4 py-2.5 text-sm font-semibold text-white shadow-hard-lg"
          >
            <Icon name={toastIcon[t.kind]} size={17} stroke={2.6} className={toastIc[t.kind]} />
            <span>{t.text}</span>
          </div>
        ))}
      </div>
      <Modal
        open={!!dialog}
        onClose={() => close(false)}
        title={dialog?.title}
        size="sm"
        footer={
          <>
            <button className="btn-secondary" onClick={() => close(false)}>Ləğv et</button>
            <button className={dialog?.danger ? "btn-danger" : "btn-primary"} onClick={() => close(true)}>
              {dialog?.confirmText ?? "Təsdiqlə"}
            </button>
          </>
        }
      >
        {dialog?.message && <p className="text-sm text-muted">{dialog.message}</p>}
      </Modal>
    </Ctx.Provider>
  );
}

function useUi() {
  const c = useContext(Ctx);
  if (!c) throw new Error("UiProvider yoxdur");
  return c;
}
export const useToast = () => useUi().toast;
export const useConfirm = () => useUi().confirm;
