import cloudinary from "@/lib/cloudinary";
import { PAGE_WIDTH } from "@/lib/paginate";
import { sanitizeTopicHtml } from "@/lib/topics";

/**
 * Hazır fayldan kitabxana: DOCX (başlıq, qalın/kursiv, siyahı, cədvəl, şəkillər), PDF (mətn), TXT (paraqraf, başlıq).
 * DOCX-dəki şəkillər Cloudinary-ə yüklənir. Nəticə təmizlənmiş HTML-dir; müəllim redaktorda yoxlayıb yadda saxlayır.
 */

const MAX_IMAGES = 30;
const IMG_TYPES = /^image\/(png|jpe?g|gif|webp|bmp)$/i;

export interface ImportResult {
  html: string;
  images: number;
  skippedImages: number;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/* ───── DOCX ───── */
async function fromDocx(buf: Buffer): Promise<ImportResult> {
  const mammoth = await import("mammoth");
  let images = 0;
  let skippedImages = 0;
  const { value } = await mammoth.convertToHtml(
    { buffer: buf },
    {
      styleMap: ["u => u", "strike => s", "p[style-name='Title'] => h1:fresh", "p[style-name='Subtitle'] => h2:fresh"],
      convertImage: mammoth.images.imgElement(async (image) => {
        if (images >= MAX_IMAGES || !IMG_TYPES.test(image.contentType)) {
          skippedImages++;
          return { src: "" };
        }
        images++;
        const b64 = await image.read("base64");
        const r = await cloudinary.uploader.upload(`data:${image.contentType};base64,${b64}`, {
          folder: "eduflow/topics",
          resource_type: "image",
        });
        // Eni sonradan şəkil qutusunun ölçüsü üçün lazımdır (URL fraqmentində daşınır)
        return { src: `${r.secure_url}#w=${r.width}` };
      }),
    },
  );

  let html = value
    // Word başlıqları: H1 → başlıq, H2 → alt başlıq, qalanları da alt başlıq
    .replace(/<(\/?)h([1-6])>/gi, (_m, close: string, lvl: string) => `<${close}${lvl === "1" ? "h2" : "h3"}>`)
    .replace(/<img src=""[^>]*>/gi, "");

  const figure = (src: string, cls: "img-c" | "img-r") => {
    const m = src.match(/#w=(\d+)$/);
    const natural = m ? +m[1] : PAGE_WIDTH;
    const width = Math.max(80, Math.min(natural, cls === "img-c" ? PAGE_WIDTH : 300));
    return `<figure class="${cls}" style="width:${width}px"><img src="${src.replace(/#w=\d+$/, "")}" alt="" /></figure>`;
  };
  // Yalnız şəkildən ibarət paraqraf → mərkəzdə şəkil
  html = html.replace(/<p>((?:\s*<img [^>]*>\s*)+)<\/p>/gi, (_m, imgs: string) =>
    [...imgs.matchAll(/src="([^"]+)"/g)].map((x) => figure(x[1], "img-c")).join(""),
  );
  // Mətnin içindəki şəkil → paraqrafın sağında (mətn ətrafından axır)
  html = html.replace(/<p>([\s\S]*?)<\/p>/gi, (m, inner: string) => {
    const srcs = [...inner.matchAll(/<img [^>]*src="([^"]+)"[^>]*>/g)].map((x) => x[1]);
    if (!srcs.length) return m;
    const text = inner.replace(/<img [^>]*>/g, "");
    return srcs.map((s) => figure(s, "img-r")).join("") + (text.trim() ? `<p>${text}</p>` : "");
  });

  return { html: sanitizeTopicHtml(html), images, skippedImages };
}

/* ───── PDF: sətirlərdən paraqraflar ───── */
async function fromPdf(buf: Uint8Array): Promise<ImportResult> {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(buf);
  const { text } = await extractText(pdf, { mergePages: false });
  const pages = Array.isArray(text) ? text : [text];
  const out: string[] = [];

  for (const page of pages) {
    const lines = page.split("\n").map((l) => l.replace(/\s+/g, " ").trim());
    const lens = lines.filter(Boolean).map((l) => l.length).sort((a, b) => a - b);
    const full = lens.length ? lens[Math.floor(lens.length * 0.9)] : 80;
    let para: string[] = [];
    const flush = () => {
      if (para.length) out.push(`<p>${esc(para.join(" ").replace(/- (?=[a-zəığöüşç])/g, ""))}</p>`);
      para = [];
    };
    lines.forEach((line, i) => {
      if (!line) return flush();
      const next = lines[i + 1] ?? "";
      const short = line.length < full * 0.6;
      // Qısa, nöqtəsiz, ayrıca duran sətir: başlıq
      if (!para.length && short && !/[.,;:!?]$/.test(line) && next.length > line.length && /^[\p{Lu}\d]/u.test(line)) {
        out.push(`<h3>${esc(line)}</h3>`);
        return;
      }
      para.push(line);
      // Cümlə ilə bitən qısa sətir: paraqrafın sonu
      if (/[.!?:]$/.test(line) && line.length < full * 0.85) flush();
    });
    flush();
  }
  const html = out.join("");
  if (!html) throw new Error("PDF-dən mətn tapılmadı. Skan edilmiş (şəkil) PDF-lər oxunmur.");
  return { html: sanitizeTopicHtml(html), images: 0, skippedImages: 0 };
}

/* ───── TXT / MD ───── */
function fromText(raw: string): ImportResult {
  const blocks = raw.replace(/\r/g, "").split(/\n\s*\n/);
  const out: string[] = [];
  for (const block of blocks) {
    const lines = block.split("\n").map((l) => l.trimEnd()).filter((l) => l.trim());
    if (!lines.length) continue;
    if (lines.every((l) => /^\s*[-*•]\s+/.test(l))) {
      out.push(`<ul>${lines.map((l) => `<li>${esc(l.replace(/^\s*[-*•]\s+/, ""))}</li>`).join("")}</ul>`);
      continue;
    }
    let para: string[] = [];
    const flush = () => { if (para.length) out.push(`<p>${para.map(esc).join("<br>")}</p>`); para = []; };
    for (const l of lines) {
      const h = l.match(/^(#{1,3})\s+(.*)$/);
      if (h) {
        flush();
        out.push(h[1].length === 1 ? `<h2>${esc(h[2])}</h2>` : `<h3>${esc(h[2])}</h3>`);
      } else {
        para.push(l.trim());
      }
    }
    flush();
  }
  return { html: sanitizeTopicHtml(out.join("")), images: 0, skippedImages: 0 };
}

export async function fileToTopicHtml(file: File): Promise<ImportResult> {
  const name = file.name.toLowerCase();
  const buf = new Uint8Array(await file.arrayBuffer());
  if (name.endsWith(".docx")) return fromDocx(Buffer.from(buf));
  if (name.endsWith(".pdf") || file.type === "application/pdf") return fromPdf(buf);
  if (name.endsWith(".txt") || name.endsWith(".md") || file.type.startsWith("text/")) return fromText(new TextDecoder("utf-8").decode(buf));
  throw new Error("Dəstəklənən formatlar: DOCX, PDF, TXT");
}
