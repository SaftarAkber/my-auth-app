"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui";

/** Yuxarı paneldə tək “Giriş” düyməsi: basanda “Daxil ol” və “Hesab yarat” seçimləri açılır. */
export default function AuthMenu({ signupLabel, preview = false }: { signupLabel: string; preview?: boolean }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const down = (e: PointerEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", down);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("pointerdown", down);
      document.removeEventListener("keydown", key);
    };
  }, [open]);

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        className="btn-primary btn-sm gap-2 sm:!px-5 sm:!py-2.5 sm:!text-sm"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        Giriş <Icon name="down" size={14} />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-lg border border-line bg-white p-1.5 animate-slide-in" style={{ boxShadow: "var(--hard-lg)" }}>
          {preview ? (
            <>
              <span className="block rounded px-3 py-2.5 text-sm font-semibold text-ink">Daxil ol</span>
              <span className="block rounded px-3 py-2.5 text-sm font-semibold text-ink">{signupLabel}</span>
            </>
          ) : (
            <>
              <Link role="menuitem" href="/login" prefetch={false} className="flex min-h-11 items-center rounded px-3 text-sm font-semibold text-ink transition-colors hover:bg-tint hover:text-brand">
                Daxil ol
              </Link>
              <Link role="menuitem" href="/register" prefetch={false} className="flex min-h-11 items-center rounded px-3 text-sm font-semibold text-ink transition-colors hover:bg-tint hover:text-brand">
                {signupLabel}
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  );
}
