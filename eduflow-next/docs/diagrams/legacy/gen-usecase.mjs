// สร้าง Use Case Diagram (UML) ของระบบ EduFlow เป็น SVG → ห่อด้วย HTML สำหรับพิมพ์เป็น PDF
// รัน: node gen-usecase.mjs  → ได้ usecase.html แล้วใช้ Edge/Chrome headless --print-to-pdf
import { writeFileSync } from 'node:fs';

const W = 1720, H = 1180;

// ─── ชุดสีประจำ actor (ใช้กับเส้น association ให้แยกแยะง่าย) ───
const C = {
  student: '#2E7D5B',
  parent:  '#B5533E',
  teacher: '#8B5A2B',
  sadmin:  '#4A6FA5',
  wadmin:  '#6A4C93',
  shared:  '#9A8467',
  ink:     '#3D2B1A',
  boundary:'#C9B79C',
  ucFill:  '#FBF7F0',
  ucStroke:'#C9A876',
  bg:      '#FFFDF8',
};

// ─── Actor (stick figure) ───
function actor(x, y, label, color, sub) {
  const r = 13;
  return `
  <g class="actor">
    <circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="${color}" stroke-width="2.4"/>
    <line x1="${x}" y1="${y + r}" x2="${x}" y2="${y + r + 34}" stroke="${color}" stroke-width="2.4"/>
    <line x1="${x - 20}" y1="${y + r + 12}" x2="${x + 20}" y2="${y + r + 12}" stroke="${color}" stroke-width="2.4"/>
    <line x1="${x}" y1="${y + r + 34}" x2="${x - 16}" y2="${y + r + 60}" stroke="${color}" stroke-width="2.4"/>
    <line x1="${x}" y1="${y + r + 34}" x2="${x + 16}" y2="${y + r + 60}" stroke="${color}" stroke-width="2.4"/>
    <text x="${x}" y="${y + r + 82}" text-anchor="middle" font-size="19" font-weight="700" fill="${color}">${label}</text>
    ${sub ? `<text x="${x}" y="${y + r + 102}" text-anchor="middle" font-size="12.5" fill="#8A7862">${sub}</text>` : ''}
  </g>`;
}

// ─── Use case (pill) ───
const UC = {}; // id -> {cx, cy, rx, ry}
function uc(id, cx, cy, label, w) {
  const rx = w / 2, ry = 26;
  UC[id] = { cx, cy, rx, ry };
  const lines = Array.isArray(label) ? label : [label];
  const startY = cy - (lines.length - 1) * 9;
  const text = lines.map((l, i) =>
    `<text x="${cx}" y="${startY + i * 18 + 6}" text-anchor="middle" font-size="14.5" fill="${C.ink}">${l}</text>`).join('');
  return `
  <g class="uc">
    <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${C.ucFill}" stroke="${C.ucStroke}" stroke-width="1.6"/>
    ${text}
  </g>`;
}

// เส้น association actor → use case (แตะขอบ pill)
function assoc(ax, ay, ucId, color) {
  const u = UC[ucId];
  const dx = u.cx - ax, dy = u.cy - ay;
  const len = Math.hypot(dx, dy);
  const tx = u.cx - (dx / len) * u.rx * 0.98;
  const ty = u.cy - (dy / len) * u.ry * 0.98;
  return `<line x1="${ax}" y1="${ay}" x2="${tx}" y2="${ty}" stroke="${color}" stroke-width="1.3" opacity="0.55"/>`;
}

