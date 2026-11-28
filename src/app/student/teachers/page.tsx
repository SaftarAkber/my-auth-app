"use client";

import { useEffect, useRef, useState } from "react";
import { useFetch } from "@/lib/api";
import { cx } from "@/lib/format";
import { MAX_SUBJECTS, SUBJECTS, subjectLabel } from "@/lib/subjects";
import { Empty, ErrorBox, Icon, PageHeader, type IconName } from "@/components/ui";
import { CardSkeleton, TeacherCard, type TeacherCardData } from "@/components/ProfileCards";

/** Filtr hap düyməsi; basanda altında kiçik pəncərə açılır */
function FilterPill({
  icon, label, active, open, onToggle, onClose, children,
}: {
  icon: IconName; label: string; active: boolean; open: boolean; onToggle: () => void; onClose: () => void; children?: React.ReactNode;
}) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const click = (e: PointerEvent) => { if (box.current && !box.current.contains(e.target as Node)) onClose(); };
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("pointerdown", click);
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("pointerdown", click); document.removeEventListener("keydown", key); };
  }, [open, onClose]);
  return (
    <div ref={box} className="relative">
      <button type="button" onClick={onToggle} aria-expanded={children ? open : undefined} aria-pressed={children ? undefined : active} className={cx("fpill", active && "on")}>
        <Icon name={icon} size={15} />
        <span className="max-w-[180px] truncate">{label}</span>
        {children && <Icon name="down" size={14} className={cx("transition-transform", open && "rotate-180")} />}
      </button>
      {open && children && <div className="fpop animate-slide-in">{children}</div>}
    </div>
  );
}

function Option({ on, onClick, disabled, children, radio }: { on: boolean; onClick: () => void; disabled?: boolean; children: React.ReactNode; radio?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={cx("fopt", disabled && "cursor-not-allowed opacity-40")}>
      <span className={cx("grid h-4 w-4 shrink-0 place-items-center border text-white", radio ? "rounded-full" : "rounded", on ? "border-brand bg-brand" : "border-line-strong")}>
        {on && (radio ? <span className="h-1.5 w-1.5 rounded-full bg-white" /> : <Icon name="check" size={11} stroke={3} />)}
      </span>
      {children}
    </button>
  );
}

const STUDENT_OPTS = [10, 50, 100];
const EXP_OPTS = [1, 3, 5, 10];

/** Tələbə: bütün müəllimlər, filtrlərlə (fənn ≤ 2, tələbə sayı, təcrübə, canlı dərs) */
export default function TeachersPage() {
  const [subjects, setSubjects] = useState<string[]>([]);
  const [minStudents, setMinStudents] = useState(0);
  const [minExp, setMinExp] = useState(0);
  const [live, setLive] = useState(false);
  const [open, setOpen] = useState<"subj" | "stud" | "exp" | null>(null);
  const close = () => setOpen(null);

  const qs = new URLSearchParams();
  if (subjects.length) qs.set("subjects", subjects.join(","));
  if (minStudents) qs.set("minStudents", String(minStudents));
  if (minExp) qs.set("minExp", String(minExp));
  if (live) qs.set("live", "1");
  const { data, loading, error, reload } = useFetch<{ teachers: TeacherCardData[] }>(`/api/teacher/public?${qs}`);
  const any = subjects.length > 0 || minStudents > 0 || minExp > 0 || live;
  const list = data?.teachers ?? [];

  return (
    <div className="page">
      <PageHeader title="Müəllimlər" subtitle="Fənnə, təcrübəyə və dərs formasına görə müəllim seçin" back="/student" />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <FilterPill
          icon="book"
          label={subjects.length ? `Fənn: ${subjects.map(subjectLabel).join(", ")}` : "Fənn"}
          active={subjects.length > 0}
          open={open === "subj"}
          onToggle={() => setOpen(open === "subj" ? null : "subj")}
          onClose={close}
        >
          <div className="max-h-64 overflow-y-auto">
            {SUBJECTS.map((s) => {
              const on = subjects.includes(s.id);
              return (
                <Option key={s.id} on={on} disabled={!on && subjects.length >= MAX_SUBJECTS} onClick={() => setSubjects(on ? subjects.filter((x) => x !== s.id) : [...subjects, s.id])}>
                  {s.label}
                </Option>
              );
            })}
          </div>
          <p className="border-t border-line px-2.5 pb-1 pt-2 text-[11px] font-bold text-muted">{subjects.length}/{MAX_SUBJECTS} seçilib</p>
        </FilterPill>

        <FilterPill
          icon="grad"
          label={minStudents ? `${minStudents}+ tələbə` : "Tələbə sayı"}
          active={minStudents > 0}
          open={open === "stud"}
          onToggle={() => setOpen(open === "stud" ? null : "stud")}
          onClose={close}
        >
          <Option radio on={minStudents === 0} onClick={() => { setMinStudents(0); close(); }}>Hamısı</Option>
          {STUDENT_OPTS.map((n) => <Option radio key={n} on={minStudents === n} onClick={() => { setMinStudents(n); close(); }}>{n}+ tələbə</Option>)}
        </FilterPill>

        <FilterPill
          icon="briefcase"
          label={minExp ? `${minExp}+ il təcrübə` : "Təcrübə"}
          active={minExp > 0}
          open={open === "exp"}
          onToggle={() => setOpen(open === "exp" ? null : "exp")}
          onClose={close}
        >
          <Option radio on={minExp === 0} onClick={() => { setMinExp(0); close(); }}>Hamısı</Option>
          {EXP_OPTS.map((n) => <Option radio key={n} on={minExp === n} onClick={() => { setMinExp(n); close(); }}>{n}+ il</Option>)}
        </FilterPill>

        <FilterPill icon="live" label="Canlı dərs" active={live} open={false} onToggle={() => setLive(!live)} onClose={close} />

        {any && (
          <button type="button" className="fpill border-dashed" onClick={() => { setSubjects([]); setMinStudents(0); setMinExp(0); setLive(false); }}>
            <Icon name="x" size={14} /> Təmizlə
          </button>
        )}
      </div>

      {loading && !data ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => <CardSkeleton key={i} />)}
        </div>
      ) : error ? (
        <ErrorBox message={error} onRetry={reload} />
      ) : list.length === 0 ? (
        <Empty
          icon="grad"
          title={any ? "Bu filtrlərə uyğun müəllim yoxdur" : "Hələ müəllim yoxdur"}
          text={any ? "Filtrlərdən birini dəyişin və ya təmizləyin." : undefined}
          action={any ? <button className="btn-primary" onClick={() => { setSubjects([]); setMinStudents(0); setMinExp(0); setLive(false); }}>Filtrləri təmizlə</button> : undefined}
        />
      ) : (
        <div className={cx("grid gap-5 sm:grid-cols-2 lg:grid-cols-3", loading && "opacity-60 transition-opacity")}>
          {list.map((t) => <TeacherCard key={t.id} t={t} />)}
        </div>
      )}
    </div>
  );
}
