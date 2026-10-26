// Faylın mətnindən test suallarını çıxarır (PDF / DOCX / TXT). Sual dili: Azərbaycan, rus, ingilis.
// Dəstəklənən format:
//   1. Sual mətni            (və ya "1) ...")
//   A) variant   B) variant  (A–E, ayrı sətirlərdə və ya bir sətirdə)
//   Cavab: B                 (sualın altında) — və ya faylın sonunda "Cavablar: 1-A 2-C ..."
// Düzgün variant "*" və ya "✓" ilə də işarələnə bilər. Variantsız suallar açıq sual olur.

export interface ParsedQuestion {
  text: string;
  type: "MULTIPLE_CHOICE" | "OPEN_ENDED";
  options: string[];
  /** Düzgün variantın indeksi (tapılmayıbsa -1) */
  correct: number;
}

const MAX_OPTIONS = 5;
const LETTERS = "ABCDE";

const QUESTION_RE = /^\s*(\d{1,3})\s*[.)]\s*(\S.*)$/;
const OPTION_RE = /^\s*[(]?([A-Ea-e])\s*[.)]\s*(\S.*)$/;
const ANSWER_RE = /^\s*(?:düzgün\s+cavab|cavab|ответ|answer|ans|correct)\s*[:\-–=]?\s*[(]?([A-Ea-e])\b/i;
const KEY_HEADER_RE = /^\s*(?:cavablar|cavab\s+açarı|açar|ответы|answers?|answer\s+key|key)\s*[:\-–]?\s*(.*)$/i;
const MARK_RE = /(^\s*[*✓✔✅]\s*)|(\s*[*✓✔✅]\s*$)/;

function clean(s: string) {
  return s.replace(/ /g, " ").replace(/[ \t]+/g, " ").trim();
}

/** "A) x B) y C) z" kimi bir sətri hissələrə bölür */
function splitInlineOptions(line: string): string[] {
  const m = line.match(/^\s*[(]?[A-Ea-e]\s*[.)]/);
  if (!m) return [line];
  const parts = line.split(/\s+(?=[(]?[B-Eb-e]\s*[.)]\s*\S)/);
  return parts.length > 1 ? parts : [line];
}

export function parseQuiz(raw: string): ParsedQuestion[] {
  const lines = raw.replace(/\r/g, "").split("\n").map(clean).filter(Boolean);

  type Draft = { text: string; options: string[]; correct: number; opt: number; marks: number; answered: boolean };
  const drafts: Draft[] = [];
  let cur: Draft | null = null;
  let keyMode = false;
  const key = new Map<number, number>();

  const readKey = (s: string) => {
    for (const m of s.matchAll(/(\d{1,3})\s*[-.):=]?\s*([A-Ea-e])\b/g)) key.set(+m[1], LETTERS.indexOf(m[2].toUpperCase()));
  };

  for (const rawLine of lines) {
    const kh = rawLine.match(KEY_HEADER_RE);
    if (kh && !QUESTION_RE.test(rawLine) && (kh[1] === "" || /\d\s*[-.):=]?\s*[A-Ea-e]\b/.test(kh[1]))) {
      keyMode = true;
      readKey(kh[1]);
      continue;
    }
    if (keyMode) {
      readKey(rawLine);
      continue;
    }

    for (const line of splitInlineOptions(rawLine)) {
      const ans = line.match(ANSWER_RE);
      if (ans && cur) {
        cur.correct = LETTERS.indexOf(ans[1].toUpperCase());
        cur.answered = true;
        continue;
      }
      const opt = line.match(OPTION_RE);
      // Sual yoxdursa variant sayılmır; A–E ardıcıllığı pozulursa mətnin davamıdır
      if (opt && cur && LETTERS.indexOf(opt[1].toUpperCase()) === cur.options.length && cur.options.length < MAX_OPTIONS) {
        const marked = MARK_RE.test(opt[2]);
        cur.options.push(clean(opt[2].replace(MARK_RE, "")));
        cur.opt = cur.options.length - 1;
        if (marked) {
          cur.correct = cur.options.length - 1;
          cur.marks++;
        }
        continue;
      }
      const q = line.match(QUESTION_RE);
      // Yeni sual: nömrə əvvəlkindən böyük olmalıdır (mətn içindəki "2) ..." ilə qarışmasın)
      if (q && (!cur || +q[1] === drafts.length + 1 || (cur.options.length > 0 && cur.options.length >= 2))) {
        cur = { text: clean(q[2]), options: [], correct: -1, opt: -1, marks: 0, answered: false };
        drafts.push(cur);
        continue;
      }
      if (!cur) continue;
      // Davam sətri: variantın və ya sualın mətninə əlavə olunur
      if (cur.options.length > 0 && cur.opt >= 0) cur.options[cur.opt] = clean(`${cur.options[cur.opt]} ${line}`);
      else cur.text = clean(`${cur.text} ${line}`);
    }
  }

  return drafts.map((d, i) => {
    const mc = d.options.length >= 2;
    // Bir neçə variant işarələnibsə (məs. hamısı qalındır) qeyri-müəyyəndir: müəllim seçsin
    let correct = d.marks > 1 && !d.answered ? -1 : d.correct;
    if (key.has(i + 1)) correct = key.get(i + 1)!;
    if (!mc || correct >= d.options.length) correct = -1;
    return mc
      ? { text: d.text, type: "MULTIPLE_CHOICE" as const, options: d.options, correct }
      : { text: [d.text, ...d.options.map((o, k) => `${LETTERS[k]}) ${o}`)].join(" "), type: "OPEN_ENDED" as const, options: [], correct: -1 };
  });
}

/** Fayldan mətn çıxarır */
export async function extractText(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  const buf = new Uint8Array(await file.arrayBuffer());
  if (name.endsWith(".pdf") || file.type === "application/pdf") {
    const { extractText: pdfText, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(buf);
    const { text } = await pdfText(pdf, { mergePages: true });
    return Array.isArray(text) ? text.join("\n") : text;
  }
  if (name.endsWith(".docx")) {
    // HTML-ə çevirib qalın/altından xətli variantları düzgün cavab kimi işarələyirik (sətir sonuna *)
    const mammoth = await import("mammoth");
    const { value: html } = await mammoth.convertToHtml({ buffer: Buffer.from(buf) });
    return html
      .replace(/<\/(p|li|h\d|tr)>/gi, (m) => m + "\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .split("\n")
      .map((line) => {
        const text = decodeEntities(line.replace(/<[^>]+>/g, "")).trim();
        if (!text) return "";
        const emphasised = /<(strong|b|u)>/i.test(line) && /^[(]?[A-Ea-e]\s*[.)]/.test(text);
        return emphasised ? text + " *" : text;
      })
      .join("\n");
  }
  if (name.endsWith(".txt") || name.endsWith(".md") || file.type.startsWith("text/")) {
    return new TextDecoder("utf-8").decode(buf);
  }
  throw new Error("Dəstəklənən formatlar: PDF, DOCX, TXT");
}

function decodeEntities(s: string) {
  return s
    .replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}
