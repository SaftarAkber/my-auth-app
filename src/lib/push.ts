import webpush from "web-push";
import { after } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Telefon (PWA) bildirişləri. Yalnız saytın özündən gedir (WhatsApp istifadə olunmur).
 * Açarlar: NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (Vercel env).
 * Açar yoxdursa heç nə göndərilmir, sayt adi qaydada işləyir.
 */
export type PushMessage = { title: string; body: string; url: string; tag?: string };

/** Env dəyəri tırnaq və boşluqla kopyalanıbsa təmizlənir ("abc" → abc) */
export const envClean = (v?: string) => (v ?? "").trim().replace(/^["']|["']$/g, "").trim();

/**
 * VAPID açarları: Vercel env-də düzgün açar varsa o, yoxdursa sayt özü bir dəfə yaradıb bazada saxlayır
 * (site_content "push-vapid" — heç bir API bu sətri qaytarmır, yalnız açıq hissə /api/push/key ilə verilir).
 * Belə olanda Vercel-ə açar yazmaq lazım deyil.
 */
type Vapid = { publicKey: string; privateKey: string };
let cached: Vapid | null = null;
const SUBJECT = () => envClean(process.env.VAPID_SUBJECT) || "mailto:admin@eduflow.az";

export async function getVapid(): Promise<Vapid> {
  if (cached) return cached;
  const envPub = envClean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY);
  const envPriv = envClean(process.env.VAPID_PRIVATE_KEY);
  if (envPub && envPriv) {
    try {
      webpush.setVapidDetails(SUBJECT(), envPub, envPriv);
      return (cached = { publicKey: envPub, privateKey: envPriv });
    } catch {
      /* env-dəki açar yanlışdır — bazadakına keçirik */
    }
  }
  const row = await prisma.siteContent.findUnique({ where: { key: "push-vapid" } });
  let keys = row?.data as Vapid | undefined;
  if (!keys?.publicKey || !keys?.privateKey) {
    const fresh = webpush.generateVAPIDKeys();
    // Eyni anda iki server yaratmağa çalışsa, birincisi qalır
    await prisma.siteContent.create({ data: { key: "push-vapid", data: { publicKey: fresh.publicKey, privateKey: fresh.privateKey } } }).catch(() => null);
    keys = (await prisma.siteContent.findUnique({ where: { key: "push-vapid" } }))?.data as Vapid;
  }
  webpush.setVapidDetails(SUBJECT(), keys.publicKey, keys.privateKey);
  return (cached = keys);
}

/** Verilən istifadəçilərin bütün cihazlarına göndərir; köhnəlmiş abunəlikləri silir */
export async function sendPush(userIds: string[], msg: PushMessage) {
  const ids = [...new Set(userIds)].filter(Boolean);
  if (!ids.length) return 0;
  await getVapid();
  const subs = await prisma.pushSubscription.findMany({
    where: { userId: { in: ids }, user: { deletedAt: null } },
    select: { id: true, endpoint: true, p256dh: true, auth: true },
  });
  const payload = JSON.stringify(msg);
  const dead: string[] = [];
  let sent = 0;
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 60 * 60 * 12 });
        sent++;
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) dead.push(s.id);
        else console.error("push xətası:", code, (e as Error).message);
      }
    }),
  );
  if (dead.length) await prisma.pushSubscription.deleteMany({ where: { id: { in: dead } } });
  return sent;
}

/** Müəllimin bütün qruplarının tələbələri */
async function studentsOfTeacher(teacherId: string) {
  const m = await prisma.groupMember.findMany({ where: { group: { teacherId } }, select: { studentId: true } });
  return m.map((x) => x.studentId);
}
async function studentsOfGroups(groupIds: string[]) {
  if (!groupIds.length) return [];
  const m = await prisma.groupMember.findMany({ where: { groupId: { in: groupIds } }, select: { studentId: true } });
  return m.map((x) => x.studentId);
}

