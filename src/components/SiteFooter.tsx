import Link from "next/link";
import type { SiteContent } from "@/lib/siteDefaults";
import { emailLink, instagramLink, whatsappLink, youtubeLink } from "@/lib/contactLinks";

/** Giriş etməmişlər üçün səhifələrin (ana səhifə, haqqımızda, əlaqə) ortaq alt hissəsi. */

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M20.5 3.5A11 11 0 0 0 3.2 17.3L2 22l4.8-1.2A11 11 0 1 0 20.5 3.5z" />
      <path d="M8.6 7.6c.3 3.4 3.4 6.5 6.8 6.8l1.4-1.7-2.3-1.2-.9.9c-1.1-.5-2.2-1.6-2.7-2.7l.9-.9-1.2-2.3z" />
    </svg>
  );
}
function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.3" cy="6.7" r="0.6" fill="currentColor" />
    </svg>
  );
}
function YouTubeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="2.5" y="5" width="19" height="14" rx="4" />
      <path d="M10 9.2v5.6l5-2.8z" fill="currentColor" />
    </svg>
  );
}
function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}

export function contactChannels(site: SiteContent) {
  const c = site.contact;
  return [
    { id: "wa", label: "WhatsApp", value: c.whatsapp.trim(), href: whatsappLink(c.whatsapp), icon: <WhatsAppIcon /> },
    { id: "ig", label: "Instagram", value: c.instagram.trim(), href: instagramLink(c.instagram), icon: <InstagramIcon /> },
    { id: "yt", label: "YouTube", value: c.youtube.trim(), href: youtubeLink(c.youtube), icon: <YouTubeIcon /> },
    { id: "mail", label: "Email", value: c.email.trim(), href: emailLink(c.email), icon: <MailIcon /> },
  ].filter((x) => x.value && x.href);
}

const COL_HEAD = "mb-3 text-sm font-bold text-ink";
const LINK = "block py-1.5 text-sm text-muted transition-colors hover:text-brand";

// Önizləmədə linklər naviqasiya etmir
function FL({ href, children, className, preview }: { href: string; children: React.ReactNode; className?: string; preview: boolean }) {
  return preview ? <span className={className}>{children}</span> : <Link href={href} prefetch={false} className={className}>{children}</Link>;
}

export default function SiteFooter({ site, preview = false }: { site: SiteContent; preview?: boolean }) {
  const channels = contactChannels(site);
  const year = new Date().getFullYear();
  const sections = [
    site.show.subjects && { href: "/#fenler", label: "Fənlər" },
    site.show.teachers && { href: "/#muellimler", label: "Müəllimlər" },
    site.show.videos && { href: "/#videolar", label: "Videolar" },
    site.show.contests && { href: "/#yarislar", label: "Yarışlar" },
  ].filter(Boolean) as { href: string; label: string }[];

  return (
    <footer className="border-t border-line bg-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 sm:px-8 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
        <div>
          <FL preview={preview} href="/" className="inline-flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-brand"><span className="h-3.5 w-3.5 rounded-full bg-white" /></span>
            <span className="text-lg font-bold tracking-tight text-brand">{site.brand}</span>
          </FL>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted">{site.footer}</p>
          {channels.length > 0 && (
            <ul className="mt-5 flex gap-2" aria-label="Sosial şəbəkələr">
              {channels.map((c) => (
                <li key={c.id}>
                  <a
                    href={c.href!}
                    target={c.id === "mail" ? undefined : "_blank"}
                    rel="noopener noreferrer"
                    aria-label={c.label}
                    title={c.label}
                    className="grid h-11 w-11 place-items-center rounded border border-line-strong text-muted transition-colors hover:border-brand hover:bg-brand hover:text-white"
                  >
                    {c.icon}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>

        <nav aria-label="Platforma">
          <p className={COL_HEAD}>Platforma</p>
          {sections.map((x) => <FL preview={preview} key={x.href} href={x.href} className={LINK}>{x.label}</FL>)}
          <FL preview={preview} href="/login" className={LINK}>Daxil ol</FL>
          <FL preview={preview} href="/register" className={LINK}>Hesab yarat</FL>
        </nav>

        <nav aria-label="Şirkət">
          <p className={COL_HEAD}>Şirkət</p>
          <FL preview={preview} href="/about" className={LINK}>Haqqımızda</FL>
          <FL preview={preview} href="/contact" className={LINK}>Əlaqə</FL>
        </nav>

        <div>
          <p className={COL_HEAD}>Əlaqə</p>
          {channels.length === 0 ? (
            <p className="text-sm text-muted">Əlaqə məlumatları tezliklə əlavə olunacaq.</p>
          ) : (
            <ul className="space-y-1">
              {channels.map((c) => (
                <li key={c.id}>
                  <a href={c.href!} target={c.id === "mail" ? undefined : "_blank"} rel="noopener noreferrer" className="flex items-center gap-2.5 py-1.5 text-sm text-muted transition-colors hover:text-brand">
                    {c.icon}
                    <span className="min-w-0 truncate">{/^https?:///i.test(c.value) ? c.label : c.value}</span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="border-t border-line">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-5 py-5 text-sm text-muted sm:flex-row sm:px-8">
          <p>© {year} {site.brand}. Bütün hüquqlar qorunur.</p>
          <p>Müəllim və tələbələr üçün onlayn təhsil platforması</p>
        </div>
      </div>
    </footer>
  );
}
