"use client";

import { useEffect, useRef, useState } from "react";
import { LANGS, useLang } from "@/lib/i18n";
import { Icon } from "@/components/ui";
import { cx } from "@/lib/format";

/** Giriş etməmişlər üçün dil seçimi (ana səhifə, giriş, haqqımızda / əlaqə) */
export default function LangSwitch({ light = false }: { light?: boolean }) {
  const { lang, setLang } = useLang();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const down = (e: PointerEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", down);
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("pointerdown", down); document.removeEventListener("keydown", key); };
  }, [open]);

  return (
    <div ref={box} className="relative" data-no-translate>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Language"
        className={cx(
          "inline-flex h-10 items-center gap-1.5 rounded px-2.5 text-sm font-semibold transition-colors",
          light ? "text-white/90 hover:bg-white/10" : "text-muted hover:bg-tint hover:text-brand",
        )}
      >
        <Icon name="globe" size={18} /> {lang}
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full z-50 mt-2 w-44 overflow-hidden rounded-lg border border-line bg-white p-1.5 animate-slide-in" style={{ boxShadow: "var(--hard-lg)" }}>
          {LANGS.map((l) => (
            <button
              key={l.code}
              role="menuitemradio"
              aria-checked={lang === l.code}
              onClick={() => { setOpen(false); if (l.code !== lang) setLang(l.code); }}
              className={cx("flex min-h-10 w-full items-center justify-between rounded px-3 text-sm font-semibold text-ink transition-colors", lang === l.code ? "bg-tint text-brand" : "hover:bg-tint/60")}
            >
              {l.label}<span className="text-muted">{l.code}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
