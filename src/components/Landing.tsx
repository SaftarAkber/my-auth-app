import Link from "next/link";
import type { SiteContent } from "@/lib/siteDefaults";

const TILES = ["bg-sun", "bg-iris", "bg-tiger", "bg-flame"];

/** Giriş etməmiş ziyarətçilərin gördüyü ana səhifə. Məzmun adminin “Sayt” bölməsindən gəlir. */
// Önizləmədə linklər naviqasiya etmir
function A({ href, className, children, preview }: { href: string; className?: string; children: React.ReactNode; preview: boolean }) {
  return preview ? <span className={className}>{children}</span> : <Link href={href} className={className}>{children}</Link>;
}

export default function Landing({ site, preview = false }: { site: SiteContent; preview?: boolean }) {

  return (
    <div className="relative z-10">
      <header className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-5 sm:px-8">
        <span className="flex items-center gap-2.5">
          <span className="grid h-10 w-10 place-items-center rounded-full border-[2.5px] border-ink bg-white">
            <span className="h-4 w-4 rounded-full bg-ink" />
          </span>
          <span className="text-xl font-extrabold tracking-tight">{site.brand}</span>
        </span>
        <nav className="flex items-center gap-2 sm:gap-3">
          <A preview={preview} href="/login" className="btn-secondary btn-sm sm:!px-5 sm:!py-2 sm:!text-sm">Daxil ol</A>
          <A preview={preview} href="/register" className="btn-primary btn-sm sm:!px-5 sm:!py-2 sm:!text-sm">{site.heroBtn}</A>
        </nav>
      </header>

      <section className="mx-auto grid max-w-7xl items-center gap-10 px-5 pb-16 pt-8 sm:px-8 sm:pt-14 lg:grid-cols-[1.15fr_1fr]">
        <div>
          <h1 className="text-5xl font-extrabold leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl">{site.heroTitle}</h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed sm:text-xl">{site.heroText}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <A preview={preview} href="/register" className="btn-primary !px-8 !py-3 !text-base">{site.heroBtn} →</A>
            <A preview={preview} href="/login" className="btn-secondary !px-8 !py-3 !text-base">Hesabım var</A>
          </div>
        </div>

        {/* Coin motivi: kodla çəkilmiş dairələr və “qazanılmış coin” stikeri */}
        <div className="relative mx-auto aspect-square w-full max-w-md" aria-hidden>
          <div className="absolute inset-[6%] rounded-full border-[3px] border-ink bg-sun" style={{ boxShadow: "var(--hard-lg)" }} />
          <div className="absolute inset-[22%] grid place-items-center rounded-full border-[3px] border-ink bg-white">
            <span className="text-7xl font-extrabold tabular-nums sm:text-8xl">+20</span>
          </div>
          <div className="absolute -bottom-2 right-2 h-[34%] w-[34%] rounded-full border-[3px] border-ink bg-flame" style={{ boxShadow: "var(--hard)" }} />
          <div className="absolute left-0 top-[14%] h-[20%] w-[20%] rounded-full border-[3px] border-ink bg-iris" style={{ boxShadow: "var(--hard)" }} />
          <div className="absolute -left-2 bottom-[10%] rotate-[-6deg] rounded-2xl border-[3px] border-ink bg-white px-4 py-2 text-sm font-bold" style={{ boxShadow: "var(--hard)" }}>
            30 sualdan 28 düz ✓
          </div>
        </div>
      </section>

      {site.show.features && site.features.length > 0 && (
        <section className="mx-auto max-w-7xl px-5 pb-16 sm:px-8">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {site.features.map((f, i) => (
              <article key={i} className={`card ${TILES[i % TILES.length]} flex min-h-52 flex-col justify-between p-6`}>
                <h2 className="text-3xl font-extrabold leading-tight tracking-tight">{f.title}</h2>
                <p className="mt-6 text-[15px] font-medium leading-relaxed">{f.text}</p>
              </article>
            ))}
          </div>
        </section>
      )}

      {site.show.steps && site.steps.length > 0 && (
        <section className="mx-auto max-w-7xl px-5 pb-16 sm:px-8">
          <h2 className="mb-6 inline-block text-4xl font-extrabold tracking-tight" style={{ boxShadow: "inset 0 -0.34em 0 rgb(var(--sun))" }}>
            {site.stepsTitle}
          </h2>
          <ol className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {site.steps.map((s, i) => (
              <li key={i} className="card flex gap-4 p-5">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border-[2.5px] border-ink bg-sun text-lg font-extrabold">{i + 1}</span>
                <div>
                  <h3 className="text-lg font-bold">{s.title}</h3>
                  <p className="mt-1 text-sm text-muted">{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      {site.show.close && (
        <section className="mx-auto max-w-7xl px-5 pb-20 sm:px-8">
          <div className="card flex flex-col items-start justify-between gap-6 bg-sun p-8 sm:flex-row sm:items-center sm:p-12" style={{ boxShadow: "var(--hard-lg)" }}>
            <div className="max-w-2xl">
              <h2 className="text-4xl font-extrabold tracking-tight sm:text-5xl">{site.closeTitle}</h2>
              <p className="mt-3 text-lg">{site.closeText}</p>
            </div>
            <A preview={preview} href="/register" className="btn-primary !px-8 !py-3 !text-base">{site.heroBtn} →</A>
          </div>
        </section>
      )}

      <footer className="border-t-[3px] border-ink bg-ink px-5 py-8 text-center text-sm text-white sm:px-8">
        {site.footer}
      </footer>
    </div>
  );
}
