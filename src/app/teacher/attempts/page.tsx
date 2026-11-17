"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { api, errMsg, useFetch } from "@/lib/api";
import { cx, fmtDateTime, percent } from "@/lib/format";
import { Avatar, Empty, ErrorBox, Icon, Modal, PageHeader, SkeletonList, Spinner, Tabs, useToast } from "@/components/ui";
import { SubNav, TESTS_NAV } from "@/components/SubNav";
import GiftModal from "@/components/GiftModal";
import QuestionImage from "@/components/QuestionImage";

interface Answer {
  id: string;
  answer: string;
  isCorrect: boolean | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  teacherComment: string | null;
  question: { text: string; type: "MULTIPLE_CHOICE" | "OPEN_ENDED"; options: string[] | null; correctAnswer: string | null; imageUrl?: string | null };
}
interface Attempt {
  id: string;
  score: number | null;
  totalScore: number | null;
  startedAt: string;
  finishedAt: string | null;
  rewardGranted: boolean;
  rewardCoins: number;
  student: { id: string; name: string; photo: string | null };
  package: {
    id: string; name: string; collection: { name: string } | null; group: { name: string } | null;
    rewardEnabled: boolean; rewardMinCorrect: number | null; rewardCoins: number | null; rewardAuto: boolean;
  };
  answers: Answer[];
}

