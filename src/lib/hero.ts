/** Karusel slaydı: admin formasından gələn dəyərləri təmizləyir */
export const HERO_TEMPLATES = ["exam", "contest", "shop", "live"] as const;
export const HERO_SELECT = {
  id: true, kind: true, template: true, tag: true, title: true, subtitle: true, highlight: true, note: true,
  imageUrl: true, countdownAt: true, timerPos: true, order: true, isActive: true, startsAt: true, endsAt: true,
} as const;

const str = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
const date = (v: unknown) => {
  if (v === null || v === "" || v === undefined) return null;
  const d = new Date(String(v));
  return isNaN(d.getTime()) ? null : d;
};

export function cleanHero(b: Record<string, unknown>) {
  const kind = b.kind === "image" ? "image" : "template";
  const template = HERO_TEMPLATES.includes(b.template as (typeof HERO_TEMPLATES)[number]) ? (b.template as string) : "exam";
  const imageUrl = str(b.imageUrl, 1000);
  if (kind === "image" && !imageUrl) return { error: "Şəkil yükləyin" } as const;
  if (kind === "template" && !str(b.title, 120)) return { error: "Başlıq yazın" } as const;
  return {
    data: {
      kind,
      template: kind === "template" ? template : null,
      tag: str(b.tag, 40),
      title: str(b.title, 120),
      subtitle: str(b.subtitle, 200),
      highlight: str(b.highlight, 24),
      note: str(b.note, 40),
      imageUrl: kind === "image" ? imageUrl : null,
      countdownAt: date(b.countdownAt),
      timerPos: ["bl", "br", "tl", "tr"].includes(b.timerPos as string) ? (b.timerPos as string) : "bl",
      isActive: b.isActive !== false,
      startsAt: date(b.startsAt),
      endsAt: date(b.endsAt),
    },
  } as const;
}
