import type { Lang } from "@/lib/i18n";

/** Dil bayraqları (sadə SVG): AZ, RU, EN (Böyük Britaniya) */
export function Flag({ code, className }: { code: Lang; className?: string }) {
  return (
    <svg viewBox="0 0 30 20" width="22" height="15" className={className} aria-hidden="true" style={{ borderRadius: 3, boxShadow: "0 0 0 1px rgb(0 0 0 / .1)" }}>
      {code === "AZ" && (
        <>
          <rect width="30" height="20" fill="#00b5e2" />
          <rect y="6.67" width="30" height="6.67" fill="#ef3340" />
          <rect y="13.33" width="30" height="6.67" fill="#509e2f" />
          <circle cx="14" cy="10" r="2.6" fill="#fff" />
          <circle cx="14.8" cy="10" r="2.1" fill="#ef3340" />
          <path d="M17.4 8.6l.33.96h1.01l-.82.6.31.97-.83-.6-.82.6.31-.97-.82-.6h1.01z" fill="#fff" />
        </>
      )}
      {code === "RU" && (
        <>
          <rect width="30" height="6.67" fill="#fff" />
          <rect y="6.67" width="30" height="6.67" fill="#0039a6" />
          <rect y="13.33" width="30" height="6.67" fill="#d52b1e" />
        </>
      )}
      {code === "EN" && (
        <>
          <rect width="30" height="20" fill="#012169" />
          <path d="M0 0l30 20M30 0L0 20" stroke="#fff" strokeWidth="4" />
          <path d="M0 0l30 20M30 0L0 20" stroke="#c8102e" strokeWidth="1.6" />
          <path d="M15 0v20M0 10h30" stroke="#fff" strokeWidth="6" />
          <path d="M15 0v20M0 10h30" stroke="#c8102e" strokeWidth="3.4" />
        </>
      )}
    </svg>
  );
}