/** Yoxlanmalı açıq cavabı olan cəhdlər: qiymətləndirmə və coin */
function ReviewList({ onChanged }: { onChanged: () => void }) {
  const toast = useToast();
  const { data, loading, error, reload: reloadList } = useFetch<{ attempts: Attempt[] }>("/api/teacher/attempts?pending=1");
  const reload = () => { reloadList(); onChanged(); };
  const tab = "review" as "all" | "review";
  const [pkgId, setPkgId] = useState("");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [giftFor, setGiftFor] = useState<Attempt | null>(null);

  const [grading, setGrading] = useState<Answer | null>(null);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  const all = useMemo(() => data?.attempts ?? [], [data]);
  const needsReview = (a: Attempt) => a.answers.some((x) => x.status === "PENDING");
  // Coin qaydası ödənib, amma hələ mükafat verilməyib (açıq cavablar yoxlanıbsa)
  const eligible = (a: Attempt) =>
    a.package.rewardEnabled && a.package.rewardMinCorrect != null && (a.score ?? 0) >= a.package.rewardMinCorrect && !a.rewardGranted && !needsReview(a);

  const packages = useMemo(() => {
    const m = new Map<string, string>();
    all.forEach((a) => m.set(a.package.id, a.package.name));
    return [...m.entries()];
  }, [all]);

  const list = all.filter(
    (a) =>
      (tab === "all" || needsReview(a)) &&
      (!pkgId || a.package.id === pkgId) &&
      (!q.trim() || a.student.name.toLowerCase().includes(q.trim().toLowerCase())),
  );

  async function grade(status: "APPROVED" | "REJECTED") {
    if (!grading) return;
    setBusy(true);
    try {
      await api(`/api/answers/${grading.id}`, { method: "PATCH", body: { status, teacherComment: comment.trim() || undefined } });
      toast.success(status === "APPROVED" ? "Düzgün sayıldı" : "Yanlış sayıldı");
      setGrading(null);
      reload();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap gap-3">
        <div className="relative min-w-60 flex-1 sm:max-w-sm">
          <Icon name="search" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" size={17} />
          <input className="input pl-10" placeholder="Tələbə axtar…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="input !w-auto min-w-0 max-w-full" value={pkgId} onChange={(e) => setPkgId(e.target.value)}>
          <option value="">Bütün testlər</option>
          {packages.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
        </select>
      </div>

      {loading ? (
        <SkeletonList />
      ) : error ? (
        <ErrorBox message={error} onRetry={reload} />
      ) : list.length === 0 ? (
        <Empty icon="chart" title={tab === "review" ? "Yoxlanacaq cavab yoxdur" : "Nəticə tapılmadı"} />
      ) : (
        <div className="space-y-3">
          {list.map((a) => {
            const p = percent(a.score, a.totalScore);
            const pend = a.answers.filter((x) => x.status === "PENDING").length;
            const isOpen = open === a.id;
            return (
              <article key={a.id} className="card overflow-hidden">
                <button className="flex w-full items-start gap-3 p-4 text-left sm:items-center" onClick={() => setOpen(isOpen ? null : a.id)}>
                  <Avatar src={a.student.photo} name={a.student.name} size={42} />
                  <div className="min-w-0 flex-1">
                    <p className="break-words font-bold [overflow-wrap:anywhere]">{a.student.name}</p>
                    <p className="break-words text-xs text-muted [overflow-wrap:anywhere]">{a.package.name} · {fmtDateTime(a.finishedAt)}</p>
                    {(pend > 0 || a.rewardGranted || eligible(a)) && (
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {pend > 0 && <span className="badge-warn">{pend} yoxlanmamış</span>}
                        {a.rewardGranted && <span className="badge-ok"><Icon name="coin" size={12} /> +{a.rewardCoins}</span>}
                        {eligible(a) && <span className="badge-warn"><Icon name="coin" size={12} /> Mükafat gözləyir</span>}
                      </div>
                    )}
                  </div>
                  <span className="hidden shrink-0 text-sm text-muted sm:inline">{a.score}/{a.totalScore}</span>
                  <span className={cx("badge shrink-0", p >= 70 ? "bg-ok/10 text-ok" : p >= 40 ? "bg-warn/10 text-warn" : "bg-bad/10 text-bad")}>{p}%</span>
                  <Icon name="down" className={cx("shrink-0 text-muted transition", isOpen && "rotate-180")} />
                </button>

                {isOpen && (
                  <div className="space-y-3 border-t border-line bg-surface-2/50 p-4">
                    {eligible(a) && (
                      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-tint p-3.5">
                        <p className="text-sm font-semibold">
                          Qayda ödənib: {a.package.rewardMinCorrect}+ düz cavab = {a.package.rewardCoins} coin
                        </p>
                        <button className="btn-primary btn-sm" onClick={() => setGiftFor(a)}><Icon name="coin" size={14} /> Coin ver</button>
                      </div>
                    )}
                    {a.answers.length === 0 && <p className="text-sm text-muted">Cavab qeyd olunmayıb.</p>}
                    {a.answers.map((r, i) => (
                      <div key={r.id} className="rounded-xl border border-line bg-surface p-4">
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <span className="text-xs font-bold uppercase text-muted">Sual {i + 1} · {r.question.type === "MULTIPLE_CHOICE" ? "Seçimli" : "Açıq"}</span>
                          {r.status === "PENDING" ? <span className="badge-warn">Yoxlanmalı</span> : r.isCorrect ? <span className="badge-ok">Düzgün</span> : <span className="badge-bad">Yanlış</span>}
                        </div>
                        <p className="whitespace-pre-wrap break-words text-sm font-semibold">{r.question.text}</p>
                        <QuestionImage src={r.question.imageUrl} />
                        <p className="mt-2 break-words text-sm"><span className="text-muted">Cavab:</span> <span className="whitespace-pre-wrap">{r.answer}</span></p>
                        {r.question.type === "MULTIPLE_CHOICE" && !r.isCorrect && (
                          <p className="mt-1 text-sm"><span className="text-muted">Düzgün cavab:</span> <span className="font-semibold text-ok">{r.question.correctAnswer}</span></p>
                        )}
                        {r.teacherComment && <p className="mt-2 rounded-lg bg-brand/5 p-2.5 text-sm"><span className="font-semibold text-brand">Şərhiniz:</span> {r.teacherComment}</p>}
                        {r.question.type === "OPEN_ENDED" && (
                          <button className="btn-soft btn-sm mt-3" onClick={() => { setGrading(r); setComment(r.teacherComment ?? ""); }}>
                            <Icon name="edit" size={14} /> {r.status === "PENDING" ? "Qiymətləndir" : "Yenidən qiymətləndir"}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      <GiftModal
        open={!!giftFor}
        onClose={() => setGiftFor(null)}
        onDone={reload}
        studentId={giftFor?.student.id}
        studentName={giftFor?.student.name}
        attemptId={giftFor?.id}
        defaultAmount={giftFor?.package.rewardCoins ?? 10}
        defaultReason={giftFor ? `${giftFor.package.name}, ${giftFor.score}/${giftFor.totalScore}` : ""}
      />

      <Modal
        open={!!grading}
        onClose={() => setGrading(null)}
        title="Açıq sualı qiymətləndir"
        footer={
          <>
            <button className="btn-danger" onClick={() => grade("REJECTED")} disabled={busy}>{busy ? <Spinner /> : <><Icon name="x" size={15} /> Yanlış</>}</button>
            <button className="btn-primary" onClick={() => grade("APPROVED")} disabled={busy}>{busy ? <Spinner /> : <><Icon name="check" size={15} /> Düzgün</>}</button>
          </>
        }
      >
        {grading && (
          <div className="space-y-4">
            <div>
              <p className="label">Sual</p>
              <p className="whitespace-pre-wrap break-words font-semibold">{grading.question.text}</p>
              <QuestionImage src={grading.question.imageUrl} />
            </div>
            <div className="rounded-xl bg-surface-2 p-3.5">
              <p className="label">Tələbənin cavabı</p>
              <p className="whitespace-pre-wrap break-words text-sm">{grading.answer}</p>
            </div>
            <label className="block">
              <span className="label">Şərh (istəyə bağlı)</span>
              <textarea className="input min-h-20" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Tələbəyə geri bildirim…" />
            </label>
          </div>
        )}
      </Modal>
    </div>
  );
}

/* ───────── Testlər → tələbələr → cəhdlər ───────── */

interface PkgSummary {
  id: string; name: string; isBank: boolean; isMonthly: boolean; collection: { name: string } | null;
  students: number; attempts: number; lastAt: string | null; pending: number;
}
interface StudentAttemptLite {
  id: string; score: number | null; totalScore: number | null; startedAt: string; finishedAt: string | null;
  rewardGranted: boolean; rewardCoins: number; pending: number; first: boolean;
}
interface PkgResults {
  package: { id: string; name: string; isBank: boolean; isMonthly: boolean; rewardEnabled: boolean; rewardMinCorrect: number | null; rewardCoins: number | null; rewardAuto: boolean };
  students: { student: { id: string; name: string; photo: string | null }; attempts: StudentAttemptLite[] }[];
}

const pctTone = (p: number) => (p >= 70 ? "bg-ok/10 text-ok" : p >= 40 ? "bg-warn/10 text-warn" : "bg-bad/10 text-bad");

export default function TeacherAttemptsPage() {
  return (
    <Suspense fallback={<div className="page"><SkeletonList /></div>}>
      <AttemptsInner />
    </Suspense>
  );
}

function AttemptsInner() {
  const router = useRouter();
  const search = useSearchParams();
  const pkgId = search.get("p");
  const [tab, setTab] = useState<"packages" | "review">(search.get("tab") === "review" ? "review" : "packages");
  const list = useFetch<{ packages: PkgSummary[] }>("/api/teacher/results");
  const pendingTotal = (list.data?.packages ?? []).reduce((n, p) => n + p.pending, 0);

  return (
    <div className="page">
      <PageHeader title="Nəticələr" subtitle="Testlər üzrə tələbələrin cəhdləri və açıq sualların yoxlanması" />
      <SubNav items={TESTS_NAV} />

      {pkgId ? (
        <PackageView id={pkgId} onBack={() => router.push("/teacher/attempts")} />
      ) : (
        <>
          <Tabs
            value={tab}
            onChange={setTab}
            tabs={[
              { id: "packages", label: "Testlər", count: list.data?.packages.length },
              { id: "review", label: "Yoxlanmalı", count: pendingTotal },
            ]}
          />
          {tab === "review" ? (
            <ReviewList onChanged={list.reload} />
          ) : (
            <PackageList packages={list.data?.packages} loading={list.loading} error={list.error} reload={list.reload} />
          )}
        </>
      )}
    </div>
  );
}

function PackageList({
  packages, loading, error, reload,
}: { packages?: PkgSummary[]; loading: boolean; error: string | null; reload: () => void }) {
  const [q, setQ] = useState("");
  if (loading && !packages) return <SkeletonList />;
  if (error || !packages) return <ErrorBox message={error ?? "Xəta"} onRetry={reload} />;
  if (packages.length === 0) return <Empty icon="chart" title="Hələ heç kim test işləməyib" />;
  const rows = packages.filter((p) => !q.trim() || p.name.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <div>
      <div className="relative mb-4 sm:max-w-sm">
        <Icon name="search" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" size={17} />
        <input className="input pl-10" placeholder="Test axtar…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="space-y-2.5">
        {rows.map((p) => (
          <Link key={p.id} href={`/teacher/attempts?p=${p.id}`} className="card flex items-center gap-3 p-4 transition-colors hover:bg-tint/50">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
              <Icon name={p.isBank ? "book" : p.isMonthly ? "award" : "file"} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block break-words font-bold [overflow-wrap:anywhere]">{p.name}</span>
              <span className="mt-0.5 flex flex-wrap gap-x-2 text-xs text-muted">
                {p.collection && <span>{p.collection.name}</span>}
                <span>{p.students} tələbə · {p.attempts} cəhd</span>
                {p.lastAt && <span>son: {fmtDateTime(p.lastAt)}</span>}
              </span>
              {(p.isBank || p.isMonthly || p.pending > 0) && (
                <span className="mt-1.5 flex flex-wrap gap-1.5">
                  {p.isBank && <span className="badge-brand">Sual bankı</span>}
                  {p.isMonthly && <span className="badge-brand">Aylıq sınaq</span>}
                  {p.pending > 0 && <span className="badge-warn">{p.pending} yoxlanmalı</span>}
                </span>
              )}
            </span>
            <Icon name="right" className="shrink-0 text-muted" />
          </Link>
        ))}
      </div>
    </div>
  );
}

function PackageView({ id, onBack }: { id: string; onBack: () => void }) {
  const { data, loading, error, reload } = useFetch<PkgResults>(`/api/teacher/results/${id}`);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [giftFor, setGiftFor] = useState<{ attempt: StudentAttemptLite; student: { id: string; name: string } } | null>(null);

  if (loading && !data) return <SkeletonList />;
  if (error || !data) return <ErrorBox message={error ?? "Tapılmadı"} onRetry={reload} />;
  const pkg = data.package;
  const eligible = (a: StudentAttemptLite) =>
    pkg.rewardEnabled && pkg.rewardMinCorrect != null && (a.score ?? 0) >= pkg.rewardMinCorrect && !a.rewardGranted && a.pending === 0;

  const rows = data.students
    .map((s) => {
      const pcts = s.attempts.map((a) => percent(a.score, a.totalScore));
      return {
        ...s,
        last: s.attempts[s.attempts.length - 1],
        best: Math.max(...pcts),
        avg: Math.round((pcts.reduce((x, y) => x + y, 0) / pcts.length) * 10) / 10,
        total: s.attempts.reduce((n, a) => n + (a.score ?? 0), 0),
        pending: s.attempts.reduce((n, a) => n + a.pending, 0),
      };
    })
    .filter((r) => !q.trim() || r.student.name.toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => +new Date(b.last.finishedAt ?? 0) - +new Date(a.last.finishedAt ?? 0));
  const cur = data.students.find((s) => s.student.id === open);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button className="btn-secondary btn-sm" onClick={onBack}><Icon name="left" size={14} /> Testlər</button>
        <h2 className="min-w-0 flex-1 break-words text-lg font-bold [overflow-wrap:anywhere]">{pkg.name}</h2>
        <Link href={`/teacher/results/${pkg.id}`} className="btn-soft btn-sm"><Icon name="chart" size={14} /> {pkg.isBank ? "Reytinq" : "Cədvəl"}</Link>
      </div>
      <div className="relative mb-4 sm:max-w-sm">
        <Icon name="search" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" size={17} />
        <input className="input pl-10" placeholder="Tələbə axtar…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {rows.length === 0 ? (
        <Empty icon="users" title="Tələbə tapılmadı" />
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <button key={r.student.id} onClick={() => setOpen(r.student.id)} className="card flex w-full items-center gap-3 p-3.5 text-left transition-colors hover:bg-tint/50">
              <Avatar src={r.student.photo} name={r.student.name} size={38} />
              <span className="min-w-0 flex-1">
                <span className="block break-words font-bold [overflow-wrap:anywhere]">{r.student.name}</span>
                <span className="mt-0.5 flex flex-wrap gap-x-2 text-xs text-muted">
                  <span>{r.attempts.length} cəhd</span>
                  <span>son: {r.last.score}/{r.last.totalScore}</span>
                  {r.attempts.length > 1 && <span>ən yaxşı: {r.best}%</span>}
                  {pkg.isBank && <span>toplam düz: {r.total}</span>}
                </span>
                {r.pending > 0 && <span className="badge-warn mt-1">{r.pending} yoxlanmalı</span>}
              </span>
              <span className={cx("badge shrink-0 font-extrabold", pctTone(r.avg))} title="Orta faiz">{r.avg}%</span>
              <Icon name="right" className="shrink-0 text-muted" />
            </button>
          ))}
        </div>
      )}

      <Modal open={!!cur} onClose={() => setOpen(null)} title={cur?.student.name}>
        {cur && (
          <div>
            <Link href={`/u/${cur.student.id}`} className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline">
              Profilə bax <Icon name="right" size={14} />
            </Link>
            <ul className="divide-y divide-line">
              {[...cur.attempts].reverse().map((a, i) => {
                const p = percent(a.score, a.totalScore);
                return (
                  <li key={a.id} className="py-2.5">
                    <div className="flex items-center gap-3">
                      <Link href={`/teacher/attempts/${a.id}`} className="flex min-w-0 flex-1 items-center gap-3 hover:underline">
                        <span className="w-7 shrink-0 text-center text-sm font-bold text-muted">{cur.attempts.length - i}</span>
                        <span className="min-w-0 flex-1 text-sm">
                          <span className="font-semibold">{a.score}/{a.totalScore}</span>
                          <span className="block text-xs text-muted">{fmtDateTime(a.finishedAt)}</span>
                        </span>
                      </Link>
                      <span className={cx("badge shrink-0", pctTone(p))}>{p}%</span>
                    </div>
                    {(pkg.isMonthly || a.pending > 0 || a.rewardGranted || eligible(a)) && (
                      <div className="ml-10 mt-1 flex flex-wrap gap-1.5">
                        {pkg.isMonthly && (a.first ? <span className="badge-brand">Cədvələ düşən</span> : <span className="badge-muted">Məşq</span>)}
                        {a.pending > 0 && <span className="badge-warn">{a.pending} yoxlanmalı</span>}
                        {a.rewardGranted && <span className="badge-ok"><Icon name="coin" size={12} /> +{a.rewardCoins}</span>}
                        {eligible(a) && (
                          <button className="badge-warn" onClick={() => setGiftFor({ attempt: a, student: cur.student })}>
                            <Icon name="coin" size={12} /> Coin ver
                          </button>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </Modal>

      <GiftModal
        open={!!giftFor}
        onClose={() => setGiftFor(null)}
        onDone={reload}
        studentId={giftFor?.student.id}
        studentName={giftFor?.student.name}
        attemptId={giftFor?.attempt.id}
        defaultAmount={pkg.rewardCoins ?? 10}
        defaultReason={giftFor ? `${pkg.name}, ${giftFor.attempt.score}/${giftFor.attempt.totalScore}` : ""}
      />
    </div>
  );
}
