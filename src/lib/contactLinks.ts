/** Admin panelindən gələn əlaqə məlumatlarını təhlükəsiz keçidlərə çevirir (yalnız http/https, mailto, wa.me). */

const httpUrl = (v: string) => {
  try {
    const u = new URL(v);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
};

export function whatsappLink(v: string) {
  const digits = v.replace(/\D/g, "");
  return digits.length >= 9 && digits.length <= 15 ? `https://wa.me/${digits}` : null;
}

export function instagramLink(v: string) {
  const t = v.trim();
  if (!t) return null;
  if (/^https?:\/\//i.test(t)) return httpUrl(t);
  const h = t.replace(/^@/, "");
  return /^[A-Za-z0-9._]{1,30}$/.test(h) ? `https://instagram.com/${h}` : null;
}

export function youtubeLink(v: string) {
  const t = v.trim();
  if (!t) return null;
  if (/^https?:\/\//i.test(t)) return httpUrl(t);
  const h = t.replace(/^@/, "");
  return /^[A-Za-z0-9._-]{1,40}$/.test(h) ? `https://youtube.com/@${h}` : null;
}

export function emailLink(v: string) {
  const t = v.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t) ? `mailto:${t}` : null;
}
