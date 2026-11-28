import Link from "next/link";
import type { SiteContent } from "@/lib/siteDefaults";
import SiteFooter from "@/components/SiteFooter";
import AuthMenu from "@/components/AuthMenu";
import LangSwitch from "@/components/LangSwitch";
import { LogoMark } from "@/components/Logo";

/** Haqqımızda / Əlaqə kimi açıq səhifələrin çərçivəsi: yuxarı panel + məzmun + ortaq footer. */
export default function PublicPage({ site, title, lead, children }: { site: SiteContent; title: string; lead?: string; children: React.ReactNode }) {
  return (
    <div className="relative z-10 min-h-screen">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-5 sm:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <LogoMark size={36} />
            <span className="text-lg font-bold tracking-tight text-brand">{site.brand}</span>
          </Link>
          <div className="flex items-center gap-1 sm:gap-2">
            <LangSwitch />
            <AuthMenu signupLabel={site.heroBtn} />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-5 py-14 sm:px-8 sm:py-20">
        <h1 className="text-4xl font-bold tracking-tight text-ink sm:text-5xl">{title}</h1>
        {lead && <p className="mt-5 text-lg leading-relaxed text-muted">{lead}</p>}
        <div className="mt-10">{children}</div>
      </main>
      <SiteFooter site={site} />
    </div>
  );
}
