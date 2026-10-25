import { prisma } from "@/lib/prisma";
import { DEFAULT_SITE, mergeSite, type SiteContent } from "@/lib/siteDefaults";

export { DEFAULT_SITE, mergeSite };
export type { SiteContent };

export async function getSiteContent(): Promise<SiteContent> {
  try {
    const row = await prisma.siteContent.findUnique({ where: { key: "landing" } });
    return mergeSite((row?.data ?? null) as Partial<SiteContent> | null);
  } catch {
    // Cədvəl hələ yaradılmayıbsa və ya baza əlçatmaz olarsa susmaya görə məzmun göstərilir
    return DEFAULT_SITE;
  }
}
