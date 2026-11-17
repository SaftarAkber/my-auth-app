// Faylın mətnindən test suallarını çıxarır (PDF / DOCX / TXT). Sual dili: Azərbaycan, rus, ingilis.
// Dəstəklənən format:
//   1. Sual mətni            (və ya "1) ...")
//   A) variant   B) variant  (A–E, ayrı sətirlərdə və ya bir sətirdə)
//   Cavab: B                 (sualın altında) — və ya faylın sonunda "Cavablar: 1-A 2-C ..."
// Düzgün variant "*" və ya "✓" ilə də işarələnə bilər. Variantsız suallar açıq sual olur.
// Çətinlik: ayrıca sətirdə "Asan" / "Orta" / "Çətin" (və ya "Asan suallar", "Çətinlik: Orta") başlığı
// özündən sonrakı bütün suallara aiddir.

export interface ParsedQuestion {
  text: string;
  type: "MULTIPLE_CHOICE" | "OPEN_ENDED";
  options: string[];
  /** Düzgün variantın indeksi (tapılmayıbsa -1) */
  correct: number;
  /** Sualın şəkli (DOCX-dən Cloudinary-ə yüklənmiş) */
  image?: string;
  /** Bölmə başlığından gələn çətinlik */
  difficulty?: Difficulty;
}

export type Difficulty = "EASY" | "MEDIUM" | "HARD";
/** Çətinlik başlığı: "Asan", "ORTA suallar", "Çətinlik: Çətin", "Çətin suallar (350)" */
const DIFF_RE = /^\s*(?:(?:çətinlik|cetinlik|səviyyə|seviyye|dərəcə|derece)\s*[:\-–]?\s*)?(asan|orta|çətin|cetin|çetin|cətin|ÇƏTİN|CƏTİN|ÇETİN|CETİN)(?:\s+(?:suallar|sual|səviyyə|seviyye|dərəcə|derece))?\s*(?:\(\s*\d+\s*\))?\s*:?\s*$/iu;
const DIFF_OF: Record<string, Difficulty> = { asan: "EASY", orta: "MEDIUM" };
export function difficultyHeader(line: string): Difficulty | null {
  const m = line.match(DIFF_RE);
  if (!m) return null;
  return DIFF_OF[m[1].toLocaleLowerCase("az")] ?? "HARD";
}

/** Mətndə şəklin yeri: ayrıca sətirdə [[IMG:url]] */
const IMG_LINE_RE = /^\[\[IMG:(\S+)\]\]$/;
/** Sual içindəki siyahı bəndi ("1 – ...", "a – ...") öz sətrində qalır */
const LIST_ITEM_RE = /^(?:\d{1,2}|[A-Za-z])\s*[–—-]\s+\S/;

const MAX_OPTIONS = 5;
const LETTERS = "ABCDE";

