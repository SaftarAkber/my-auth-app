"use client";

import { useEffect, useState } from "react";
import { cx } from "@/lib/format";

/** "2 gün 5 saat", "3 saat 12 dəq", "45 dəq" */
export function leftText(ms: number) {
  const min = Math.max(0, Math.floor(ms / 60000));
  const d = Math.floor(min / 1440);
  const h = Math.floor((min % 1440) / 60);
  const m = min % 60;
  if (d > 0) return `${d} gün${h ? ` ${h} saat` : ""}`;
  if (h > 0) return `${h} saat${m ? ` ${m} dəq` : ""}`;
  return `${Math.max(1, m)} dəq`;
}

/** Son tarixə qədər geri sayım (hər 30 saniyədən bir yenilənir) */
export default function Countdown({ to, className }: { to: string | Date; className?: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);
  const ms = new Date(to).getTime() - now;
  if (ms <= 0) return <span className={cx("font-semibold text-bad", className)}>Vaxt bitib</span>;
  return (
    <span className={cx("font-semibold tabular-nums", ms < 3 * 3600_000 ? "text-bad" : ms < 86400_000 ? "text-warn" : "text-ink", className)}>
      {leftText(ms)} qalıb
    </span>
  );
}
