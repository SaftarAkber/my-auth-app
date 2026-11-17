"use client";

import { useEffect, useState } from "react";
import { api, errMsg } from "@/lib/api";
import { cx, minutes, toInputDateTime } from "@/lib/format";
import { ChipSelect, Field, Icon, Modal, Spinner, Toggle, useToast } from "@/components/ui";

type State = "draft" | "public" | "groups";
type Kind = "normal" | "bank" | "monthly";

interface Settings {
  package: {
    id: string;
    name: string;
    description: string | null;
    isPublished: boolean;
    visibility: "PUBLIC" | "GROUP_ONLY";
    isTimed: boolean;
    duration: number | null;
    startsAt: string | null;
    endsAt: string | null;
    allowRetry: boolean;
    shareAnswers: boolean;
    rewardEnabled: boolean;
    rewardMinCorrect: number | null;
    rewardCoins: number | null;
    rewardAuto: boolean;
    isBank: boolean;
    drawEasy: number;
    drawMedium: number;
    drawHard: number;
    isMonthly: boolean;
    groupIds: string[];
    topicIds: string[];
    _count: { attempts: number };
  } | null;
  groups: { id: string; name: string }[];
  topics: { id: string; title: string; isPublished: boolean }[];
  restricted: boolean;
  counts: { EASY: number; MEDIUM: number; HARD: number; NONE: number };
}

const EMPTY = {
  name: "", description: "", state: "draft" as State, groupIds: [] as string[], topicIds: [] as string[],
  kind: "normal" as Kind, drawEasy: "4", drawMedium: "6", drawHard: "15",
  isTimed: false, durationMin: "", startsAt: "", endsAt: "", allowRetry: false, shareAnswers: false,
  rewardEnabled: false, rewardMinCorrect: "", rewardCoins: "", rewardAuto: true,
};

const int = (v: string) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Test paketinin bütün ayarları bir pəncərədə: kimə açıqdır, hansı mövzulara aiddir,
 * test növü (adi / sual bankı / aylıq sınaq), müddət, təkrar və coin mükafatı.
 * Müəllim və admin eyni pəncərədən istifadə edir.
 */
