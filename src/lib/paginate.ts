/**
 * Kitabxananın səhifələnməsi: səhifə sabit endə (680px) ölçülür ki, telefon və kompüterdə eyni səhifələr çıxsın.
 * Bir səhifə = 40 sətir × 24px = 960px. Müəllimin qoyduğu <hr class="page-break"> həmişə yeni səhifə başladır.
 */
export const PAGE_WIDTH = 680;
export const LINE_PX = 24;
export const LINES_PER_PAGE = 40;
export const PAGE_PX = LINE_PX * LINES_PER_PAGE;

export const isPageBreak = (el: Element) => el.tagName === "HR" && el.classList.contains("page-break");

/** Kökün birbaşa uşaqlarını səhifələrə bölür (uşaq indeksləri). Kök `position: relative` olmalıdır. */
export function paginate(root: HTMLElement): number[][] {
  const kids = Array.from(root.children) as HTMLElement[];
  const pages: number[][] = [[]];
  let top = 0;
  kids.forEach((el, i) => {
    const page = pages[pages.length - 1];
    if (isPageBreak(el)) {
      if (page.length) pages.push([]);
      return;
    }
    if (!page.length) top = el.offsetTop;
    const bottom = el.offsetTop + el.offsetHeight - top;
    if (bottom > PAGE_PX && page.length) {
      pages.push([i]);
      top = el.offsetTop;
    } else {
      page.push(i);
    }
  });
  if (pages.length > 1 && !pages[pages.length - 1].length) pages.pop();
  return pages;
}

/** Şəkillər yüklənənə qədər gözləyir (hündürlük düzgün ölçülsün) */
export function imagesReady(root: HTMLElement): Promise<void> {
  const imgs = Array.from(root.querySelectorAll("img"));
  return Promise.all(
    imgs.map((img) =>
      img.complete ? Promise.resolve() : new Promise<void>((r) => { img.onload = () => r(); img.onerror = () => r(); }),
    ),
  ).then(() => undefined);
}
