import type { Prisma } from "@prisma/client";
import sanitizeHtml from "sanitize-html";
import { prisma } from "@/lib/prisma";

/**
 * Mövzu paketləri (qrupda "Mövzular"): kitabxana mətni + bağlı test paketləri və videolar.
 * Kitabxana HTML kimi saxlanılır; tələbəyə göstərilməzdən əvvəl burada icazəli teq və stillərlə süzülür.
 */

export const MAX_TOPIC_HTML = 300_000;

const COLOR = [/^#[0-9a-f]{3,8}$/i, /^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(,\s*(0|1|0?\.\d+)\s*)?\)$/i];
const FONT_SIZES: Record<string, string> = { "1": "x-small", "2": "small", "3": "medium", "4": "large", "5": "x-large", "6": "xx-large", "7": "xx-large" };

export function sanitizeTopicHtml(html: string): string {
  return sanitizeHtml(html.slice(0, MAX_TOPIC_HTML), {
    allowedTags: ["p", "br", "h2", "h3", "strong", "b", "em", "i", "u", "s", "span", "mark", "ul", "ol", "li", "blockquote", "figure", "img", "figcaption", "hr", "table", "thead", "tbody", "tr", "th", "td"],
    allowedAttributes: {
      "*": ["style"],
      figure: ["class", "style"],
      img: ["src", "alt"],
      hr: ["class"],
      td: ["colspan", "rowspan"],
      th: ["colspan", "rowspan"],
    },
    allowedClasses: { figure: ["img-l", "img-c", "img-r"], hr: ["page-break"] },
    allowedStyles: {
      "*": {
        color: COLOR,
        "background-color": COLOR,
        "text-align": [/^(left|right|center|justify)$/],
        "font-size": [/^(x-small|small|medium|large|x-large|xx-large|\d{1,2}px)$/],
        width: [/^\d{2,3}px$/],
        // Brauzer qalın/kursiv/altından xətti stil kimi də yazır (styleWithCSS)
        "font-weight": [/^(bold|bolder|normal|[1-9]00)$/],
        "font-style": [/^(italic|normal)$/],
        "text-decoration": [/^(none|underline|line-through)( (underline|line-through))*$/],
        "text-decoration-line": [/^(none|underline|line-through)( (underline|line-through))*$/],
      },
    },
    allowedSchemes: ["https"],
    allowedSchemesByTag: { img: ["https"] },
    // Yalnız tam https ünvanlı şəkillər (nisbi və ya boş src atılır)
    exclusiveFilter: (frame) => frame.tag === "img" && !frame.attribs.src?.startsWith("https://"),
    transformTags: {
      div: "p",
      // Brauzerin execCommand("fontSize") nəticəsi: <font size="5"> → <span style="font-size:x-large">
      font: (_tag, attribs) => {
        const styles: string[] = [];
        if (attribs.size && FONT_SIZES[attribs.size]) styles.push(`font-size:${FONT_SIZES[attribs.size]}`);
        if (attribs.color) styles.push(`color:${attribs.color}`);
        const out: Record<string, string> = {};
        if (styles.length) out.style = styles.join(";");
        return { tagName: "span", attribs: out };
      },
    },
  }).trim();
}

/** Müəllimə aid test paketləri (kolleksiya, qrup və ya qrup bağlantısı ilə) */
export const ownedTestWhere = (teacherId: string): Prisma.TestPackageWhereInput => ({
  deletedAt: null,
  OR: [
    { collection: { teacherId } },
    { group: { teacherId } },
    { testPackageGroups: { some: { group: { teacherId } } } },
  ],
});

/** Tələbəyə açıq test paketləri: dərc olunmuş; hamıya açıq və ya onun qruplarından birinə açılmış */
export const visibleTestWhere = (groupIds: string[]): Prisma.TestPackageWhereInput => ({
  deletedAt: null,
  isPublished: true,
  OR: [
    { visibility: "PUBLIC" },
    ...(groupIds.length
      ? [{ groupId: { in: groupIds } }, { testPackageGroups: { some: { groupId: { in: groupIds } } } }]
      : []),
  ],
});

/** Test sətri (TestRow) üçün lazım olan sahələr */
export const testLiteSelect = (studentId?: string) =>
  ({
    id: true,
    name: true,
    collectionId: true,
    description: true,
    isTimed: true,
    duration: true,
    allowRetry: true,
    startsAt: true,
    endsAt: true,
    isPublished: true,
    visibility: true,
    _count: { select: { questions: true } },
    ...(studentId
      ? { attempts: { where: { studentId }, select: { id: true, score: true, totalScore: true, finishedAt: true, startedAt: true } } }
      : {}),
  }) satisfies Prisma.TestPackageSelect;

export const videoLiteSelect = {
  id: true,
  title: true,
  url: true,
  description: true,
  duration: true,
  isPublished: true,
  visibility: true,
} satisfies Prisma.VideoSelect;

/** Tələbənin üzv olduğu qruplar */
export async function studentGroupIds(studentId: string) {
  const rows = await prisma.groupMember.findMany({ where: { studentId }, select: { groupId: true } });
  return rows.map((r) => r.groupId);
}

/** Tələbə bu mövzunu görə bilərmi: dərc olunub və onun qruplarından birinə paylaşılıb */
export async function studentCanSeeTopic(topicId: string, studentId: string) {
  const gids = await studentGroupIds(studentId);
  if (!gids.length) return { allowed: false as const, groupIds: gids };
  const t = await prisma.topic.findFirst({
    where: { id: topicId, isPublished: true, groups: { some: { groupId: { in: gids } } } },
    select: { id: true },
  });
  return { allowed: !!t, groupIds: gids };
}

/** Siyahıdakı id-ləri təmizləyir: yalnız sətirlər, təkrarsız, ən çoxu `max` */
export function cleanIds(v: unknown, max = 200): string[] | null {
  if (v === undefined) return null;
  if (!Array.isArray(v)) return [];
  return [...new Set(v.filter((x): x is string => typeof x === "string" && x.length > 0 && x.length < 64))].slice(0, max);
}
