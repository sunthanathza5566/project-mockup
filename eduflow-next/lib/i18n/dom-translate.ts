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

import { EN, type Lang } from './dict';

/** ข้อความไทยต้นฉบับของแต่ละ node — ใช้ย้อนกลับเป็นภาษาไทย */
const originals = new WeakMap<Text, string>();

const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'CODE']);

function shouldSkip(node: Node): boolean {
  const parent = node.parentElement;
  if (!parent) return true;
  if (SKIP_TAGS.has(parent.tagName)) return true;
  return !!parent.closest('[data-no-i18n]');
}

function eachTextNode(root: Node, fn: (n: Text) => void) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  let n = walker.nextNode();
  while (n) { nodes.push(n as Text); n = walker.nextNode(); }
  nodes.forEach(fn);
}

/** แปลงข้อความในทุก text node ใต้ root ตามภาษาที่เลือก */
export function translateTree(root: Node, lang: Lang) {
  eachTextNode(root, node => {
    if (shouldSkip(node)) return;

    if (lang === 'en') {
      const raw = node.data;
      const key = raw.trim();
      if (!key) return;
      const translated = EN[key];
      if (!translated) return;
      if (!originals.has(node)) originals.set(node, raw);
      // คงช่องว่างหน้า/หลังเดิมไว้ เพื่อไม่ให้ layout เพี้ยน
      node.data = raw.replace(key, translated);
    } else {
      const original = originals.get(node);
      if (original !== undefined && node.data !== original) node.data = original;
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
  const OPTS: MutationObserverInit = { childList: true, subtree: true, characterData: true };
  observer = new MutationObserver(mutations => {
    const targets: Node[] = [];
    for (const m of mutations) {
      m.addedNodes.forEach(n => targets.push(n));
      if (m.type === 'characterData') targets.push(m.target.parentNode || m.target);
    }
    if (targets.length === 0) return;

    observer?.disconnect();
    targets.forEach(n => translateTree(n, 'en'));
    observer?.observe(document.body, OPTS);
  });
  observer.observe(document.body, OPTS);

  return () => { observer?.disconnect(); observer = null; };
}
