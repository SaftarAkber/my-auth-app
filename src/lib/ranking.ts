/** Reytinq cədvəlləri üçün ortaq köməkçilər (server və brauzer) */

/** "Aysel Məmmədova" → "Aysel M." (cədvəldə yer qənaəti üçün) */
export function shortName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return name.trim();
  return `${parts[0]} ${parts[parts.length - 1].charAt(0).toLocaleUpperCase("az")}.`;
}

export const pct1 = (x: number) => Math.round(x * 10) / 10;

type Ranked = { rank: number | null };

/**
 * Sıralayır və yer verir: `played` olmayanlar (hələ işləməyənlər) sonda, əlifba sırası ilə, yersiz.
 * Bütün meyarlar bərabərdirsə eyni yer verilir.
 */
export function rankRows<T>(
  rows: T[],
  played: (r: T) => boolean,
  keys: ((r: T) => number)[],
  name: (r: T) => string,
): (T & Ranked)[] {
  const cmp = (a: T, b: T) => {
    for (const k of keys) {
      const d = k(b) - k(a);
      if (d) return d;
    }
    return 0;
  };
  const on = rows.filter(played).sort((a, b) => cmp(a, b) || name(a).localeCompare(name(b), "az"));
  const off = rows.filter((r) => !played(r)).sort((a, b) => name(a).localeCompare(name(b), "az"));
  const out: (T & Ranked)[] = [];
  on.forEach((r, i) => {
    const prev = out[i - 1];
    const rank = i > 0 && cmp(on[i - 1], r) === 0 && prev ? prev.rank : i + 1;
    out.push({ ...r, rank });
  });
  for (const r of off) out.push({ ...r, rank: null });
  return out;
}