/** Dərc olunan məzmunu görə bilən tələbələr (sayt bildirişləri ilə eyni qayda) */
export async function notifyPublished(kind: "topic" | "video" | "testPackage", ids: string[]) {
  for (const id of ids) {
    try {
      if (kind === "topic") {
        const t = await prisma.topic.findUnique({ where: { id }, select: { title: true, teacherId: true, visibility: true, isPublished: true, groups: { select: { groupId: true } } } });
        if (!t?.isPublished) continue;
        const to = t.visibility === "PUBLIC" ? await studentsOfTeacher(t.teacherId) : await studentsOfGroups(t.groups.map((g) => g.groupId));
        await sendPush(to, { title: "Yeni mövzu", body: t.title, url: `/student/topics/${id}`, tag: `topic-${id}` });
      } else if (kind === "video") {
        const v = await prisma.video.findUnique({ where: { id }, select: { title: true, teacherId: true, visibility: true, isPublished: true, videoGroups: { select: { groupId: true } } } });
        if (!v?.isPublished) continue;
        const to = v.visibility === "PUBLIC" ? await studentsOfTeacher(v.teacherId) : await studentsOfGroups(v.videoGroups.map((g) => g.groupId));
        await sendPush(to, { title: "Yeni video dərs", body: v.title, url: `/watch/${id}?play=1`, tag: `video-${id}` });
      } else {
        const p = await prisma.testPackage.findUnique({
          where: { id },
          select: {
            name: true, isPublished: true, isMonthly: true, startsAt: true, visibility: true, groupId: true,
            collection: { select: { teacherId: true } }, group: { select: { teacherId: true } },
            testPackageGroups: { select: { groupId: true } },
          },
        });
        if (!p?.isPublished) continue;
        const groupIds = [...new Set([...p.testPackageGroups.map((g) => g.groupId), ...(p.groupId ? [p.groupId] : [])])];
        const teacherId = p.collection?.teacherId ?? p.group?.teacherId;
        const to = p.visibility === "GROUP_ONLY" || p.isMonthly ? await studentsOfGroups(groupIds) : teacherId ? await studentsOfTeacher(teacherId) : [];
        const when = p.isMonthly && p.startsAt ? ` · ${fmtAz(p.startsAt)}` : "";
        await sendPush(to, {
          title: p.isMonthly ? "Yeni aylıq sınaq" : "Yeni test",
          body: `${p.name}${when}`,
          url: groupIds[0] ? `/student/groups/${groupIds[0]}?tab=tests&pkg=${id}` : "/student/my-tests",
          tag: `test-${id}`,
        });
      }
    } catch (e) {
      console.error("notifyPublished xətası:", kind, id, e);
    }
  }
}

/** "30 noy, 18:00" (Bakı vaxtı) */
export function fmtAz(d: Date) {
  const M = ["yan", "fev", "mar", "apr", "may", "iyn", "iyl", "avq", "sen", "okt", "noy", "dek"];
  const x = new Date(d.getTime() + 4 * 3600 * 1000); // UTC+4
  return `${x.getUTCDate()} ${M[x.getUTCMonth()]}, ${String(x.getUTCHours()).padStart(2, "0")}:${String(x.getUTCMinutes()).padStart(2, "0")}`;
}

/**
 * Cavab göndərildikdən sonra işləsin (istifadəçi gözləməsin). Next.js `after` əlçatmazdırsa, dərhal başladılır.
 */
export function later(task: () => Promise<unknown>) {
  const run = () => task().catch((e) => console.error("arxa fon xətası:", e));
  try {
    after(run);
  } catch {
    void run();
  }
}

/** Müəllim paylaşımı: qrup paylaşımı həmin qrupların, açıq paylaşım müəllimin bütün qruplarının tələbələrinə */
export async function notifyPost(teacherId: string, groupIds: string[], visibility: string, text: string, createdAt: Date) {
  const [to, t, first] = await Promise.all([
    visibility === "PUBLIC" ? studentsOfTeacher(teacherId) : studentsOfGroups(groupIds),
    prisma.user.findUnique({ where: { id: teacherId }, select: { name: true } }),
    prisma.groupPost.findFirst({ where: { teacherId, createdAt, groupId: { in: groupIds } }, select: { id: true } }),
  ]);
  const body = text.length > 120 ? `${text.slice(0, 117)}…` : text;
  await sendPush(to, { title: `${t?.name ?? "Müəllim"} paylaşım etdi`, body, url: first ? `/student?post=${first.id}` : "/student", tag: `post-${first?.id ?? ""}` });
}
