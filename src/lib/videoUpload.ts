import cloudinary from "@/lib/cloudinary";
import { prisma } from "@/lib/prisma";

/** Müəllimin yüklədiyi videolar: brauzer faylı birbaşa Cloudinary-yə göndərir (Vercel-in 4,5 MB sorğu limiti keçilmir),
 *  server yalnız imza verir və yüklənəndən sonra faylı yoxlayır. */

// Hədlər mühit dəyişənləri ilə dəyişdirilir (hosting böyüyəndə artırın)
export const VIDEO_MAX_MB = Number(process.env.VIDEO_MAX_MB) || 100;
export const VIDEO_QUOTA_MB = Number(process.env.VIDEO_TEACHER_QUOTA_MB) || 3072;
export const VIDEO_MAX_MINUTES = Number(process.env.VIDEO_MAX_MINUTES) || 60;

export const VIDEO_FORMATS = ["mp4", "mov", "m4v", "webm", "3gp", "mkv", "avi"];
// Hər cihazda oynayan MP4 (H.264 + AAC) — iPhone-un HEVC .MOV faylları da buna çevrilir
export const EAGER = "f_mp4,vc_h264,ac_aac,q_auto";

export const folderFor = (teacherId: string) => `eduflow/videos/${teacherId}`;

export function cloudName() {
  return process.env.CLOUDINARY_CLOUD_NAME ?? "";
}

/** Brauzerin birbaşa yükləməsi üçün imzalanmış parametrlər (1 saat qüvvədədir) */
export function signVideoUpload(teacherId: string) {
  const params = {
    allowed_formats: VIDEO_FORMATS.join(","),
    eager: EAGER,
    eager_async: "true",
    folder: folderFor(teacherId),
    timestamp: Math.floor(Date.now() / 1000),
  };
  const signature = cloudinary.utils.api_sign_request(params, process.env.CLOUDINARY_API_SECRET ?? "");
  return {
    ...params,
    signature,
    apiKey: process.env.CLOUDINARY_API_KEY ?? "",
    uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName()}/video/upload`,
  };
}

export const deliveryUrl = (version: number | string, publicId: string) =>
  `https://res.cloudinary.com/${cloudName()}/video/upload/${EAGER}/v${version}/${publicId}.mp4`;

/** Müəllimin yüklədiyi videoların cəmi ölçüsü (bayt) */
export async function usedBytes(teacherId: string) {
  const r = await prisma.video.aggregate({ where: { teacherId, publicId: { not: null } }, _sum: { bytes: true } });
  return r._sum.bytes ?? 0;
}

export class UploadRejected extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

/** Yüklənmiş faylı Cloudinary-dən təsdiqləyir (client-in dediyinə inanmırıq): sahibi, növü, ölçüsü, müddəti, yer limiti */
export async function verifyUploadedVideo(teacherId: string, publicId: string) {
  if (typeof publicId !== "string" || !publicId.startsWith(`${folderFor(teacherId)}/`)) {
    throw new UploadRejected("Bu fayl sizə aid deyil", 403);
  }
  let r: { bytes: number; duration?: number; version: number; format?: string };
  try {
    r = await cloudinary.api.resource(publicId, { resource_type: "video" });
  } catch {
    throw new UploadRejected("Yüklənmiş video tapılmadı, yenidən cəhd edin", 404);
  }
  const reject = async (msg: string, status = 413) => {
    await destroyVideo(publicId);
    throw new UploadRejected(msg, status);
  };
  if (r.bytes > VIDEO_MAX_MB * 1024 * 1024) return reject(`Video ${VIDEO_MAX_MB} MB-dan böyük ola bilməz`);
  const seconds = Math.round(r.duration ?? 0);
  if (seconds > VIDEO_MAX_MINUTES * 60) return reject(`Video ${VIDEO_MAX_MINUTES} dəqiqədən uzun ola bilməz`);
  if ((await usedBytes(teacherId)) + r.bytes > VIDEO_QUOTA_MB * 1024 * 1024) {
    return reject(`Yer limitiniz (${VIDEO_QUOTA_MB} MB) dolub. Köhnə videoları silin`);
  }
  return { url: deliveryUrl(r.version, publicId), publicId, bytes: r.bytes, duration: seconds };
}

/** Cloudinary-dən faylı silir (xəta olsa da əsas əməliyyatı pozmur) */
export async function destroyVideo(publicId: string | null | undefined) {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: "video", invalidate: true });
  } catch (e) {
    console.error("Cloudinary silmə xətası:", e);
  }
}

/** Yüklənmiş video emal olunub və oynamağa hazırdırmı? (eager çevirmə bitənə qədər 423 qaytarır) */
export async function isVideoReady(url: string) {
  try {
    const res = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(4000) });
    return res.ok;
  } catch {
    return false;
  }
}