// generalization: specialized actor → parent actor (หัวลูกศรสามเหลี่ยมกลวง)
function generalize(x1, y1, x2, y2, color) {
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="1.4" stroke-dasharray="1 0" opacity="0.6" marker-end="url(#tri)"/>`;
}

// «include» / «extend» dashed arrow ระหว่าง use case
function include(fromId, toId, kind = 'include') {
  const a = UC[fromId], b = UC[toId];
  const dx = b.cx - a.cx, dy = b.cy - a.cy, len = Math.hypot(dx, dy);
  const sx = a.cx + (dx / len) * a.rx * 0.98, sy = a.cy + (dy / len) * a.ry;
  const ex = b.cx - (dx / len) * b.rx * 0.98, ey = b.cy - (dy / len) * b.ry;
  const mx = (sx + ex) / 2, my = (sy + ey) / 2;
  return `<line x1="${sx}" y1="${sy}" x2="${ex}" y2="${ey}" stroke="#8A7862" stroke-width="1.2" stroke-dasharray="5 4" marker-end="url(#openarrow)"/>
  <text x="${mx}" y="${my - 5}" text-anchor="middle" font-size="11" fill="#8A7862" font-style="italic">«${kind}»</text>`;
}

// ═══════════════ วาง Use Cases ═══════════════
const ucs = [];

// ── ส่วนกลาง (ทุกผู้ใช้) — คอลัมน์กลางบน ──
ucs.push(uc('login',   860, 250, 'เข้าสู่ระบบ', 150));
ucs.push(uc('auth',    860, 335, ['ยืนยันตัวตน', '(ล็อคเมื่อผิดหลายครั้ง)'], 190));
ucs.push(uc('register',1060, 250, 'สมัครสมาชิก', 150));
ucs.push(uc('profile', 660, 250, 'จัดการโปรไฟล์', 165));
ucs.push(uc('notify',  660, 335, 'รับการแจ้งเตือน', 175));

// ── นักเรียน — คอลัมน์ซ้าย ──
const SX = 560;
ucs.push(uc('s_schedule', SX, 470, 'ดูตารางเรียน', 170));
ucs.push(uc('s_class',    SX, 540, ['ดูห้องเรียน', '(สื่อ/ประกาศ)'], 170));
ucs.push(uc('s_hw',       SX, 615, 'ดู & ส่งการบ้าน', 175));
ucs.push(uc('s_qr',       SX, 685, 'เช็คชื่อผ่าน QR', 175));
ucs.push(uc('s_grade',    SX, 755, 'ดูผลการเรียน', 170));
ucs.push(uc('s_doc',      SX, 825, ['ดาวน์โหลดเอกสาร', 'ผลการเรียน (ปพ.)'], 195));
ucs.push(uc('s_lib',      SX, 900, ['อ่านหนังสือ', 'ห้องสมุดออนไลน์'], 185));
ucs.push(uc('s_book',     SX, 970, 'จองหนังสือ', 160));
ucs.push(uc('s_shop',     SX, 1040,['ซื้อสินค้า /', 'เติมเงินกระเป๋า'], 180));

// ── ร่วม นักเรียน+ครู ──
ucs.push(uc('tutoring',   760, 900, ['เรียนพิเศษ', '(จอง / เปิดสอน)'], 180));

// ── ผู้ปกครอง — ล่างซ้าย (ใช้ UC ของนักเรียนบางส่วน) ──
ucs.push(uc('p_follow',   760, 1000, ['ติดตามผลการเรียน /', 'การเข้าเรียนบุตรหลาน'], 235));

// ── ครู — คอลัมน์ขวา ──
const TX = 1160;
ucs.push(uc('t_academic', 960, 470, ['จัดการโครงสร้าง', 'วิชาการ'], 185));
ucs.push(uc('t_subject',  TX, 470, 'จัดการรายวิชา', 165));
ucs.push(uc('t_schedule', TX, 540, 'จัดตารางสอน', 165));
ucs.push(uc('t_qr',       TX, 610, ['สร้าง QR เช็คชื่อ', '& ดูรายงาน'], 185));
ucs.push(uc('t_hw',       TX, 685, ['สั่ง & ตรวจ', 'การบ้าน'], 165));
ucs.push(uc('t_score',    TX, 755, 'บันทึกคะแนน', 160));
ucs.push(uc('t_ppdoc',    TX, 825, ['ออกเอกสาร', 'ผลการเรียน (ปพ.)'], 190));
ucs.push(uc('t_material', TX, 900, ['จัดการสื่อการสอน', '& ประกาศ'], 195));

// ── แอดมิน — คอลัมน์ขวาล่าง ──
ucs.push(uc('a_users', 960, 700, 'จัดการผู้ใช้', 155));
ucs.push(uc('a_perm',  960, 900, ['กำหนดสิทธิ์', 'การเข้าถึง'], 165));
ucs.push(uc('a_log',   960, 800, 'ดู Log ระบบ', 155));

// ═══════════════ Associations ═══════════════
const lines = [];
// จุดเชื่อมของ actor (มือขวา/ซ้าย)
const A = {
  user:   { x: 860, y: 150 },   // ผู้ใช้ระบบ (parent actor) — อยู่บนสุดกลาง
  student:{ x: 250, y: 470 },
  parent: { x: 250, y: 900 },
  teacher:{ x: 1470, y: 470 },
  sadmin: { x: 1470, y: 760 },
  wadmin: { x: 1470, y: 940 },
};

// ผู้ใช้ระบบ → ส่วนกลาง
['login','auth','register','profile','notify'].forEach(id => lines.push(assoc(A.user.x, A.user.y, id, C.shared)));

// นักเรียน
['s_schedule','s_class','s_hw','s_qr','s_grade','s_doc','s_lib','s_book','s_shop','tutoring']
  .forEach(id => lines.push(assoc(A.student.x, A.student.y, id, C.student)));

// ผู้ปกครอง
['p_follow','s_schedule','s_grade','s_doc'].forEach(id => lines.push(assoc(A.parent.x, A.parent.y, id, C.parent)));

// ครู
['t_academic','t_subject','t_schedule','t_qr','t_hw','t_score','t_ppdoc','t_material','tutoring']
  .forEach(id => lines.push(assoc(A.teacher.x, A.teacher.y, id, C.teacher)));

// แอดมินโรงเรียน
['a_users','t_academic','a_log'].forEach(id => lines.push(assoc(A.sadmin.x, A.sadmin.y, id, C.sadmin)));

// เว็บแอดมิน
['a_perm','a_users','a_log'].forEach(id => lines.push(assoc(A.wadmin.x, A.wadmin.y, id, C.wadmin)));

// generalization: 5 actor → ผู้ใช้ระบบ
const gens = [
  generalize(A.student.x, A.student.y - 40, A.user.x - 40, A.user.y + 40, C.student),
  generalize(A.parent.x, A.parent.y - 40, A.user.x - 60, A.user.y + 60, C.parent),
  generalize(A.teacher.x, A.teacher.y - 40, A.user.x + 40, A.user.y + 40, C.teacher),
  generalize(A.sadmin.x, A.sadmin.y - 40, A.user.x + 60, A.user.y + 55, C.sadmin),
  generalize(A.wadmin.x, A.wadmin.y - 40, A.user.x + 70, A.user.y + 65, C.wadmin),
];

// «include» login → ยืนยันตัวตน
const incs = [include('login', 'auth', 'include')];

// ═══════════════ ประกอบ SVG ═══════════════
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="'Leelawadee UI','Tahoma',sans-serif">
  <defs>
    <marker id="tri" markerWidth="16" markerHeight="16" refX="13" refY="6" orient="auto">
      <path d="M1,1 L13,6 L1,11 Z" fill="white" stroke="#8A7862" stroke-width="1.2"/>
    </marker>
    <marker id="openarrow" markerWidth="12" markerHeight="12" refX="8" refY="4" orient="auto">
      <path d="M1,1 L8,4 L1,7" fill="none" stroke="#8A7862" stroke-width="1.3"/>
    </marker>
  </defs>

  <rect x="0" y="0" width="${W}" height="${H}" fill="${C.bg}"/>

  <!-- หัวเรื่อง -->
  <text x="${W/2}" y="48" text-anchor="middle" font-size="30" font-weight="800" fill="${C.ink}">Use Case Diagram — ระบบ EduFlow</text>
  <text x="${W/2}" y="76" text-anchor="middle" font-size="15" fill="#8A7862">ระบบอำนวยความสะดวกโรงเรียน · แผนภาพกรณีการใช้งานจำแนกตามบทบาทผู้ใช้</text>

  <!-- System boundary -->
  <rect x="430" y="180" width="850" height="920" rx="18" fill="none" stroke="${C.boundary}" stroke-width="2"/>
  <text x="455" y="208" font-size="16" font-weight="700" fill="#A8926F">ระบบ EduFlow</text>

  <!-- association lines (วาดก่อนเพื่อให้อยู่หลัง pill) -->
  <g>${lines.join('\n')}</g>
  <g>${gens.join('\n')}</g>

  <!-- use cases -->
  ${ucs.join('\n')}

  <!-- include arrows (บน pill) -->
  ${incs.join('\n')}

  <!-- parent actor: ผู้ใช้ระบบ -->
  ${actor(A.user.x, A.user.y - 60, 'ผู้ใช้ระบบ', C.ink, '«abstract»')}

  <!-- actors -->
  ${actor(A.student.x, A.student.y - 40, 'นักเรียน', C.student)}
  ${actor(A.parent.x, A.parent.y - 40, 'ผู้ปกครอง', C.parent)}
  ${actor(A.teacher.x, A.teacher.y - 40, 'ครู', C.teacher)}
  ${actor(A.sadmin.x, A.sadmin.y - 40, 'แอดมินโรงเรียน', C.sadmin)}
  ${actor(A.wadmin.x, A.wadmin.y - 40, 'เว็บแอดมิน', C.wadmin)}

  <!-- legend -->
  <g transform="translate(${W - 250}, 92)">
    <rect x="0" y="0" width="238" height="150" rx="10" fill="white" stroke="${C.boundary}" stroke-width="1.2"/>
    <text x="14" y="24" font-size="13.5" font-weight="700" fill="${C.ink}">สัญลักษณ์</text>
    <line x1="14" y1="44" x2="44" y2="44" stroke="#8A7862" stroke-width="1.4"/>
    <text x="52" y="48" font-size="12" fill="#5A4A38">association (ใช้งาน)</text>
    <line x1="14" y1="68" x2="44" y2="68" stroke="#8A7862" stroke-width="1.4" marker-end="url(#tri)"/>
    <text x="52" y="72" font-size="12" fill="#5A4A38">generalization (สืบทอด)</text>
    <line x1="14" y1="92" x2="44" y2="92" stroke="#8A7862" stroke-width="1.2" stroke-dasharray="5 4" marker-end="url(#openarrow)"/>
    <text x="52" y="96" font-size="12" fill="#5A4A38">«include»</text>
    <ellipse cx="26" cy="118" rx="14" ry="9" fill="${C.ucFill}" stroke="${C.ucStroke}" stroke-width="1.4"/>
    <text x="52" y="122" font-size="12" fill="#5A4A38">use case (กรณีใช้งาน)</text>
    <text x="14" y="142" font-size="11" fill="#8A7862">รวม 5 บทบาท · ${Object.keys(UC).length} กรณีการใช้งาน</text>
  </g>
</svg>`;

const html = `<!doctype html><html lang="th"><head><meta charset="utf-8">
<style>
  @page { size: 420mm 288mm; margin: 0; }
  html,body { margin:0; padding:0; background:${C.bg}; }
  svg { width:100%; height:auto; display:block; }
</style></head><body>${svg}</body></html>`;

writeFileSync(new URL('./usecase.html', import.meta.url), html);
writeFileSync(new URL('./usecase.svg', import.meta.url), svg);
console.log('wrote usecase.html + usecase.svg ·', Object.keys(UC).length, 'use cases');