const QUESTION_RE = /^\s*(\d{1,3})\s*[.)]\s*(\S.*)$/;
const OPTION_RE = /^\s*[(]?([A-Ea-e])\s*[.)]\s*(\S.*)$/;
const ANSWER_RE = /^\s*(?:düzgün\s+cavab|cavab|ответ|answer|ans|correct)\s*[:\-–=]?\s*[(]?([A-Ea-e])\b/i;
const KEY_HEADER_RE = /^\s*(?:cavablar|cavab\s+açarı|açar|ответы|answers?|answer\s+key|key)\s*[:\-–]?\s*(.*)$/i;
// Radio/qutu işarələri: ○ boş, ● dolu (dolu olan düzgün cavabdır)
const GLYPH = "○◯⚪●◉⚫☐☑✔✅";
const GLYPH_RE = new RegExp("^\\s*([" + GLYPH + "])\\s*");
const GLYPH_BEFORE_OPTION_RE = new RegExp("\\s*([" + GLYPH + "])\\s*(?=[(]?[A-Ea-e]\\s*[.)])", "g");
const FILLED_RE = /[●◉⚫☑✔✅]/;
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
  const lines = raw
    .replace(/\r/g, "")
    // Hər "○ A)" / "● C)" yeni sətirdən başlasın (bütün sual bir sətirdə olsa belə)
    .replace(GLYPH_BEFORE_OPTION_RE, "\n$1 ")
    .split("\n")
    .map(clean)
    .filter(Boolean);

  type Draft = { text: string; options: string[]; correct: number; opt: number; marks: number; answered: boolean; image?: string; difficulty?: Difficulty };
  const drafts: Draft[] = [];
  let cur: Draft | null = null;
  let keyMode = false;
  const key = new Map<number, number>();
  // Sualın nömrəsindən əvvəl gələn şəkil növbəti suala aiddir
  let pendingImage: string | undefined;
  let difficulty: Difficulty | undefined;

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
    const dh = difficultyHeader(rawLine);
    if (dh) {
      difficulty = dh;
      cur = null;
      continue;
    }
    const img = rawLine.match(IMG_LINE_RE);
    if (img) {
      // Sualın mətni ilə variantları arasındakı şəkil həmin sualındır; variantlardan/cavabdan sonrakı isə növbəti sualın
      if (cur && !cur.image && cur.options.length === 0 && !cur.answered) cur.image = img[1];
      else if (!pendingImage) pendingImage = img[1];
      continue;
    }

    for (const piece of splitInlineOptions(rawLine.replace(GLYPH_RE, ""))) {
      const filled = FILLED_RE.test(rawLine.match(GLYPH_RE)?.[1] ?? "") && piece === splitInlineOptions(rawLine.replace(GLYPH_RE, ""))[0];
      const line = piece;
      const ans = line.match(ANSWER_RE);
      if (ans && cur) {
        cur.correct = LETTERS.indexOf(ans[1].toUpperCase());
        cur.answered = true;
        continue;
      }
      const opt = line.match(OPTION_RE);
      // Sual yoxdursa variant sayılmır; A–E ardıcıllığı pozulursa mətnin davamıdır
      if (opt && cur && LETTERS.indexOf(opt[1].toUpperCase()) === cur.options.length && cur.options.length < MAX_OPTIONS) {
        const marked = filled || MARK_RE.test(opt[2]);
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
        cur = { text: clean(q[2]), options: [], correct: -1, opt: -1, marks: 0, answered: false, image: pendingImage, difficulty };
        pendingImage = undefined;
        drafts.push(cur);
        continue;
      }
      if (!cur) continue;
      // Davam sətri: variantın və ya sualın mətninə əlavə olunur
      if (cur.options.length > 0 && cur.opt >= 0) cur.options[cur.opt] = clean(`${cur.options[cur.opt]} ${line}`);
      else cur.text = LIST_ITEM_RE.test(line) ? `${cur.text}\n${line}` : `${cur.text} ${line}`.trim();
    }
  }
  // Sonuncu sualdan sonra qalan şəkil həmin suala aiddir
  if (pendingImage && cur && !cur.image) cur.image = pendingImage;

  return drafts.map((d, i) => {
    const mc = d.options.length >= 2;
    // Bir neçə variant işarələnibsə (məs. hamısı qalındır) qeyri-müəyyəndir: müəllim seçsin
    let correct = d.marks > 1 && !d.answered ? -1 : d.correct;
    if (key.has(i + 1)) correct = key.get(i + 1)!;
    if (!mc || correct >= d.options.length) correct = -1;
    const image = { ...(d.image ? { image: d.image } : {}), ...(d.difficulty ? { difficulty: d.difficulty } : {}) };
    return mc
      ? { text: d.text, type: "MULTIPLE_CHOICE" as const, options: d.options, correct, ...image }
      : { text: [d.text, ...d.options.map((o, k) => `${LETTERS[k]}) ${o}`)].join(" "), type: "OPEN_ENDED" as const, options: [], correct: -1, ...image };
  });
}

const MAX_IMAGES = 150;
const IMG_TYPES = /^image\/(png|jpe?g|gif|webp|bmp)$/i;

/** Fayldan mətn çıxarır. DOCX şəkilləri `uploadImage` ilə yüklənir və mətndə ayrıca [[IMG:url]] sətri kimi qalır. */
export async function extractText(file: File, uploadImage?: (dataUri: string) => Promise<string>): Promise<string> {
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
    let images = 0;
    const { value: html } = await mammoth.convertToHtml(
      { buffer: Buffer.from(buf) },
      {
        convertImage: mammoth.images.imgElement(async (image) => {
          if (!uploadImage || images >= MAX_IMAGES || !IMG_TYPES.test(image.contentType)) return { src: "" };
          images++;
          return { src: await uploadImage(`data:${image.contentType};base64,${await image.read("base64")}`) };
        }),
      },
    );
    // Word-un avtomatik nömrələməsi (1. 2. 3.) mətndə itir: nömrələnmiş siyahı elementlərinə əlavə edirik
    const stack: { ordered: boolean; n: number }[] = [];
    const numbered = html.replace(/<(\/?)(ol|ul|li)>/gi, (m, close: string, tag: string) => {
      const t = tag.toLowerCase();
      if (t !== "li") {
        if (close) stack.pop();
        else stack.push({ ordered: t === "ol", n: 0 });
        return m;
      }
      const top = stack[stack.length - 1];
      return !close && top?.ordered && stack.length === 1 ? `${m}${++top.n}. ` : m;
    });
    return numbered
      // Şəkil öz sətrində qalır
      .replace(/<img [^>]*src="(https:[^"]+)"[^>]*>/gi, (_m, src: string) => `\n[[IMG:${src}]]\n`)
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
