import Link from "next/link";
import type { SiteContent } from "@/lib/siteDefaults";

/** Giriş etməmiş ziyarətçilərin gördüyü ana səhifə. Məzmun adminin “Sayt” bölməsindən gəlir. */
// Önizləmədə linklər naviqasiya etmir
function A({ href, className, children, preview }: { href: string; className?: string; children: React.ReactNode; preview: boolean }) {
  return preview ? <span className={className}>{children}</span> : <Link href={href} className={className}>{children}</Link>;
}

const SAMPLE = [
  { name: "Riyaziyyat: triqonometriya", score: "28 / 30", pct: 93 },
  { name: "İnformatika: say sistemləri", score: "22 / 25", pct: 88 },
  { name: "Ədəbiyyat: orta əsr poeziyası", score: "17 / 20", pct: 85 },
];

export default function Landing({ site, preview = false }: { site: SiteContent; preview?: boolean }) {
  return (
    <div className="relative z-10">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <span className="flex items-center gap-2.5">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-brand">
              <span className="h-4 w-4 rounded-full bg-white" />
            </span>
            <span className="text-xl font-bold tracking-tight text-brand">{site.brand}</span>
          </span>
          <nav className="flex items-center gap-2 sm:gap-3">
            <A preview={preview} href="/login" className="btn-secondary btn-sm sm:!px-5 sm:!py-2.5 sm:!text-sm">Daxil ol</A>
            <A preview={preview} href="/register" className="btn-primary btn-sm sm:!px-5 sm:!py-2.5 sm:!text-sm">{site.heroBtn}</A>
          </nav>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl items-center gap-12 px-5 pb-20 pt-12 sm:px-8 sm:pt-20 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <h1 className="text-4xl font-bold leading-[1.1] tracking-tight text-ink sm:text-5xl lg:text-6xl">{site.heroTitle}</h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted sm:text-xl">{site.heroText}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <A preview={preview} href="/register" className="btn-primary !px-8 !py-3.5 !text-base">{site.heroBtn}</A>
            <A preview={preview} href="/login" className="btn-secondary !px-8 !py-3.5 !text-base">Hesabım var</A>
          </div>
        </div>

        {/* Məhsulun özündən nümunə: tələbənin test nəticələri */}
        <div className="card mx-auto w-full max-w-md overflow-hidden" aria-hidden>
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <div>
              <p className="text-sm font-semibold text-ink">Test nəticələri</p>
              <p className="text-xs text-muted">Bu ay</p>
            </div>
            <span className="rounded-md bg-ok/10 px-2.5 py-1 text-xs font-semibold text-ok">Orta nəticə 89%</span>
          </div>
          <ul className="divide-y divide-line">
            {SAMPLE.map((r) => (
              <li key={r.name} className="px-5 py-4">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-sm font-medium text-ink">{r.name}</p>
                  <p className="text-sm font-semibold tabular-nums text-brand">{r.score}</p>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2">
                  <div className="h-full rounded-full bg-brand" style={{ width: `${r.pct}%` }} />
                </div>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between bg-surface-2 px-5 py-3 text-sm">
            <span className="text-muted">Müəllimdən mükafat</span>
            <span className="inline-flex items-center gap-1.5 font-semibold text-[#7a5a00]"><span className="coin-ic" /> +20 coin</span>
          </div>
        </div>
      </section>

      {site.show.features && site.features.length > 0 && (
        <section className="mx-auto max-w-7xl px-5 pb-20 sm:px-8">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {site.features.map((f, i) => (
              <article key={i} className="card flex min-h-48 flex-col justify-between border-t-4 border-t-brand p-6">
                <h2 className="text-2xl font-bold leading-tight tracking-tight text-ink">{f.title}</h2>
                <p className="mt-6 text-[15px] leading-relaxed text-muted">{f.text}</p>
              </article>
            ))}
          </div>
        </section>
      )}

      {site.show.steps && site.steps.length > 0 && (
        <section className="mx-auto max-w-7xl px-5 pb-20 sm:px-8">
          <h2 className="mb-8 text-3xl font-bold tracking-tight text-ink sm:text-4xl">{site.stepsTitle}</h2>
          <ol className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {site.steps.map((s, i) => (
              <li key={i} className="card flex gap-4 p-5">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-tint text-lg font-bold text-brand">{i + 1}</span>
                <div>
                  <h3 className="text-lg font-semibold">{s.title}</h3>
                  <p className="mt-1 text-sm text-muted">{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      {site.show.close && (
        <section className="mx-auto max-w-7xl px-5 pb-20 sm:px-8">
          <div className="flex flex-col items-start justify-between gap-6 rounded-xl bg-brand p-8 text-white sm:flex-row sm:items-center sm:p-12">
            <div className="max-w-2xl">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{site.closeTitle}</h2>
              <p className="mt-3 text-lg text-white/80">{site.closeText}</p>
            </div>
            <A preview={preview} href="/register" className="btn bg-white px-8 py-3.5 text-base text-brand hover:bg-tint">{site.heroBtn}</A>
          </div>
        </section>
      )}

      <footer className="border-t border-line bg-white px-5 py-8 text-center text-sm text-muted sm:px-8">
        {site.footer}
      </footer>
    </div>
  );
}
