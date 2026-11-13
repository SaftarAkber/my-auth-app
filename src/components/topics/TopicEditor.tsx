"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { errMsg, uploadImage } from "@/lib/api";
import { cx } from "@/lib/format";
import { LINE_PX, LINES_PER_PAGE, PAGE_WIDTH, imagesReady, paginate } from "@/lib/paginate";
import { Icon, Spinner, useConfirm, useToast } from "@/components/ui";

/**
 * Kitabxana redaktoru (contenteditable). Mətn: ölçü, başlıq, qalın/kursiv/altından xətt, rəng, marker, siyahı, düzləmə.
 * Şəkil: yüklənir, solda/mərkəzdə/sağda yerləşir (mətn ətrafından axır), küncdən dartmaqla və −/+ ilə ölçüsü dəyişir.
 * Narıncı xətlər 40 sətirlik səhifələrin sərhədini göstərir; "Yeni səhifə" əl ilə səhifə sonu qoyur.
 */

const COLORS = [
  { c: "#14161b", n: "Qara" }, { c: "#5a5e69", n: "Boz" }, { c: "#c2570c", n: "Narıncı" }, { c: "#b42318", n: "Qırmızı" },
  { c: "#1f6b3a", n: "Yaşıl" }, { c: "#1e3a8a", n: "Göy" }, { c: "#6d28d9", n: "Bənövşəyi" }, { c: "#a16207", n: "Qəhvəyi" },
];
const MARKERS = [{ c: "#fff3a3", n: "Sarı marker" }, { c: "#d1fae5", n: "Yaşıl marker" }, { c: "#dbeafe", n: "Göy marker" }];
const SIZES = [{ v: "2", n: "Kiçik" }, { v: "3", n: "Normal" }, { v: "4", n: "Böyük" }, { v: "5", n: "Çox böyük" }];
const BLOCKS = [{ v: "p", n: "Mətn" }, { v: "h2", n: "Başlıq" }, { v: "h3", n: "Alt başlıq" }, { v: "blockquote", n: "Qeyd qutusu" }];
const MIN_IMG = 80;

/** Saxlanmış HTML-i redaktor üçün hazırlayır: şəkillərə tutacaq, izaha yazma imkanı */
function prepareFigure(f: HTMLElement) {
  f.setAttribute("contenteditable", "false");
  if (!f.querySelector("figcaption")) f.appendChild(document.createElement("figcaption"));
  const cap = f.querySelector("figcaption")!;
  cap.setAttribute("contenteditable", "true");
  if (cap.textContent?.trim()) f.classList.add("cap");
  if (!f.querySelector(".handle")) {
    const h = document.createElement("span");
    h.className = "handle";
    f.appendChild(h);
  }
}
const prepare = (root: HTMLElement) => root.querySelectorAll("figure").forEach((f) => prepareFigure(f as HTMLElement));

/** Redaktordan təmiz HTML (tutacaqlar və redaktor sinifləri çıxarılır) */
function serialize(root: HTMLElement) {
  const c = root.cloneNode(true) as HTMLElement;
  c.querySelectorAll(".handle").forEach((n) => n.remove());
  c.querySelectorAll("[contenteditable]").forEach((n) => n.removeAttribute("contenteditable"));
  c.querySelectorAll("figure").forEach((f) => {
    f.classList.remove("sel", "cap");
    const cap = f.querySelector("figcaption");
    if (cap && !cap.textContent?.trim()) cap.remove();
  });
  return c.innerHTML;
}

/** Kursorun olduğu üst səviyyəli blok (redaktorun birbaşa uşağı) */
function topBlock(root: HTMLElement, node: Node | null): HTMLElement | null {
  let n: Node | null = node;
  while (n && n.parentNode !== root) n = n.parentNode;
  return n && n.parentNode === root ? (n as HTMLElement) : null;
}

