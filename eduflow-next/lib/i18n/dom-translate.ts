/**
 * แปลข้อความ "ทั้งหน้า" โดยไล่แทนที่ text node ตามพจนานุกรม
 *
 * ทำไมต้องมี: การไล่ครอบ t() ทีละข้อความในทุกคอมโพเนนต์ใช้เวลามาก และตกหล่นง่าย
 * วิธีนี้ทำให้ปุ่มเปลี่ยนภาษา "กดครั้งเดียวเปลี่ยนทั้งหน้า" ได้จริง โดย:
 *   - เก็บข้อความไทยต้นฉบับของแต่ละ text node ไว้ใน WeakMap → กดกลับเป็นไทยได้ทันที ไม่ต้อง reload
 *   - มี MutationObserver คอยแปลงส่วนที่ React เพิ่งวาดใหม่ (เปลี่ยนหน้า/เปิด popup)
 *   - ข้ามข้อความที่ไม่มีในพจนานุกรม → ไม่แตะข้อมูลผู้ใช้ (ชื่อคน ชื่อวิชาที่ครูพิมพ์เอง)
 *
 * คอมโพเนนต์ที่ใช้ t() อยู่แล้วยังทำงานปกติ — สองระบบนี้ทับกันได้ (แปลซ้ำไม่มีผล)
 *
 * TODO(i18n): เมื่อย้ายไป next-intl ให้เลิกใช้ไฟล์นี้ แล้วใช้ key แบบ message id แทน
 */

import { lookupEn, type Lang } from './dict';

/**
 * ข้อความไทยต้นฉบับ + ข้อความที่เราแปลใส่ไป ของแต่ละ text node (C-10: ไม่เก็บ original ค้าง)
 * - ถ้าค่าปัจจุบัน ≠ ค่าที่เราแปลใส่ → React เปลี่ยนข้อความเอง → ถือค่าปัจจุบันเป็นต้นฉบับใหม่
 * - ตอนกลับเป็นไทย คืนค่าเฉพาะเมื่อค่าปัจจุบันยังเป็นค่าที่เราแปลใส่ (ไม่ทับค่าที่ React ตั้งใหม่)
 */
const originals = new WeakMap<Text, string>();
const translatedText = new WeakMap<Text, string>();

const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'CODE']);

function shouldSkip(node: Node): boolean {
  const parent = node.parentElement;
  if (!parent) return true;
  if (SKIP_TAGS.has(parent.tagName)) return true;
  return !!parent.closest('[data-no-i18n]');
}

function eachTextNode(root: Node, fn: (n: Text) => void) {
  if (root.nodeType === Node.TEXT_NODE) { fn(root as Text); return; }
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  let n = walker.nextNode();
  while (n) { nodes.push(n as Text); n = walker.nextNode(); }
  nodes.forEach(fn);
}

/** attribute ที่ผู้ใช้เห็น/ได้ยิน (placeholder, aria-label, title) */
const ATTRS = ['placeholder', 'aria-label', 'title'] as const;
/** ค่าต้นฉบับ (ไทย) ต่อ attribute */
const attrOriginals = new WeakMap<Element, Partial<Record<string, string>>>();
/** ค่าที่เราแปลใส่ไปแล้วต่อ attribute (ADR 6.3 ข้อ 1) */
const translatedAttrs = new WeakMap<Element, Partial<Record<string, string>>>();