export default function PackageSettings({
  open, onClose, onSaved, packageId, collectionId, totalQuestions,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: (id: string) => void;
  /** null: yeni test (kolleksiyada yaradılır) */
  packageId: string | null;
  collectionId?: string;
  totalQuestions?: number;
}) {
  const toast = useToast();
  const isNew = !packageId;
  const url = isNew
    ? `/api/packages/new/settings${collectionId ? `?collectionId=${collectionId}` : ""}`
    : `/api/packages/${packageId}/settings`;
  // Yüklənən ayarlar ünvanla birlikdə saxlanılır: başqa test açılanda köhnə məlumat göstərilmir
  const [loaded, setLoaded] = useState<{ url: string; data?: Settings; error?: string } | null>(null);
  const data = loaded?.url === url ? loaded.data ?? null : null;
  const loadErr = loaded?.url === url ? loaded.error ?? null : null;
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    api<Settings>(url)
      .then((d) => {
        if (!alive) return;
        setLoaded({ url, data: d });
        const p = d.package;
        setForm(
          p
            ? {
                name: p.name,
                description: p.description ?? "",
                state: !p.isPublished ? "draft" : p.visibility === "PUBLIC" ? "public" : "groups",
                // Yalnız seçilə bilən qruplar (məhdud kolleksiyada kolleksiyanın qrupları)
                groupIds: p.groupIds.filter((g) => d.groups.some((x) => x.id === g)),
                topicIds: p.topicIds,
                kind: p.isBank ? "bank" : p.isMonthly ? "monthly" : "normal",
                drawEasy: String(p.drawEasy),
                drawMedium: String(p.drawMedium),
                drawHard: String(p.drawHard),
                isTimed: p.isTimed,
                durationMin: p.duration ? String(minutes(p.duration)) : "",
                startsAt: toInputDateTime(p.startsAt),
                endsAt: toInputDateTime(p.endsAt),
                allowRetry: p.allowRetry,
                shareAnswers: p.shareAnswers,
                rewardEnabled: p.rewardEnabled,
                rewardMinCorrect: p.rewardMinCorrect ? String(p.rewardMinCorrect) : "",
                rewardCoins: p.rewardCoins ? String(p.rewardCoins) : "",
                rewardAuto: p.rewardAuto,
              }
            : EMPTY,
        );
      })
      .catch((e) => alive && setLoaded({ url, error: errMsg(e) }));
    return () => {
      alive = false;
    };
  }, [open, url]);

  const set = (p: Partial<typeof EMPTY>) => setForm((f) => ({ ...f, ...p }));
  const drawSum = int(form.drawEasy) + int(form.drawMedium) + int(form.drawHard);
  const perAttempt = form.kind === "bank" ? drawSum : totalQuestions ?? 0;

  function pickKind(kind: Kind) {
    // Sual bankı adətən vaxtlı olur: standart 40 dəqiqə
    if (kind === "bank" && !form.isTimed) set({ kind, isTimed: true, durationMin: form.durationMin || "40" });
    else if (kind === "monthly" && form.state === "public") set({ kind, state: "groups" });
    else set({ kind });
  }

  async function save() {
    if (!form.name.trim()) return toast.error("Test adı məcburidir");
    if (form.isTimed && !(int(form.durationMin) > 0)) return toast.error("Müddəti dəqiqə ilə daxil edin");
    if (form.kind === "bank" && drawSum < 1) return toast.error("Testə düşəcək sual sayını yazın");
    if (form.kind === "monthly" && form.state === "public") return toast.error("Aylıq sınaq yalnız seçilmiş qruplara açıq ola bilər");
    if (form.state === "groups" && form.groupIds.length === 0) return toast.error("Ən azı bir qrup seçin");
    if (form.rewardEnabled) {
      if (!(int(form.rewardMinCorrect) >= 1)) return toast.error("Mükafat üçün minimum düz cavab sayını yazın");
      if (!(int(form.rewardCoins) >= 1)) return toast.error("Mükafat coin sayını yazın");
      if (perAttempt > 0 && int(form.rewardMinCorrect) > perAttempt) return toast.error(`Testdə ${perAttempt} sual var, minimum düz cavab ondan çox ola bilməz`);
    }
    setBusy(true);
    try {
      const common = {
        name: form.name.trim(),
        description: form.description,
        isTimed: form.isTimed,
        duration: form.isTimed ? int(form.durationMin) * 60 : null,
        startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
        endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
        allowRetry: form.kind === "bank" ? true : form.allowRetry,
        shareAnswers: form.kind === "bank" ? false : form.shareAnswers,
        rewardEnabled: form.rewardEnabled,
        rewardMinCorrect: form.rewardEnabled ? int(form.rewardMinCorrect) : null,
        rewardCoins: form.rewardEnabled ? int(form.rewardCoins) : null,
        rewardAuto: form.rewardAuto,
      };
      const extra = {
        isBank: form.kind === "bank",
        isMonthly: form.kind === "monthly",
        drawEasy: int(form.drawEasy),
        drawMedium: int(form.drawMedium),
        drawHard: int(form.drawHard),
        topicIds: form.topicIds,
      };
      let id = packageId;
      if (isNew) {
        const r = await api<{ package: { id: string } }>("/api/packages", { body: { ...common, collectionId } });
        id = r.package.id;
        // Yeni test hələ sualsızdır: qaralama qalır, qrup seçimi isə yadda saxlanılır
        await api(`/api/packages/${id}`, {
          method: "PATCH",
          body: { ...extra, ...(form.state === "groups" ? { groupIds: form.groupIds, visibility: "GROUP_ONLY", isPublished: false } : {}) },
        });
      } else {
        await api(`/api/packages/${id}`, {
          method: "PATCH",
          body: { ...common, ...extra, state: form.state, groupIds: form.state === "groups" ? form.groupIds : [] },
        });
      }
      toast.success("Yadda saxlanıldı");
      onSaved(id!);
      onClose();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  const c = data?.counts;
  const states: { id: State; label: string; hint: string; icon: "eyeOff" | "globe" | "users" }[] = [
    { id: "draft", label: "Qaralama", hint: "Heç kim görmür", icon: "eyeOff" },
    { id: "public", label: "Hərkəsə açıq", hint: "Bütün tələbələr işləyə bilər", icon: "globe" },
    { id: "groups", label: "Qruplar", hint: "Yalnız seçilmiş qrupların üzvləri", icon: "users" },
  ];
  const kinds: { id: Kind; label: string; hint: string }[] = [
    { id: "normal", label: "Adi test", hint: "Bütün suallar, sabit sıra" },
    { id: "bank", label: "Sual bankı", hint: "Hər dəfə təsadüfi suallar" },
    { id: "monthly", label: "Aylıq sınaq", hint: "Qrupların yarış cədvəlinə düşür" },
  ];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isNew ? "Yeni test" : "Test ayarları"}
      size="lg"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>Ləğv et</button>
          <button className="btn-primary" onClick={save} disabled={busy || !data}>{busy ? <Spinner /> : "Yadda saxla"}</button>
        </>
      }
    >
      {loadErr ? (
        <p className="text-sm text-bad">{loadErr}</p>
      ) : !data ? (
        <div className="space-y-3">
          <div className="skeleton h-11" />
          <div className="skeleton h-24" />
          <div className="skeleton h-24" />
        </div>
      ) : (
        <div className="space-y-5">
          <Field label="Ad *"><input className="input" value={form.name} onChange={(e) => set({ name: e.target.value })} autoFocus={isNew} /></Field>
          <Field label="Təsvir"><textarea className="input min-h-16" value={form.description} onChange={(e) => set({ description: e.target.value })} /></Field>

          {/* Test növü */}
          <section>
            <span className="label">Test növü</span>
            <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Test növü">
              {kinds.map((k) => (
                <button
                  key={k.id}
                  type="button"
                  role="radio"
                  aria-checked={form.kind === k.id}
                  onClick={() => pickKind(k.id)}
                  className={cx(
                    "rounded-lg border p-2.5 text-left transition-colors",
                    form.kind === k.id ? "border-brand bg-tint" : "border-line bg-surface hover:bg-tint/50",
                  )}
                >
                  <span className="block text-sm font-bold">{k.label}</span>
                  <span className="block text-xs text-muted">{k.hint}</span>
                </button>
              ))}
            </div>

            {form.kind === "bank" && (
              <div className="mt-3 rounded-lg border border-line bg-tint/40 p-3">
                <p className="mb-2 text-sm font-semibold">Hər testə neçə sual düşsün?</p>
                <div className="grid grid-cols-3 gap-2">
                  {([["drawEasy", "Asan", c?.EASY], ["drawMedium", "Orta", c?.MEDIUM], ["drawHard", "Çətin", c?.HARD]] as const).map(([k, label, have]) => (
                    <label key={k} className="block min-w-0">
                      <span className="block text-xs font-semibold text-muted">{label}</span>
                      <input
                        className={cx("input mt-1 tabular-nums", have !== undefined && int(form[k]) > have && "!border-warn")}
                        type="number"
                        min={0}
                        max={200}
                        inputMode="numeric"
                        value={form[k]}
                        onChange={(e) => set({ [k]: e.target.value } as Partial<typeof EMPTY>)}
                      />
                      <span className={cx("mt-1 block text-xs", have !== undefined && int(form[k]) > have ? "font-semibold text-warn" : "text-muted")}>
                        bankda {have ?? 0}
                      </span>
                    </label>
                  ))}
                </div>
                <p className="mt-2 text-sm">
                  Cəmi: <b className="tabular-nums">{drawSum}</b> sual
                  {!!c?.NONE && <span className="text-muted"> · {c.NONE} sualın səviyyəsi qeyd olunmayıb</span>}
                </p>
                <p className="mt-1 text-xs text-muted">
                  Hər tələbəyə əvvəlcə hələ görmədiyi suallar düşür; səviyyədə sual çatmasa, qalanı başqa suallardan tamamlanır. Təkrar işləmək həmişə açıqdır.
                </p>
              </div>
            )}
            {form.kind === "monthly" && (
              <p className="mt-3 rounded-lg border border-line bg-tint/40 p-3 text-xs text-muted">
                Nəticələr seçilmiş qrupların “Aylıq sınaq” cədvəlinə düşür. Cədvələ tələbənin ilk cəhdi yazılır; təkrar açıqdırsa, sonrakı cəhdlər məşq sayılır.
              </p>
            )}
          </section>

          {/* Kimə açıqdır */}
          <section>
            <span className="label">Kimə açıqdır?</span>
            {isNew ? (
              <p className="mb-2 text-xs text-muted">Test sualsız dərc olunmur: sualları əlavə edəndən sonra buradan dərc edin. Qrupları indi də seçə bilərsiniz.</p>
            ) : null}
            <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Kimə açıqdır">
              {states.map((s) => {
                const disabled = (s.id === "public" && (form.kind === "monthly" || data.restricted)) || (isNew && s.id === "public");
                return (
                  <button
                    key={s.id}
                    type="button"
                    role="radio"
                    aria-checked={form.state === s.id}
                    disabled={disabled}
                    onClick={() => set({ state: s.id })}
                    className={cx(
                      "flex items-start gap-2 rounded-lg border p-2.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                      form.state === s.id
                        ? s.id === "draft" ? "border-warn/50 bg-warn/10" : "border-ok/50 bg-ok/10"
                        : "border-line bg-surface hover:bg-tint/50",
                    )}
                  >
                    <Icon name={s.icon} size={15} className="mt-0.5 shrink-0" />
                    <span className="min-w-0">
                      <span className="block text-sm font-bold">{s.label}</span>
                      <span className="block text-xs text-muted">{s.hint}</span>
                    </span>
                  </button>
                );
              })}
            </div>
            {form.state === "groups" && (
              <div className="mt-3">
                <ChipSelect
                  options={data.groups.map((g) => ({ id: g.id, label: g.name }))}
                  value={form.groupIds}
                  onChange={(v) => set({ groupIds: v })}
                  empty="Əvvəlcə qrup yaradın"
                />
              </div>
            )}
          </section>

          {/* Mövzular */}
          <section>
            <span className="label">Hansı mövzulara aiddir?</span>
            <ChipSelect
              options={data.topics.map((t) => ({ id: t.id, label: t.isPublished ? t.title : `${t.title} (qaralama)` }))}
              value={form.topicIds}
              onChange={(v) => set({ topicIds: v })}
              empty="Hələ mövzunuz yoxdur"
            />
            <p className="mt-1.5 text-xs text-muted">Seçilən mövzuların səhifəsində tələbə “Testə başla” düyməsini görür.</p>
          </section>

          {/* Vaxt */}
          <section className="space-y-3">
            <Toggle checked={form.isTimed} onChange={(v) => set({ isTimed: v, durationMin: v && !form.durationMin ? "40" : form.durationMin })} label="Vaxt məhdudiyyəti" hint="Vaxt bitəndə test bitmiş sayılır, cavabsız suallar səhv hesablanır" />
            {form.isTimed && (
              <Field label="Müddət (dəqiqə)">
                <input className="input tabular-nums" type="number" min={1} inputMode="numeric" value={form.durationMin} onChange={(e) => set({ durationMin: e.target.value })} placeholder="40" />
              </Field>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Başlama vaxtı"><input className="input" type="datetime-local" value={form.startsAt} onChange={(e) => set({ startsAt: e.target.value })} /></Field>
              <Field label="Bitmə vaxtı"><input className="input" type="datetime-local" value={form.endsAt} onChange={(e) => set({ endsAt: e.target.value })} /></Field>
            </div>
          </section>

          {form.kind !== "bank" && (
            <section className="space-y-3">
              <Toggle
                checked={form.allowRetry}
                onChange={(v) => set({ allowRetry: v })}
                label="Təkrar həll icazəsi"
                hint={form.kind === "monthly" ? "Cədvələ ilk cəhd düşür, sonrakılar məşq kimi saxlanılır" : "Tələbə testi bir neçə dəfə həll edə bilər"}
              />
              <Toggle checked={form.shareAnswers} onChange={(v) => set({ shareAnswers: v })} label="Cavablar hamıya açıq" hint="Testi bitirən tələbələr nəticə cədvəlində bir-birinin cavab kitabçasına baxa bilər" />
            </section>
          )}

          {/* Coin */}
          <section className="rounded-lg border border-line bg-tint/40 p-3.5">
            <Toggle checked={form.rewardEnabled} onChange={(v) => set({ rewardEnabled: v })} label="Coin mükafatı (uduşlu)" hint="Şərti ödəyən tələbəyə öz balansınızdan coin göndərilir" />
            {form.rewardEnabled && (
              <div className="mt-3 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Minimum düz cavab" hint={perAttempt ? `Testdə ${perAttempt} sual` : undefined}>
                    <input className="input tabular-nums" type="number" min={1} inputMode="numeric" value={form.rewardMinCorrect} onChange={(e) => set({ rewardMinCorrect: e.target.value })} placeholder={perAttempt ? String(Math.max(1, perAttempt - 1)) : "24"} />
                  </Field>
                  <Field label="Coin">
                    <input className="input tabular-nums" type="number" min={1} inputMode="numeric" value={form.rewardCoins} onChange={(e) => set({ rewardCoins: e.target.value })} placeholder="1" />
                  </Field>
                </div>
                <Field label="Necə verilsin">
                  <select className="input" value={form.rewardAuto ? "auto" : "manual"} onChange={(e) => set({ rewardAuto: e.target.value === "auto" })}>
                    <option value="auto">Avtomatik, test bitəndə</option>
                    <option value="manual">Mən təsdiq edim (Nəticələrdən “Coin ver”)</option>
                  </select>
                </Field>
                <p className="text-xs text-muted">
                  {form.kind === "bank"
                    ? "Şərti ödəyən hər cəhd üçün verilir. Balansınız çatmasa, mükafat “gözləyir” statusunda qalır."
                    : "Hər tələbə bu testdən bir dəfə mükafat alır. Balansınız çatmasa, mükafat “gözləyir” statusunda qalır."}
                </p>
              </div>
            )}
          </section>
        </div>
      )}
    </Modal>
  );
}
