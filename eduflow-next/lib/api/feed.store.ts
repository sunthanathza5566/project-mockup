/**
 * Feed Store — ฟีดข่าว/กิจกรรม/วันหยุด/เกร็ดความรู้ (แหล่งเดียว → แสดง 3 ที่)
 *   ก่อนล็อกอิน (landing) · แดชบอร์ดครู · แดชบอร์ดนักเรียน
 * web admin เป็นผู้ดูแล (เพิ่ม/แก้/ลบ) ที่หน้า /admin/content
 *
 * รูปภาพ: อัปโหลดจริงฝั่ง client → เก็บเป็น base64 dataURL ใน localStorage
 * TODO(PostgreSQL + S3): ย้ายรูปขึ้น storage จริง เก็บแค่ URL · table: feed_items
 */

import { SCHOOL_NEWS_MOCK } from '../mock-data';

const STORE_KEY = 'eduflow_feed_v4'; // bump = โหลด seed ชุดใหม่ (เพิ่ม placement + sort)

export type FeedType = 'activity' | 'holiday' | 'news' | 'tip';
export type RailSide = 'left' | 'right';

export const FEED_META: Record<FeedType, { label: string; icon: string; color: string }> = {
  activity: { label: 'กิจกรรม',       icon: '🎉', color: '#B5533E' },
  holiday:  { label: 'วันหยุด',       icon: '🏖', color: '#2E7D5B' },
  news:     { label: 'ข่าว/ประกาศ',   icon: '📢', color: '#4A6FA5' },
  tip:      { label: 'เกร็ดความรู้',  icon: '💡', color: '#C4804A' },
};

/** ฝั่งเริ่มต้นตามชนิด (ถ้า admin ยังไม่กำหนดเอง) */
const SIDE_BY_TYPE: Record<FeedType, RailSide> = { holiday: 'left', news: 'left', activity: 'right', tip: 'right' };

export interface FeedItem {
  id: number;
  type: FeedType;
  title: string;
  body: string;
  image?: string;      // base64 dataURL (ไม่บังคับ)
  pinned: boolean;
  date: string;        // ข้อความวันที่ เช่น "29 ก.ค. 2569"
  placement: RailSide; // ฝั่งที่จะแสดงในราง (ซ้าย/ขวา) — admin กำหนดเองได้
  sort: number;        // ลำดับในฝั่งนั้น (น้อย = อยู่บน)
  createdAt: number;
}

/** เติมค่า default ให้ข้อมูลเก่าที่ยังไม่มี placement/sort */
function norm(i: FeedItem): FeedItem {
  return { ...i, placement: i.placement ?? SIDE_BY_TYPE[i.type], sort: i.sort ?? 0 };
}

function isBrowser() { return typeof window !== 'undefined'; }

type FeedSeed = Omit<FeedItem, 'createdAt' | 'placement' | 'sort'>;

