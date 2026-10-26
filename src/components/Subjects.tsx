"use client";

import { cx } from "@/lib/format";
import { Icon } from "@/components/ui";
import { MAX_SUBJECTS, SUBJECTS, subjectLabel } from "@/lib/subjects";

/** Fənn seçimi: ən çoxu MAX_SUBJECTS (2). Limitə çatanda qalanlar söndürülür. */
export function SubjectPicker({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const full = value.length >= MAX_SUBJECTS;
  return (
    <div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Tədris etdiyiniz fənlər">
        {SUBJECTS.map((s) => {
          const on = value.includes(s.id);
          const disabled = !on && full;
          return (
            <button
              type="button"
              key={s.id}
              disabled={disabled}
              aria-pressed={on}
              onClick={() => onChange(on ? value.filter((v) => v !== s.id) : [...value, s.id])}
              className={cx(
                "inline-flex items-center gap-1.5 rounded-full border-[2.5px] border-ink px-3 py-1.5 text-sm font-semibold transition",
                on ? "bg-sun" : "bg-white hover:bg-sun/30",
                disabled && "cursor-not-allowed opacity-40 hover:bg-white",
              )}
            >
              {on && <Icon name="check" size={14} />} {s.label}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-muted">
        Ən çoxu {MAX_SUBJECTS} fənn seçə bilərsiniz ({value.length}/{MAX_SUBJECTS}).
      </p>
    </div>
  );
}

/** Müəllimin fənləri: adın yanında kiçik nişanlar. */
export function SubjectBadges({ subjects, className }: { subjects?: string[] | null; className?: string }) {
  if (!subjects?.length) return null;
  return (
    <>
      {subjects.slice(0, MAX_SUBJECTS).map((s) => (
        <span key={s} className={cx("badge-brand whitespace-nowrap", className)}>{subjectLabel(s)}</span>
      ))}
    </>
  );
}
