"use client";

import { Img } from "@/components/ui";

/** Hazır divar kağızları (kodla çəkilmiş mənzərələr). Bazada "preset:c1" kimi saxlanılır. */
export const COVER_PRESETS: { id: string; name: string; svg: React.ReactNode }[] = [
  {
    id: "c1",
    name: "Dağ səhəri",
    svg: (
      <svg viewBox="0 0 1600 400" preserveAspectRatio="xMidYMid slice" className="h-full w-full" aria-hidden>
        <rect width="1600" height="400" fill="#d3d0ee" />
        <circle cx="1180" cy="150" r="78" fill="#f7b801" />
        <path d="M0 400V250l180-110 150 90 220-170 260 190 170-90 250 150 200-100 170 90v200z" fill="#a7a1dc" />
        <path d="M0 400V300l230-90 190 70 260-120 260 140 200-80 280 110 180-50v120z" fill="#7b72cb" />
        <path d="M0 400V340l260-60 210 50 300-70 320 80 240-40 270 50v50z" fill="#3d348b" />
      </svg>
    ),
  },
  {
    id: "c2",
    name: "Dəniz və gün batımı",
    svg: (
      <svg viewBox="0 0 1600 400" preserveAspectRatio="xMidYMid slice" className="h-full w-full" aria-hidden>
        <rect width="1600" height="400" fill="#fee597" />
        <rect y="120" width="1600" height="60" fill="#fed093" />
        <circle cx="800" cy="215" r="120" fill="#f18701" />
        <rect y="215" width="1600" height="185" fill="#5044b9" />
        <rect y="215" width="1600" height="22" fill="#7678ed" />
        <g fill="#7678ed">
          <rect x="520" y="250" width="560" height="6" rx="3" />
          <rect x="600" y="276" width="400" height="6" rx="3" />
          <rect x="680" y="304" width="240" height="6" rx="3" />
        </g>
        <path d="M0 215h1600v8H0z" fill="#3d348b" />
      </svg>
    ),
  },
  {
    id: "c3",
    name: "Gecə səması",
    svg: (
      <svg viewBox="0 0 1600 400" preserveAspectRatio="xMidYMid slice" className="h-full w-full" aria-hidden>
        <rect width="1600" height="400" fill="#241f53" />
        <g fill="#e4e4fb">
          <circle cx="120" cy="70" r="3" /><circle cx="310" cy="140" r="2" /><circle cx="470" cy="50" r="3" />
          <circle cx="640" cy="110" r="2" /><circle cx="820" cy="60" r="3" /><circle cx="1010" cy="150" r="2" />
          <circle cx="1210" cy="80" r="3" /><circle cx="1400" cy="130" r="2" /><circle cx="1520" cy="50" r="3" />
          <circle cx="240" cy="220" r="2" /><circle cx="930" cy="230" r="2" />
        </g>
        <circle cx="1280" cy="120" r="64" fill="#f7b801" />
        <circle cx="1308" cy="104" r="58" fill="#241f53" />
        <path d="M0 400V300q200-80 420-20t440 10 380-60 360 40v130z" fill="#181437" />
        <path d="M0 400V350q260-50 520-10t520 20 560-40v80z" fill="#0c0a1c" />
      </svg>
    ),
  },
];

export const PRESET_PREFIX = "preset:";

/** Profilin divar kağızı: hazır mənzərə, yüklənmiş şəkil və ya boş fon. */
/** Divar kağızı seçməyənlər üçün istifadəçiyə görə sabit hazır mənzərə. */
function pickDefault(seed?: string) {
  let h = 0;
  for (const ch of seed ?? "") h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return COVER_PRESETS[h % COVER_PRESETS.length];
}

export function CoverArt({ value, seed, className }: { value?: string | null; seed?: string; className?: string }) {
  if (!value && seed) return <div className={`h-full w-full overflow-hidden ${className ?? ""}`}>{pickDefault(seed).svg}</div>;
  if (value?.startsWith(PRESET_PREFIX)) {
    const p = COVER_PRESETS.find((c) => c.id === value.slice(PRESET_PREFIX.length));
    if (p) return <div className={`h-full w-full overflow-hidden ${className ?? ""}`}>{p.svg}</div>;
  }
  if (value) return <Img src={value} className={`h-full w-full object-cover ${className ?? ""}`} />;
  return <div className={`h-full w-full bg-surface-2 ${className ?? ""}`} />;
}
