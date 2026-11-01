import Link from "next/link";
import type { SiteContent } from "@/lib/siteDefaults";
import type { LandingData } from "@/lib/landingData";
import { SUBJECTS, subjectLabel } from "@/lib/subjects";
import { Avatar, Icon, Img } from "@/components/ui";
import LandingCarousel from "@/components/LandingCarousel";
import SiteFooter from "@/components/SiteFooter";
import ItemCarousel from "@/components/ItemCarousel";
import AuthMenu from "@/components/AuthMenu";

/**
 * Giriş etməmiş ziyarətçilərin gördüyü ana səhifə. Əsas mətnlər adminin “Sayt” bölməsindən gəlir.
 * Müəllim və video kartları baxış üçündür: klik /u və /watch-a aparır, orada giriş tələb olunduğu üçün login səhifəsi açılır.
 */
// Önizləmədə linklər naviqasiya etmir
function A({ href, className, children, preview, label }: { href: string; className?: string; children: React.ReactNode; preview: boolean; label?: string }) {
  return preview ? (
    <span className={className}>{children}</span>
  ) : (
    <Link href={href} prefetch={false} className={className} aria-label={label}>{children}</Link>
  );
}

const CONTESTS = [
  { title: "Həftəlik test yarışı", text: "Eyni test, eyni vaxt. Ən yaxşı nəticə həftənin qalibidir.", tag: "Hər həftə" },
  { title: "Qrup yarışı", text: "Qruplar bir-biri ilə yarışır, müəllim nəticələri izləyir.", tag: "Qruplar arası" },
  { title: "Aylıq olimpiada", text: "Fənn üzrə geniş imtahan, reytinq cədvəli və coin mükafatları.", tag: "Hər ay" },
];

