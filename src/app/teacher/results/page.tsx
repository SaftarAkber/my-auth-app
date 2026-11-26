"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createPortal } from "react-dom";
import { api, errMsg } from "@/lib/api";
import { cx, fmtDateTime } from "@/lib/format";
import { Avatar, Empty, ErrorBox, Icon, PageHeader, SkeletonList, Spinner, useToast } from "@/components/ui";

type Item = {
  id: string;
  student: { id: string; name: string; photo: string | null; deleted: boolean };
  groups: { id: string; name: string }[];
  package: { id: string; name: string; type: "bank" | "static" | "monthly"; durationSec: number | null };
  score: number; total: number; pct: number; finishedAt: string; durationSec: number;
  fast: boolean; pending: number; commented: boolean; coinDue: boolean; rewardCoins: number;
};
type Meta = { groups: { id: string; name: string }[]; packages: { id: string; name: string; isBank: boolean; isMonthly: boolean }[]; topics: { id: string; title: string }[] };
type F = { q: string; period: string; min: number; max: number; groups: string[]; type: string; packageId: string; topicId: string; status: string; fast: boolean };

const EMPTY: F = { q: "", period: "", min: 0, max: 100, groups: [], type: "", packageId: "", topicId: "", status: "", fast: false };
const STORE = "teacher-results-filters";
const PERIODS = [["", "Hamısı"], ["day", "Bu gün"], ["week", "Son 7 gün"], ["month", "Son 30 gün"], ["6m", "Son 6 ay"], ["1y", "Son 1 il"], ["2y", "Son 2 il"]] as const;
const TYPES = [["", "Hamısı"], ["bank", "Sual bankı"], ["static", "Adi test"], ["monthly", "Aylıq sınaq"]] as const;
const STATUSES = [["", "Hamısı"], ["pending", "Açıq sualları yoxlanmalı"], ["nocomment", "Şərh yazılmayıb"], ["nocoin", "Coin verilməyib"]] as const;

const toParams = (f: F) => {
  const p = new URLSearchParams();
  if (f.q.trim()) p.set("q", f.q.trim());
  if (f.period) p.set("period", f.period);
  if (f.min > 0) p.set("min", String(f.min));
  if (f.max < 100) p.set("max", String(f.max));
  if (f.groups.length) p.set("groups", f.groups.join(","));
  if (f.type) p.set("type", f.type);
  if (f.packageId) p.set("packageId", f.packageId);
  if (f.topicId) p.set("topicId", f.topicId);
  if (f.status) p.set("status", f.status);
  if (f.fast) p.set("fast", "1");
  return p;
};
const fromParams = (p: URLSearchParams): F => ({
  q: p.get("q") ?? "",
  period: p.get("period") ?? "",
  min: Math.max(0, Math.min(100, Number(p.get("min") ?? 0) || 0)),
  max: p.get("max") === null ? 100 : Math.max(0, Math.min(100, Number(p.get("max")) || 0)),
  groups: (p.get("groups") ?? "").split(",").filter(Boolean),
  type: p.get("type") ?? "",
  packageId: p.get("packageId") ?? "",
  topicId: p.get("topicId") ?? "",
  status: p.get("status") ?? "",
  fast: p.get("fast") === "1",
});
const activeCount = (f: F) =>
  [f.q.trim(), f.period, f.min > 0 || f.max < 100, f.groups.length, f.type, f.packageId, f.topicId, f.status, f.fast].filter(Boolean).length;
const mmss = (s: number) => (s >= 3600 ? `${Math.floor(s / 3600)} saat ${Math.floor((s % 3600) / 60)} dəq` : `${Math.floor(s / 60)} dəq ${s % 60} san`);
const pctTone = (p: number) => (p >= 80 ? "bg-ok/15 text-ok" : p >= 50 ? "bg-warn/20 text-[#8a5a00]" : "bg-bad/15 text-bad");

export default function TeacherResultsPage() {
  return (
    <Suspense fallback={<div className="page"><SkeletonList rows={5} /></div>}>
      <ResultsFeed />
    </Suspense>
  );
}

