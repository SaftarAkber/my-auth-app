"use client";

import { useEffect } from "react";
import { getLang } from "@/lib/i18n";
import { translateText } from "@/lib/autoTranslate";

/**
 * Səhifədəki interfeys mətnlərini seçilmiş dilə çevirir (lüğət: i18n-dict.ts).
 * Mətn düyünləri və placeholder / title / aria-label / alt atributları izlənir (MutationObserver), React yeniləyəndə yenidən çevrilir.
 * Redaktə olunan sahələr, kitabxana məzmunu və [data-no-translate] daxilindəkilər toxunulmaz qalır.
 */

const ATTRS = ["placeholder", "title", "aria-label", "alt"] as const;
const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "TEXTAREA", "CODE", "PRE", "NOSCRIPT"]);

export default function AutoTranslate() {
  useEffect(() => {
    const lang = getLang();
    const root = document.documentElement;
    const reveal = () => root.classList.remove("i18n-pending");

    // Orijinal (Azərbaycan) mətn və bizim yazdığımız son dəyər: React dəyişəndə fərqi bilmək üçün
    const orig = new WeakMap<Node, string>();
    const last = new WeakMap<Node, string>();
    const origAttr = new WeakMap<Element, Record<string, string>>();
    const lastAttr = new WeakMap<Element, Record<string, string>>();

    const skipped = (el: Element | null): boolean => {
      for (let e = el; e; e = e.parentElement) {
        if (SKIP_TAGS.has(e.tagName)) return true;
        if (e.hasAttribute("data-no-translate") || e.classList.contains("topic-content")) return true;
        if ((e as HTMLElement).isContentEditable) return true;
      }
      return false;
    };

    const split = (s: string) => {
      const m = s.match(/^(\s*)([\s\S]*?)(\s*)$/)!;
      return { lead: m[1], core: m[2].replace(/\s+/g, " "), trail: m[3] };
    };

    // Cəm forması üçün əvvəlki rəqəm: qonşu düyündə və ya (söz ayrıca elementdədirsə) valideynin qonşusunda
    const prevNumber = (node: Node): number | null => {
      const before = (n: Node | null) => {
        let p = n?.previousSibling ?? null;
        while (p && p.nodeType === Node.TEXT_NODE && !p.textContent?.trim()) p = p.previousSibling;
        return p;
      };
      let p = before(node);
      if (!p && node.parentElement && !node.parentElement.previousSibling?.textContent?.match(/[A-Za-zƏəİıŞşÇçĞğÖöÜüА-Яа-я]{3}/)) p = before(node.parentElement);
      const t = p?.textContent?.trim() ?? "";
      const m = t.match(/(\d[\d\s.,]*)$/);
      return m ? Number(m[1].replace(/[^\d]/g, "")) : null;
    };

    const doText = (node: Text) => {
      const data = node.data;
      if (last.get(node) === data) return;
      if (skipped(node.parentElement)) return;
      orig.set(node, data);
      const { lead, core, trail } = split(data);
      const tr = translateText(core, lang, prevNumber(node));
      const out = tr === null ? data : lead + tr + trail;
      last.set(node, out);
      if (out !== data) node.data = out;
    };

    const doAttrs = (el: Element) => {
      for (const a of ATTRS) {
        const v = el.getAttribute(a);
        if (v === null) continue;
        const l = lastAttr.get(el) ?? {};
        if (l[a] === v) continue;
        if (skipped(el.parentElement) && a !== "placeholder") continue;
        const o = origAttr.get(el) ?? {};
        o[a] = v;
        origAttr.set(el, o);
        const tr = translateText(split(v).core, lang);
        const out = tr ?? v;
        l[a] = out;
        lastAttr.set(el, l);
        if (out !== v) el.setAttribute(a, out);
      }
    };

    const walk = (start: Node) => {
      if (start.nodeType === Node.TEXT_NODE) return doText(start as Text);
      if (start.nodeType !== Node.ELEMENT_NODE) return;
      const el = start as Element;
      if (SKIP_TAGS.has(el.tagName) && el.tagName !== "TEXTAREA") return;
      doAttrs(el);
      const tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
      for (let n = tw.nextNode(); n; n = tw.nextNode()) {
        if (n.nodeType === Node.TEXT_NODE) doText(n as Text);
        else doAttrs(n as Element);
      }
    };

    const doTitle = () => {
      const t = document.title;
      const parts = t.split(" · ");
      const tr = parts.map((p) => translateText(p, lang) ?? p).join(" · ");
      if (tr !== t) document.title = tr;
    };

    walk(document.body);
    doTitle();
    reveal();

    const mo = new MutationObserver((records) => {
      for (const r of records) {
        if (r.type === "characterData") doText(r.target as Text);
        else if (r.type === "attributes") doAttrs(r.target as Element);
        else r.addedNodes.forEach(walk);
      }
    });
    mo.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: [...ATTRS] });
    const titleEl = document.querySelector("title");
    const to = new MutationObserver(doTitle);
    if (titleEl) to.observe(titleEl, { childList: true, characterData: true, subtree: true });
    return () => { mo.disconnect(); to.disconnect(); };
  }, []);

  return null;
}
