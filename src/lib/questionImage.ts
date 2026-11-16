/** Sual şəkli yalnız bizim Cloudinary-dən gələ bilər (başqa saytlara keçid qəbul olunmur). */
export function cleanQuestionImage(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const url = v.trim();
  if (!url) return null;
  return /^https:\/\/res\.cloudinary\.com\/[\w-]+\/image\/upload\/[^\s"'<>]+$/.test(url) && url.length <= 500 ? url : null;
}