/** ตั้งต้นจาก mock ข่าวเดิม + วันหยุดนักขัตฤกษ์ทั้งปี + กิจกรรม + เกร็ดความรู้ (ให้ฟีดยาวเต็มหน้า) */
function seed(): FeedItem[] {
  const map: Record<string, FeedType> = { announce: 'news', calendar: 'news', activity: 'activity', holiday: 'holiday' };
  const base: FeedSeed[] = SCHOOL_NEWS_MOCK.map((n) => ({
    id: n.id, type: map[n.type] || 'news', title: n.title, body: n.body,
    pinned: false, date: n.date,
  }));

  const extra: FeedSeed[] = [
    // ── วันหยุดนักขัตฤกษ์ประจำปี พ.ศ. 2569 ──
    { id: 2001, type: 'holiday', pinned: false, date: '1 ม.ค. 2569',  title: 'วันขึ้นปีใหม่',                 body: 'หยุดราชการ · เริ่มต้นปีใหม่ ตั้งเป้าหมายการเรียนของปีนี้กันเถอะ' },
    { id: 2002, type: 'holiday', pinned: false, date: '3 มี.ค. 2569', title: 'วันมาฆบูชา',                   body: 'วันสำคัญทางพุทธศาสนา — โอวาทปาติโมกข์ · โรงเรียนหยุด 1 วัน' },
    { id: 2003, type: 'holiday', pinned: false, date: '6 เม.ย. 2569',  title: 'วันจักรี',                     body: 'รำลึกการสถาปนาราชวงศ์จักรีและพระบาทสมเด็จพระพุทธยอดฟ้าจุฬาโลกมหาราช' },
    { id: 2004, type: 'holiday', pinned: false, date: '13–15 เม.ย. 2569', title: 'วันสงกรานต์',              body: 'ประเพณีปีใหม่ไทย · หยุดยาว 3 วัน — เล่นน้ำอย่างปลอดภัย รดน้ำดำหัวผู้ใหญ่' },
    { id: 2006, type: 'holiday', pinned: false, date: '31 ก.ค. 2569',  title: 'วันอาสาฬหบูชา & เข้าพรรษา',    body: 'วันสำคัญทางพุทธศาสนา — งดอบายมุขตลอดพรรษา' },
    { id: 2007, type: 'holiday', pinned: false, date: '12 ส.ค. 2569',  title: 'วันแม่แห่งชาติ',               body: 'วันเฉลิมพระชนมพรรษาสมเด็จพระบรมราชชนนีพันปีหลวง · ทำกิจกรรมวันแม่ที่โรงเรียน' },
    { id: 2008, type: 'holiday', pinned: false, date: '23 ต.ค. 2569',  title: 'วันปิยมหาราช',                 body: 'รำลึกพระบาทสมเด็จพระจุลจอมเกล้าเจ้าอยู่หัว รัชกาลที่ 5' },
    { id: 2009, type: 'holiday', pinned: false, date: '5 ธ.ค. 2569',   title: 'วันพ่อแห่งชาติ & วันชาติ',      body: 'วันคล้ายวันพระบรมราชสมภพ ร.9 · กิจกรรมวันพ่อและทำความดีถวาย' },

    // ── กิจกรรมโรงเรียน ──
    { id: 3001, type: 'activity', pinned: false, date: '8 ส.ค. 2569',  title: 'กีฬาสีภายใน "เกมส์สัมพันธ์"',  body: 'แข่งกีฬาเชื่อมความสามัคคี 4 คณะสี ณ สนามกีฬาโรงเรียน — สมัครนักกีฬาที่ครูพละ' },
    { id: 3002, type: 'activity', pinned: false, date: '15 ส.ค. 2569', title: 'สัปดาห์วิทยาศาสตร์',          body: 'นิทรรศการโครงงาน · ประกวดสิ่งประดิษฐ์ · จรวดขวดน้ำ ที่อาคารวิทยาศาสตร์' },
    { id: 3003, type: 'activity', pinned: false, date: '20 ส.ค. 2569', title: 'ค่ายภาษาอังกฤษ English Camp',  body: 'ฝึกทักษะการสื่อสารกับครูต่างชาติ 2 วัน 1 คืน · รับจำนวนจำกัด' },

    // ── เกร็ดความรู้ ──
    { id: 4001, type: 'tip', pinned: false, date: 'เกร็ดวันนี้', title: 'รู้หรือไม่? 🐘',            body: 'ช้างจำเส้นทางและแหล่งน้ำได้ไกลหลายร้อยกิโลเมตร เพราะสมองส่วนความจำ (ฮิปโปแคมปัส) ใหญ่มาก' },
    { id: 4002, type: 'tip', pinned: false, date: 'เกร็ดวันนี้', title: 'เคล็ดลับอ่านหนังสือ 📚',     body: 'เทคนิค Pomodoro: อ่าน 25 นาที พัก 5 นาที ช่วยให้สมองจำได้ดีกว่าการอ่านรวดเดียวยาว ๆ' },
    { id: 4003, type: 'tip', pinned: false, date: 'เกร็ดวันนี้', title: 'น้ำในร่างกาย 💧',            body: 'ร่างกายมนุษย์มีน้ำเป็นองค์ประกอบราว 60% — ดื่มน้ำให้พอช่วยให้สมองคิดและจำได้ดีขึ้น' },
    { id: 4004, type: 'tip', pinned: false, date: 'เกร็ดวันนี้', title: 'ทำไมท้องฟ้าเป็นสีฟ้า? 🌤',   body: 'แสงสีฟ้ากระเจิงในชั้นบรรยากาศได้มากกว่าสีอื่น (Rayleigh scattering) เราจึงเห็นฟ้าเป็นสีฟ้า' },
  ];

  // กำหนดฝั่งตามชนิด + ลำดับ (sort) เรียงในแต่ละฝั่ง — admin ปรับเองได้ภายหลัง
  const counter: Record<RailSide, number> = { left: 0, right: 0 };
  return [...base, ...extra].map((s, i) => {
    const placement = SIDE_BY_TYPE[s.type];
    return { ...s, placement, sort: counter[placement]++, createdAt: Date.now() - i * 1000 };
  });
}