function translateAttrs(el: Element, lang: Lang) {
  if (el.closest('[data-no-i18n]')) return;
  for (const a of ATTRS) {
    const cur = el.getAttribute(a);
    if (cur === null) continue;
    const saved = attrOriginals.get(el) ?? {};
    const done = translatedAttrs.get(el) ?? {};
    if (lang === 'en') {
      if (done[a] !== undefined && cur === done[a]) continue;           // แปลแล้ว
      // ค่าใหม่จาก React (ไม่ใช่ต้นฉบับเดิมและไม่ใช่ค่าที่เราแปล) → ต้นฉบับใหม่
      if (saved[a] === undefined || cur !== saved[a]) { saved[a] = cur; attrOriginals.set(el, saved); }
      const tr = cur.trim() ? lookupEn(cur.trim()) : undefined;
      if (!tr) { delete done[a]; translatedAttrs.set(el, done); continue; }
      done[a] = tr; translatedAttrs.set(el, done);
      el.setAttribute(a, tr);
    } else {
      // คืนต้นฉบับเฉพาะเมื่อค่าปัจจุบันยังเป็นค่าที่เราแปลใส่ (ADR 6.3 ข้อ 3)
      if (done[a] !== undefined && cur === done[a] && saved[a] !== undefined) el.setAttribute(a, saved[a]!);
      delete done[a]; translatedAttrs.set(el, done);
    }
  }
}

/** แปลงข้อความในทุก text node ใต้ root ตามภาษาที่เลือก */
export function translateTree(root: Node, lang: Lang) {
  if (root.nodeType === Node.ELEMENT_NODE) {
    const el = root as Element;
    translateAttrs(el, lang);
    el.querySelectorAll('[placeholder],[aria-label],[title]').forEach(e => translateAttrs(e, lang));
  }
  eachTextNode(root, node => {
    if (shouldSkip(node)) return;
    const raw = node.data;
    const mine = translatedText.get(node);

    if (lang === 'en') {
      if (mine !== undefined && raw === mine) return;                   // แปลแล้ว
      const key = raw.trim();
      if (!key) return;
      const translated = lookupEn(key);
      if (!translated) { originals.delete(node); translatedText.delete(node); return; }
      originals.set(node, raw);                                         // ต้นฉบับล่าสุดเสมอ
      // คงช่องว่างหน้า/หลังเดิมไว้ เพื่อไม่ให้ layout เพี้ยน
      const out = raw.replace(key, translated);
      translatedText.set(node, out);
      node.data = out;
    } else {
      const original = originals.get(node);
      if (original !== undefined && mine !== undefined && raw === mine) node.data = original;
      originals.delete(node); translatedText.delete(node);
    }
  });
}

let observer: MutationObserver | null = null;

/**
 * เริ่ม/หยุดการแปลทั้งหน้า — เรียกจาก LangProvider ทุกครั้งที่ภาษาเปลี่ยน
 * คืนฟังก์ชันสำหรับ cleanup
 */
export function syncPageLanguage(lang: Lang): () => void {
  if (typeof document === 'undefined') return () => {};

  observer?.disconnect();
  observer = null;

  translateTree(document.body, lang);
  if (lang === 'th') return () => {};

  // React วาดใหม่เมื่อไร ให้แปลส่วนที่เพิ่มมาทันที
  // ปิด observer ระหว่างที่เราแก้ข้อความเอง — กันไม่ให้ mutation ของเราปลุก callback ซ้ำ
  // C-10: ฟัง attribute ที่ผู้ใช้เห็นด้วย (React เปลี่ยน title/aria-label/placeholder ตาม state)
  const OPTS: MutationObserverInit = {
    childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: [...ATTRS],
  };
  observer = new MutationObserver(mutations => {
    const targets: Node[] = [];
    const attrTargets: Element[] = [];
    for (const m of mutations) {
      m.addedNodes.forEach(n => targets.push(n));
      if (m.type === 'characterData') targets.push(m.target);
      if (m.type === 'attributes') attrTargets.push(m.target as Element);
    }
    if (targets.length === 0 && attrTargets.length === 0) return;

    observer?.disconnect();
    targets.forEach(n => translateTree(n, 'en'));
    attrTargets.forEach(el => translateAttrs(el, 'en'));
    observer?.observe(document.body, OPTS);
  });
  observer.observe(document.body, OPTS);

  return () => { observer?.disconnect(); observer = null; };
}
