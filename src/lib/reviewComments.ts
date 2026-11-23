import { prisma } from "@/lib/prisma";
import { teacherOwnsTestPackage } from "@/lib/guards";
import { youtubeId } from "@/lib/format";

/** Müəllim şərhlərinin ortaq köməkçiləri (cavab kitabçası) */

export const MAX_IMAGES = 10;
export const MAX_TEXT = 2000;

type Viewer = { id: string; role: string };

/** Cəhd + baxanın rolu: müəllim (paketin sahibi və ya admin) / tələbənin özü */
export async function attemptAccess(user: Viewer, attemptId: string) {
  const attempt = await prisma.studentAttempt.findUnique({
    where: { id: attemptId },
    select: {
      id: true, studentId: true, packageId: true, finishedAt: true, questionIds: true,
      package: { select: { name: true, allowRetry: true, group: { select: { teacherId: true } } } },
    },
  });
  if (!attempt) return null;
  const teacher =
    user.role === "ADMIN" ||
    (user.role === "TEACHER" && (attempt.package.group?.teacherId === user.id || (await teacherOwnsTestPackage(user.id, attempt.packageId))));
  return { attempt, teacher, owner: attempt.studentId === user.id };
}

/** Bu cəhddə səhv və ya cavabsız qalan suallar ("hamıya" şərhləri yalnız bunlarda görünür) */
export async function wrongQuestionIds(attempt: { id: string; packageId: string; finishedAt: Date | null; questionIds: string[]; package: { allowRetry: boolean } }) {
  const answers = await prisma.studentAnswer.findMany({ where: { attemptId: attempt.id }, select: { questionId: true, isCorrect: true, status: true } });
  const wrong = new Set(answers.filter((a) => a.status !== "PENDING" && !a.isCorrect).map((a) => a.questionId));
  if (attempt.finishedAt) {
    const answered = new Set(answers.map((a) => a.questionId));
    const all = attempt.questionIds.length
      ? attempt.questionIds
      : attempt.package.allowRetry
        ? []
        : (await prisma.question.findMany({ where: { packageId: attempt.packageId, isActive: true }, select: { id: true } })).map((q) => q.id);
    for (const q of all) if (!answered.has(q)) wrong.add(q);
  }
  return wrong;
}

export const COMMENT_SELECT = {
  id: true, attemptId: true, questionId: true, teacherId: true, scope: true, text: true, images: true,
  youtubeUrl: true, sentAt: true, createdAt: true, updatedAt: true,
  video: { select: { id: true, title: true, url: true } },
  teacher: { select: { id: true, name: true, photo: true } },
} as const;

/** Gələn məlumatı təmizləyir; səhv varsa { error } */
export async function cleanCommentInput(b: Record<string, unknown>, teacherId: string) {
  const text = typeof b.text === "string" ? b.text.replace(/\r/g, "").trim().slice(0, MAX_TEXT) : "";
  const images = Array.isArray(b.images)
    ? b.images.filter((u): u is string => typeof u === "string" && /^https:\/\/res\.cloudinary\.com\//.test(u)).slice(0, MAX_IMAGES)
    : [];
  if (Array.isArray(b.images) && b.images.length > MAX_IMAGES) return { error: `Ən çox ${MAX_IMAGES} şəkil əlavə etmək olar` };
  let youtubeUrl: string | null = null;
  if (typeof b.youtubeUrl === "string" && b.youtubeUrl.trim()) {
    const id = youtubeId(b.youtubeUrl.trim());
    if (!id) return { error: "YouTube linki tanınmadı" };
    youtubeUrl = `https://www.youtube.com/watch?v=${id}`;
  }
  let videoId: string | null = null;
  if (typeof b.videoId === "string" && b.videoId) {
    const v = await prisma.video.findFirst({ where: { id: b.videoId, teacherId }, select: { id: true } });
    if (!v) return { error: "Video tapılmadı" };
    videoId = v.id;
  }
  if (!text && !images.length && !youtubeUrl && !videoId) return { error: "Şərh boşdur" };
  const scope = b.scope === "WRONG_ALL" ? ("WRONG_ALL" as const) : ("ATTEMPT" as const);
  return { data: { text, images, youtubeUrl, videoId, scope } };
}
