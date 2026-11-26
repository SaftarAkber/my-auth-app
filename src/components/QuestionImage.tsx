"use client";

import { useState } from "react";
import { cx } from "@/lib/format";
import MediaViewer from "@/components/MediaViewer";

/**
 * Sualın şəkli (qraf, ağac, cədvəl...). Ekrana sığır; toxunanda tam ekran baxışda açılır:
 * şəkil scroll-suz, ekrana bütöv sığacaq qədər böyük göstərilir, lazım olsa +/−, təkər və iki klik ilə yaxınlaşdırılır.
 */
export default function QuestionImage({ src, className }: { src?: string | null; className?: string }) {
  const [zoom, setZoom] = useState(false);
  if (!src) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => setZoom(true)}
        className={cx("mt-3 block w-full overflow-hidden rounded-xl border border-line bg-white p-2 text-left sm:w-auto sm:max-w-full", className)}
        aria-label="Şəkli böyüt"
        title="Şəkli böyüt"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" loading="lazy" className="mx-auto block h-auto max-h-[45vh] w-auto max-w-full object-contain sm:max-h-80" />
      </button>
      {zoom && <MediaViewer items={[{ type: "image", src }]} onClose={() => setZoom(false)} light />}
    </>
  );
}
