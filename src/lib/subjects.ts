// Müəllimin tədris edə biləcəyi fənlər. Bazada id kimi saxlanılır, ekranda label göstərilir.
export const SUBJECTS = [
  { id: "en", label: "İngilis dili" },
  { id: "fr", label: "Fransız dili" },
  { id: "es", label: "İspan dili" },
  { id: "ru", label: "Rus dili" },
  { id: "de", label: "Alman dili" },
  { id: "math", label: "Riyaziyyat" },
  { id: "it", label: "İnformatika" },
  { id: "az", label: "Azərbaycan dili" },
  { id: "lit", label: "Ədəbiyyat" },
  { id: "geo", label: "Coğrafiya" },
  { id: "phys", label: "Fizika" },
  { id: "chem", label: "Kimya" },
] as const;

export const MAX_SUBJECTS = 2;

const LABELS: Record<string, string> = Object.fromEntries(SUBJECTS.map((s) => [s.id, s.label]));

export const subjectLabel = (id: string) => LABELS[id] ?? id;

/** Gələn dəyəri təmizləyir: yalnız tanınan id-lər, təkrarsız, ən çoxu MAX_SUBJECTS. */
export function cleanSubjects(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return [...new Set(input.filter((x): x is string => typeof x === "string" && x in LABELS))].slice(0, MAX_SUBJECTS);
}
