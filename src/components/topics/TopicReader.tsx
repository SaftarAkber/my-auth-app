"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Empty, Icon } from "@/components/ui";
import { cx } from "@/lib/format";
import { PAGE_WIDTH, imagesReady, paginate } from "@/lib/paginate";

/**
 * Kitabxananın oxu görünüşü: məzmun gizli, 680px enli qutuda ölçülür və 40 sətirlik səhifələrə bölünür.
 * Tələbənin qaldığı səhifə brauzerdə yadda saxlanılır (`rememberKey` verilibsə).
 */
/** Şəkil eni (px, 680-lik səhifəyə görə) faizə çevrilir ki, hər ekranda eyni nisbəti saxlasın */
function responsive(el: Element) {
  const c = el.cloneNode(true) as HTMLElement;
  const figs = c.matches("figure") ? [c] : Array.from(c.querySelectorAll("figure"));
  figs.forEach((f) => {
    const px = parseFloat(f.style.width);
    if (!px) return;
    const pct = `${Math.min(100, (px / PAGE_WIDTH) * 100).toFixed(2)}%`;
    f.style.width = pct;
    f.style.setProperty("--w", pct);
  });
  return c.outerHTML;
}

export default function TopicReader({ html, rememberKey }: { html: string; rememberKey?: string }) {
  const measure = useRef<HTMLDivElement>(null);
  const top = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState<string[] | null>(null);
  const [page, setPage] = useState(0);

  useEffect(() => {
    const root = measure.current;
    if (!root) return;
    let alive = true;
    root.innerHTML = html;
    imagesReady(root).then(() => {
      if (!alive) return;
      const kids = Array.from(root.children);
      const out = paginate(root).map((idx) => idx.map((i) => responsive(kids[i])).join(""));
      setPages(out.length ? out : [""]);
      let saved = 0;
      if (rememberKey) {
        try { saved = Number(localStorage.getItem(rememberKey) ?? 0) || 0; } catch { /* brauzer yaddaşı bağlıdır */ }
      }
      setPage(Math.min(Math.max(0, saved), out.length - 1));
    });
    return () => { alive = false; };
  }, [html, rememberKey]);

  const go = (p: number) => {
    setPage(p);
    if (rememberKey) {
      try { localStorage.setItem(rememberKey, String(p)); } catch { /* ignore */ }
    }
    top.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const empty = !html.replace(/<[^>]*>/g, "").trim() && !/<img/i.test(html);
  const nums = useMemo(() => {
    if (!pages) return [];
    const n = pages.length;
    // Çox səhifədə: 1 … p-1 p p+1 … n
    const set = new Set([0, n - 1, page - 1, page, page + 1].filter((x) => x >= 0 && x < n));
    return [...set].sort((a, b) => a - b);
  }, [pages, page]);

  return (
    <div ref={top} className="scroll-mt-24">
      {/* Ölçmə üçün gizli qutu (oxucuya görünmür) */}
      <div aria-hidden className="pointer-events-none invisible absolute left-0 top-0 -z-10 overflow-hidden" style={{ width: PAGE_WIDTH, height: 0 }}>
        <div ref={measure} className="topic-content" style={{ width: PAGE_WIDTH }} />
      </div>

      {empty ? (
        <Empty icon="book" title="Kitabxana hələ boşdur" text="Müəllim bu mövzu üçün qeydləri hazırlayır." />
      ) : !pages ? (
        <div className="skeleton h-96 max-w-[760px]" />
      ) : (
        <>
          <article className="card w-full max-w-[760px] px-5 py-7 sm:px-10 sm:py-9">
            <div className="topic-content topic-reader" dangerouslySetInnerHTML={{ __html: pages[page] }} />
          </article>
          {pages.length > 1 && (
            <nav className="mt-4 flex max-w-[760px] flex-wrap items-center justify-between gap-3" aria-label="Səhifələr">
              <button className="btn-soft btn-sm" disabled={page === 0} onClick={() => go(page - 1)}>
                <Icon name="left" size={14} /> Əvvəlki
              </button>
              <div className="flex items-center gap-1">
                {nums.map((n, i) => (
                  <span key={n} className="flex items-center gap-1">
                    {i > 0 && n - nums[i - 1] > 1 && <span className="px-1 text-muted">…</span>}
                    <button
                      onClick={() => go(n)}
                      aria-current={n === page ? "page" : undefined}
                      className={cx(
                        "h-10 min-w-10 rounded border px-2 text-sm font-semibold transition-colors",
                        n === page ? "border-brand bg-brand text-white" : "border-line-strong bg-white hover:bg-tint",
                      )}
                    >
                      {n + 1}
                    </button>
                  </span>
                ))}
              </div>
              <button className="btn-soft btn-sm" disabled={page === pages.length - 1} onClick={() => go(page + 1)}>
                Növbəti <Icon name="right" size={14} />
              </button>
            </nav>
          )}
          <p className="mt-2 text-xs text-muted">Səhifə {page + 1} / {pages.length}</p>
        </>
      )}
    </div>
  );
}
