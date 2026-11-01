import { prisma } from "@/lib/prisma";
import { videoThumb } from "@/lib/format";

export interface LandingTeacher {
  id: string;
  name: string;
  photo: string | null;
  subjects: string[];
}

export interface LandingVideo {
  id: string;
  title: string;
  thumb: string | null;
  duration: number | null;
  teacher: string;
}

export interface LandingData {
  teachers: LandingTeacher[];
  videos: LandingVideo[];
}

export const EMPTY_LANDING: LandingData = { teachers: [], videos: [] };

/**
 * Giriş etməmiş ziyarətçilərə göstərilən vitrin: yalnız ad, şəkil, fənn və hamıya açıq videoların başlığı.
 * Kartlara klik /u və /watch-a aparır; orada giriş tələb olunduğu üçün istifadəçi login səhifəsinə yönlənir.
 */
export async function getLandingData(): Promise<LandingData> {
  try {
    const [teachers, videos] = await Promise.all([
      prisma.user.findMany({
        where: { role: "TEACHER" },
        select: { id: true, name: true, photo: true, subjects: true },
        orderBy: { createdAt: "desc" },
        take: 40,
      }),
      prisma.video.findMany({
        where: { isActive: true, isPublished: true, visibility: "PUBLIC" },
        select: { id: true, title: true, url: true, duration: true, teacher: { select: { name: true } } },
        orderBy: [{ pinOrder: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }],
        take: 8,
      }),
    ]);

    // Şəkli və fənni olan müəllimlər önə çıxır
    const rank = (t: { photo: string | null; subjects: string[] }) => (t.photo ? 2 : 0) + (t.subjects.length ? 1 : 0);
    const picked = [...teachers].sort((a, b) => rank(b) - rank(a)).slice(0, 8);

    return {
      teachers: picked,
      videos: videos.map((v) => ({
        id: v.id,
        title: v.title,
        thumb: videoThumb(v.url),
        duration: v.duration,
        teacher: v.teacher.name,
      })),
    };
  } catch {
    // Baza əlçatmazdırsa vitrin boş göstərilir, səhifə yenə açılır
    return EMPTY_LANDING;
  }
}
