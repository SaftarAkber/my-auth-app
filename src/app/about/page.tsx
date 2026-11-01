import type { Metadata } from "next";
import { getSiteContent } from "@/lib/site";
import PublicPage from "@/components/PublicPage";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Haqqımızda" };

const POINTS = [
  { title: "Müəllimlər üçün", text: "Qrup yaradın, test və video dərslər hazırlayın, nəticələri izləyin, tələbələri coin ilə mükafatlandırın." },
  { title: "Tələbələr üçün", text: "Müəllimin qrupuna qoşulun, testləri həll edin, videoları izləyin və nəticələrinizi bir yerdə görün." },
  { title: "Hamı üçün", text: "Hamıya açıq dərslər və testlər, fənlər üzrə müəllimlər və yaxınlaşan yarışlar." },
];

export default async function AboutPage() {
  const site = await getSiteContent();
  return (
    <PublicPage site={site} title="Haqqımızda" lead={site.heroText}>
      <ul className="grid gap-4">
        {POINTS.map((p) => (
          <li key={p.title} className="card border-l-4 border-l-accent p-6">
            <h2 className="text-xl font-bold text-ink">{p.title}</h2>
            <p className="mt-2 leading-relaxed text-muted">{p.text}</p>
          </li>
        ))}
      </ul>
    </PublicPage>
  );
}
