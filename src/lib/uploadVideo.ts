import { ApiError, api } from "@/lib/api";

// Cloudinary hissə-hissə yükləmədə hər hissə (sonuncudan başqa) ən azı 5 MB olmalıdır
export const CHUNK_BYTES = 6 * 1024 * 1024;
const RETRIES = 3;

/** Faylı hissələrə bölür: [başlanğıc, son) aralıqları */
export function planChunks(size: number, chunk = CHUNK_BYTES): [number, number][] {
  const out: [number, number][] = [];
  for (let start = 0; start < size; start += chunk) out.push([start, Math.min(size, start + chunk)]);
  return out.length ? out : [[0, 0]];
}

interface Sign {
  allowed_formats: string;
  eager: string;
  eager_async: string;
  folder: string;
  timestamp: number;
  signature: string;
  apiKey: string;
  uploadUrl: string;
}

function sendChunk(
  sign: Sign, file: File, range: [number, number], uploadId: string,
  onBytes: (loaded: number) => void, signal: AbortSignal,
): Promise<{ public_id?: string }> {
  return new Promise((resolve, reject) => {
    const [start, end] = range;
    const xhr = new XMLHttpRequest();
    xhr.open("POST", sign.uploadUrl);
    xhr.setRequestHeader("X-Unique-Upload-Id", uploadId);
    xhr.setRequestHeader("Content-Range", `bytes ${start}-${Math.max(start, end - 1)}/${file.size}`);
    xhr.upload.onprogress = (e) => e.lengthComputable && onBytes(e.loaded);
    xhr.onload = () => {
      let body: { public_id?: string; error?: { message?: string } } = {};
      try { body = JSON.parse(xhr.responseText); } catch { /* boş cavab */ }
      if (xhr.status >= 200 && xhr.status < 300) resolve(body);
      else reject(new ApiError(body.error?.message ?? "Yükləmə xətası", xhr.status));
    };
    xhr.onerror = () => reject(new ApiError("Şəbəkə kəsildi", 0));
    xhr.onabort = () => reject(new ApiError("Yükləmə ləğv edildi", -1));
    signal.addEventListener("abort", () => xhr.abort(), { once: true });

    const fd = new FormData();
    fd.append("file", file.slice(start, end), file.name);
    fd.append("api_key", sign.apiKey);
    fd.append("timestamp", String(sign.timestamp));
    fd.append("signature", sign.signature);
    fd.append("folder", sign.folder);
    fd.append("eager", sign.eager);
    fd.append("eager_async", sign.eager_async);
    fd.append("allowed_formats", sign.allowed_formats);
    xhr.send(fd);
  });
}

/**
 * Videonu birbaşa Cloudinary-yə yükləyir (Vercel-dən keçmir). Hissə-hissə göndərir, kəsilən hissəni təkrar cəhd edir.
 * Qaytarır: yüklənmiş faylın publicId-si (serverdə təsdiqlənib videoya bağlanır).
 */
export async function uploadVideo(
  file: File,
  onProgress: (fraction: number) => void,
  signal: AbortSignal,
): Promise<string> {
  const { sign } = await api<{ sign: Sign }>("/api/videos/upload-sign", { body: { size: file.size, name: file.name } });

  // Yükləmə zamanı telefonun ekranı yatmasın (dəstəklənən cihazlarda)
  let lock: { release: () => Promise<void> } | null = null;
  try {
    const wl = (navigator as unknown as { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } }).wakeLock;
    lock = (await wl?.request("screen")) ?? null;
  } catch { /* vacib deyil */ }

  const uploadId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const chunks = planChunks(file.size);
  let done = 0;
  let publicId = "";
  try {
    for (const range of chunks) {
      let attempt = 0;
      for (;;) {
        try {
          const body = await sendChunk(sign, file, range, uploadId, (loaded) => onProgress(Math.min(1, (done + loaded) / file.size)), signal);
          if (body.public_id) publicId = body.public_id;
          break;
        } catch (e) {
          // ləğv və ya server rədd etmə (4xx) təkrar cəhd olunmur, şəbəkə xətası olunur
          const status = e instanceof ApiError ? e.status : 0;
          if (signal.aborted || (status >= 400 && status < 500) || ++attempt >= RETRIES) throw e;
          await new Promise((r) => setTimeout(r, 1500 * attempt));
        }
      }
      done += range[1] - range[0];
      onProgress(done / file.size);
    }
  } finally {
    void lock?.release().catch(() => {});
  }
  if (!publicId) throw new ApiError("Yükləmə tamamlanmadı, yenidən cəhd edin", 0);
  return publicId;
}
