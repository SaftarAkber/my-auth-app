/** Sual şəkli yalnız bizim Cloudinary-dən gələ bilər (başqa saytlara keçid qəbul olunmur). */
export function cleanQuestionImage(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const url = v.trim();
  if (!url) return null;
  return /^https:\/\/res\.cloudinary\.com\/[\w-]+\/image\/upload\/[^\s"'<>]+$/.test(url) && url.length <= 500 ? url : null;
}

/** Sualın çətinliyi: EASY / MEDIUM / HARD və ya null (qeyd olunmayıb) */
export function cleanDifficulty(v: unknown): "EASY" | "MEDIUM" | "HARD" | null {
  return v === "EASY" || v === "MEDIUM" || v === "HARD" ? v : null;
}