function mmss(sec: number | null) {
  if (!sec || sec <= 0) return null;
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function SectionHead({ id, title, text, action }: { id: string; title: string; text?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h2 id={id} className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">{title}</h2>
        {text && <p className="mt-2 max-w-2xl text-base text-muted">{text}</p>}
      </div>
      {action}
    </div>
  );
}

export default function Landing({ site, data, preview = false }: { site: SiteContent; data?: LandingData; preview?: boolean }) {
  const teachers = data?.teachers ?? [];
  const videos = data?.videos ?? [];
  const showTeachers = site.show.teachers && (preview || teachers.length > 0);
  const showVideos = site.show.videos && (preview || videos.length > 0);

  return (
    <div className="relative z-10">
      <header className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-5 sm:px-8">
          <span className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-brand">
              <span className="h-3.5 w-3.5 rounded-full bg-white" />
            </span>
            <span className="text-lg font-bold tracking-tight text-brand">{site.brand}</span>
          </span>
          <nav className="hidden h-full items-stretch lg:flex" aria-label="Bölmələr">
            {site.show.subjects && <a href="#fenler" className="tl">Fənlər</a>}
            {showTeachers && <a href="#muellimler" className="tl">Müəllimlər</a>}
            {showVideos && <a href="#videolar" className="tl">Videolar</a>}
            {site.show.contests && <a href="#yarislar" className="tl">Yarışlar</a>}
          </nav>
          <AuthMenu signupLabel={site.heroBtn} preview={preview} />
        </div>
      </header>

      {/* Giriş + karusel */}
      <section className="mx-auto grid max-w-7xl items-center gap-12 px-5 pb-20 pt-12 sm:px-8 sm:pt-20 lg:grid-cols-[1.05fr_1fr]">
        <div className="min-w-0">
          <h1 className="text-4xl font-bold leading-[1.1] tracking-tight text-ink sm:text-5xl lg:text-6xl">{site.heroTitle}</h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted sm:text-xl">{site.heroText}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <A preview={preview} href="/register" className="btn-primary !px-8 !py-3.5 !text-base">{site.heroBtn}</A>
            <A preview={preview} href="/login" className="btn-secondary !px-8 !py-3.5 !text-base">Hesabım var</A>
          </div>
          <ul className="mt-10 flex flex-wrap gap-x-8 gap-y-3 text-sm font-semibold text-muted">
            {["Onlayn testlər", "Video dərslər", "Müəllim qrupları", "Coin və mağaza"].map((x) => (
              <li key={x} className="flex items-center gap-2"><Icon name="check" size={16} className="text-ok" /> {x}</li>
            ))}
          </ul>
        </div>
        <LandingCarousel />
      </section>

      {/* Fənlər */}
      {site.show.subjects && (
        <section id="fenler" className="scroll-mt-20 border-y border-line bg-white py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <SectionHead
              id="fenler-b"
              title="Hansı fəndən hazırlaşırsan?"
              text="Müəllimlər fənlər üzrə qruplar, testlər və videodərslər yerləşdirir. Fənni seç, müəllimini tap."
            />
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {SUBJECTS.map((s) => (
                <li key={s.id}>
                  <A
                    preview={preview}
                    href="/register"
                    className="group flex min-h-16 items-center gap-3 rounded-lg border border-line bg-bg px-4 py-3 font-semibold text-ink transition-colors hover:border-brand hover:bg-brand hover:text-white"
                  >
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded bg-white text-sm font-bold text-brand group-hover:bg-white/15 group-hover:text-white">
                      {s.label.slice(0, 2)}
                    </span>
                    {s.label}
                  </A>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Müəllimlər */}
      {showTeachers && (
        <section id="muellimler" className="mx-auto max-w-7xl scroll-mt-20 px-5 py-16 sm:px-8 sm:py-20">
          <SectionHead
            id="muellimler-b"
            title="Müəllimlərimiz"
            text="Profilə baxmaq və qrupa müraciət etmək üçün hesaba daxil olmaq lazımdır."
            action={<A preview={preview} href="/register" className="btn-secondary">Qoşul</A>}
          />
          <ItemCarousel label="Müəllimlər">
            {teachers.map((t) => (
              <div key={t.id} className="h-full">
                <A preview={preview} href={`/u/${t.id}`} label={`${t.name}: profilə baxmaq üçün daxil ol`} className="card flex h-full flex-col items-center p-5 text-center transition-colors hover:border-brand">
                  <Avatar src={t.photo} name={t.name} size={72} className="border border-line" />
                  <p className="mt-3 font-bold leading-tight text-ink">{t.name}</p>
                  <div className="mt-2 flex flex-wrap justify-center gap-1.5">
                    {t.subjects.length === 0 ? (
                      <span className="badge-muted">Müəllim</span>
                    ) : (
                      t.subjects.map((s) => <span key={s} className="badge-brand">{subjectLabel(s)}</span>)
                    )}
                  </div>
                  <span className="mt-auto inline-flex items-center gap-1.5 pt-4 text-xs font-semibold text-muted">
                    <Icon name="lock" size={13} /> Profilə bax
                  </span>
                </A>
              </div>
            ))}
          </ItemCarousel>
        </section>
      )}

      {/* Videolar */}
      {showVideos && (
        <section id="videolar" className="scroll-mt-20 border-y border-line bg-white py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <SectionHead
              id="videolar-b"
              title="Videodərslər"
              text="Hamıya açıq dərslərdən seçmələr. İzləmək üçün giriş etmək lazımdır."
              action={<A preview={preview} href="/login" className="btn-secondary">Daxil ol və izlə</A>}
            />
            <ItemCarousel label="Videodərslər">
              {videos.map((v) => {
                const dur = mmss(v.duration);
                return (
                  <div key={v.id}>
                    <A preview={preview} href={`/watch/${v.id}`} label={`${v.title}: izləmək üçün daxil ol`} className="group block">
                      <span className="relative block aspect-video overflow-hidden rounded-lg border border-line bg-brand">
                        {v.thumb ? (
                          <Img src={v.thumb} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
                        ) : (
                          <span className="grid h-full w-full place-items-center text-white/80"><Icon name="video" size={34} /></span>
                        )}
                        <span className="absolute inset-0 grid place-items-center bg-black/0 transition-colors group-hover:bg-black/25">
                          <span className="grid h-12 w-12 place-items-center rounded-full bg-white/95 text-brand opacity-0 transition-opacity group-hover:opacity-100"><Icon name="lock" size={20} /></span>
                        </span>
                        {dur && <span className="absolute bottom-2 right-2 rounded bg-black/75 px-1.5 py-0.5 text-xs font-semibold text-white">{dur}</span>}
                      </span>
                      <span className="mt-3 block line-clamp-2 font-semibold leading-snug text-ink group-hover:text-brand">{v.title}</span>
                      <span className="mt-0.5 block truncate text-sm text-muted">{v.teacher}</span>
                    </A>
                  </div>
                );
              })}
            </ItemCarousel>
          </div>
        </section>
      )}

      {/* Yarışlar */}
      {site.show.contests && (
        <section id="yarislar" className="mx-auto max-w-7xl scroll-mt-20 px-5 py-16 sm:px-8 sm:py-20">
          <SectionHead
            id="yarislar-b"
            title="Yarışlar"
            text="Yarışlar platformaya əlavə olunur. Qalibləri reytinq cədvəli və coin mükafatları gözləyir."
          />
          <ul className="grid gap-5 md:grid-cols-3">
            {CONTESTS.map((c) => (
              <li key={c.title} className="card flex flex-col border-t-4 border-t-accent p-6">
                <span className="badge bg-accent text-white">Tezliklə</span>
                <h3 className="mt-4 text-xl font-bold leading-tight text-ink">{c.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-muted">{c.text}</p>
                <span className="mt-auto pt-5 text-sm font-semibold text-brand">{c.tag}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {site.show.steps && site.steps.length > 0 && (
        <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20">
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
            <A preview={preview} href="/register" className="btn bg-white px-8 py-3.5 text-base text-brand hover:bg-accent hover:text-white">{site.heroBtn}</A>
          </div>
        </section>
      )}

      <SiteFooter site={site} preview={preview} />
    </div>
  );
}