export default function TopicEditor({
  initialHtml, onSave, onDirtyChange, importUrl,
}: { initialHtml: string; onSave: (html: string) => Promise<void>; onDirtyChange?: (dirty: boolean) => void; importUrl?: string }) {
  const toast = useToast();
  const confirm = useConfirm();
  const docRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const ed = useRef<HTMLDivElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const measure = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const lastRange = useRef<Range | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Seçilmiş şəkil DOM elementidir (ref), ekranda yalnız onun yeri (sol/mərkəz/sağ) state-də saxlanılır
  const selRef = useRef<HTMLElement | null>(null);
  const [selPos, setSelPos] = useState<string | null>(null);
  const [barPos, setBarPos] = useState<{ top: number; left: number } | null>(null);
  const [markers, setMarkers] = useState<number[]>([]);
  const [info, setInfo] = useState({ pages: 1, lastLines: 0 });
  const [dirty, setDirtyState] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const setDirty = useCallback((v: boolean) => {
    setDirtyState(v);
    onDirtyChange?.(v);
  }, [onDirtyChange]);

  /* ───── Səhifə sayı və sərhəd xətləri ───── */
  const recount = useCallback(() => {
    const root = ed.current;
    const m = measure.current;
    if (!root || !m) return;
    const sameWidth = Math.abs(root.clientWidth - PAGE_WIDTH) < 2;
    const target = sameWidth ? root : m;
    if (!sameWidth) {
      m.innerHTML = serialize(root);
    }
    const run = () => {
      const pages = paginate(target);
      const kids = Array.from(target.children) as HTMLElement[];
      const last = pages[pages.length - 1] ?? [];
      let lastLines = 0;
      if (last.length) {
        const a = kids[last[0]], b = kids[last[last.length - 1]];
        lastLines = Math.ceil((b.offsetTop + b.offsetHeight - a.offsetTop) / LINE_PX);
      }
      setInfo({ pages: Math.max(1, pages.length), lastLines: Math.min(lastLines, LINES_PER_PAGE) });
      setMarkers(sameWidth ? pages.slice(1).map((p) => kids[p[0]]?.offsetTop ?? 0).filter((y) => y > 0) : []);
    };
    if (sameWidth) run();
    else imagesReady(m).then(run);
  }, []);

  const schedule = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(recount, 200);
  }, [recount]);

  const changed = useCallback(() => {
    setDirty(true);
    schedule();
  }, [setDirty, schedule]);

  /* ───── Başlanğıc ───── */
  useEffect(() => {
    const root = ed.current;
    if (!root) return;
    root.innerHTML = initialHtml;
    prepare(root);
    try {
      document.execCommand("defaultParagraphSeparator", false, "p");
      document.execCommand("styleWithCSS", false, "true");
    } catch { /* köhnə brauzer */ }
    imagesReady(root).then(recount);
    const ro = new ResizeObserver(() => schedule());
    ro.observe(root);
    return () => ro.disconnect();
  }, [initialHtml, recount, schedule]);

  // Saxlanmamış dəyişiklik varsa səhifədən çıxanda xəbərdarlıq
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  // Kursorun son yeri (şəkil yüklənəndə fokus itir)
  useEffect(() => {
    const onSel = () => {
      const s = document.getSelection();
      if (s && s.rangeCount && ed.current?.contains(s.anchorNode)) lastRange.current = s.getRangeAt(0).cloneRange();
    };
    document.addEventListener("selectionchange", onSel);
    return () => document.removeEventListener("selectionchange", onSel);
  }, []);

  /* ───── Şəkil seçimi ───── */
  const placeBar = useCallback((f: HTMLElement | null) => {
    if (!f || !wrap.current) return setBarPos(null);
    const r = f.getBoundingClientRect();
    const w = wrap.current.getBoundingClientRect();
    setBarPos({ top: Math.max(0, r.top - w.top - 46), left: Math.max(0, Math.min(r.left - w.left, w.width - 330)) });
  }, []);

  const select = useCallback((f: HTMLElement | null) => {
    ed.current?.querySelectorAll("figure.sel").forEach((x) => x.classList.remove("sel"));
    if (f) f.classList.add("sel");
    selRef.current = f;
    setSelPos(f ? (["img-l", "img-c", "img-r"].find((c) => f.classList.contains(c)) ?? "img-r") : null);
    placeBar(f);
  }, [placeBar]);

  useEffect(() => {
    const down = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest("[data-topic-editor]")) select(null);
    };
    document.addEventListener("mousedown", down);
    const onScroll = () => placeBar(selRef.current);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mousedown", down);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [select, placeBar]);

  function onEditorMouseDown(e: React.MouseEvent) {
    const t = e.target as HTMLElement;
    if (t.classList.contains("handle")) return;
    const fig = t.closest("figure") as HTMLElement | null;
    if (fig && !t.closest("figcaption")) {
      e.preventDefault();
      select(fig);
    } else if (!t.closest(".imgbar")) {
      select(fig);
    }
  }

  // Küncdən dartıb ölçünü dəyişmək
  function onPointerDown(e: React.PointerEvent) {
    const t = e.target as HTMLElement;
    if (!t.classList.contains("handle")) return;
    e.preventDefault();
    const fig = t.closest("figure") as HTMLElement;
    select(fig);
    const startX = e.clientX;
    const startW = fig.offsetWidth;
    const right = fig.classList.contains("img-r");
    const move = (ev: PointerEvent) => {
      const dx = (ev.clientX - startX) * (right ? -1 : 1);
      fig.style.width = `${Math.round(Math.min(PAGE_WIDTH, Math.max(MIN_IMG, startW + dx)))}px`;
      placeBar(fig);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      changed();
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  function figPos(pos: "img-l" | "img-c" | "img-r") {
    const sel = selRef.current;
    if (!sel) return;
    sel.classList.remove("img-l", "img-c", "img-r");
    sel.classList.add(pos);
    setSelPos(pos);
    changed();
    requestAnimationFrame(() => placeBar(sel));
  }
  function figSize(d: number) {
    const sel = selRef.current;
    if (!sel) return;
    sel.style.width = `${Math.round(Math.min(PAGE_WIDTH, Math.max(MIN_IMG, sel.offsetWidth + d)))}px`;
    changed();
    requestAnimationFrame(() => placeBar(sel));
  }
  function figCaption() {
    const sel = selRef.current;
    if (!sel) return;
    const cap = sel.querySelector("figcaption") as HTMLElement | null;
    if (!cap) return;
    if (sel.classList.contains("cap")) {
      cap.textContent = "";
      sel.classList.remove("cap");
    } else {
      sel.classList.add("cap");
      requestAnimationFrame(() => cap.focus());
    }
    changed();
  }
  function figDelete() {
    const sel = selRef.current;
    if (!sel) return;
    sel.remove();
    select(null);
    changed();
  }

  /* ───── Əmrlər ───── */
  const exec = (cmd: string, val?: string) => {
    ed.current?.focus();
    document.execCommand(cmd, false, val);
    changed();
  };

  // Blok kursordan sonra (şəkil, səhifə sonu) əlavə olunur
  function insertBlock(node: HTMLElement, after = false) {
    const root = ed.current!;
    const r = lastRange.current;
    const blk = r ? topBlock(root, r.startContainer) : null;
    if (blk) {
      if (after) blk.after(node);
      else blk.before(node);
    } else {
      root.appendChild(node);
    }
    if (!node.nextElementSibling) {
      const p = document.createElement("p");
      p.appendChild(document.createElement("br"));
      node.after(p);
    }
  }

  async function addImage(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Yalnız şəkil faylı");
    setUploading(true);
    try {
      const url = await uploadImage(file);
      const fig = document.createElement("figure");
      fig.className = "img-r";
      fig.style.width = "260px";
      const img = document.createElement("img");
      img.src = url;
      img.alt = "";
      fig.appendChild(img);
      prepareFigure(fig);
      insertBlock(fig);
      img.onload = () => recount();
      changed();
      select(fig);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  // Hazır fayldan (DOCX / PDF / TXT) kitabxana: server mətni, formatı və şəkilləri hazırlayır
  async function importFile(files: FileList | null) {
    const file = files?.[0];
    if (docRef.current) docRef.current.value = "";
    if (!file || !importUrl || !ed.current) return;
    const root = ed.current;
    const hasContent = !!root.textContent?.trim() || !!root.querySelector("img");
    if (hasContent) {
      const ok = await confirm({
        title: "Kitabxanada artıq mətn var",
        message: `“${file.name}” faylının məzmunu mövcud mətnin sonuna əlavə olunacaq.`,
        confirmText: "Sona əlavə et",
      });
      if (!ok) return;
    }
    setImporting(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(importUrl, { method: "POST", body: fd });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d?.error ?? "Fayl oxunmadı");
      const tmp = document.createElement("div");
      tmp.innerHTML = d.html as string;
      prepare(tmp);
      if (!hasContent) root.innerHTML = "";
      root.append(...Array.from(tmp.childNodes));
      select(null);
      changed();
      imagesReady(root).then(recount);
      const extra = d.skippedImages ? ` (${d.skippedImages} şəkil oxunmadı)` : "";
      toast.success(`Fayl əlavə olundu${d.images ? `: ${d.images} şəkil` : ""}${extra}. Yoxlayıb yadda saxlayın.`);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setImporting(false);
    }
  }

  function addPageBreak() {
    const hr = document.createElement("hr");
    hr.className = "page-break";
    insertBlock(hr, true);
    changed();
  }

  async function save() {
    if (!ed.current) return;
    setSaving(true);
    try {
      await onSave(serialize(ed.current));
      setDirty(false);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setSaving(false);
    }
  }

  const tb = "inline-flex h-9 min-w-9 items-center justify-center gap-1 rounded px-2 text-sm font-semibold text-ink transition-colors hover:bg-tint";
  const keep = (e: React.MouseEvent) => e.preventDefault();

  return (
    <div data-topic-editor>
      {/* Alətlər */}
      <div className="sticky top-[124px] z-20 flex flex-nowrap items-center gap-1 overflow-x-auto md:top-16 md:flex-wrap md:overflow-visible [&>*]:shrink-0 rounded-t-lg border border-line bg-white p-1.5" onMouseDown={keep}>
        <select
          className="h-9 rounded border border-line bg-white px-2 text-sm"
          aria-label="Blok növü"
          value=""
          onMouseDown={(e) => e.stopPropagation()}
          onChange={(e) => { if (e.target.value) exec("formatBlock", `<${e.target.value}>`); }}
        >
          <option value="">Növ</option>
          {BLOCKS.map((b) => <option key={b.v} value={b.v}>{b.n}</option>)}
        </select>
        <select
          className="h-9 rounded border border-line bg-white px-2 text-sm"
          aria-label="Şrift ölçüsü"
          value=""
          onMouseDown={(e) => e.stopPropagation()}
          onChange={(e) => { if (e.target.value) exec("fontSize", e.target.value); }}
        >
          <option value="">Ölçü</option>
          {SIZES.map((s) => <option key={s.v} value={s.v}>{s.n}</option>)}
        </select>
        <span className="mx-1 h-6 w-px bg-line" />
        <button type="button" className={tb} title="Qalın (Ctrl+B)" onClick={() => exec("bold")}><b>B</b></button>
        <button type="button" className={tb} title="Kursiv (Ctrl+I)" onClick={() => exec("italic")}><i>I</i></button>
        <button type="button" className={tb} title="Altından xətt (Ctrl+U)" onClick={() => exec("underline")}><u>U</u></button>
        <span className="mx-1 h-6 w-px bg-line" />
        {COLORS.map((c) => (
          <button key={c.c} type="button" title={c.n} aria-label={`Rəng: ${c.n}`} onClick={() => exec("foreColor", c.c)} className="grid h-9 w-7 place-items-center rounded hover:bg-tint">
            <span className="h-5 w-5 rounded-full border-2 border-white" style={{ background: c.c, boxShadow: "0 0 0 1px rgb(var(--line-strong))" }} />
          </button>
        ))}
        <span className="mx-1 h-6 w-px bg-line" />
        {MARKERS.map((m) => (
          <button key={m.c} type="button" title={m.n} aria-label={m.n} onClick={() => exec("hiliteColor", m.c)} className="grid h-9 w-7 place-items-center rounded hover:bg-tint">
            <span className="grid h-5 w-5 place-items-center rounded text-[11px] font-bold" style={{ background: m.c }}>A</span>
          </button>
        ))}
        <button type="button" className={tb} title="Formatı təmizlə" onClick={() => exec("removeFormat")}><Icon name="x" size={14} /></button>
        <span className="mx-1 h-6 w-px bg-line" />
        <button type="button" className={tb} title="Siyahı" onClick={() => exec("insertUnorderedList")}>• Siyahı</button>
        <button type="button" className={tb} title="Nömrəli siyahı" onClick={() => exec("insertOrderedList")}>1. Siyahı</button>
        <button type="button" className={tb} title="Sola düz" onClick={() => exec("justifyLeft")}>⇤</button>
        <button type="button" className={tb} title="Mərkəzə düz" onClick={() => exec("justifyCenter")}>↔</button>
        <button type="button" className={tb} title="Sağa düz" onClick={() => exec("justifyRight")}>⇥</button>
        <span className="mx-1 h-6 w-px bg-line" />
        <button type="button" className={tb} onClick={() => fileRef.current?.click()} disabled={uploading}>
          {uploading ? <Spinner /> : <Icon name="image" size={16} />} Şəkil
        </button>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => addImage(e.target.files)} />
        {importUrl && (
          <>
            <button type="button" className={tb} title="DOCX, PDF və ya TXT faylından kitabxana hazırla" onClick={() => docRef.current?.click()} disabled={importing}>
              {importing ? <Spinner /> : <Icon name="upload" size={15} />} Fayldan
            </button>
            <input ref={docRef} type="file" accept=".docx,.pdf,.txt,.md" hidden onChange={(e) => importFile(e.target.files)} />
          </>
        )}
        <button type="button" className={tb} title="Burada yeni səhifə başlasın" onClick={addPageBreak}><Icon name="file" size={15} /> Yeni səhifə</button>
        <span className="mx-1 h-6 w-px bg-line" />
        <button type="button" className={tb} title="Geri al (Ctrl+Z)" onClick={() => exec("undo")}>↶</button>
        <button type="button" className={tb} title="Təkrarla (Ctrl+Y)" onClick={() => exec("redo")}>↷</button>
      </div>

      {/* Səhifə */}
      <div className="overflow-x-auto rounded-b-lg border border-t-0 border-line bg-surface-2 px-2 py-6 sm:px-6">
        <div ref={wrap} className="relative mx-auto rounded bg-white px-4 py-8 shadow-soft sm:px-10" style={{ width: "fit-content", maxWidth: "100%" }}>
          {importing && (
            <div className="absolute inset-0 z-40 grid place-items-center rounded bg-white/85" role="status">
              <div className="w-64 text-center">
                <Spinner />
                <p className="mt-3 text-sm font-semibold">Fayl hazırlanır…</p>
                <p className="mt-1 text-xs text-muted">Mətn, başlıqlar və şəkillər kitabxanaya çevrilir</p>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-2"><div className="h-full w-1/3 animate-[shimmer_1.2s_infinite] rounded-full bg-accent" /></div>
              </div>
            </div>
          )}
          <div
            ref={ed}
            className="topic-content topic-editor"
            style={{ width: PAGE_WIDTH, maxWidth: "100%" }}
            contentEditable
            suppressContentEditableWarning
            spellCheck={false}
            onInput={changed}
            onMouseDown={onEditorMouseDown}
            onPointerDown={onPointerDown}
            onKeyDown={(e) => {
              if (selRef.current && (e.key === "Backspace" || e.key === "Delete") && !(e.target as HTMLElement).closest("figcaption")) {
                e.preventDefault();
                figDelete();
              }
              if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
                e.preventDefault();
                void save();
              }
            }}
            onPaste={(e) => {
              // Yalnız düz mətn: Word/sayt formatı redaktoru qarışdırmasın
              e.preventDefault();
              document.execCommand("insertText", false, e.clipboardData.getData("text/plain"));
            }}
            onDrop={(e) => { if (e.dataTransfer.files.length) e.preventDefault(); }}
          />
          {/* 40 sətirlik səhifə sərhədləri */}
          {markers.map((y, i) => (
            <div key={i} aria-hidden className="pointer-events-none absolute left-0 right-0 border-t-2 border-dashed border-accent/60" style={{ top: y + 32 - 6 }}>
              <span className="absolute -top-3 right-2 bg-white px-1.5 text-[11px] font-bold text-accent">Səhifə {i + 2}</span>
            </div>
          ))}
          {/* Şəkil paneli */}
          {selPos && barPos && (
            <div className="imgbar absolute z-30 flex gap-0.5 rounded bg-brand p-1 text-white shadow-soft" style={{ top: barPos.top, left: barPos.left }} onMouseDown={keep}>
              {([["img-l", "Solda"], ["img-c", "Mərkəzdə"], ["img-r", "Sağda"]] as const).map(([v, n]) => (
                <button key={v} type="button" onClick={() => figPos(v)} className={cx("h-8 rounded px-2.5 text-xs font-semibold hover:bg-white/15", selPos === v && "bg-white/20")}>{n}</button>
              ))}
              <button type="button" onClick={() => figSize(-40)} className="h-8 w-8 rounded text-sm font-bold hover:bg-white/15" aria-label="Kiçilt">−</button>
              <button type="button" onClick={() => figSize(40)} className="h-8 w-8 rounded text-sm font-bold hover:bg-white/15" aria-label="Böyüt">+</button>
              <button type="button" onClick={figCaption} className="h-8 rounded px-2.5 text-xs font-semibold hover:bg-white/15">İzah</button>
              <button type="button" onClick={figDelete} className="h-8 rounded px-2.5 text-xs font-semibold hover:bg-bad">Sil</button>
            </div>
          )}
        </div>
      </div>

      {/* Ölçmə qutusu (dar ekranda səhifə sayı üçün) */}
      <div aria-hidden className="pointer-events-none invisible absolute left-0 top-0 -z-10 overflow-hidden" style={{ width: PAGE_WIDTH, height: 0 }}>
        <div ref={measure} className="topic-content" style={{ width: PAGE_WIDTH }} />
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {info.pages} səhifə · son səhifədə {info.lastLines}/{LINES_PER_PAGE} sətir
          {dirty && <span className="ml-2 badge-warn">Yadda saxlanmayıb</span>}
        </p>
        <button type="button" className="btn-primary" onClick={save} disabled={saving || !dirty}>
          {saving ? <Spinner /> : <Icon name="check" size={16} />} Yadda saxla
        </button>
      </div>
    </div>
  );
}