function load(): FeedItem[] {
  if (!isBrowser()) return seed();
  const raw = localStorage.getItem(STORE_KEY);
  if (raw) return JSON.parse(raw);
  const s = seed();
  localStorage.setItem(STORE_KEY, JSON.stringify(s));
  return s;
}

function save(items: FeedItem[]) {
  if (isBrowser()) localStorage.setItem(STORE_KEY, JSON.stringify(items));
}

const sortFn = (a: FeedItem, b: FeedItem) => (Number(b.pinned) - Number(a.pinned)) || (b.createdAt - a.createdAt);

/** ทั้งหมด (หรือกรองตามชนิด) — เรียงปักหมุดก่อน (ใช้ใน NewsBoard + หน้า admin) */
export function getFeed(type?: FeedType): FeedItem[] {
  const all = load().map(norm).sort(sortFn);
  return type ? all.filter(i => i.type === type) : all;
}

/** การ์ดของราง 1 ฝั่ง — ตามที่ admin จัดไว้ (ปักหมุดก่อน แล้วเรียงตาม sort) */
export function getRailItems(side: RailSide): FeedItem[] {
  return load().map(norm)
    .filter(i => i.placement === side)
    .sort((a, b) => (Number(b.pinned) - Number(a.pinned)) || (a.sort - b.sort) || (b.createdAt - a.createdAt));
}

/** ย้ายการ์ดขึ้น/ลงภายในฝั่งเดียวกัน (สลับ sort กับเพื่อนบ้าน) */
export function moveFeed(id: number, dir: 'up' | 'down'): void {
  const items = load().map(norm);
  const cur = items.find(i => i.id === id);
  if (!cur) return;
  const sibs = items.filter(i => i.placement === cur.placement)
    .sort((a, b) => (a.sort - b.sort) || (b.createdAt - a.createdAt));
  const idx = sibs.findIndex(i => i.id === id);
  const swapWith = dir === 'up' ? sibs[idx - 1] : sibs[idx + 1];
  if (!swapWith) return;
  const a = items.find(i => i.id === cur.id)!;
  const b = items.find(i => i.id === swapWith.id)!;
  [a.sort, b.sort] = [b.sort, a.sort];
  save(items);
}

/** ย้ายการ์ดไปอีกฝั่ง — วางไว้ท้ายสุดของฝั่งใหม่ */
export function setPlacement(id: number, side: RailSide): void {
  const items = load().map(norm);
  const maxSort = items.filter(i => i.placement === side).reduce((m, i) => Math.max(m, i.sort), -1);
  save(items.map(i => (i.id === id ? { ...i, placement: side, sort: maxSort + 1 } : i)));
}

// TODO(PostgreSQL): INSERT INTO feed_items (...)
export function createFeed(data: Omit<FeedItem, 'id' | 'createdAt' | 'placement' | 'sort'> & { placement?: RailSide }): FeedItem {
  const items = load().map(norm);
  const placement = data.placement ?? SIDE_BY_TYPE[data.type];
  const maxSort = items.filter(i => i.placement === placement).reduce((m, i) => Math.max(m, i.sort), -1);
  const item: FeedItem = { ...data, placement, sort: maxSort + 1, id: Date.now(), createdAt: Date.now() };
  items.unshift(item);
  save(items);
  return item;
}

export function updateFeed(id: number, patch: Partial<Omit<FeedItem, 'id' | 'createdAt'>>): void {
  save(load().map(i => (i.id === id ? { ...i, ...patch } : i)));
}

export function deleteFeed(id: number): void {
  save(load().filter(i => i.id !== id));
}

/** อ่านไฟล์ภาพ → base64 dataURL (client upload จริง) */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}
