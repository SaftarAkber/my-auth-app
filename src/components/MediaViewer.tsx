"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cx, youtubeId } from "@/lib/format";
import { Icon } from "@/components/ui";

/*
 * Şəkil və video baxış pəncərəsi (ekranın ortasında, telefona uyğun):
 * sağa-sola keçid (düymələr, ← → klavişləri, telefonda sürüşdürmə), şəkildə yaxınlaşdırma (düymələr, siçan təkəri,
 * iki dəfə klik, sürüşdürərək baxmaq), X və ya kənara klik / Esc ilə bağlanır.
 * Video: YouTube öz pleyerində; saytdakı video – səs, tam ekran, zaman xətti + ±10 saniyə düymələri.
 */
export type MediaItem = { type: "image"; src: string } | { type: "video"; url: string; title?: string };

/**
 * `light`: sual şəkilləri (qara xətli blok-sxem, qraf) – ağ vərəq üzərində, ekrana sığacaq qədər BÖYÜDÜLÜR
 * (kiçik şəkil də ekranı doldurur), scroll olmur.
 */
export default function MediaViewer({ items, start = 0, onClose, light = false }: { items: MediaItem[]; start?: number; onClose: () => void; light?: boolean }) {
  const [i, setI] = useState(start);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const touchX = useRef<number | null>(null);
  const item = items[i];
  const many = items.length > 1;

  const go = useCallback((d: number) => {
    setI((v) => (v + d + items.length) % items.length);
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [items.length]);
  const setZ = (z: number) => {
    const n = Math.min(5, Math.max(1, Math.round(z * 100) / 100));
    setZoom(n);
    if (n === 1) setPan({ x: 0, y: 0 });
  };

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight" && many && item?.type === "image") go(1);
      else if (e.key === "ArrowLeft" && many && item?.type === "image") go(-1);
    };
    document.addEventListener("keydown", key);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", key); document.body.style.overflow = prev; };
  }, [go, many, onClose, item?.type]);

  if (!item || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[300] flex flex-col bg-black/85 text-white"
      role="dialog"
      aria-modal="true"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="flex items-center gap-2 px-3 py-2 text-sm" onClick={(e) => e.stopPropagation()}>
        <span className="min-w-0 flex-1 truncate font-semibold">
          {item.type === "video" ? item.title ?? "Video" : many ? `${i + 1} / ${items.length}` : ""}
        </span>
        {item.type === "image" && (
          <>
            <button type="button" className="grid h-9 w-9 place-items-center rounded-full hover:bg-white/15" onClick={() => setZ(zoom - 0.5)} aria-label="Uzaqlaşdır" disabled={zoom <= 1}>
              <span className="text-xl leading-none">−</span>
            </button>
            <span className="w-12 text-center tabular-nums">{Math.round(zoom * 100)}%</span>
            <button type="button" className="grid h-9 w-9 place-items-center rounded-full hover:bg-white/15" onClick={() => setZ(zoom + 0.5)} aria-label="Yaxınlaşdır">
              <span className="text-xl leading-none">+</span>
            </button>
          </>
        )}
        <button type="button" className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/15" onClick={onClose} aria-label="Bağla">
          <Icon name="x" size={22} />
        </button>
      </div>

      <div
        className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden px-2 pb-4 sm:px-14"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        onTouchStart={(e) => { if (zoom === 1) touchX.current = e.touches[0].clientX; }}
        onTouchEnd={(e) => {
          if (touchX.current === null || !many || item.type !== "image") return;
          const dx = e.changedTouches[0].clientX - touchX.current;
          touchX.current = null;
          if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
        }}
      >
        {item.type === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.src}
            alt=""
            draggable={false}
            className={cx(
              "select-none object-contain transition-transform duration-150",
              light ? "h-full w-full rounded-lg bg-white p-2 sm:p-4" : "max-h-full max-w-full",
              zoom > 1 ? "cursor-grab" : "cursor-zoom-in",
            )}
            style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
            onDoubleClick={() => setZ(zoom > 1 ? 1 : 2.5)}
            onWheel={(e) => setZ(zoom + (e.deltaY < 0 ? 0.25 : -0.25))}
            onPointerDown={(e) => {
              if (zoom === 1) return;
              (e.target as HTMLElement).setPointerCapture(e.pointerId);
              drag.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
            }}
            onPointerMove={(e) => {
              const d = drag.current;
              if (d) setPan({ x: d.px + (e.clientX - d.x) / zoom, y: d.py + (e.clientY - d.y) / zoom });
            }}
            onPointerUp={() => { drag.current = null; }}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <VideoBox url={item.url} />
        )}

        {many && (
          <>
            <button type="button" onClick={() => go(-1)} aria-label="Əvvəlki" className="absolute left-1 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-black/40 hover:bg-white/20 sm:left-3">
              <Icon name="left" size={22} />
            </button>
            <button type="button" onClick={() => go(1)} aria-label="Növbəti" className="absolute right-1 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-black/40 hover:bg-white/20 sm:right-3">
              <Icon name="left" size={22} className="rotate-180" />
            </button>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}

function VideoBox({ url }: { url: string }) {
  const yt = youtubeId(url);
  const ref = useRef<HTMLVideoElement>(null);
  if (yt) {
    return (
      <div className="aspect-video w-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
        <iframe
          src={`https://www.youtube.com/embed/${yt}?autoplay=1&rel=0&playsinline=1`}
          className="h-full w-full rounded-lg"
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          title="Video"
        />
      </div>
    );
  }
  const skip = (s: number) => {
    const v = ref.current;
    if (v) v.currentTime = Math.max(0, Math.min(v.duration || Infinity, v.currentTime + s));
  };
  return (
    <div className="flex w-full max-w-5xl flex-col items-center gap-2" onClick={(e) => e.stopPropagation()}>
      <video
        ref={ref}
        src={url}
        controls
        autoPlay
        playsInline
        className="max-h-[75vh] w-full rounded-lg bg-black"
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") { e.preventDefault(); skip(10); }
          if (e.key === "ArrowLeft") { e.preventDefault(); skip(-10); }
        }}
      />
      <div className="flex gap-2">
        <button type="button" onClick={() => skip(-10)} className="rounded-full bg-white/15 px-4 py-1.5 text-sm font-semibold hover:bg-white/25">« 10 san</button>
        <button type="button" onClick={() => skip(10)} className="rounded-full bg-white/15 px-4 py-1.5 text-sm font-semibold hover:bg-white/25">10 san »</button>
      </div>
    </div>
  );
}
