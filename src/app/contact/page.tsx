import type { Metadata } from "next";
import { getSiteContent } from "@/lib/site";
import PublicPage from "@/components/PublicPage";
import { contactChannels } from "@/components/SiteFooter";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Əlaqə" };

export default async function ContactPage() {
  const site = await getSiteContent();
  const channels = contactChannels(site);
  return (
    <PublicPage site={site} title="Əlaqə" lead="Sual, təklif və ya əməkdaşlıq üçün bizimlə aşağıdakı kanallardan əlaqə saxlaya bilərsiniz.">
      {channels.length === 0 ? (
        <p className="card p-6 text-muted">Əlaqə məlumatları tezliklə əlavə olunacaq.</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {channels.map((c) => (
            <li key={c.id}>
              <a
                href={c.href!}
                target={c.id === "mail" ? undefined : "_blank"}
                rel="noopener noreferrer"
                className="card flex min-h-20 items-center gap-4 p-5 transition-colors hover:border-brand"
              >
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded bg-tint text-brand">{c.icon}</span>
                <span className="min-w-0">
                  <span className="block font-bold text-ink">{c.label}</span>
                  <span className="block truncate text-sm text-muted">{c.value}</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </PublicPage>
  );
}
