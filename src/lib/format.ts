export function initials(name?: string | null) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

const dateFmt = new Intl.DateTimeFormat("az-AZ", { day: "2-digit", month: "short", year: "numeric" });
const dateTimeFmt = new Intl.DateTimeFormat("az-AZ", {
  day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
});

export const fmtDate = (d?: string | Date | null) => (d ? dateFmt.format(new Date(d)) : "—");
export const fmtDateTime = (d?: string | Date | null) => (d ? dateTimeFmt.format(new Date(d)) : "—");

export function timeAgo(d: string | Date) {
  const diff = (Date.now() - new Date(d).getTime()) / 1000;
  if (diff < 60) return "indicə";
  if (diff < 3600) return `${Math.floor(diff / 60)} dəq əvvəl`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} saat əvvəl`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} gün əvvəl`;
  return fmtDate(d);
}

/** 125 → "02:05" */
export function fmtClock(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export const minutes = (seconds?: number | null) => (seconds ? Math.round(seconds / 60) : 0);

export function percent(score?: number | null, total?: number | null) {
  if (score == null || !total) return 0;
  return Math.round((score / total) * 100);
}

export function toInputDateTime(d?: string | null) {
  if (!d) return "";
  const date = new Date(d);
  const off = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - off).toISOString().slice(0, 16);
}

const YT = /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/;

export function youtubeId(url: string) {
  return url.match(YT)?.[1] ?? null;
}
export function videoEmbed(url: string) {
  const id = youtubeId(url);
  return id ? `https://www.youtube.com/embed/${id}?autoplay=1&rel=0` : null;
}
export function videoThumb(url: string) {
  const id = youtubeId(url);
  return id ? `https://img.youtube.com/vi/${id}/mqdefault.jpg` : null;
}

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");
