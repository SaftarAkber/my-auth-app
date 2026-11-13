import { MONTHS, UI, UI_TPL } from "@/lib/i18n-dict";
import type { Lang } from "@/lib/i18n";

/**
 * Lüğətə əsaslanan tərcümə: verilən Azərbaycan mətnini seçilmiş dilə çevirir, tapılmasa null qaytarır.
 * Lüğətdə olmayan mətnlər (adlar, paylaşımlar, müəllimin yazdıqları) toxunulmaz qalır.
 */

const COL: Record<Lang, number> = { RU: 0, EN: 1, AZ: 2 };

function pluralIndex(lang: Lang, n: number, forms: number) {
  if (lang === "RU" && forms >= 3) {
    const m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return 0;
    if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return 1;
    return 2;
  }
  return n === 1 ? 0 : Math.min(1, forms - 1);
}

/** {0:bir|çox} → saya görə forma; {:…} → əvvəlki rəqəmə görə (`prev`) */
function resolvePlurals(s: string, lang: Lang, args: string[], prev: number | null) {
  return s.replace(/\{(\d*):([^{}]+)\}/g, (_m, idx: string, body: string) => {
    const forms = body.split("|");
    const raw = idx === "" ? prev : Number(String(args[+idx] ?? "").replace(/[^\d]/g, ""));
    if (raw === null || Number.isNaN(raw)) return forms[forms.length - 1];
    return forms[pluralIndex(lang, raw, forms.length)] ?? forms[forms.length - 1];
  });
}

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// Uzun (daha dəqiq) şablonlar əvvəl yoxlanılır: “{0} sual · {1} cəhd” “{0} sual · {1}”-dən öncə
const TEMPLATES = [...UI_TPL].sort((x, y) => y[0].length - x[0].length).map(([az, ru, en]) => ({
  re: new RegExp("^" + esc(az).replace(/\\\{(\d)\\\}/g, "(.+?)") + "$"),
  order: [...az.matchAll(/\{(\d)\}/g)].map((m) => +m[1]),
  ru,
  en,
}));
const MONTH_RE = /(\d{1,2}) (yan|fev|mar|apr|may|iyn|iyl|avq|sen|okt|noy|dek)\b/g;

export function translateText(core: string, lang: Lang, prev: number | null = null): string | null {
  if (!core) return null;
  const col = COL[lang];
  const hit = UI[core];
  if (hit) {
    const v = hit[col];
    return v === undefined ? null : resolvePlurals(v, lang, [], prev);
  }
  if (lang === "AZ") return null;

  for (const t of TEMPLATES) {
    const m = core.match(t.re);
    if (!m) continue;
    const args: string[] = [];
    t.order.forEach((argIdx, i) => { args[argIdx] = m[i + 1]; });
    // Dəyişən hissə özü lüğətdə varsa (məs. rəng adı) o da tərcümə olunur; adlar və istifadəçi məlumatı olduğu kimi qalır
    const out = (lang === "RU" ? t.ru : t.en).replace(/\{(\d)\}/g, (_x, i: string) => {
      const a = args[+i] ?? "";
      return UI[a]?.[col] ?? a;
    });
    return resolvePlurals(out, lang, args, prev);
  }

  if (MONTH_RE.test(core)) {
    MONTH_RE.lastIndex = 0;
    return core.replace(MONTH_RE, (_m, d: string, mon: string) => `${d} ${MONTHS[mon][lang === "RU" ? 0 : 1]}`);
  }
  return null;
}
