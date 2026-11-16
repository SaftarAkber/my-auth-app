/** Böyük şəkli brauzerdə kiçildir (uzun tərəf `max` px). Kiçik şəkillərə (sxem, qraf) toxunmur ki, xətlər bulanmasın. */
export async function shrinkImage(file: File, { max = 1800, minBytes = 0, type = "image/jpeg" } = {}): Promise<File> {
  if (file.size <= minBytes) return file;
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * scale);
  c.height = Math.round(bmp.height * scale);
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("Şəkil işlənmədi");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(bmp, 0, 0, c.width, c.height);
  const blob = await new Promise<Blob | null>((r) => c.toBlob(r, type, 0.85));
  if (!blob) throw new Error("Şəkil işlənmədi");
  return new File([blob], type === "image/png" ? "image.png" : "image.jpg", { type });
}