function ResultsFeed() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const toast = useToast();
  const [f, setF] = useState<F>(() => fromParams(sp));
  const [meta, setMeta] = useState<Meta | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [total, setTotal] = useState(0);
  const [next, setNext] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [more, setMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drawer, setDrawer] = useState(false);
  const [qInput, setQInput] = useState(f.q);
  const sentinel = useRef<HTMLDivElement>(null);
  const reqId = useRef(0);

  // Linkdə filtr yoxdursa, son istifadə olunan filtrlər bərpa olunur
  useEffect(() => {
    if ([...sp.keys()].length) return;
    try {
      const saved = localStorage.getItem(STORE);
      if (saved) {
        const g = fromParams(new URLSearchParams(saved));
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setF(g);
        setQInput(g.q);
      }
    } catch { /* yaddaş bağlıdır */ }
    // yalnız ilk açılışda
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Axtarış yazılanda 350 ms gözlənilir
  useEffect(() => {
    const t = setTimeout(() => setF((x) => (x.q === qInput ? x : { ...x, q: qInput })), 350);
    return () => clearTimeout(t);
  }, [qInput]);

  const params = useMemo(() => toParams(f).toString(), [f]);

  const load = useCallback(async (offset: number) => {
    const id = ++reqId.current;
    if (offset === 0) setLoading(true);
    else setMore(true);
    try {
      const p = new URLSearchParams(params);
      p.set("offset", String(offset));
      if (offset === 0 && !meta) p.set("meta", "1");
      const r = await api<{ items: Item[]; total: number; nextOffset: number | null; meta?: Meta }>(`/api/teacher/results-feed?${p}`);
      if (id !== reqId.current) return;
      if (r.meta) setMeta(r.meta);
      setItems((x) => (offset === 0 ? r.items : [...x, ...r.items]));
      setTotal(r.total);
      setNext(r.nextOffset);
      setError(null);
    } catch (e) {
      if (id === reqId.current) setError(errMsg(e));
    } finally {
      if (id === reqId.current) { setLoading(false); setMore(false); }
    }
  }, [params, meta]);

  // Filtr dəyişəndə: link və yaddaş yenilənir, siyahı yenidən yüklənir
  useEffect(() => {
    router.replace(params ? `${pathname}?${params}` : pathname, { scroll: false });
    try { localStorage.setItem(STORE, params); } catch { /* yaddaş bağlıdır */ }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  // Aşağı çatanda növbəti hissə
  useEffect(() => {
    const el = sentinel.current;
    if (!el || next === null) return;
    const io = new IntersectionObserver((e) => { if (e[0].isIntersecting && !more) void load(next); }, { rootMargin: "400px" });
    io.observe(el);
    return () => io.disconnect();
  }, [next, more, load]);

  const reset = () => { setF(EMPTY); setQInput(""); };
  const set = (patch: Partial<F>) => setF((x) => ({ ...x, ...patch }));
  const n = activeCount(f);

  async function exportCsv() {
    try {
      const res = await fetch(`/api/teacher/results-feed?${params}&format=csv`);
      if (!res.ok) throw new Error("Yükləmə alınmadı");
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `neticeler-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    } catch (e) {
      toast.error(errMsg(e));
    }
  }

  const filters = (
    <FilterPanel f={f} set={set} meta={meta} onReset={reset} active={n} />
  );

  return (
    <div className="page">
      <PageHeader title="Bütün nəticələr" subtitle="Tələbələrin bitirdiyi bütün testlər – ən yenisi yuxarıda" back="/teacher" />
      <div className="lg:grid lg:grid-cols-[260px_minmax(0,1fr)] lg:items-start lg:gap-6">
        <aside className="hidden lg:sticky lg:top-24 lg:block lg:max-h-[calc(100dvh-7rem)] lg:overflow-y-auto lg:pb-2">{filters}</aside>

        <section className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <div className="relative min-w-0 flex-1 basis-60">
              <Icon name="search" size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
              <input className="input pl-10" value={qInput} onChange={(e) => setQInput(e.target.value)} placeholder="Tələbə, test və ya qrup axtar…" />
            </div>
            <button type="button" className="btn-secondary lg:hidden" onClick={() => setDrawer(true)}>
              <Icon name="menu" size={16} /> Filtr{n ? ` (${n})` : ""}
            </button>
            <button type="button" className="btn-secondary" onClick={exportCsv} disabled={!total} title="Süzülmüş nəticələri Excel üçün CSV faylına yüklə">
              <Icon name="upload" size={16} className="rotate-180" /> Excel
            </button>
          </div>
          <p className="mb-3 text-sm text-muted">
            {loading ? "Yüklənir…" : `${total} nəticə`}
            {n > 0 && <button type="button" className="ml-3 font-semibold text-brand hover:underline" onClick={reset}>Filtrləri sıfırla</button>}
          </p>

          {loading && !items.length ? (
            <SkeletonList rows={6} />
          ) : error ? (
            <ErrorBox message={error} onRetry={() => load(0)} />
          ) : items.length === 0 ? (
            <Empty icon="search" title="Nəticə tapılmadı" text={n ? "Filtrləri dəyişin və ya sıfırlayın." : "Tələbələr test bitirdikcə burada görünəcək."} />
          ) : (
            <ul className="card divide-y divide-line overflow-hidden">
              {items.map((x) => (
                <li key={x.id}>
                  <Link href={`/teacher/attempts/${x.id}`} className="flex items-center gap-3 px-3.5 py-3 transition-colors hover:bg-tint/60">
                    <Avatar src={x.student.photo} name={x.student.name} size={38} />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span className={cx("truncate font-bold", x.student.deleted && "text-muted line-through")}>{x.student.name}</span>
                        {x.groups.length > 0 && <span className="truncate text-xs text-muted">{x.groups.map((g) => g.name).join(", ")}</span>}
                      </span>
                      <span className="block truncate text-sm">{x.package.name}</span>
                      <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
                        <span>{fmtDateTime(x.finishedAt)}</span>
                        <span>· {mmss(x.durationSec)}</span>
                        {x.package.type !== "static" && <span className="badge-muted !py-0">{x.package.type === "bank" ? "Bank" : "Aylıq"}</span>}
                        {x.fast && <span className="badge-warn !py-0" title="Test vaxtından çox tez bitirilib">Çox tez</span>}
                        {x.pending > 0 && <span className="badge-warn !py-0">{x.pending} yoxlanmalı</span>}
                        {x.coinDue && <span className="badge-warn !py-0"><Icon name="coin" size={11} /> coin verilməyib</span>}
                        {x.commented && <span className="badge-muted !py-0"><Icon name="message" size={11} /> şərh</span>}
                      </span>
                    </span>
                    <span className="flex flex-col items-end gap-1">
                      <span className={cx("min-w-[52px] rounded-md px-2 py-1 text-center text-sm font-extrabold tabular-nums", pctTone(x.pct))}>{x.pct}%</span>
                      <span className="text-xs font-semibold tabular-nums text-muted">{x.score}/{x.total}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <div ref={sentinel} />
          {more && <div className="flex justify-center py-4"><Spinner /></div>}
        </section>
      </div>

      {drawer && createPortal(
        <div className="fixed inset-0 z-[500] lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-ink/50" onClick={() => setDrawer(false)} />
          <div className="absolute inset-y-0 left-0 flex w-[min(320px,88vw)] flex-col bg-bg shadow-soft">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <h2 className="font-bold">Filtrlər</h2>
              <button className="btn-icon" onClick={() => setDrawer(false)} aria-label="Bağla"><Icon name="x" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">{filters}</div>
            <div className="border-t border-line p-3">
              <button className="btn-primary w-full" onClick={() => setDrawer(false)}>{total} nəticəni göstər</button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-line pb-4 last:border-0">
      <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">{title}</h3>
      {children}
    </div>
  );
}

function Radio({ name, value, current, label, onPick }: { name: string; value: string; current: string; label: string; onPick: (v: string) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 py-0.5 text-sm">
      <input type="radio" name={name} checked={current === value} onChange={() => onPick(value)} />
      {label}
    </label>
  );
}

function FilterPanel({ f, set, meta, onReset, active }: { f: F; set: (p: Partial<F>) => void; meta: Meta | null; onReset: () => void; active: number }) {
  const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v || 0)));
  return (
    <div className="card space-y-4 p-4">
      <div className="flex items-center justify-between">
        <span className="font-bold">Filtrlər</span>
        {active > 0 && <button type="button" className="text-xs font-semibold text-brand hover:underline" onClick={onReset}>Sıfırla ({active})</button>}
      </div>

      <Section title="Vaxt">
        {PERIODS.map(([v, l]) => <Radio key={v} name="period" value={v} current={f.period} label={l} onPick={(x) => set({ period: x })} />)}
      </Section>

      <Section title="Nəticə (%)">
        <div className="relative h-6">
          <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-surface-2" />
          <div className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-brand" style={{ left: `${f.min}%`, right: `${100 - f.max}%` }} />
          <input
            type="range" min={0} max={100} value={f.min} aria-label="Minimum faiz"
            onChange={(e) => set({ min: Math.min(clamp(+e.target.value), f.max) })}
            className="range-thumb pointer-events-none absolute inset-0 w-full appearance-none bg-transparent"
          />
          <input
            type="range" min={0} max={100} value={f.max} aria-label="Maksimum faiz"
            onChange={(e) => set({ max: Math.max(clamp(+e.target.value), f.min) })}
            className="range-thumb pointer-events-none absolute inset-0 w-full appearance-none bg-transparent"
          />
        </div>
        <div className="mt-2 flex items-center gap-2 text-sm">
          <input className="input h-9 w-20 tabular-nums" type="number" min={0} max={100} value={f.min} onChange={(e) => set({ min: Math.min(clamp(+e.target.value), f.max) })} aria-label="Min" />
          <span className="text-muted">–</span>
          <input className="input h-9 w-20 tabular-nums" type="number" min={0} max={100} value={f.max} onChange={(e) => set({ max: Math.max(clamp(+e.target.value), f.min) })} aria-label="Max" />
          <span className="text-muted">%</span>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {[[80, 100, "80%+"], [60, 100, "60%+"], [0, 49, "50%-dən aşağı"]].map(([a, b, l]) => (
            <button key={String(l)} type="button" onClick={() => set({ min: a as number, max: b as number })}
              className={cx("rounded-full border px-2.5 py-0.5 text-xs font-semibold", f.min === a && f.max === b ? "border-brand bg-brand text-white" : "border-line hover:bg-tint")}>
              {l}
            </button>
          ))}
        </div>
      </Section>

      {meta && meta.groups.length > 0 && (
        <Section title="Qruplar">
          {meta.groups.map((g) => (
            <label key={g.id} className="flex cursor-pointer items-center gap-2 py-0.5 text-sm">
              <input type="checkbox" checked={f.groups.includes(g.id)} onChange={(e) => set({ groups: e.target.checked ? [...f.groups, g.id] : f.groups.filter((x) => x !== g.id) })} />
              <span className="truncate">{g.name}</span>
            </label>
          ))}
        </Section>
      )}

      <Section title="Test növü">
        {TYPES.map(([v, l]) => <Radio key={v} name="type" value={v} current={f.type} label={l} onPick={(x) => set({ type: x, packageId: "" })} />)}
      </Section>

      <Section title="Test paketi və mövzu">
        <select className="input mb-2 text-sm" value={f.packageId} onChange={(e) => set({ packageId: e.target.value })}>
          <option value="">Bütün paketlər</option>
          {(meta?.packages ?? [])
            .filter((p) => !f.type || (f.type === "bank" ? p.isBank : f.type === "monthly" ? p.isMonthly : !p.isBank && !p.isMonthly))
            .map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select className="input text-sm" value={f.topicId} onChange={(e) => set({ topicId: e.target.value })}>
          <option value="">Bütün mövzular</option>
          {(meta?.topics ?? []).map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
        </select>
      </Section>

      <Section title="Vəziyyət">
        {STATUSES.map(([v, l]) => <Radio key={v} name="status" value={v} current={f.status} label={l} onPick={(x) => set({ status: x })} />)}
        <label className="mt-2 flex cursor-pointer items-start gap-2 text-sm">
          <input type="checkbox" className="mt-1" checked={f.fast} onChange={(e) => set({ fast: e.target.checked })} />
          <span>Çox tez bitirilənlər<span className="block text-xs text-muted">≤40 dəq test – yarısından tez; 40–60 dəq – 25 dəq-dən; 60+ – 30 dəq-dən tez</span></span>
        </label>
      </Section>
    </div>
  );
}
