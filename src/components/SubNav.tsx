"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { cx } from "@/lib/format";

interface Item { href: string; label: string; badge?: boolean }

/** Əlaqəli bölmələr arasında keçid: nav-da tək ikon altında birləşən səhifələr (məs. Tələbələr ↔ Müraciətlər). */
export function SubNav({ items }: { items: Item[] }) {
  const pathname = usePathname();
  const [pending, setPending] = useState(0);

  useEffect(() => {
    if (!items.some((i) => i.badge)) return;
    api<{ count: number }>("/api/teacher/requests/count").then((d) => setPending(d.count)).catch(() => {});
  }, [items]);

  return (
    <div className="-mx-2 mb-5 flex gap-2 overflow-x-auto px-2 pb-3 pt-2">
      {items.map((i) => {
        const active = pathname === i.href || pathname.startsWith(i.href + "/");
        return (
          <Link
            key={i.href}
            href={i.href}
            aria-current={active ? "page" : undefined}
            className={cx(
              "flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full border-[2.5px] border-ink px-4 py-1.5 text-sm font-semibold transition hover:-translate-y-0.5",
              active ? "bg-ink text-white" : "bg-white text-ink hover:bg-sun/40",
            )}
          >
            {i.label}
            {i.badge && pending > 0 && <span className="rounded-full border-2 border-ink bg-flame px-1.5 text-xs font-bold text-white">{pending}</span>}
          </Link>
        );
      })}
    </div>
  );
}

export const STUDENTS_NAV: Item[] = [
  { href: "/teacher/students", label: "Tələbələr" },
  { href: "/teacher/requests", label: "Müraciətlər", badge: true },
];
export const TESTS_NAV: Item[] = [
  { href: "/teacher/tests", label: "Testlər" },
  { href: "/teacher/attempts", label: "Nəticələr" },
];
